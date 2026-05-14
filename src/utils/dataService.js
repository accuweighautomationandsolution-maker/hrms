import { supabase } from './supabaseClient';

// ── Generic Supabase Helpers (Pure Supabase, No localStorage) ───────────

// Fetches all rows from a table where data is stored in a JSONB 'data' column
const sbGetAll = async (table, defaultVal = []) => {
  if (!supabase) return defaultVal;
  try {
    // Order by id desc as a safe fallback — created_at may not exist in all tables
    const { data, error } = await supabase.from(table).select('data').order('id', { ascending: false });
    if (error) {
      // If id ordering fails, try without ordering
      const { data: d2, error: e2 } = await supabase.from(table).select('data');
      if (e2) { console.error(`sbGetAll(${table}):`, e2); return defaultVal; }
      return (d2 || []).filter(r => r.data != null).map(r => r.data);
    }
    return (data || []).filter(r => r.data != null).map(r => r.data);
  } catch (e) { console.error(`sbGetAll(${table}) exception:`, e); return defaultVal; }
};

// Generic write: upserts a list of records to a JSONB table
const sbSaveAll = async (table, list) => {
  if (!supabase || !list || list.length === 0) return list;
  try {
    const rows = list.map(r => ({ id: String(r.id), data: r }));
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) { console.error(`sbSaveAll upsert(${table}):`, error); }
  } catch (e) { console.error(`sbSaveAll(${table}) exception:`, e); }
  return list;
};

// Generic single delete
const sbDelete = async (table, id) => {
  if (!supabase) return;
  try {
    await supabase.from(table).delete().eq('id', String(id));
  } catch (e) { console.error(`sbDelete(${table}, ${id}):`, e); }
};

// Config helpers (using app_config table)
const getConfig = async (key, defaultVal) => {
  if (!supabase) return defaultVal;
  try {
    // Strategy 1: Try app_config (official settings table)
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .limit(1);
    
    if (!error && data && data.length > 0) return data[0].value;

    // Strategy 2: Fallback to employees table (using shadow ID)
    const shadowId = `sys_config_${key}`;
    const { data: shadow, error: shadowErr } = await supabase
      .from('employees')
      .select('data')
      .eq('id', shadowId)
      .maybeSingle();
    
    if (!shadowErr && shadow && shadow.data) return shadow.data.value;

    return defaultVal;
  } catch (e) { 
    console.warn(`getConfig(${key}) exception:`, e.message); 
    return defaultVal; 
  }
};

// Robust saveConfig: tries upsert → update → insert to guarantee write regardless of schema constraints
const saveConfig = async (key, value) => {
  if (!supabase) return false;
  try {
    // Strategy 1: Try app_config
    const { error: e1 } = await supabase
      .from('app_config')
      .upsert({ key, value }, { onConflict: 'key' });
    if (!e1) return true;

    // Strategy 2: Fallback to employees table (shadow record)
    const shadowId = `sys_config_${key}`;
    const { error: e2 } = await supabase
      .from('employees')
      .upsert({ 
        id: shadowId, 
        name: `System Config: ${key}`,
        status: 'System',
        data: { key, value } 
      }, { onConflict: 'id' });
    
    if (!e2) return true;

    console.error(`saveConfig(${key}) failed in all tables:`, e2.message);
    return false;
  } catch (e) {
    console.error(`saveConfig(${key}) exception:`, e.message);
    return false;
  }
};

// ── Supabase Storage Helper ──────────────────────────────────────────────
// Bucket: 'hrms-files' — must be created in the Supabase dashboard with public access disabled.
// Path pattern: {folder}/{timestamp}_{filename}
const storageUpload = async (folder, file) => {
  if (!supabase) throw new Error('Supabase not connected');
  const ext = file.name.split('.').pop();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('hrms-files').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream'
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  // Return a signed URL valid for 10 years (max)
  const { data: urlData } = await supabase.storage.from('hrms-files').createSignedUrl(path, 315360000);
  return { path, url: urlData?.signedUrl || path };
};

// Upload base64 data URL to Supabase Storage
const storageUploadBase64 = async (folder, base64DataUrl, filename, mimeType) => {
  if (!supabase) throw new Error('Supabase not connected');
  // Convert base64 to Blob
  const base64 = base64DataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid base64 data');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from('hrms-files').upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: mimeType || 'application/octet-stream'
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: urlData } = await supabase.storage.from('hrms-files').createSignedUrl(path, 315360000);
  return { path, url: urlData?.signedUrl || path };
};

export const dataService = {
  // ── Employees ─────────────────────────────────────────────────────────────
  getEmployees: async () => {
    if (!supabase) {
      console.warn('dataService: Supabase client is null. Returning empty employee list.');
      return [];
    }
    try {
      console.log('dataService: Fetching employees from Supabase...');
      // 15-second timeout — some networks are slow
      const fetchPromise = supabase
        .from('employees')
        .select('*')
        .order('id', { ascending: false });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getEmployees query timed out after 15s')), 15000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('Supabase Query Error (employees):', error.message);
        alert("📊 Database Access Error (Employees): " + error.message + "\n\nThis is likely why the employee list is blank. Please check your SQL Grants.");
        return [];
      }
      
      console.log(`dataService: Successfully fetched ${data.length} employees.`);
      
      const userRole = (typeof authService !== 'undefined' && authService.getUserRole) ? authService.getUserRole() : null;
      const isEmployeeUser = userRole === 'employee';

      return data.map(r => {
        let parsedData = {};
        if (typeof r.data === 'string') {
          try { parsedData = JSON.parse(r.data); } catch(e) { parsedData = {}; }
        } else if (r.data && typeof r.data === 'object') {
          parsedData = r.data;
        }
        
        const fullProfile = {
          ...parsedData,
          id: r.id,
          name: r.name || parsedData.name || 'Unnamed Employee',
          email: r.email || parsedData.email || '',
          empCode: r.emp_code || parsedData.empCode || '',
          role: r.designation || parsedData.role || 'Associate',
          department: r.department || parsedData.department || 'Engineering',
          status: r.status || parsedData.status || 'Active',
          empType: r.employment_type || parsedData.empType || 'Probation'
        };

        // Strict Access Control: Scrub sensitive data for employee-level users
        if (isEmployeeUser) {
          return {
            id: fullProfile.id,
            name: fullProfile.name,
            role: fullProfile.role,
            department: fullProfile.department,
            contact: fullProfile.contact || '', // Allowed per requirements
            // Scrub everything else
            email: '', 
            empCode: '', 
            status: 'Active',
            empType: '',
            salaryConfig: null,
            bankAccountNumber: '',
            aadharNo: '',
            panNo: '',
            documents: []
          };
        }

        return fullProfile;
      });
    } catch (err) {
      console.error('Critical Exception in getEmployees:', err.message);
      return [];
    }
  },

  getEmployeeById: async (id) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('employees').select('data').eq('id', id).maybeSingle();
    const profile = (data && data.data) ? data.data : null;
    if (!profile) return null;

    const userRole = typeof authService !== 'undefined' ? authService.getUserRole() : 'employee';
    if (userRole !== 'management' && userRole !== 'admin') {
      return {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        department: profile.department,
        contact: profile.contact || '',
        // All other fields hidden
      };
    }
    return profile;
  },

  saveEmployee: async (empData) => {
    if (!supabase) return empData;
    const id = empData.id || Date.now();
    const status = empData.status || 'Active';
    const row = {
      id,
      name: empData.name || '',
      email: empData.email || '',
      status,
      data: { ...empData, id, status }
    };
    
    // We omit employment_type, designation, and department from the top-level row
    // because they are confirmed missing in some schema versions. 
    // They are safely stored inside the 'data' JSONB object above.
    
    try {
      // Always use upsert so documents and profile updates are never silently dropped.
      // Insert-only (isNew) is handled via onConflict behavior.
      const { error } = await supabase
        .from('employees')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.error("Error saving employee to Supabase:", error);
        throw error;
      }
      return row.data;
    } catch (err) {
      console.error("Exception in saveEmployee:", err);
      throw err;
    }
  },

  saveEmployees: async (list) => {
    if (!supabase) return list;
    const rows = list.map(emp => ({
      id: emp.id,
      name: emp.name || '',
      email: emp.email || '',
      emp_code: emp.empCode || '',
      status: emp.status || 'Active',
      data: emp
    }));
    await supabase.from('employees').upsert(rows);
    return list;
  },

  deleteEmployee: async (id) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('employees').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Deletion failed. This is likely due to database Row Level Security (RLS) blocking your account from deleting records.");
      }
    } catch (err) {
      console.error("Exception in deleteEmployee:", err);
      throw err;
    }
  },

  // ── Departments ──────────────────────────────────────────────────────────
  getDepartments: async () => {
    const list = await getConfig('departments', ['Management', 'Engineering', 'Operations', 'Sales', 'HR', 'Finance']);
    return Array.isArray(list) ? list : ['Management', 'Engineering', 'Operations', 'Sales', 'HR', 'Finance'];
  },

  addDepartment: async (name) => {
    const current = await dataService.getDepartments();
    if (!current.includes(name)) {
      const updated = [...current, name];
      await saveConfig('departments', updated);
      return updated;
    }
    return current;
  },

  deleteDepartment: async (name) => {
    const current = await dataService.getDepartments();
    const updated = current.filter(d => d !== name);
    await saveConfig('departments', updated);
    return updated;
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  getAttendance: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('attendance').select('*');
    if (!data) return {};
    
    // Transform flat array into the map expected by the UI: { "empId_y_m_d": record }
    const map = {};
    data.forEach(r => {
      const dateObj = new Date(r.date);
      const k = `${r.emp_id}_${dateObj.getFullYear()}_${dateObj.getMonth()}_${dateObj.getDate()}`;
      map[k] = {
        punchIn: r.punch_in ? new Date(r.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        punchOut: r.punch_out ? new Date(r.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        status: r.status,
        remark: r.data?.remark || '',
        source: r.data?.source || 'Database'
      };
    });
    return map;
  },

  saveAttendance: async (recordsMap) => {
    if (!supabase) return;
    // recordsMap is { "empId_y_m_d": { punchIn, punchOut, remark, source } }
    const rows = Object.entries(recordsMap).map(([key, val]) => {
      const [empId, y, m, d] = key.split('_');
      const dateStr = `${y}-${String(Number(m) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Construct timestamps
      let punchInTs = null;
      if (val.punchIn) {
        punchInTs = new Date(`${dateStr}T${val.punchIn}:00`).toISOString();
      }
      let punchOutTs = null;
      if (val.punchOut) {
        punchOutTs = new Date(`${dateStr}T${val.punchOut}:00`).toISOString();
      }

      return {
        id: key, // Using the key as ID for easy upsert
        emp_id: empId,
        date: dateStr,
        punch_in: punchInTs,
        punch_out: punchOutTs,
        status: val.punchOut ? 'Present' : (val.punchIn ? 'Incomplete' : 'Absent'),
        data: { remark: val.remark, source: val.source }
      };
    });
    await supabase.from('attendance').upsert(rows);
  },

  getTodayAttendanceStatus: async (userId) => {
    if (!supabase) return { punch_in: null, punch_out: null, status: 'Not Marked' };
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('attendance')
      .select('*')
      .eq('emp_id', userId)
      .eq('date', today)
      .maybeSingle();
    return data || { punch_in: null, punch_out: null, status: 'Not Marked' };
  },

  saveAttendanceRecord: async (record) => {
    if (!supabase) return;
    await supabase.from('attendance').upsert(record);
  },

  saveAttendance: async (records) => {
    if (!supabase) return;
    // records is a map of { empId_y_m_d: { punchIn, punchOut, remark, source } }
    const rows = Object.entries(records).map(([id, rec]) => {
      const parts = id.split('_'); // empId_year_month_day
      const emp_id = parts[0];
      const date = `${parts[1]}-${String(Number(parts[2]) + 1).padStart(2, '0')}-${String(parts[3]).padStart(2, '0')}`;
      
      // Construct timestamps for DB columns if present
      let punchInTs = null;
      if (rec.punchIn && rec.punchIn.includes(':')) {
        punchInTs = new Date(`${date}T${rec.punchIn}:00`).toISOString();
      } else if (rec.punchIn) {
        punchInTs = rec.punchIn; // assume already ISO or valid
      }

      let punchOutTs = null;
      if (rec.punchOut && rec.punchOut.includes(':')) {
        punchOutTs = new Date(`${date}T${rec.punchOut}:00`).toISOString();
      } else if (rec.punchOut) {
        punchOutTs = rec.punchOut; // assume already ISO or valid
      }

      return {
        id,
        emp_id,
        date,
        punch_in: punchInTs,
        punch_out: punchOutTs,
        status: rec.punchOut ? 'Present' : (rec.punchIn ? 'Incomplete' : 'Absent'),
        data: { remark: rec.remark, source: rec.source }
      };
    });
    // Upsert in chunks to avoid URL length limits
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from('attendance').upsert(rows.slice(i, i + 100));
      if (error) {
        console.error("Supabase attendance upsert error:", error.message);
        if (error.code === '42501') throw new Error("Permission Denied: Row Level Security (RLS) policy prevents saving attendance. Please contact the Database Admin.");
        throw new Error(`Database Error: ${error.message}`);
      }
    }
  },

  getPresentDaysCount: async (empId, month, year) => {
    if (!supabase) return 0;
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { count } = await supabase.from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('emp_id', empId)
      .not('punch_in', 'is', null)
      .gte('date', start)
      .lte('date', end);
    return count || 0;
  },

  // ── Leave Management ──────────────────────────────────────────────────────
  getLeaveRequests: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('leave_requests').select('*, employees(name)');
    return data || [];
  },

  saveLeaveRequests: async (reqs) => {
    if (!supabase) return reqs;
    const rows = reqs.map(r => {
      const id = r.id || `LV_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      return {
        id,
        emp_id: String(r.emp_id || r.empId),
        type: r.type,
        start_date: r.start_date || r.startDate,
        end_date: r.end_date || r.endDate,
        reason: r.reason,
        status: r.status,
        data: { ...r, id } // Ensure data field also has the stable ID
      };
    });
    await supabase.from('leave_requests').upsert(rows, { onConflict: 'id' });
    return reqs;
  },

  getLeaveBalances: async () => {
    if (!supabase) return {};
    const { data } = await supabase.from('leave_balances').select('*');
    const map = {};
    (data || []).forEach(r => map[r.emp_id] = r.data);
    return map;
  },

  getEmployeeBalance: async (empId, type = 'total') => {
    if (!supabase) return 0;
    const { data } = await supabase.from('leave_balances').select('data').eq('emp_id', empId).maybeSingle();
    const bals = (data && data.data) ? data.data : { Sick: 0, Casual: 0, Paid: 0 };
    if (type === 'total') return Object.values(bals).reduce((a, b) => a + b, 0);
    return bals[type] || 0;
  },

  updateLeaveBalance: async (empId, newBalance) => {
    if (!supabase) return;
    await supabase.from('leave_balances').upsert({ emp_id: empId, data: newBalance, updated_at: new Date().toISOString() });
  },

  // ── Notices ─────────────────────────────────────────────────────────────
  getNotices: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('notices').select('*').order('start_at', { ascending: false });
    return (data || []).map(r => ({
      ...r.data,
      id: r.id,
      start_at: r.start_at,
      end_at: r.end_at,
      is_permanent: r.is_permanent,
      status: r.status
    }));
  },

  getPersonalNotices: async (empId) => {
    // Notices are currently global, but we filter by targeting logic if implemented
    return dataService.getNotices();
  },

  saveNotice: async (notice) => {
    if (!supabase) return notice;
    try {
      const row = {
        title: notice.title,
        content: notice.content,
        type: notice.type || 'General',
        priority: notice.priority || 'Normal',
        author: notice.author || 'Admin',
        date: notice.date || new Date().toISOString().slice(0, 10),
        start_at: notice.start_at || new Date().toISOString(),
        end_at: notice.is_permanent ? null : (notice.end_at || null),
        is_permanent: !!notice.is_permanent,
        status: notice.status || 'Active',
        data: notice
      };

      // Check if it's an existing BigInt ID (usually numeric and not a long timestamp)
      if (notice.id && !isNaN(notice.id) && String(notice.id).length < 12) {
        // Update existing
        const { error } = await supabase.from('notices').update(row).eq('id', notice.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from('notices').insert([row]);
        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.error("Notice Save Failure:", err);
      throw err;
    }
  },

  // Backward compatibility alias
  saveNotices: async (notices) => {
    // If passed a list, we'll just save the last one for now or loop
    for (const n of notices) {
      await dataService.saveNotice(n);
    }
    return notices;
  },

  deleteNotice: async (id) => {
    if (!supabase) return;
    await supabase.from('notices').delete().eq('id', id);
  },

  // ── Policies ──────────────────────────────────────────────
  getPolicies: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('policies').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  savePolicies: async (policies) => {
    if (!supabase) return policies;
    const rows = policies.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status || 'Active',
      data: p
    }));
    await supabase.from('policies').upsert(rows);
    return policies;
  },

  deletePolicy: async (id) => {
    if (!supabase) return;
    await supabase.from('policies').delete().eq('id', id);
  },

  uploadPolicyFile: async (file) => {
    const { url } = await storageUpload('policies', file);
    return url;
  },

  getAcknowledgments: async () => sbGetAll('policy_acks'),
  saveAcknowledgment: async (ack) => {
    const id = `ACK_${Date.now()}`;
    await supabase.from('policy_acks').insert({ id, data: { ...ack, id, timestamp: new Date().toISOString() } });
  },

  // ── Holidays ─────────────────────────────────────────────────────────────
  getCustomHolidays: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('holidays').select('*').order('from_date', { ascending: true });
    return (data || []).map(h => ({
      ...h,
      fromDate: h.from_date,
      toDate: h.to_date
    }));
  },

  saveHolidays: async (list) => {
    if (!supabase) return list;
    const rows = list.map(h => ({
      id: h.id,
      name: h.name,
      from_date: h.from_date || h.fromDate,
      to_date: h.to_date || h.toDate,
      type: h.type || 'Public',
      data: h
    }));
    await supabase.from('holidays').upsert(rows);
    return list;
  },

  // ── Advances & Payroll ─────────────────────────────────────────────────
  getAdvanceHistory: async () => sbGetAll('advances'),
  saveAdvanceHistory: async (history) => {
    if (!supabase || !history || history.length === 0) return history;
    try {
      const rows = history.map(r => ({
        id: String(r.id),
        emp_id: String(r.empId || r.emp_id),
        data: r
      }));
      await supabase.from('advances').upsert(rows, { onConflict: 'id' });
    } catch (e) { console.error(`saveAdvanceHistory exception:`, e); }
    return history;
  },
  getPersonalAdvances: async (empId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('advances').select('data').eq('emp_id', String(empId));
    return (data || []).map(r => r.data);
  },

  getPayrollHistory: async () => sbGetAll('payroll_history'),
  savePayrollHistory: async (history) => {
    if (!supabase || !history || history.length === 0) return history;
    const rows = history.map(h => ({
      id: `PAY_${h.year}_${h.month}_${h.empId}`,
      data: h,
      created_at: h.createdAt || new Date().toISOString()
    }));
    await supabase.from('payroll_history').upsert(rows, { onConflict: 'id' });
    return history;
  },

  getManpowerRequests: async () => sbGetAll('manpower_requests'),
  saveManpowerRequests: async (list) => sbSaveAll('manpower_requests', list),

  getDeptBudgets: async () => sbGetAll('dept_budgets'),
  saveDeptBudgets: async (list) => sbSaveAll('dept_budgets', list),

  getBonusPayments: async () => sbGetAll('bonus_payments'),
  saveBonusPayments: async (list) => sbSaveAll('bonus_payments', list),

  getHandoverMaster: async () => sbGetAll('handover_master'),
  saveHandoverMaster: async (list) => sbSaveAll('handover_master', list),

  // ── Expenses ──────────────────────────────────────────────────────────
  getExpenses: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return data || [];
  },

  getPersonalExpenses: async (empId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('expenses').select('*').eq('emp_id', empId).order('date', { ascending: false });
    return data || [];
  },

  saveExpenses: async (list) => {
    if (!supabase) return list;
    await supabase.from('expenses').upsert(list);
    return list;
  },

  deleteExpense: async (id) => {
    if (!supabase) return;
    await supabase.from('expenses').delete().eq('id', id);
  },


  // ── Projects ──────────────────────────────────────────────────────────
  getProjects: async () => {
    if (!supabase) return [];
    const { data } = await supabase.from('projects').select('*').order('name');
    return data || [];
  },

  saveProjects: async (list) => {
    if (!supabase) return list;
    await supabase.from('projects').upsert(list);
    return list;
  },

  getBudgetUtilization: async (dept) => {
    if (!supabase) return 0;
    const { data } = await supabase.from('employees').select('data').eq('department', dept);
    if (!data) return 0;
    return data.reduce((sum, r) => sum + (Number(r.data?.grossSalary) || 0), 0);
  },

  addProject: async (name) => {
    if (!supabase) return;
    const id = name.toLowerCase().replace(/ /g, '_');
    await supabase.from('projects').insert({ id, name, status: 'Active' });
  },

  toggleProjectStatus: async (id) => {
    if (!supabase) return;
    const { data } = await supabase.from('projects').select('status').eq('id', id).single();
    const newStatus = data?.status === 'Active' ? 'Inactive' : 'Active';
    await supabase.from('projects').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  },



  // ── Induction & Feedback ──────────────────────────────────────────────
  getInductionTasks: async (empId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('induction_tasks').select('tasks').eq('emp_id', empId).maybeSingle();
    return (data && data.tasks) ? data.tasks : [];
  },

  saveInductionTasks: async (empId, tasks) => {
    if (!supabase) return;
    await supabase.from('induction_tasks').upsert({ emp_id: empId, tasks, updated_at: new Date().toISOString() });
  },



  // ── App Configs (Bulletin, Biometrics, etc) ──────────────────────────
  getConfig: async (key, def) => getConfig(key, def),
  saveConfig: async (key, val) => saveConfig(key, val),

  getBiometricConfig: async () => getConfig('biometric', { ip: '192.168.1.201', port: '4370', isEnabled: true }),
  saveBiometricConfig: async (conf) => saveConfig('biometric', conf),

  getGratuityConfig: async () => getConfig('gratuity_config', { enabled: true, minYearsStandard: 5 }),
  saveGratuityConfig: async (conf) => saveConfig('gratuity_config', conf),

  getBonusConfig: async () => getConfig('bonus_config', { enabled: true, bonusPercentage: 8.33 }),
  saveBonusConfig: async (conf) => saveConfig('bonus_config', conf),

  getBulletinConfig: async () => getConfig('bulletin_config', null),
  saveBulletinConfig: async (conf) => saveConfig('bulletin_config', conf),

  // ── Dashboard Stats ──────────────────────────────────────────────────
  getDashboardStats: async () => {
    if (!supabase) return { totalEmployees: 0, presentToday: 0, onLeave: 0 };
    
    const { count: totalEmployees } = await supabase.from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');
    
    const today = new Date().toISOString().split('T')[0];
    const { count: presentToday } = await supabase.from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .not('punch_in', 'is', null);

    const { data: leaves } = await supabase.from('leave_requests')
      .select('emp_id')
      .eq('status', 'Approved')
      .lte('start_date', today)
      .gte('end_date', today);
    
    const onLeave = new Set((leaves || []).map(l => l.emp_id)).size;

    return { totalEmployees: totalEmployees || 0, presentToday: presentToday || 0, onLeave };
  },

  // ── Business Logic Helpers ───────────────────────────────────────────
  getPersonalAttendanceSummary: async (userId, month, year) => {
    const present = await dataService.getPresentDaysCount(userId, month, year);
    return {
      present,
      absent: 0,
      late: 0,
      total: 30
    };
  },

  getUpcomingProbations: async () => {
    const emps = await dataService.getEmployees();
    const now = new Date();
    return emps.filter(e => {
      if (!e.joiningDate || e.empType !== 'Probation') return false;
      const joinDate = new Date(e.joiningDate);
      const probationEnd = new Date(joinDate.setMonth(joinDate.getMonth() + 6));
      const daysLeft = Math.ceil((probationEnd - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 15;
    }).map(e => {
      const joinDate = new Date(e.joiningDate);
      const probationEnd = new Date(joinDate.setMonth(joinDate.getMonth() + 6));
      return {
        id: e.id,
        empId: e.empCode,
        name: e.name,
        expiryDate: probationEnd.toISOString().split('T')[0],
        daysRemaining: Math.ceil((probationEnd - now) / (1000 * 60 * 60 * 24))
      };
    });
  },

  getEmployeeBalanceByCriteria: async (empId, type = 'total') => {
    return await dataService.getEmployeeBalance(empId, type);
  },

  getLeavesByCriteria: async (filters = {}) => {
    let employees = await dataService.getEmployees();
    const allLeaves = await dataService.getLeaveRequests();
    
    if (filters.managerId) {
      employees = employees.filter(e => e.managerId === Number(filters.managerId));
    }
    if (filters.departments && filters.departments.length > 0) {
      employees = employees.filter(e => filters.departments.includes(e.department));
    }
    if (filters.empId && filters.empId !== 'all') {
      employees = employees.filter(e => e.id === Number(filters.empId));
    }

    const empIds = employees.map(e => e.id);
    let filtered = allLeaves.filter(l => empIds.includes(l.emp_id || l.empId));
    
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      filtered = filtered.filter(l => {
        const lStart = new Date(l.start_date || l.startDate);
        return lStart >= start && lStart <= end;
      });
    }
    return { leaves: filtered, employees };
  },

  getPersonalAdvances: async (userId) => {
    const all = await dataService.getAdvanceHistory();
    return all.filter(a => Number(a.empId) === Number(userId));
  },

  getPersonalExpenses: async (userId) => {
    const all = await dataService.getExpenses();
    return all.filter(e => Number(e.emp_id || e.empId) === Number(userId));
  },

  getPersonalNotices: async (userId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('notices').select('data').order('id', { ascending: false });
    const all = (data || []).map(r => r.data);
    return all.filter(n => !n.targetUserId || String(n.targetUserId) === String(userId));
  },

  getSalaryByMonth: async (month, year) => {
    const history = await dataService.getPayrollHistory();
    return history.filter(h => h.month === month && h.year === year);
  },

  // ── Other Records ─────────────────────────────────────────────────────

  getExitRecords: async () => sbGetAll('exit_records'),
  saveExitRecords: async (list) => sbSaveAll('exit_records', list),

  getTrainingRecords: async () => sbGetAll('training_records'),
  saveTrainingRecords: async (list) => sbSaveAll('training_records', list),

  getCandidates: async () => sbGetAll('candidates'),
  saveCandidates: async (list) => sbSaveAll('candidates', list),

  getLetterTemplates: async () => sbGetAll('letter_templates'),
  saveLetterTemplates: async (list) => sbSaveAll('letter_templates', list),

  // ── Employee Vault Documents ───────────────────────────────────────────
  // Primary storage: Supabase app_config with key='vault_{empId}' (cross-device, cross-session)
  // Secondary/cache: localStorage with key='vault_{empId}' (instant read, survives network issues)
  // localStorage is PRESERVED across logout and version updates (see App.jsx)

  getEmployeeDocs: async (empId = null) => {
    const localRead = (key) => {
      try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
      catch { return []; }
    };
    const localWrite = (key, docs) => {
      try { localStorage.setItem(key, JSON.stringify(docs)); } catch { }
    };

    if (empId) {
      const localKey = `vault_${empId}`;
      try {
        // 1. Read from Supabase (source of truth, cross-device)
        const remoteDocs = await getConfig(localKey, null);
        if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
          localWrite(localKey, remoteDocs); // Update local cache
          return remoteDocs;
        }
      } catch (e) { console.warn('getEmployeeDocs Supabase read failed, using localStorage'); }
      // 2. Fallback: localStorage cache
      return localRead(localKey);
    }
    // All employees: scan localStorage
    const allDocs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vault_')) allDocs.push(...localRead(key));
    }
    return allDocs;
  },

  addEmployeeDoc: async (doc) => {
    const localKey = `vault_${String(doc.empId)}`;
    const newDoc = {
      id: `DOC_${Date.now()}`,
      empId: String(doc.empId),
      name: doc.name || 'Document',
      size: doc.size || 0,
      type: doc.type || 'application/octet-stream',
      content: doc.content || '',
      category: doc.category || 'General',
      docType: doc.docType || 'Document',
      status: doc.status || 'Active',
      uploadedBy: doc.uploadedBy || 'HR Admin',
      version: doc.version || 1,
      createdAt: new Date().toISOString()
    };

    // Step 1: Read existing from localStorage (fast)
    let existing = [];
    try { const r = localStorage.getItem(localKey); existing = r ? JSON.parse(r) : []; }
    catch { existing = []; }
    if (!Array.isArray(existing)) existing = [];
    const updated = [...existing, newDoc];

    // Step 2: Write to localStorage immediately (instant UI update)
    localStorage.setItem(localKey, JSON.stringify(updated));
    console.log(`Vault: ${newDoc.id} cached in localStorage for emp ${doc.empId}`);

    // Step 3: AWAIT Supabase Storage & Config save
    if (supabase) {
      try {
        let finalDoc = { ...newDoc };
        // If there's content (base64), upload it to Storage instead of DB
        if (doc.content && doc.content.startsWith('data:')) {
          console.log(`Vault: Uploading file for ${newDoc.id} to Supabase Storage...`);
          const { path, url } = await storageUploadBase64('vault', doc.content, newDoc.name, newDoc.type);
          finalDoc.content = url; // Replace base64 with signed URL
          finalDoc.storagePath = path; // Store the actual storage path
          console.log(`Vault: Storage upload success for ${newDoc.id}`);
        }

        // Update local and remote with the URL version
        const updatedWithUrl = updated.map(d => d.id === newDoc.id ? finalDoc : d);
        localStorage.setItem(localKey, JSON.stringify(updatedWithUrl));
        
        const saved = await saveConfig(localKey, updatedWithUrl);
        if (saved) {
          console.log(`Vault: ${newDoc.id} persisted to Supabase successfully.`);
        } else {
          console.error(`Vault: Supabase config save FAILED for ${newDoc.id}.`);
        }
      } catch (err) {
        console.error(`Vault: Critical upload failure for ${newDoc.id}:`, err.message);
      }
    }
  },

  deleteEmployeeDoc: async (docId, empId) => {
    if (!empId) throw new Error('empId required to delete document');
    const localKey = `vault_${String(empId)}`;
    let existing = [];
    try { const r = localStorage.getItem(localKey); existing = r ? JSON.parse(r) : []; }
    catch { existing = []; }
    const updated = existing.filter(d => String(d.id) !== String(docId));
    localStorage.setItem(localKey, JSON.stringify(updated));
    if (supabase) saveConfig(localKey, updated).catch(e => console.warn('Vault delete sync:', e));
  },


  getStatutoryUpdates: async () => sbGetAll('statutory_updates'),
  saveStatutoryUpdates: async (list) => sbSaveAll('statutory_updates', list),

  getComplianceManuals: async () => sbGetAll('compliance_manuals'),
  saveComplianceManuals: async (list) => sbSaveAll('compliance_manuals', list),

  getBudgetUtilization: async (dept) => {
    if (!supabase) return 0;
    const reqs = await dataService.getManpowerRequests();
    return reqs
      .filter(r => r.department === dept && (r.status === 'Approved' || r.status === 'Auto-Approved'))
      .reduce((sum, r) => sum + (Number(r.proposedCTC) || 0), 0);
  },


  getSalaryStructure: async (empId) => {
    if (!supabase) return null;
    const { data } = await supabase.from('salary_structures_ext').select('data').eq('emp_id', empId).maybeSingle();
    return data ? data.data : null;
  },

  saveSalaryStructure: async (empId, structData) => {
    if (!supabase) return;
    try {
      const snapshot = { ...structData, empId: String(empId), lastUpdated: new Date().toISOString() };
      // Use upsert so it works for both new and existing employees
      const { error } = await supabase.from('salary_structures_ext').upsert({
        emp_id: String(empId),
        data: snapshot
      }, { onConflict: 'emp_id' });
      if (error) throw error;
    } catch (err) {
      console.error('Exception in saveSalaryStructure:', err);
      throw err;
    }
  },

  getFeedback: async (empId, type) => {
    if (!supabase) return null;
    const { data } = await supabase.from('feedback_records').select('data')
      .eq('emp_id', empId)
      .eq('data->>reviewType', type)
      .maybeSingle();
    return data ? data.data : null;
  },

  saveFeedback: async (submission) => {
    if (!supabase) return;
    const id = `FB_${Date.now()}`;
    await supabase.from('feedback_records').insert({
      id,
      emp_id: submission.empId,
      data: submission,
      created_at: new Date().toISOString()
    });
  },

  getFeedbackHistory: async (empId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('feedback_records').select('data')
      .eq('emp_id', empId)
      .order('created_at', { ascending: false });
    return (data || []).map(r => r.data);
  },

  savePayrollSnapshot: async (data) => {
    if (!supabase) return;
    const id = `PAY_${data.year}_${data.month}_${data.empId}`;
    await supabase.from('payroll_history').upsert({ 
      id, 
      data, 
      created_at: new Date().toISOString() 
    }, { onConflict: 'id' });
  },

  getLeaveAnalytics: (leaves) => {
    const stats = { 
      statusBreakdown: { Approved: 0, Pending: 0, Rejected: 0 }, 
      typeDistribution: {}, 
      monthlyTrend: {}, 
      totalDays: 0 
    };
    
    leaves.forEach(l => {
      // Status
      if (stats.statusBreakdown[l.status] !== undefined) {
        stats.statusBreakdown[l.status]++;
      }
      
      if (l.status === 'Approved') {
        // Type
        stats.typeDistribution[l.type] = (stats.typeDistribution[l.type] || 0) + 1;
        // Days
        stats.totalDays += (Number(l.days) || 0);
        // Trend
        const date = new Date(l.start_date || l.startDate);
        const month = date.toLocaleString('default', { month: 'short' });
        stats.monthlyTrend[month] = (stats.monthlyTrend[month] || 0) + 1;
      }
    });
    return stats;
  },

  getReportRangeData: (empId, start, end, attendanceMap) => {
    const results = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = curr.getMonth();
      const d = curr.getDate();
      const key = `${empId}_${y}_${m}_${d}`;
      const dayName = curr.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = curr.toISOString().split('T')[0];
      
      results.push({
        date: dateStr,
        dayName,
        log: attendanceMap[key] || null
      });
      curr.setDate(curr.getDate() + 1);
    }
    return results;
  },



  getBiometricConfig: async () => dataService.getBiometricConfig(),
  saveBiometricConfig: async (config) => dataService.saveBiometricConfig(config)
};

import { supabase } from './supabaseClient';

// ── Generic Supabase Helpers (Pure Supabase, No localStorage) ───────────

// Fetches all rows from a table where data is stored in a JSONB 'data' column
const sbGetAll = async (table, defaultVal = []) => {
  if (!supabase) return defaultVal;
  try {
    const { data, error } = await supabase.from(table).select('data').order('created_at', { ascending: false });
    if (error) { console.error(`sbGetAll(${table}):`, error); return defaultVal; }
    return data.map(r => r.data);
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
    const { data, error } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
    if (error) return defaultVal;
    return data ? data.value : defaultVal;
  } catch (e) { return defaultVal; }
};

const saveConfig = async (key, value) => {
  if (!supabase) return;
  try {
    await supabase.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() });
  } catch (e) { console.error(`saveConfig(${key}):`, e); }
};

export const dataService = {
  // ── Employees ─────────────────────────────────────────────────────────────
  getEmployees: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('employees').select('id, data').order('id');
    if (error) return [];
    return data.map(r => r.data || { id: r.id });
  },

  getEmployeeById: async (id) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('employees').select('data').eq('id', id).maybeSingle();
    return (data && data.data) ? data.data : null;
  },

  saveEmployee: async (empData) => {
    if (!supabase) return empData;
    const id = empData.id || Date.now();
    const row = {
      id,
      name: empData.name || '',
      email: empData.email || '',
      emp_code: empData.empCode || '',
      designation: empData.designation || '',
      department: empData.department || '',
      status: empData.status || 'Active',
      data: { ...empData, id }
    };
    await supabase.from('employees').upsert(row);
    return row.data;
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
    await supabase.from('employees').delete().eq('id', id);
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

  getPersonalAttendanceTrajectory: async (userId) => {
    if (!supabase) return [];
    const { data } = await supabase.from('attendance')
      .select('date, punch_in')
      .eq('emp_id', userId)
      .order('date', { ascending: false })
      .limit(5);
    
    return (data || []).reverse().map(r => ({
      day: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }),
      present: r.punch_in ? 1 : 0
    }));
  },

  getAttendance: async () => {
    if (!supabase) return {};
    const { data } = await supabase.from('attendance').select('*');
    const map = {};
    (data || []).forEach(r => {
      map[r.id] = {
        punchIn: r.punch_in,
        punchOut: r.punch_out,
        remark: r.remark,
        source: r.source
      };
    });
    return map;
  },

  saveAttendance: async (records) => {
    if (!supabase) return;
    const rows = Object.entries(records).map(([id, rec]) => {
      const parts = id.split('_'); // empId_year_month_day
      const emp_id = parts[0];
      const date = new Date(parts[1], parts[2], parts[3]).toISOString().split('T')[0];
      return {
        id,
        emp_id,
        date,
        punch_in: rec.punchIn,
        punch_out: rec.punchOut,
        remark: rec.remark,
        source: rec.source,
        updated_at: new Date().toISOString()
      };
    });
    // Upsert in chunks to avoid URL length limits or payload issues if many records
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('attendance').upsert(rows.slice(i, i + 100));
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
    const rows = reqs.map(r => ({
      id: r.id || Date.now() + Math.random(),
      emp_id: r.emp_id || r.empId,
      type: r.type,
      start_date: r.start_date || r.startDate,
      end_date: r.end_date || r.endDate,
      reason: r.reason,
      status: r.status,
      data: r
    }));
    await supabase.from('leave_requests').upsert(rows);
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
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  saveNotices: async (notices) => {
    if (!supabase) return notices;
    const rows = notices.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type || 'General',
      priority: n.priority || 'Normal',
      author: n.author,
      date: n.date,
      data: n
    }));
    await supabase.from('notices').upsert(rows);
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
    // Placeholder: In a real app, use supabase.storage.from('policies').upload(...)
    console.log("Mock file upload:", file.name);
    return `/mock-storage/policies/${file.name}`;
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
  saveAdvanceHistory: async (history) => sbSaveAll('advances', history),

  getPayrollHistory: async () => sbGetAll('payroll_history'),
  savePayrollHistory: async (history) => sbSaveAll('payroll_history', history),

  getManpowerRequests: async () => sbGetAll('recruitment_requests'),
  saveManpowerRequests: async (reqs) => sbSaveAll('recruitment_requests', reqs),
  
  getDeptBudgets: async () => getConfig('dept_budgets', {}),
  saveDeptBudgets: async (budgets) => saveConfig('dept_budgets', budgets),

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
    await supabase.from('projects').update({ status: newStatus }).eq('id', id);
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
  getBiometricConfig: async () => getConfig('biometric_config', { ip: '192.168.1.201', port: '4370' }),
  saveBiometricConfig: async (conf) => saveConfig('biometric_config', conf),

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
    const all = await dataService.getNotices();
    return all.filter(n => !n.data?.targetUserId || n.data.targetUserId === Number(userId));
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

  getEmployeeDocs: async (empId = null) => {
    if (!supabase) return [];
    let query = supabase.from('employee_docs').select('data');
    if (empId) query = query.eq('emp_id', empId);
    const { data } = await query;
    return (data || []).map(r => r.data);
  },

  addEmployeeDoc: async (doc) => {
    if (!supabase) return;
    const id = `DOC_${Date.now()}`;
    const record = { ...doc, id, uploadDate: new Date().toISOString() };
    await supabase.from('employee_docs').insert({ id, emp_id: doc.empId, data: record });
  },

  getStatutoryUpdates: async () => sbGetAll('statutory_updates'),
  saveStatutoryUpdates: async (list) => sbSaveAll('statutory_updates', list),

  getComplianceManuals: async () => sbGetAll('compliance_manuals'),
  saveComplianceManuals: async (list) => sbSaveAll('compliance_manuals', list),

  getManpowerRequests: async () => sbGetAll('manpower_requests'),
  saveManpowerRequests: async (list) => sbSaveAll('manpower_requests', list),

  getDeptBudgets: async () => sbGetAll('dept_budgets'),
  saveDeptBudgets: async (list) => sbSaveAll('dept_budgets', list),

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
    const snapshot = { ...structData, lastUpdated: new Date().toISOString() };
    await supabase.from('salary_structures_ext').upsert({
      emp_id: empId,
      data: snapshot,
      last_updated: new Date().toISOString()
    });
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
    await supabase.from('payroll_history').upsert({ id, data, created_at: new Date().toISOString() });
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



  getBiometricConfig: async () => {
    return await getConfig('biometric', { ip: '192.168.1.201', port: '4370', isEnabled: true });
  },

  saveBiometricConfig: async (config) => {
    if (!supabase) return;
    await supabase.from('app_config').upsert({ key: 'biometric', value: config, updated_at: new Date().toISOString() });
  }
};

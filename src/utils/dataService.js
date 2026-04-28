import { supabase } from './supabaseClient';

const KEYS = {
  ATTENDANCE: 'hrms_attendance_records',
  LEAVES:     'hrms_leave_balances',
  EMPLOYEES:  'hrms_employees_list',
  NOTICES:    'hrms_notices_board',
  HOLIDAYS:   'hrms_custom_holidays',
  BIO_CONFIG: 'hrms_biometric_config',
  LEAVE_RECS: 'hrms_leave_requests',
  ADVANCE_HISTORY: 'hrms_advance_history',
  PAYROLL_HISTORY: 'hrms_payroll_history',
  DEPT_BUDGETS: 'hrms_dept_budgets',
  MANPOWER_REQUESTS: 'hrms_manpower_requests',
  APPROVAL_LOGS: 'hrms_approval_logs',
  EXPENSES: 'hrms_expenses_ledger',
  EXITS: 'hrms_exit_records',
  GRATUITY_CONFIG: 'hrms_gratuity_config',
  HANDOVER_CONFIG: 'hrms_handover_config',
  BONUS_CONFIG: 'hrms_bonus_config',
  BONUS_PAYMENTS: 'hrms_bonus_payments',
  POLICIES: 'hrms_policies',
  POLICY_ACKS: 'hrms_policy_acks',
  USERS: 'hrms_users',
  INIT_GUARD: 'hrms_init_guard',
  AUTH_LOGS: 'hrms_auth_logs',
  LOGIN_ATTEMPTS: 'hrms_login_attempts',
  SALARY_STRUCTURES: 'hrms_salary_structures',
  TRAINING_RECORDS: 'hrms_training_records',
  INDUCTION_TASKS: 'hrms_induction_tasks',
  FEEDBACK_RECS: 'hrms_feedback_records',
  STATUTORY_UPDATES: 'hrms_statutory_updates',
  COMPLIANCE_MANUALS: 'hrms_compliance_manuals',
  LETTER_TEMPLATES: 'hrms_letter_templates',
  CANDIDATES: 'hrms_candidates',
  EMPLOYEE_DOCS: 'hrms_employee_docs',
  DEPARTMENTS: 'hrms_departments_list'
};

const getJSON = (key, def = {}) => {
  const saved = localStorage.getItem(key);
  try { return saved ? JSON.parse(saved) : def; } catch (e) { return def; }
};

const saveJSON = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const dataService = {
  // ── Sync Helper (Internal) ────────────────────────────────────────────────
  _getLocalJSON: getJSON,

  // ── Employees ─────────────────────────────────────────────────────────────
  getEmployees: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('employees').select('*');
      if (!error) return data;
      console.error('Supabase Error:', error);
    }
    return getJSON(KEYS.EMPLOYEES, []);
  },

  getEmployeeById: async (id) => {
    if (supabase) {
      const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
      if (!error) return data;
    }
    const employees = getJSON(KEYS.EMPLOYEES, []);
    return employees.find(e => String(e.id) === String(id));
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  getAttendance: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('attendance').select('*');
      if (!error) return data;
    }
    return getJSON(KEYS.ATTENDANCE, {});
  },

  getTodayAttendanceStatus: async (userId) => {
    if (supabase) {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('attendance').select('*').eq('emp_id', userId).eq('date', today).single();
      if (!error && data) return data;
    }
    const now = new Date();
    const key = `${userId}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    const records = getJSON(KEYS.ATTENDANCE);
    return records[key] || { punchIn: null, punchOut: null, status: 'Not Marked' };
  },
  
  saveAttendance: async (records) => {
    saveJSON(KEYS.ATTENDANCE, records);
  },

  // ── Leave Management ──────────────────────────────────────────────────────
  getLeaveRequests: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('leave_requests').select('*, employees(name)');
      if (!error) return data;
    }
    return getJSON(KEYS.LEAVE_RECS, []);
  },

  getLeaveBalances: async () => {
    return getJSON(KEYS.LEAVES, {});
  },


  // ── Notices ─────────────────────────────────────────────────────────────
  getNotices: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (!error) return data;
    }
    return getJSON(KEYS.NOTICES, []);
  },

  saveNotices: async (notices) => {
    saveJSON(KEYS.NOTICES, notices);
  },

  getPolicies: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('policies').select('*').order('created_at', { ascending: false });
      if (!error) return data;
    }
    return getJSON(KEYS.POLICIES, [
      { id: 'POL-001', title: 'Code of Conduct v2.0', category: 'Compliance', uploadDate: '2026-01-15', effectiveDate: '2026-01-01', summary: 'Standard professional ethics and workplace behavior.', version: '2.0', status: 'Active' },
      { id: 'POL-002', title: 'Work From Home Policy', category: 'IT Policies', uploadDate: '2026-02-10', effectiveDate: '2026-02-15', summary: 'Guidelines for remote work eligibility and security.', version: '1.2', status: 'Active' },
      { id: 'POL-003', title: 'Prevention of Sexual Harassment (POSH)', category: 'Legal', uploadDate: '2025-12-01', effectiveDate: '2026-01-01', summary: 'Safety and grievance redressal for workplace harassment.', version: '3.0', status: 'Active' }
    ]);
  },

  savePolicies: async (policies) => {
    saveJSON(KEYS.POLICIES, policies);
  },

  // ── Holidays ─────────────────────────────────────────────────────────────
  getCustomHolidays: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: true });
      if (!error) return data;
    }
    return getJSON(KEYS.HOLIDAYS, []);
  },

  uploadPolicyFile: async (file) => {
    if (supabase) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('policies')
        .upload(fileName, file);

      if (error) {
        console.error('Upload Error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('policies')
        .getPublicUrl(fileName);

      return publicUrl;
    }
    // Fallback if no Supabase (mocking URL)
    return URL.createObjectURL(file);
  },



  getPersonalAttendanceTrajectory: (userId) => {
    const records = getJSON(KEYS.ATTENDANCE, {});
    const last5Days = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const key = `${userId}_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
      last5Days.push({
        day,
        present: (records[key] && records[key].punchIn) ? 1 : 0
      });
    }
    return last5Days;
  },

  getDashboardStats: async () => {
    const emps = (await dataService.getEmployees()).filter(e => e.status !== 'Inactive');
    const totalEmployees = emps.length;
    const leaveRequests = await dataService.getLeaveRequests();
    const attendance = await dataService.getAttendance();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const todayStr = now.toISOString().split('T')[0];

    let presentToday = 0;
    let onLeave = 0;

    emps.forEach(emp => {
      const key = `${emp.id}_${year}_${month}_${day}`;
      if (attendance[key] && attendance[key].punchIn) {
        presentToday++;
      }
      const leave = leaveRequests.find(l => 
        l.empId === emp.id && 
        l.status === 'Approved' && 
        todayStr >= l.startDate && 
        todayStr <= l.endDate
      );
      if (leave) onLeave++;
    });

    return { totalEmployees, presentToday, onLeave };
  },

  // ── Leaves ─────────────────────────────────────────────────────────────────
  getLeaveBalances: () => getJSON(KEYS.LEAVES, {}),

  getEmployeeBalance: (empId, type = 'total') => {
    const bals = dataService.getLeaveBalances()[empId] || { Sick: 0, Casual: 0, Paid: 0 };
    if (type === 'total') return Object.values(bals).reduce((a, b) => a + b, 0);
    return bals[type] || 0;
  },

  updateLeaveBalance: (empId, newBalance) => {
    const bals = dataService.getLeaveBalances();
    bals[empId] = newBalance;
    saveJSON(KEYS.LEAVES, bals);
  },

  // ── Leave Requests ─────────────────────────────────────────────────────────
  getLeaveRequests: async () => {
    if (supabase) {
      const { data, error } = await supabase.from('leave_requests').select('*, employees(name)');
      if (!error) return data;
    }
    return getJSON(KEYS.LEAVE_RECS, []);
  },

  saveLeaveRequests: async (reqs) => saveJSON(KEYS.LEAVE_RECS, reqs),

  getReportRangeData: (empId, startDate, endDate, attendance) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];
    
    // Iterate day by day
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate();
        const key = `${empId}_${year}_${month}_${day}`;
        const log = attendance[key] || null;
        
        results.push({
            date: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            log: log
        });
    }
    return results;
  },


  // ── Probation Alerts ──────────────────────────────────────────────
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


  // ── Biometrics ─────────────────────────────────────────────────────
  getBiometricConfig: () => getJSON(KEYS.BIO_CONFIG, {
    ip: '192.168.1.201',
    port: '4370',
    deviceName: 'Identix Main Hub',
    protocol: 'TCP/IP (UDP Pull)'
  }),

  saveBiometricConfig: (config) => saveJSON(KEYS.BIO_CONFIG, config),



  getLeavesByCriteria: async (filters = {}) => {
    let employees = await dataService.getEmployees();
    const allLeaves = await dataService.getLeaveRequests();
    
    // 1. Filter employees by scope
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
    
    // 2. Filter leaves by those employees and date range
    let filtered = allLeaves.filter(l => empIds.includes(l.empId));
    
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      filtered = filtered.filter(l => {
        const lStart = new Date(l.startDate);
        return lStart >= start && lStart <= end;
      });
    }

    return {
      leaves: filtered,
      employees: employees
    };
  },

  getLeaveAnalytics: (leaves) => {
    const stats = {
      typeDistribution: {},
      statusBreakdown: { Approved: 0, Pending: 0, Rejected: 0 },
      monthlyTrend: {}, // { "Jan": 5, "Feb": 2 ... }
      totalDays: 0
    };

    leaves.forEach(l => {
      // Type Dist
      stats.typeDistribution[l.type] = (stats.typeDistribution[l.type] || 0) + 1;
      // Status
      stats.statusBreakdown[l.status] = (stats.statusBreakdown[l.status] || 0) + 1;
      // Trend
      const month = new Date(l.startDate).toLocaleString('default', { month: 'short' });
      stats.monthlyTrend[month] = (stats.monthlyTrend[month] || 0) + l.days;
      // Total
      if (l.status === 'Approved') stats.totalDays += l.days;
    });

    return stats;
  },

  // ── Advances & Loans ─────────────────────────────────────────────────
  getAdvanceHistory: () => getJSON(KEYS.ADVANCE_HISTORY, []),

  saveAdvanceHistory: (history) => saveJSON(KEYS.ADVANCE_HISTORY, history),

  // ── Payroll ──────────────────────────────────────────────────────────
  getPayrollHistory: () => getJSON(KEYS.PAYROLL_HISTORY, []),

  savePayrollHistory: (history) => saveJSON(KEYS.PAYROLL_HISTORY, history),

  getSalaryByMonth: (month, year) => {
    const history = dataService.getPayrollHistory();
    return history.filter(h => h.month === month && h.year === year);
  },

  // ── HR Budget & Hiring ───────────────────────────────────────────────
  getDeptBudgets: () => getJSON(KEYS.DEPT_BUDGETS, [
    { id: 1, department: 'Engineering', year: '2026', totalBudget: 5000000, type: 'Annual', buffer: 5 },
    { id: 2, department: 'Design', year: '2026', totalBudget: 1200000, type: 'Annual', buffer: 10 },
    { id: 3, department: 'Human Resources', year: '2026', totalBudget: 800000, type: 'Annual', buffer: 5 },
    { id: 4, department: 'Operations', year: '2026', totalBudget: 600000, type: 'Annual', buffer: 0 }
  ]),
  saveDeptBudgets: (list) => saveJSON(KEYS.DEPT_BUDGETS, list),

  getManpowerRequests: () => getJSON(KEYS.MANPOWER_REQUESTS, []),
  saveManpowerRequests: (list) => saveJSON(KEYS.MANPOWER_REQUESTS, list),

  getApprovalLogs: () => getJSON(KEYS.APPROVAL_LOGS, []),
  saveApprovalLogs: (list) => saveJSON(KEYS.APPROVAL_LOGS, list),

  getBudgetUtilization: async (department) => {
    const employees = (await dataService.getEmployees())
      .filter(e => e.department === department && e.status !== 'Inactive');
    
    let totalUtilized = 0;
    employees.forEach(e => {
       if (e.dayRate) {
          totalUtilized += (e.dayRate * 26 * 12);
       } else {
          totalUtilized += (e.grossSalary * 12);
       }
    });
    return totalUtilized;
  },

  // ── Expenses & Site Analytics ──────────────────────────────────────────
  getExpenses: () => getJSON(KEYS.EXPENSES, []),
  saveExpenses: (list) => saveJSON(KEYS.EXPENSES, list),

  deleteExpense: (id) => {
    const list = dataService.getExpenses().filter(e => e.id !== id);
    saveJSON(KEYS.EXPENSES, list);
    return list;
  },

  // ── Gratuity & Handover Configs ─────────────────────────────────────────
  getGratuityConfig: () => getJSON(KEYS.GRATUITY_CONFIG, {
    enabled: true,
    minYearsStandard: 5,
    enable48Rule: true,
    contractualEnabled: true,
    contractualMinYears: 1,
    applyToDeathDisability: true
  }),
  saveGratuityConfig: (conf) => saveJSON(KEYS.GRATUITY_CONFIG, conf),

  getHandoverMaster: () => getJSON(KEYS.HANDOVER_CONFIG, [
    { id: 'WK_01', category: 'Work', label: 'Knowledge Transfer Sessions', mandatory: true },
    { id: 'WK_02', category: 'Work', label: 'Project Files & Documentation', mandatory: true },
    { id: 'IT_01', category: 'IT', label: 'Laptop & Peripheral Return', mandatory: true },
    { id: 'IT_02', category: 'IT', label: 'Official Email Handover/Closure', mandatory: true },
    { id: 'AD_01', category: 'Admin', label: 'ID Card & Access Fobs', mandatory: true },
    { id: 'FN_01', category: 'Finance', label: 'Advance/Loan Settlements', mandatory: true }
  ]),
  saveHandoverMaster: (list) => saveJSON(KEYS.HANDOVER_CONFIG, list),

  addHandoverItem: (item) => {
    const list = dataService.getHandoverMaster();
    list.push({ ...item, id: `HO_${Date.now()}` });
    dataService.saveHandoverMaster(list);
    return list;
  },

  deleteHandoverItem: (id) => {
    const list = dataService.getHandoverMaster().filter(h => h.id !== id);
    dataService.saveHandoverMaster(list);
    return list;
  },

  // ── Exit & Off-boarding ──────────────────────────────────────────────
  getExitRecords: () => getJSON(KEYS.EXITS, []),
  
  saveExitRecords: (list) => saveJSON(KEYS.EXITS, list),

  deleteExitRecord: (id) => {
    const list = dataService.getExitRecords().filter(ex => ex.id !== id);
    saveJSON(KEYS.EXITS, list);
    return list;
  },

  completeFnFSystemProcess: (empId) => {
    // 1. Move to Inactive
    const emps = dataService.getEmployees();
    const eidx = emps.findIndex(e => e.id === empId);
    if(eidx > -1) {
      emps[eidx].status = 'Inactive';
      saveJSON(KEYS.EMPLOYEES, emps);
    }
    // 2. Mark Exit completed
    const exits = dataService.getExitRecords();
    const xidx = exits.findIndex(ex => ex.empId === empId);
    if(xidx > -1) {
      exits[xidx].status = 'Completed';
      exits[xidx].stage = 4;
      saveJSON(KEYS.EXITS, exits);
    }
  },

  saveEmployees: (list) => saveJSON(KEYS.EMPLOYEES, list),

  // ── Departments ─────────────────────────────────────────────────────
  getDepartments: () => getJSON(KEYS.DEPARTMENTS, ['Engineering', 'Product', 'Human Resources', 'Design', 'Operations', 'Finance', 'Production']),
  
  saveDepartments: (list) => saveJSON(KEYS.DEPARTMENTS, list),

  addDepartment: (name) => {
    const list = dataService.getDepartments();
    if (!list.includes(name)) {
      list.push(name);
      dataService.saveDepartments(list);
    }
    return list;
  },

  deleteDepartment: (name) => {
    const list = dataService.getDepartments().filter(d => d !== name);
    dataService.saveDepartments(list);
    return list;
  },

  // ── Bonus Management ────────────────────────────────────────────────
  getBonusConfig: () => getJSON(KEYS.BONUS_CONFIG, {
    enabled: true,
    eligibilityDays: 30,
    salaryThreshold: 21000,
    calculationCeiling: 7000,
    minWageOverride: 8500,
    bonusPercentage: 8.33
  }),
  saveBonusConfig: (conf) => saveJSON(KEYS.BONUS_CONFIG, conf),

  getBonusPayments: () => getJSON(KEYS.BONUS_PAYMENTS, []),
  saveBonusPayments: (list) => saveJSON(KEYS.BONUS_PAYMENTS, list),
  getAcknowledgments: () => getJSON(KEYS.POLICY_ACKS, []),
  
  saveAcknowledgment: (ack) => {
    const list = dataService.getAcknowledgments();
    list.push({ ...ack, timestamp: new Date().toISOString() });
    saveJSON(KEYS.POLICY_ACKS, list);
    return list;
  },

  deletePolicyById: (id) => {
    const policies = dataService.getPolicies();
    const filtered = policies.filter(p => p.id !== id);
    saveJSON(KEYS.POLICIES, filtered);
    return filtered;
  },

  // ── Scoped/Personal Data Fetchers ────────────────────────────────────
  getPersonalAdvances: async (userId) => {
    const all = await dataService.getAdvanceHistory();
    return all.filter(a => a.empId === Number(userId));
  },

  getPersonalExpenses: async (userId) => {
    const all = await dataService.getExpenses();
    return all.filter(e => e.empId === Number(userId));
  },

  getPersonalNotices: async (userId) => {
    const all = await dataService.getNotices();
    // Notices are public if no targetedUserId, or if specifically targeted
    return all.filter(n => !n.targetUserId || n.targetUserId === Number(userId));
  },

  // ── Identity & Access Management ──────────────────────────────────────
  getUsers: () => getJSON(KEYS.USERS, []),
  saveUsers: (list) => {
    // Critical Protection: Don't allow saving an explicitly empty list if it would trigger re-init
    if (!Array.isArray(list)) return;
    saveJSON(KEYS.USERS, list);
    // Set guard to prevent re-initialization if any users exist
    if (list.length > 0 && !localStorage.getItem(KEYS.INIT_GUARD)) {
      localStorage.setItem(KEYS.INIT_GUARD, 'true');
    }
  },

  getAuthLogs: () => getJSON(KEYS.AUTH_LOGS, []),
  saveAuthLogs: (list) => saveJSON(KEYS.AUTH_LOGS, list),

  addAuthLog: (action, user, details) => {
    const logs = dataService.getAuthLogs();
    logs.unshift({
      id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      user,
      details
    });
    // Keep only last 500 logs
    dataService.saveAuthLogs(logs.slice(0, 500));
  },

  getLoginAttempts: () => getJSON(KEYS.LOGIN_ATTEMPTS, {}),
  saveLoginAttempts: (attempts) => saveJSON(KEYS.LOGIN_ATTEMPTS, attempts),

  // ── Salary Structures (Snapshots/Database) ──────────────────────────
  getSalaryStructure: (empId) => {
    const all = getJSON(KEYS.SALARY_STRUCTURES, {});
    // Return latest if multiple versions exist, or just the stored object
    return all[empId] || null;
  },

  saveSalaryStructure: async (empId, data) => {
    const all = getJSON(KEYS.SALARY_STRUCTURES, {});
    // We snapshot the full object with a timestamp for audit tracking
    all[empId] = {
      ...data,
      lastUpdated: new Date().toISOString(),
      db_version: '1.0'
    };
    saveJSON(KEYS.SALARY_STRUCTURES, all);
    
    // Also update the main employee record's gross salary for backward compatibility in the directory
    if (data.targetSalary) {
      const emps = await dataService.getEmployees();
      const idx = emps.findIndex(e => e.id === Number(empId));
      if (idx > -1) {
        emps[idx].grossSalary = Number(data.targetSalary);
        dataService.saveEmployees(emps);
      }
    }
  },

  // ── Training & Induction ──────────────────────────────────────────
  getTrainingRecords: () => getJSON(KEYS.TRAINING_RECORDS, [
    { id: 1, type: 'Safety Training', time: '2 Hours', trainer: 'Dr. Ramesh Singh', date: '2026-04-10', attendeeIds: [1, 2, 4], attendeeNames: 'Alice, Bob, Diana' },
    { id: 2, type: 'POSH Orientation', time: '1.5 Hours', trainer: 'Adv. Meera Nair', date: '2026-04-12', attendeeIds: [3, 7], attendeeNames: 'Charlie, Frank' }
  ]),

  saveTrainingRecords: (list) => saveJSON(KEYS.TRAINING_RECORDS, list),

  getInductionTasks: (empId) => {
    const all = getJSON(KEYS.INDUCTION_TASKS, {});
    if (!all[empId]) {
      // Default template for new hires
      return [
        { id: 1, task: 'ID Card & Biometric Registration', status: 'Completed', owner: 'IT/Admin' },
        { id: 2, task: 'Safety Gear (PPE) Handover', status: 'Pending', owner: 'Operations' },
        { id: 3, task: 'HR Policy & POSH Briefing', status: 'Pending', owner: 'HR' },
        { id: 4, task: 'Bank Account & PF Form Submission', status: 'Pending', owner: 'Finance' }
      ];
    }
    return all[empId];
  },

  saveInductionTasks: (empId, tasks) => {
    const all = getJSON(KEYS.INDUCTION_TASKS, {});
    all[empId] = tasks;
    saveJSON(KEYS.INDUCTION_TASKS, all);
  },

  // ── Feedback & Performance ──────────────────────────────────────────
  getFeedback: (empId, type) => {
    const all = getJSON(KEYS.FEEDBACK_RECS, []);
    return all.find(f => f.empId === Number(empId) && f.reviewType === type) || null;
  },

  getFeedbackHistory: (empId) => {
    const all = getJSON(KEYS.FEEDBACK_RECS, []);
    return all.filter(f => f.empId === Number(empId)).sort((a,b) => new Date(b.reviewDate) - new Date(a.reviewDate));
  },

  saveFeedback: (data) => {
    const all = getJSON(KEYS.FEEDBACK_RECS, []);
    const idx = all.findIndex(f => f.empId === data.empId && f.reviewType === data.reviewType);
    
    const record = {
      ...data,
      id: idx > -1 ? all[idx].id : `FB_${Date.now()}`,
      reviewDate: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      isLocked: true // Enforcement: Submitted records are locked
    };

    if (idx > -1) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    saveJSON(KEYS.FEEDBACK_RECS, all);
    
    // Automatic Status/Probation Update Logic
    if (data.recommendation) {
      dataService.updateEmployeeStatusAfterFeedback(data.empId, data.recommendation, data.extensionPeriod);
    }

    return record;
  },

  updateEmployeeStatusAfterFeedback: (empId, recommendation, extensionVal) => {
    const emps = dataService.getEmployees();
    const idx = emps.findIndex(e => e.id === Number(empId));
    if (idx === -1) return;

    const emp = emps[idx];
    if (recommendation === 'Permanent') {
      emp.empType = 'Permanent';
    } else if (recommendation === 'Extend') {
      emp.empType = 'Probation';
      // If extensionVal is provided (e.g. "3 months"), we could update expiry dates here
      if (extensionVal) {
        emp.probPeriod = extensionVal;
      }
    } else if (recommendation === 'Rejected' || recommendation === 'Terminate') {
      emp.status = 'Inactive';
      emp.exitReason = 'Performance / Termination';
    } else if (recommendation === 'Release') {
      emp.status = 'Inactive';
      emp.exitReason = 'Released';
    }

    dataService.saveEmployees(emps);
  },

  deleteFeedback: (id) => {
    const all = getJSON(KEYS.FEEDBACK_RECS, []);
    const filtered = all.filter(f => f.id !== id);
    saveJSON(KEYS.FEEDBACK_RECS, filtered);
    return filtered;
  },

  // ── Statutory Compliance Hub ───────────────────────────────────────
  getStatutoryUpdates: () => {
    return getJSON(KEYS.STATUTORY_UPDATES, []);
  },

  saveStatutoryUpdates: (list) => saveJSON(KEYS.STATUTORY_UPDATES, list),

  saveStatutoryUpdate: (update) => {
    const list = dataService.getStatutoryUpdates();
    const idx = list.findIndex(u => u.id === update.id);
    let updatedList;
    if (idx > -1) {
      updatedList = list.map(u => u.id === update.id ? { ...u, ...update } : u);
    } else {
      updatedList = [...list, { ...update, id: Date.now() }];
    }
    dataService.saveStatutoryUpdates(updatedList);
    return updatedList;
  },

  deleteStatutoryUpdate: (id) => {
    const list = dataService.getStatutoryUpdates().filter(u => u.id !== id);
    dataService.saveStatutoryUpdates(list);
    return list;
  },

  getComplianceManuals: () => {
    let list = getJSON(KEYS.COMPLIANCE_MANUALS, []);
    if (list.length === 0) {
      list = [
        { 
          id: 'MAN_01', 
          category: 'PF', 
          title: 'EPF Master Handbook 2026 (Official)', 
          content: 'This manual covers all aspects of PF withdrawal, nominations, and UAN management. Key section 7 outlines the new 2026 withdrawal rules.',
          version: '4.2', 
          lastUpdated: '2026-03-20',
          previousVersions: [
            { version: '4.1', date: '2025-09-10', note: 'Last stable version' }
          ]
        },
        { 
          id: 'MAN_02', 
          category: 'ESIC', 
          title: 'ESIC Benefits & Claims Manual', 
          content: 'Detailed guide for HR admins to process sickness benefits and maternity claims. Includes updated ESIC discharge forms.',
          version: '3.0', 
          lastUpdated: '2026-02-15',
          previousVersions: []
        },
        { 
          id: 'MAN_03', 
          category: 'Labour Law', 
          title: 'Factories Act Compliance Guide', 
          content: 'Comprehensive handbook for workplace safety, working hours, and leave policy as per the revised Labour Code.',
          version: '1.5', 
          lastUpdated: '2026-01-10',
          previousVersions: [
            { version: '1.4', date: '2024-12-01', note: 'Old code reference' }
          ]
        }
      ];
      saveJSON(KEYS.COMPLIANCE_MANUALS, list);
    }
    return list;
  },

  saveComplianceManuals: (list) => saveJSON(KEYS.COMPLIANCE_MANUALS, list),

  saveComplianceManual: (manual) => {
    const list = dataService.getComplianceManuals();
    const idx = list.findIndex(m => m.id === manual.id);
    let updatedList;
    if (idx > -1) {
      // Versioning Logic: Move current version to previousVersions
      const current = list[idx];
      const newVersion = {
        ...manual,
        lastUpdated: new Date().toISOString().split('T')[0],
        previousVersions: [
          { version: current.version, date: current.lastUpdated, note: 'Replaced by system update' },
          ...(current.previousVersions || [])
        ]
      };
      updatedList = list.map(m => m.id === manual.id ? newVersion : m);
    } else {
      updatedList = [...list, { ...manual, previousVersions: [], lastUpdated: new Date().toISOString().split('T')[0] }];
    }
    dataService.saveComplianceManuals(updatedList);
    return updatedList;
  },

  // ── Extended CRUD Operations ────────────────────────────────────────
  saveEmployee: (empData) => {
    const list = dataService.getEmployees();
    const idx = list.findIndex(e => e.id === Number(empData.id));
    let savedEmp;
    let updatedList;
    if (idx > -1) {
      savedEmp = { ...list[idx], ...empData };
      updatedList = list.map(e => e.id === Number(empData.id) ? savedEmp : e);
    } else {
      const newId = list.length > 0 ? Math.max(...list.map(e => e.id)) + 1 : 1;
      savedEmp = { ...empData, id: newId };
      updatedList = [...list, savedEmp];
    }
    dataService.saveEmployees(updatedList);
    return savedEmp; // Return the saved object with the ID
  },

  deleteEmployee: (id) => {
    const list = dataService.getEmployees().filter(e => e.id !== Number(id));
    dataService.saveEmployees(list);
    return list;
  },

  savePayrollSnapshot: (snapshot) => {
    const history = dataService.getPayrollHistory();
    // Check if snapshot for this month/year already exists, if so update, else push
    const idx = history.findIndex(h => h.month === snapshot.month && h.year === snapshot.year && h.empId === snapshot.empId);
    let newHistory;
    if (idx > -1) {
      newHistory = history.map((h, i) => i === idx ? { ...h, ...snapshot } : h);
    } else {
      newHistory = [...history, { ...snapshot, id: Date.now() + Math.random() }];
    }
    dataService.savePayrollHistory(newHistory);
    return newHistory;
  },

  deletePolicy: (id) => {
    const list = dataService.getPolicies().filter(p => p.id !== id);
    dataService.savePolicies(list);
    return list;
  },

  saveBonusPayment: (payment) => {
    const list = dataService.getBonusPayments();
    list.push({ ...payment, id: `BON_${Date.now()}`, timestamp: new Date().toISOString() });
    dataService.saveBonusPayments(list);
    return list;
  },

  // ── Letters & Documents ─────────────────────────────────────────────
  getLetterTemplates: () => getJSON(KEYS.LETTER_TEMPLATES, [
    {
      id: 'template_offer',
      type: 'Offer Letter',
      subject: 'Offer of Employment - {{company_name}}',
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 40px; border: 1px solid #eee; background: #fff;">
          <h2 style="text-align: center; color: #1e293b; margin-bottom: 30px;">OFFER OF EMPLOYMENT</h2>
          <p style="text-align: right;">Date: ${new Date().toLocaleDateString()}</p>
          <p>To,<br/><strong>{{employee_name}}</strong></p>
          <p>Dear {{employee_name}},</p>
          <p>We are pleased to offer you the position of <strong>{{designation}}</strong> at <strong>{{company_name}}</strong>. We were impressed with your background and believe you will be a valuable asset to our {{department}} team.</p>
          <p>The details of your offer are as follows:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 10px;"><strong>Annual CTC:</strong> ₹{{salary}}</li>
              <li style="margin-bottom: 10px;"><strong>Expected Joining Date:</strong> {{joining_date}}</li>
              <li><strong>Location:</strong> Mumbai HQ</li>
            </ul>
          </div>
          <p>This offer is contingent upon successful background verification. Please signify your acceptance by signing a copy of this letter.</p>
          <p>Welcome aboard!</p>
          <p style="margin-top: 40px;">Sincerely,<br/><br/><strong>HR Department</strong><br/>{{company_name}}</p>
        </div>
      `
    },
    {
      id: 'template_appointment',
      type: 'Appointment Letter',
      subject: 'Letter of Appointment',
      content: `
        <div style="font-family: 'Times New Roman', serif; line-height: 1.8; padding: 40px; border: 1px solid #eee;">
          <h2 style="text-align: center; text-decoration: underline; color: #000;">APPOINTMENT LETTER</h2>
          <p style="text-align: right;">Date: ${new Date().toLocaleDateString()}</p>
          <p>To,<br/>{{employee_name}}<br/>{{designation}}</p>
          <p>Dear {{employee_name}},</p>
          <p>Further to your acceptance of our offer, we are pleased to appoint you as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department of {{company_name}} effective from <strong>{{joining_date}}</strong>.</p>
          <p>Your employment will be governed by the terms and conditions mentioned in the employee handbook and company policies.</p>
          <p>We look forward to a long and mutually beneficial association.</p>
          <div style="margin-top: 60px; display: flex; justify-content: space-between;">
            <div>
               <p>For {{company_name}},</p>
               <br/><br/>
               <p>____________________<br/>Authorized Signatory</p>
            </div>
            <div style="text-align: right;">
               <br/><br/><br/>
               <p>____________________<br/>Candidate Signature</p>
            </div>
          </div>
        </div>
      `
    }
  ]),
  saveLetterTemplates: (list) => saveJSON(KEYS.LETTER_TEMPLATES, list),

  getCandidates: () => getJSON(KEYS.CANDIDATES, [
    { id: 101, name: 'John Doe', email: 'john.doe@example.com', role: 'Full Stack Developer', department: 'Engineering', ctc: 1200000, status: 'Applied', date: '2026-04-10' },
    { id: 102, name: 'Jane Smith', email: 'jane.smith@example.com', role: 'UI Designer', department: 'Design', ctc: 900000, status: 'Selected', date: '2026-04-12' }
  ]),
  saveCandidates: (list) => saveJSON(KEYS.CANDIDATES, list),

  getEmployeeDocs: (empId = null) => {
    const all = getJSON(KEYS.EMPLOYEE_DOCS, []);
    return empId ? all.filter(d => d.empId === Number(empId)) : all;
  },
  saveEmployeeDocs: (list) => saveJSON(KEYS.EMPLOYEE_DOCS, list),

  addEmployeeDoc: (doc) => {
    const list = dataService.getEmployeeDocs();
    list.push({ ...doc, id: `DOC_${Date.now()}`, uploadDate: new Date().toISOString() });
    dataService.saveEmployeeDocs(list);
    return list;
  },

  getPresentDaysCount: (empId, month, year) => {
    const records = getJSON(KEYS.ATTENDANCE, {});
    let count = 0;
    Object.keys(records).forEach(key => {
      if (key.startsWith(`${empId}_${year}_${month}_`) && records[key].punchIn) {
        count++;
      }
    });
    return count;
  },

  getPersonalAttendanceSummary: async (userId, month, year) => {
    const present = dataService.getPresentDaysCount(userId, month, year);
    return {
      present,
      absent: 0,
      late: 0,
      total: 30
    };
  }
};

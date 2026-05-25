import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, FileText, UserPlus, ShieldAlert, MapPin, ArrowRight, UserCheck, Search, Shield, RefreshCw, Eye, Check, AlertTriangle, Filter, ArrowUpRight, HelpCircle } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { useNotification } from '../context/NotificationContext';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

const Approvals = () => {
  const { showNotification } = useNotification();
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [manpowerReqs, setManpowerReqs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [policy, setPolicy] = useState({
    option: 'B',
    maxHoursPerMonth: 8,
    approvalHierarchy: 'Direct Manager',
    workflowType: 'parallel',
    finalAuthorityId: '',
    adminVisibility: 'read-write'
  });
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloads, setReloads] = useState(0);

  // Profile & Role States
  const [managerProfile, setManagerProfile] = useState(null);
  const [myEmpId, setMyEmpId] = useState(null);
  const [simulatedNotifs, setSimulatedNotifs] = useState([]);

  // UI Filter / Tab States
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected, duty, pass, leaves, all
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Request for Detail Panel
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Modal States
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    requestId: null,
    status: '', // 'Approved', 'Rejected', 'Correction Needed'
    remarks: ''
  });
  const [adminActionModal, setAdminActionModal] = useState({
    isOpen: false,
    requestId: null,
    actionType: '', // 'Override_Approve', 'Override_Reject', 'Reassign', 'Escalate'
    targetManagerId: '',
    remarks: ''
  });

  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'management' || userRole === 'admin';

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Resolve manager's profile
        const myEmpProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
        if (myEmpProfile) {
          setManagerProfile(myEmpProfile);
          setMyEmpId(myEmpProfile.id);
        } else {
          setManagerProfile({
            id: currentUser?.id || 'admin_user',
            name: currentUser?.name || 'Administrator'
          });
          setMyEmpId(currentUser?.id || 'admin_user');
        }

        // 2. Fetch all collections
        const [hiring, leaves, emps, depts, activePolicy, auditLogs] = await Promise.all([
          dataService.getManpowerRequests().catch(() => []),
          dataService.getLeaveRequests().catch(() => []),
          dataService.getEmployees().catch(() => []),
          dataService.getDepartments().catch(() => []),
          dataService.getMovementPolicies().catch(() => null),
          dataService.getApprovalAuditTrail().catch(() => [])
        ]);

        setManpowerReqs(hiring);
        setRequests(leaves);
        setEmployees(emps);
        setDepartments(depts);
        setAuditTrail(auditLogs);
        
        if (activePolicy) {
          setPolicy(activePolicy);
        }

        // Load simulated notifications
        const notifs = JSON.parse(localStorage.getItem('simulated_notifications') || '[]');
        setSimulatedNotifs(notifs);

      } catch (err) {
        console.error("Failed to load approvals data:", err);
        showNotification("Error loading data from database.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloads, currentUser]);

  // Helper: Trigger and Log Simulated Notification
  const triggerNotification = (recipientName, role, message, type = 'info') => {
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      recipient: recipientName,
      role,
      message,
      type
    };
    const updated = [newNotif, ...simulatedNotifs].slice(0, 30);
    localStorage.setItem('simulated_notifications', JSON.stringify(updated));
    setSimulatedNotifs(updated);
    showNotification(message, type);
  };

  // Helper: Get employee department
  const getEmployeeDept = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    return emp ? emp.department : 'Unknown';
  };

  // Helper: Get manager list for an employee
  const getEmployeeManagers = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    if (!emp || !emp.managerIds) return [];
    return employees.filter(e => emp.managerIds.map(String).includes(String(e.id)));
  };

  // Helper: Check sequential/parallel pending status
  const getPendingManagersForRequest = (req) => {
    if (!['Pending', 'Escalated', 'Correction Needed', 'Awaiting Final Approval'].includes(req.status)) {
      return [];
    }

    if (req.status === 'Correction Needed') {
      return ['Employee'];
    }

    if (req.status === 'Escalated') {
      return ['Admin'];
    }

    if (policy.approvalHierarchy === 'Admin Only') {
      return ['Admin'];
    }

    if (policy.approvalHierarchy === 'Auto-Approve') {
      return [];
    }

    // Override by reassign
    if (req.data?.reassignedTo) {
      return [String(req.data.reassignedTo)];
    }

    if (req.status === 'Awaiting Final Approval') {
      return policy.finalAuthorityId ? [String(policy.finalAuthorityId)] : ['Admin'];
    }

    // Resolve employee managers
    const emp = employees.find(e => String(e.id) === String(req.emp_id || req.empId));
    const managerIds = emp?.managerIds || [];
    if (managerIds.length === 0) {
      return ['Admin'];
    }

    const history = req.data?.approvalHistory || req.approvalHistory || [];
    const approvedIds = history
      .filter(h => h.actionType === 'Approve' || h.actionType === 'Override' || h.status === 'Approved' || h.status === 'Awaiting Final Approval')
      .map(h => String(h.managerId));

    if (policy.workflowType === 'sequential') {
      // Find first manager who hasn't approved yet
      const nextId = managerIds.find(mId => !approvedIds.includes(String(mId)));
      if (nextId) {
        return [String(nextId)];
      } else {
        if (policy.finalAuthorityId && !approvedIds.includes(String(policy.finalAuthorityId))) {
          return [String(policy.finalAuthorityId)];
        }
        return [];
      }
    } else {
      // Parallel: any manager who hasn't approved yet
      const remaining = managerIds.filter(mId => !approvedIds.includes(String(mId)));
      if (remaining.length > 0) {
        return remaining.map(String);
      } else if (policy.finalAuthorityId && !approvedIds.includes(String(policy.finalAuthorityId))) {
        return [String(policy.finalAuthorityId)];
      }
      return [];
    }
  };

  // Helper: Check if request has SLA delay (> 48 hours)
  const getSLADuration = (req) => {
    const appliedStr = req.data?.appliedDate || req.start_date;
    if (!appliedStr) return 0;
    const diff = new Date() - new Date(appliedStr);
    return Math.floor(diff / (1000 * 60 * 60 * 24)); // returns days
  };

  // Resolve reporting reportees for non-admin managers
  const reporteeIds = useMemo(() => {
    if (isAdmin || !myEmpId) return [];
    return employees
      .filter(e => e.managerIds && e.managerIds.map(String).includes(String(myEmpId)))
      .map(e => String(e.id));
  }, [employees, isAdmin, myEmpId]);

  // Map and filter requests for hierarchy
  const scopedRequests = useMemo(() => {
    return requests.filter(req => {
      // Strict hierarchy restriction for managers
      if (!isAdmin && myEmpId) {
        const empIdStr = String(req.emp_id || req.empId);
        return reporteeIds.includes(empIdStr);
      }
      return true;
    }).map(l => {
      const emp = employees.find(e => String(e.id) === String(l.emp_id || l.empId));
      const pendingIds = getPendingManagersForRequest(l);
      const pendingNames = pendingIds.map(id => {
        if (id === 'Admin') return 'HR / Admin';
        if (id === 'Employee') return 'Employee';
        const mgr = employees.find(e => String(e.id) === String(id));
        return mgr ? mgr.name : 'Unknown Manager';
      });

      const appliedDate = l.data?.appliedDate || l.start_date || new Date().toISOString().split('T')[0];

      return {
        ...l,
        id: l.id,
        empName: l.employees?.name || l.data?.name || l.data?.empName || l.name || emp?.name || 'Unknown Employee',
        empId: l.emp_id || l.empId || l.data?.empId || l.data?.emp_id,
        department: emp?.department || l.data?.department || 'Unknown',
        role: emp?.role || 'Employee',
        duration: l.data?.duration || l.duration || (l.start_date && l.end_date ? `${l.start_date} - ${l.end_date}` : ''),
        appliedDate,
        pendingManagerIds: pendingIds,
        pendingManagerNames: pendingNames,
        isPendingWithMe: !isAdmin && myEmpId && pendingIds.includes(String(myEmpId)),
        slaDays: getSLADuration(l)
      };
    });
  }, [requests, employees, reporteeIds, isAdmin, myEmpId, policy]);

  // Main Filtered Dataset
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter(req => {
      // 1. Tab Filter
      if (activeTab === 'pending') {
        if (!['Pending', 'Escalated', 'Awaiting Final Approval'].includes(req.status)) return false;
      } else if (activeTab === 'approved') {
        if (!['Approved', 'Auto Approved'].includes(req.status)) return false;
      } else if (activeTab === 'rejected') {
        if (req.status !== 'Rejected') return false;
      } else if (activeTab === 'duty') {
        if (req.type !== 'Out Duty Request') return false;
      } else if (activeTab === 'pass') {
        if (req.type !== 'Out Pass Request') return false;
      } else if (activeTab === 'leaves') {
        if (req.type === 'Out Duty Request' || req.type === 'Out Pass Request') return false;
      }

      // 2. Employee Filter
      if (selectedEmployee !== 'All' && String(req.empId) !== String(selectedEmployee)) return false;

      // 3. Department Filter
      if (selectedDept !== 'All' && req.department !== selectedDept) return false;

      // 4. Status Filter
      if (selectedStatus !== 'All' && req.status !== selectedStatus) return false;

      // 5. Type Filter
      if (selectedType !== 'All') {
        if (selectedType === 'Out Duty' && req.type !== 'Out Duty Request') return false;
        if (selectedType === 'Out Pass' && req.type !== 'Out Pass Request') return false;
        if (selectedType === 'Leave' && (req.type === 'Out Duty Request' || req.type === 'Out Pass Request')) return false;
      }

      // 6. Date Filter
      const reqDate = req.start_date || req.data?.date || '';
      if (startDate && reqDate < startDate) return false;
      if (endDate && reqDate > endDate) return false;

      // 7. Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = req.empName.toLowerCase().includes(query);
        const matchesReason = (req.reason || '').toLowerCase().includes(query);
        const matchesDest = (req.data?.destination || '').toLowerCase().includes(query);
        if (!matchesName && !matchesReason && !matchesDest) return false;
      }

      return true;
    });
  }, [scopedRequests, activeTab, selectedEmployee, selectedDept, selectedStatus, selectedType, startDate, endDate, searchQuery]);

  // Dropdown Option Computations
  const employeeOptions = useMemo(() => {
    return isAdmin ? employees : employees.filter(e => reporteeIds.includes(String(e.id)));
  }, [employees, reporteeIds, isAdmin]);

  // Counters Computations
  const counters = useMemo(() => {
    const pendingList = scopedRequests.filter(r => ['Pending', 'Escalated', 'Awaiting Final Approval'].includes(r.status));
    return {
      pendingLeaves: pendingList.filter(r => r.type !== 'Out Duty Request' && r.type !== 'Out Pass Request').length,
      pendingOutDuty: pendingList.filter(r => r.type === 'Out Duty Request').length,
      pendingOutPass: pendingList.filter(r => r.type === 'Out Pass Request').length,
      totalPending: pendingList.length
    };
  }, [scopedRequests]);

  // Standard Manager Actions (Approve / Reject / Send Back)
  const handleActionClick = (requestId, status) => {
    setActionModal({
      isOpen: true,
      requestId,
      status,
      remarks: ''
    });
  };

  const handleConfirmAction = async () => {
    const { requestId, status, remarks } = actionModal;

    // Remarks validation: compulsory for Rejection and Send Back (Correction Needed)
    if ((status === 'Rejected' || status === 'Correction Needed' || status === 'Sent Back') && (!remarks || !remarks.trim())) {
      alert("Remarks are compulsory when rejecting a request or sending it back.");
      return;
    }

    try {
      setLoading(true);
      const req = requests.find(r => r.id === requestId);
      if (!req) throw new Error("Request not found");

      const managerName = managerProfile ? managerProfile.name : (currentUser?.name || 'Manager');
      const actionType = status === 'Correction Needed' || status === 'Sent Back' ? 'Send Back' : status;

      // Determine new status based on configuration
      let finalStatus = status;
      if (status === 'Approved') {
        const emp = employees.find(e => String(e.id) === String(req.emp_id || req.empId));
        const managerIds = emp?.managerIds || [];
        const history = req.data?.approvalHistory || [];
        
        // Count approvals so far
        const approvedCount = history.filter(h => h.actionType === 'Approve' || h.status === 'Approved').length + 1;

        if (policy.finalAuthorityId && String(policy.finalAuthorityId) !== String(myEmpId)) {
          // If a final authority is configured and I'm not it, transition to 'Awaiting Final Approval'
          finalStatus = 'Awaiting Final Approval';
        } else if (policy.workflowType === 'sequential' && approvedCount < managerIds.length && !policy.finalAuthorityId) {
          // In sequential, keep status 'Pending' until the last manager approves
          finalStatus = 'Pending';
        } else {
          finalStatus = 'Approved';
        }
      }

      const actionDetails = {
        status: finalStatus,
        managerId: myEmpId,
        managerName,
        remarks,
        actionType
      };

      await dataService.updateRequestWorkflowAction(requestId, actionDetails);
      setActionModal({ isOpen: false, requestId: null, status: '', remarks: '' });
      setSelectedRequest(null);
      
      // Trigger notification flows
      const emp = employees.find(e => String(e.id) === String(req.emp_id || req.empId));
      const empName = emp ? emp.name : 'Employee';

      if (finalStatus === 'Approved') {
        triggerNotification(empName, 'Employee', `Your request [${req.type}] has been Approved by manager ${managerName}.`, 'success');
      } else if (finalStatus === 'Rejected') {
        triggerNotification(empName, 'Employee', `Your request [${req.type}] was Rejected by manager ${managerName}. Reason: ${remarks}`, 'error');
      } else if (finalStatus === 'Correction Needed' || finalStatus === 'Sent Back') {
        triggerNotification(empName, 'Employee', `Your request [${req.type}] was Sent Back for Correction. Please review comments.`, 'warning');
      } else if (finalStatus === 'Awaiting Final Approval') {
        triggerNotification(empName, 'Employee', `Your request [${req.type}] was signed-off by manager ${managerName} and is awaiting Final Manager Approval.`, 'info');
        const finalAuthority = employees.find(e => String(e.id) === String(policy.finalAuthorityId));
        if (finalAuthority) {
          triggerNotification(finalAuthority.name, 'Manager', `New request pending final sign-off: [${req.type}] by ${empName}.`, 'info');
        }
      }

      setReloads(r => r + 1);
    } catch (err) {
      alert("Failed to confirm action: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin Override, Reassign, Escalate Actions
  const handleAdminActionClick = (requestId, actionType) => {
    // Check read-only settings
    if (policy.adminVisibility === 'read-only') {
      alert("Admin Approval Monitoring is configured as READ-ONLY in policy settings. Intervention is disabled.");
      return;
    }

    setAdminActionModal({
      isOpen: true,
      requestId,
      actionType,
      targetManagerId: '',
      remarks: ''
    });
  };

  const handleConfirmAdminAction = async () => {
    const { requestId, actionType, targetManagerId, remarks } = adminActionModal;

    if (!remarks || !remarks.trim()) {
      alert("Please provide audit remarks/comments for this admin intervention.");
      return;
    }

    if (actionType === 'Reassign' && !targetManagerId) {
      alert("Please select a target manager to reassign the request to.");
      return;
    }

    try {
      setLoading(true);
      const req = requests.find(r => r.id === requestId);
      if (!req) throw new Error("Request not found");

      const adminName = currentUser?.name || 'Administrator';
      
      let finalStatus = req.status;
      let actionDetails = {
        managerId: 'admin_override',
        managerName: `${adminName} (HR Override)`,
        remarks,
        actionType
      };

      if (actionType === 'Override_Approve') {
        finalStatus = 'Approved';
        actionDetails.status = 'Approved';
        actionDetails.actionType = 'Override Approve';
      } else if (actionType === 'Override_Reject') {
        finalStatus = 'Rejected';
        actionDetails.status = 'Rejected';
        actionDetails.actionType = 'Override Reject';
      } else if (actionType === 'Escalate') {
        finalStatus = 'Escalated';
        actionDetails.status = 'Escalated';
        actionDetails.escalationTime = new Date().toISOString();
        actionDetails.escalatedTo = 'Admin';
        actionDetails.actionType = 'Escalate';
      } else if (actionType === 'Reassign') {
        actionDetails.status = req.status;
        actionDetails.reassignedTo = targetManagerId;
        actionDetails.actionType = 'Reassign';
      }

      await dataService.updateRequestWorkflowAction(requestId, actionDetails);
      setAdminActionModal({ isOpen: false, requestId: null, actionType: '', targetManagerId: '', remarks: '' });
      setSelectedRequest(null);

      // Trigger notification flows
      const emp = employees.find(e => String(e.id) === String(req.emp_id || req.empId));
      const empName = emp ? emp.name : 'Employee';

      if (actionType === 'Override_Approve') {
        triggerNotification(empName, 'Employee', `HR Admin overridden and Approved your request [${req.type}].`, 'success');
      } else if (actionType === 'Override_Reject') {
        triggerNotification(empName, 'Employee', `HR Admin overridden and Rejected your request [${req.type}]. Reason: ${remarks}`, 'error');
      } else if (actionType === 'Escalate') {
        triggerNotification(empName, 'Employee', `Your request [${req.type}] has been Escalated to HR Administration for immediate action.`, 'warning');
        triggerNotification(adminName, 'Admin', `Escalation triggered for [${req.type}] by ${empName}. SLA exceeded.`, 'warning');
      } else if (actionType === 'Reassign') {
        const newMgr = employees.find(e => String(e.id) === String(targetManagerId));
        if (newMgr) {
          triggerNotification(newMgr.name, 'Manager', `Pending approval for [${req.type}] raised by ${empName} has been Reassigned to you.`, 'info');
          triggerNotification(empName, 'Employee', `Approval manager reassigned to ${newMgr.name} for your request.`, 'info');
        }
      }

      setReloads(r => r + 1);
    } catch (err) {
      alert("Admin intervention failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHiringAction = async (id, action) => {
    try {
      setLoading(true);
      const list = await dataService.getManpowerRequests();
      const updated = list.map(r => r.id === id ? { ...r, status: action } : r);
      await dataService.saveManpowerRequests(updated);
      triggerNotification('Admin', 'Admin', `Budget Override exception actioned [${action}].`, 'info');
      setReloads(r => r + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingHires = manpowerReqs.filter(r => r.status === 'Pending Approval');

  // Clear simulated notifications
  const handleClearNotifications = () => {
    localStorage.removeItem('simulated_notifications');
    setSimulatedNotifs([]);
    showNotification("Notification logs cleared.", "success");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedEmployee('All');
    setSelectedDept('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  if (loading && requests.length === 0) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ minHeight: '90vh', paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Shield size={32} color="var(--color-primary)" />
            Approvals & Workflow Control
          </h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
            {isAdmin ? 'Admin Approval Monitoring Panel — Full organizational override and reassignment visibility.' : 'Manager Suite — Action leave and movement requests from your reporting team.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
            <UserCheck size={14} /> Workflow: {policy.workflowType === 'sequential' ? 'Sequential' : 'Parallel'}
          </span>
          {policy.finalAuthorityId && (
            <span className="badge badge-success" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              Final Authority Configured
            </span>
          )}
          <button className="btn btn-outline" onClick={() => setReloads(r => r + 1)} style={{ padding: '0.5rem' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── MANAGER DASHBOARD COUNTERS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        <div className="card card-glass" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-warning)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '600' }}>Pending Leaves</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: '800' }}>{counters.pendingLeaves}</h3>
          </div>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--color-warning)' }}>
            <CalendarIcon size={24} />
          </div>
        </div>

        <div className="card card-glass" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-primary)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '600' }}>Pending Out Duty</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: '800' }}>{counters.pendingOutDuty}</h3>
          </div>
          <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
            <MapPin size={24} />
          </div>
        </div>

        <div className="card card-glass" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-success)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '600' }}>Pending Out Pass</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: '800' }}>{counters.pendingOutPass}</h3>
          </div>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--color-success)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="card card-glass text-white" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-danger)', borderLeft: '4px solid #b91c1c' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Total Pending Action</span>
            <h3 style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', fontWeight: '800', color: 'white' }}>{counters.totalPending}</h3>
          </div>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.75rem', borderRadius: '50%', color: 'white' }}>
            <AlertCircle size={24} />
          </div>
        </div>

      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="card-glass" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0.5rem 1rem', marginBottom: '1.5rem', gap: '0.5rem', overflowX: 'auto', borderRadius: '12px' }}>
        <button className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('pending')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Pending Action ({scopedRequests.filter(r => ['Pending', 'Escalated', 'Awaiting Final Approval'].includes(r.status)).length})
        </button>
        <button className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('approved')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Approved ({scopedRequests.filter(r => ['Approved', 'Auto Approved'].includes(r.status)).length})
        </button>
        <button className={`btn ${activeTab === 'rejected' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('rejected')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Rejected ({scopedRequests.filter(r => r.status === 'Rejected').length})
        </button>
        <button className={`btn ${activeTab === 'duty' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('duty')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Out Duty ({scopedRequests.filter(r => r.type === 'Out Duty Request').length})
        </button>
        <button className={`btn ${activeTab === 'pass' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('pass')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Out Pass ({scopedRequests.filter(r => r.type === 'Out Pass Request').length})
        </button>
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('leaves')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          Leaves ({scopedRequests.filter(r => r.type !== 'Out Duty Request' && r.type !== 'Out Pass Request').length})
        </button>
        <button className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('all')} style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
          All Requests ({scopedRequests.length})
        </button>
      </div>

      {/* ── FILTER MATRIX ── */}
      <div className="card card-glass" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-primary)', fontWeight: '600' }}>
          <Filter size={18} />
          <span>Filter & Search Approvals Matrix</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Employee</label>
            <select className="form-input" style={{ width: '100%' }} value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="All">All Employees</option>
              {employeeOptions.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select className="form-input" style={{ width: '100%' }} value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id || d} value={d.name || d}>{d.name || d}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Request Status</label>
            <select className="form-input" style={{ width: '100%' }} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Correction Needed">Correction Needed</option>
              <option value="Escalated">Escalated</option>
              <option value="Awaiting Final Approval">Awaiting Final Approval</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Movement Type</label>
            <select className="form-input" style={{ width: '100%' }} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Leave">Leaves</option>
              <option value="Out Duty">Out Duty (Official)</option>
              <option value="Out Pass">Out Pass (Personal)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" style={{ width: '100%' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" style={{ width: '100%' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', paddingLeft: '2.5rem' }} 
              placeholder="Search by name, reason, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={handleResetFilters}>Reset All Filters</button>
        </div>
      </div>

      {/* ── DUAL COLUMN GRID LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Requests List */}
        <div>
          {/* Manpower / Hiring Budget Overrides Required (Admins only) */}
          {isAdmin && pendingHires.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <ShieldAlert size={18} /> Budget Exception Overrides ({pendingHires.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingHires.map(req => (
                  <div key={req.id} className="card card-glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{req.role}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0' }}>{req.department} • Date: {req.date}</p>
                      </div>
                      <span className="badge badge-danger">Budget Breach</span>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Proposed CTC:</span>
                        <span style={{ fontWeight: '700' }}>{formatCurrency(req.proposedCTC)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                        <span>Breach Amount:</span>
                        <span style={{ fontWeight: '700' }}>+{formatCurrency(req.breachAmount)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleHiringAction(req.id, 'Rejected')}>Reject</button>
                      <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'white', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleHiringAction(req.id, 'Approved (Override)')}>Approve Override</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Requests List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Requests Queue ({filteredRequests.length})</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Showing filtered selection</span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="card card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-success)', opacity: 0.8 }} />
              <h3>All requests caught up!</h3>
              <p style={{ fontSize: '0.9rem' }}>No requests matching your filters were found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                const isSlaBreached = req.status === 'Pending' && req.slaDays >= 2;

                return (
                  <div 
                    key={req.id} 
                    className="card card-glass" 
                    style={{ 
                      padding: '1.25rem', 
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.02)' : '',
                      transition: 'all 0.2s ease',
                      borderColor: isSelected ? 'var(--color-primary)' : ''
                    }}
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="avatar" style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', fontWeight: '700', fontSize: '1rem' }}>
                          {req.empName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>{req.empName}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            {req.role} • <strong style={{ color: 'var(--color-text-main)' }}>{req.department}</strong>
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <span 
                          className={`badge`} 
                          style={{ 
                            fontSize: '0.7rem', 
                            backgroundColor: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                             req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                                             req.status === 'Correction Needed' ? 'rgba(59, 130, 246, 0.1)' : 
                                             'rgba(245, 158, 11, 0.1)',
                            color: req.status === 'Approved' ? 'var(--color-success)' : 
                                   req.status === 'Rejected' ? 'var(--color-danger)' : 
                                   req.status === 'Correction Needed' ? 'var(--color-primary)' : 
                                   'var(--color-warning)'
                          }}
                        >
                          {req.status === 'Correction Needed' ? 'Sent Back' : req.status}
                        </span>
                        
                        {/* SLA Breach Alert */}
                        {isSlaBreached && (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem', animation: 'pulse 2s infinite' }}>
                            SLA Breach ({req.slaDays} Days)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', backgroundColor: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Type</span>
                        <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FileText size={12} color="var(--color-primary)" /> {req.type}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Duration</span>
                        <span style={{ fontWeight: '600' }}>{req.duration}</span>
                      </div>

                      {req.data?.destination && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Location / Destination</span>
                          <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={12} /> {req.data.destination}
                          </span>
                        </div>
                      )}

                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.7rem' }}>Details</span>
                        <span style={{ fontStyle: 'italic' }}>"{req.reason || req.data?.purposeDetails || 'No description'}"</span>
                      </div>
                    </div>

                    {/* Pending Routing Hierarchy status */}
                    {['Pending', 'Escalated', 'Awaiting Final Approval'].includes(req.status) && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Pending With:</span>
                        <span style={{ fontWeight: '700', color: 'var(--color-warning)' }}>
                          {req.pendingManagerNames.join(', ') || 'Processing...'}
                        </span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detail & Workflow Timeline Panel */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={20} color="var(--color-primary)" /> Detail View
          </h2>

          {selectedRequest ? (
            <div className="card card-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Employee Detail Card */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <div className="avatar" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.2rem' }}>
                  {selectedRequest.empName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>{selectedRequest.empName}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    {selectedRequest.role} • {selectedRequest.department}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0 0' }}>
                    Employee ID: {selectedRequest.empId}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>Request Description</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div><strong>Type:</strong> {selectedRequest.type}</div>
                  <div><strong>Date/Time:</strong> {selectedRequest.duration}</div>
                  {selectedRequest.data?.outTime && (
                    <div><strong>Out Time:</strong> {selectedRequest.data.outTime} | <strong>Expected In:</strong> {selectedRequest.data.expectedInTime}</div>
                  )}
                  {selectedRequest.data?.destination && (
                    <div><strong>Destination:</strong> {selectedRequest.data.destination}</div>
                  )}
                  <div><strong>Reason:</strong> "{selectedRequest.reason || selectedRequest.data?.purposeDetails}"</div>
                  {selectedRequest.data?.attachment && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <a href={selectedRequest.data.attachment} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'inline-flex', gap: '0.25rem', color: 'var(--color-primary)' }}>
                        <FileText size={12} /> View Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Decision Widget */}
              {['Pending', 'Escalated', 'Awaiting Final Approval'].includes(selectedRequest.status) && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  
                  {/* Manager Action Lock (Sequential Flow Check) */}
                  {(!isAdmin && !selectedRequest.isPendingWithMe) ? (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--color-warning)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <div>
                        <strong>Sequential Flow Locked</strong>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem' }}>
                          This request is currently pending approval with: <strong>{selectedRequest.pendingManagerNames.join(', ')}</strong>. You must wait for their sign-off.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Manager Actions</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.85rem' }} onClick={() => handleActionClick(selectedRequest.id, 'Approved')}>
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'var(--color-danger)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.85rem' }} onClick={() => handleActionClick(selectedRequest.id, 'Rejected')}>
                          <XCircle size={14} /> Reject
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1, color: 'var(--color-primary)', borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.85rem' }} onClick={() => handleActionClick(selectedRequest.id, 'Correction Needed')}>
                          Send Back
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ADMIN OVERRIDE PANEL ── */}
                  {isAdmin && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Admin Intervention Panel</span>
                      
                      {policy.adminVisibility === 'read-only' ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>
                          * Monitoring mode is currently Read-Only. Intervention actions are disabled.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button className="btn btn-outline" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)', fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleAdminActionClick(selectedRequest.id, 'Override_Approve')}>
                            Override Approve
                          </button>
                          <button className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleAdminActionClick(selectedRequest.id, 'Override_Reject')}>
                            Override Reject
                          </button>
                          <button className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleAdminActionClick(selectedRequest.id, 'Reassign')}>
                            Reassign Manager
                          </button>
                          <button className="btn btn-outline" style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)', fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleAdminActionClick(selectedRequest.id, 'Escalate')}>
                            Escalate Request
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* Approval History Timeline */}
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Approval Trail & Timeline</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid var(--color-border)', paddingLeft: '1rem', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                  
                  {/* Origin entry */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.35rem', top: '0.2rem', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-text-muted)' }}></div>
                    <div style={{ fontWeight: '600' }}>Request Raised</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Raised by employee on {new Date(selectedRequest.appliedDate).toLocaleDateString()}</div>
                  </div>

                  {/* History entries */}
                  {(selectedRequest.data?.approvalHistory || selectedRequest.approvalHistory || []).map((h, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div 
                        style={{ 
                          position: 'absolute', 
                          left: '-1.45rem', 
                          top: '0.2rem', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: h.actionType === 'Reject' || h.actionType === 'Override Reject' ? 'var(--color-danger)' :
                                           h.actionType === 'Send Back' ? 'var(--color-primary)' :
                                           'var(--color-success)'
                        }}
                      ></div>
                      <div style={{ fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{h.actionType || h.status}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>{new Date(h.dateTime).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-main)' }}>By: <strong>{h.managerName}</strong></div>
                      {h.remarks && <div style={{ fontStyle: 'italic', fontSize: '0.75rem', marginTop: '0.1rem', color: 'var(--color-text-muted)' }}>Remarks: "{h.remarks}"</div>}
                    </div>
                  ))}

                  {/* Pending/Final state entry */}
                  {['Pending', 'Escalated', 'Awaiting Final Approval'].includes(selectedRequest.status) && (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-1.35rem', top: '0.2rem', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></div>
                      <div style={{ fontWeight: '600', color: 'var(--color-warning)' }}>Awaiting Action</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Currently pending with: {selectedRequest.pendingManagerNames.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="card card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <HelpCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3>Select a Request</h3>
              <p style={{ fontSize: '0.85rem' }}>Select any request from the queue to view full description, attachment, and workflow timeline details.</p>
            </div>
          )}

          {/* ── SIMULATED NOTIFICATION LOGS ── */}
          <div className="card card-glass" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                <Clock size={16} /> Notification Center Logs
              </h3>
              {simulatedNotifs.length > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={handleClearNotifications}>Clear</button>
              )}
            </div>
            
            {simulatedNotifs.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
                No notifications logged yet. Action approvals to trigger alerts.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {simulatedNotifs.map(n => (
                  <div key={n.id} style={{ fontSize: '0.75rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                      <span>To: <strong>{n.recipient} ({n.role})</strong></span>
                      <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ margin: '0.1rem 0 0 0', color: 'var(--color-text-main)' }}>{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── ADMIN INTERVENTION AUDIT TRAIL Expansion (Admins only) ── */}
      {isAdmin && (
        <div className="card card-glass" style={{ marginTop: '2.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Shield size={20} color="var(--color-danger)" /> Admin Override Audit Trail
            </h2>
            {auditTrail.length > 0 && (
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '0.25rem 0.5rem' }} onClick={async () => {
                await dataService.clearApprovalAuditTrail();
                setReloads(r => r + 1);
              }}>Clear Trail</button>
            )}
          </div>

          {auditTrail.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>
              No admin overrides or interventions logged in the global audit trail.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Timestamp</th>
                    <th style={{ padding: '0.5rem' }}>Request ID</th>
                    <th style={{ padding: '0.5rem' }}>Type</th>
                    <th style={{ padding: '0.5rem' }}>Intervention</th>
                    <th style={{ padding: '0.5rem' }}>Performed By</th>
                    <th style={{ padding: '0.5rem' }}>Audit Remarks</th>
                    <th style={{ padding: '0.5rem' }}>IP / Device Log</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '0.5rem' }}>{log.requestId}</td>
                      <td style={{ padding: '0.5rem' }}>{log.requestType}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>{log.actionType}</span>
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: '600' }}>{log.actionBy}</td>
                      <td style={{ padding: '0.5rem' }}>"{log.remarks}"</td>
                      <td style={{ padding: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        IP: 192.168.1.142 | Win10.Chrome124
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STANDARD ACTION REMARKS MODAL ── */}
      {actionModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: actionModal.status === 'Approved' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: actionModal.status === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                Confirm {actionModal.status === 'Correction Needed' ? 'Send Back for Correction' : actionModal.status}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {(actionModal.status === 'Rejected' || actionModal.status === 'Correction Needed' || actionModal.status === 'Sent Back') ? 'Remarks/Comments are COMPULSORY for this action.' : 'Optional: Provide comments/remarks for this decision.'}
              </p>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Remarks / Action Reason</label>
                <textarea
                  className="form-input"
                  rows="3"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Provide detailed justification..."
                  value={actionModal.remarks}
                  onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                />
              </div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setActionModal({ isOpen: false, requestId: null, status: '', remarks: '' })}>Cancel</button>
              <button 
                className="btn" 
                style={{ 
                  backgroundColor: actionModal.status === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)', 
                  color: 'white',
                  border: 'none'
                }}
                onClick={handleConfirmAction}
              >
                Confirm {actionModal.status === 'Correction Needed' ? 'Send Back' : actionModal.status}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN INTERVENTION MODAL ── */}
      {adminActionModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Shield size={20} /> Admin: {adminActionModal.actionType.replace('_', ' ')}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Every admin intervention is logged in the official override audit trail. Remarks are mandatory.
              </p>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Conditional dropdown for reassigning */}
              {adminActionModal.actionType === 'Reassign' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reassign To Manager</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%' }}
                    value={adminActionModal.targetManagerId}
                    onChange={(e) => setAdminActionModal({ ...adminActionModal, targetManagerId: e.target.value })}
                  >
                    <option value="">Select Manager</option>
                    {employees.filter(e => e.status === 'Active').map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role || 'Employee'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Audit Remarks / Comments</label>
                <textarea
                  className="form-input"
                  rows="3"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Explain override justification..."
                  value={adminActionModal.remarks}
                  onChange={(e) => setAdminActionModal({ ...adminActionModal, remarks: e.target.value })}
                />
              </div>

            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setAdminActionModal({ isOpen: false, requestId: null, actionType: '', targetManagerId: '', remarks: '' })}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ 
                  backgroundColor: 'var(--color-danger)', 
                  borderColor: 'var(--color-danger)',
                  color: 'white'
                }}
                onClick={handleConfirmAdminAction}
              >
                Execute Intervention
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Approvals;

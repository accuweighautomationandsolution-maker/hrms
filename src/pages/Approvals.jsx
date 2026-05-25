import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, FileText, UserPlus, ShieldAlert, MapPin } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

const INITIAL_REQUESTS = [
  { 
    id: 101, 
    empName: 'Evan Wright', 
    role: 'Junior Analyst',
    type: 'Annual Leave', 
    duration: 'Apr 10 - Apr 15, 2026', 
    days: 4,
    reason: 'Family Vacation',
    balanceRemaining: 12,
    status: 'Pending'
  },
  { 
    id: 102, 
    empName: 'Charlie Davis', 
    role: 'HR Specialist',
    type: 'Sick Leave', 
    duration: 'May 02 - May 03, 2026', 
    days: 2,
    reason: 'Medical Appointment',
    balanceRemaining: 8,
    status: 'Pending'
  },
  { 
    id: 103, 
    empName: 'Diana King', 
    role: 'UI/UX Designer',
    type: 'Casual Leave', 
    duration: 'May 12, 2026', 
    days: 1,
    reason: 'Personal Errands',
    balanceRemaining: 5,
    status: 'Pending'
  }
];

const Approvals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [actionedRequests, setActionedRequests] = useState([]);
  const [manpowerReqs, setManpowerReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloads, setReloads] = useState(0);

  const [managerProfile, setManagerProfile] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    requestId: null,
    status: '', // 'Approved' or 'Rejected'
    remarks: ''
  });

  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'management';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // SECURITY: Resolve manager's actual employee profile to get their employee ID
        const myEmpProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
        const myEmpId = myEmpProfile ? myEmpProfile.id : null;

        if (myEmpProfile) {
          setManagerProfile(myEmpProfile);
        } else {
          setManagerProfile({
            id: currentUser?.id,
            name: currentUser?.name || 'Administrator'
          });
        }

        const [hiring, leaves, emps] = await Promise.all([
          dataService.getManpowerRequests(),
          dataService.getLeaveRequests(),
          dataService.getEmployees()
        ]);
        setManpowerReqs(hiring);

        // Map and Filter pending requests for this manager
        const pendingLeaves = leaves.filter(l => {
          if (l.status !== 'Pending') return false;

          // Find employee record
          const employee = emps.find(e => String(e.id) === String(l.empId) || String(e.id) === String(l.emp_id));
          if (!employee) return isAdmin;

          // Check if current user is an assigned manager for this employee
          const managerIds = employee.managerIds || [];
          const isAssignedManager = myEmpId && managerIds.map(String).includes(String(myEmpId));

          return isAdmin || isAssignedManager;
        }).map(l => {
          const employee = emps.find(e => String(e.id) === String(l.empId) || String(e.id) === String(l.emp_id));
          return {
            id: l.id,
            empName: l.employees?.name || l.data?.name || l.data?.empName || l.name || 'Unknown Employee',
            empId: l.emp_id || l.empId || l.data?.empId || l.data?.emp_id,
            role: employee ? employee.role : 'Employee', 
            type: l.type,
            duration: l.data?.duration || l.duration || (l.start_date && l.end_date ? `${l.start_date} - ${l.end_date}` : ''),
            days: l.days,
            reason: l.reason,
            balanceRemaining: 0, 
            status: l.status,
            approvalHistory: l.data?.approvalHistory || [],
            destination: l.data?.destination || '',
            purpose: l.data?.purpose || ''
          };
        });

        // Map and Filter actioned requests for this manager
        const actionedLeaves = leaves.filter(l => {
          if (l.status === 'Pending') return false;

          // Find employee record
          const employee = emps.find(e => String(e.id) === String(l.empId) || String(e.id) === String(l.emp_id));
          if (!employee) return isAdmin;

          // Check if current user is an assigned manager for this employee
          const managerIds = employee.managerIds || [];
          const isAssignedManager = myEmpId && managerIds.map(String).includes(String(myEmpId));

          return isAdmin || isAssignedManager;
        }).map(l => {
          const employee = emps.find(e => String(e.id) === String(l.empId) || String(e.id) === String(l.emp_id));
          return {
            id: l.id,
            empName: l.employees?.name || l.data?.name || l.data?.empName || l.name || 'Unknown Employee',
            empId: l.emp_id || l.empId || l.data?.empId || l.data?.emp_id,
            role: employee ? employee.role : 'Employee', 
            type: l.type,
            duration: l.data?.duration || l.duration || (l.start_date && l.end_date ? `${l.start_date} - ${l.end_date}` : ''),
            days: l.days,
            reason: l.reason,
            balanceRemaining: 0, 
            status: l.status,
            approvalHistory: l.data?.approvalHistory || [],
            destination: l.data?.destination || '',
            purpose: l.data?.purpose || ''
          };
        });

        setPendingRequests(pendingLeaves);
        setActionedRequests(actionedLeaves);
      } catch (err) {
        console.error("Failed to load approvals data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloads]);

  const handleAction = (id, action) => {
    setActionModal({
      isOpen: true,
      requestId: id,
      status: action,
      remarks: ''
    });
  };

  const handleConfirmAction = async () => {
    const { requestId, status, remarks } = actionModal;
    
    // Remarks validation: mandatory for Rejected and Correction Needed (Send Back)
    if ((status === 'Rejected' || status === 'Correction Needed') && (!remarks || !remarks.trim())) {
      alert("Remarks are mandatory when rejecting a request or sending it back for correction.");
      return;
    }

    const managerName = managerProfile ? managerProfile.name : (currentUser?.name || 'Manager');

    try {
      setLoading(true);
      await dataService.updateRequestStatusWithHistory(requestId, status, managerName, remarks);
      setActionModal({ isOpen: false, requestId: null, status: '', remarks: '' });
      setReloads(r => r + 1);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHiringAction = async (id, action) => {
    const list = await dataService.getManpowerRequests();
    const updated = list.map(r => r.id === id ? { ...r, status: action } : r);
    await dataService.saveManpowerRequests(updated);
    setReloads(r => r+1);
  };

  const pendingHires = manpowerReqs.filter(r => r.status === 'Pending Approval');

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Manager Approvals</h1>
          <p className="page-subtitle">Review and authorize pending leave and advance requests from your team.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{pendingRequests.length + pendingHires.length} actions required</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          {pendingHires.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                <ShieldAlert size={20} />
                Financial Overrides Required
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingHires.map(req => (
                  <div key={req.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <div className="avatar" style={{ width: '48px', height: '48px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <UserPlus size={24} />
                         </div>
                         <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{req.role}</h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{req.department} • Scheduled {req.date}</p>
                         </div>
                      </div>
                      <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>Over Budget Exception</span>
                    </div>

                    <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Proposed Annual CTC</span>
                         <span style={{ fontWeight: '700' }}>{formatCurrency(req.proposedCTC)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                         <span style={{ fontSize: '0.875rem', color: 'var(--color-danger)' }}>Department Breach Limit By</span>
                         <span style={{ fontWeight: '700', color: 'var(--color-danger)' }}>+{formatCurrency(req.breachAmount)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-main)' }}>
                        Justification: "{req.justification}"
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                       <button className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleHiringAction(req.id, 'Rejected')}>
                         Reject Hire
                       </button>
                       <button className="btn btn-primary" onClick={() => handleHiringAction(req.id, 'Approved (Override)')} style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'white' }}>
                         <ShieldAlert size={16} style={{ marginRight: '0.5rem' }} /> Override Budget & Approve
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} color="var(--color-warning)" />
            Attention Required
          </h2>
          
          {pendingRequests.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <CheckCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--color-success)' }} />
              <h3>All Caught Up!</h3>
              <p>You have no pending approvals.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingRequests.map(req => (
                <div key={req.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="avatar" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', fontWeight: '600', fontSize: '1.2rem' }}>
                        {req.empName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{req.empName}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{req.role}</p>
                      </div>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Awaiting Manager Sign-off</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Request Type</span>
                      <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FileText size={14} color="var(--color-primary)" /> {req.type}
                        {req.purpose && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>({req.purpose})</span>}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Requested Duration / Time</span>
                      <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CalendarIcon size={14} color="var(--color-primary)" />
                        {req.type.includes('Request') ? req.duration : `${req.duration} (${req.days} days)`}
                      </span>
                    </div>
                    {req.destination && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Destination / Location</span>
                        <span style={{ fontWeight: '600', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={14} /> {req.destination}
                        </span>
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Reason / Purpose Details</span>
                      <span style={{ fontWeight: '400', fontStyle: 'italic', color: 'var(--color-text-main)' }}>"{req.reason}"</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {req.type.includes('Leave') ? (
                        <>
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Current Balance for {req.type}:</span>
                          <span className={`badge ${req.balanceRemaining - req.days >= 0 ? 'badge-blue' : 'badge-danger'}`} style={{ fontWeight: '600' }}>
                            {req.balanceRemaining} days
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                          Out Duty / Out Pass Request
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                        onClick={() => handleAction(req.id, 'Correction Needed')}
                      >
                        Send Back
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        onClick={() => handleAction(req.id, 'Rejected')}
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                        onClick={() => handleAction(req.id, 'Approved')}
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
            <Clock size={20} />
            Recently Actioned
          </h2>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {actionedRequests.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No recent activity logged.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {actionedRequests.map(req => (
                  <li key={req.id} style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '500' }}>{req.empName}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{req.type} ({req.days} days)</p>
                      </div>
                      <span className={`badge ${req.status === 'Approved' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {req.status}
                      </span>
                    </div>
                    {req.approvalHistory && req.approvalHistory.map((h, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: '100%', borderTop: '1px dashed var(--color-border)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <div>By: <strong>{h.managerName}</strong> on {new Date(h.dateTime).toLocaleString()}</div>
                        {h.remarks && <div style={{ fontStyle: 'italic', marginTop: '0.1rem', color: 'var(--color-text-main)' }}>Remarks: "{h.remarks}"</div>}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Action Dialog for Remarks */}
      {actionModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: actionModal.status === 'Approved' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: actionModal.status === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                Confirm {actionModal.status}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Please provide comments/remarks for this action.
              </p>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-input"
                  rows="3"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="e.g. Approved as discussed. / Rejected due to project dependencies."
                  value={actionModal.remarks}
                  onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                />
              </div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setActionModal({ isOpen: false, requestId: null, status: '', remarks: '' })}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ 
                  backgroundColor: actionModal.status === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)', 
                  borderColor: actionModal.status === 'Approved' ? 'var(--color-success)' : 'var(--color-danger)',
                  color: 'white'
                }}
                onClick={handleConfirmAction}
              >
                Confirm {actionModal.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;

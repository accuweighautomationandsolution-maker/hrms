import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Calendar as CalendarIcon, Clock, CheckCircle, Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const SummaryCard = ({ title, value, colorClass }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>{title}</h4>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
      <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>{value}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>days</span>
    </div>
    <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
      <div className={colorClass} style={{ height: '100%', width: '60%' }}></div>
    </div>
  </div>
);

const LeaveManagement = () => {
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isEmployee = userRole === 'employee';

  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({ Paid: 0, Sick: 0, Casual: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeEmp, setActiveEmp] = useState(null);
  const [resolvedMyEmpId, setResolvedMyEmpId] = useState(null);
  
  // Real-time synchronization of employment status for leave eligibility
  const isProbation = activeEmp?.empType === 'Probation' || currentUser?.empType === 'Probation';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // SECURITY: Resolve actual employee record by email before any ID comparisons.
        // currentUser.id is a user_profiles UUID, NOT an employees table ID.
        const myEmpProfile = isEmployee
          ? await dataService.getMyEmployeeProfile(currentUser).catch(() => null)
          : null;

        const resolvedId = myEmpProfile ? myEmpProfile.id : null;
        if (isEmployee && resolvedId) setResolvedMyEmpId(resolvedId);

        // Use the resolved employee's actual ID for all data filtering
        const myEmpId = resolvedId || currentUser.id;

        const [leaves, emps, paidBal, sickBal, casualBal] = await Promise.all([
          dataService.getLeaveRequests(),
          dataService.getEmployees(),
          dataService.getEmployeeBalance(myEmpId, 'Paid'),
          dataService.getEmployeeBalance(myEmpId, 'Sick'),
          dataService.getEmployeeBalance(myEmpId, 'Casual')
        ]);
        
        // Find current user's employee record to get real status
        let matchedEmp = myEmpProfile;
        if (!matchedEmp) {
          matchedEmp = emps.find(e => e.id === currentUser.id || e.empCode === currentUser.empCode);
        }
        if (matchedEmp) {
          setActiveEmp(matchedEmp);
          if (matchedEmp.empType === 'Probation') {
            setLeaveType('Unpaid Leave');
          }
        }

        if (isEmployee) {
          // Filter leaves strictly by the resolved employee ID (string and number safe)
          setRequests(leaves.filter(l =>
            String(l.empId) === String(myEmpId) ||
            String(l.emp_id) === String(myEmpId)
          ));
        } else {
          setRequests(leaves);
        }
        setBalances({ Paid: paidBal, Sick: sickBal, Casual: casualBal });
      } catch (err) {
        console.error("Failed to load leave data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id, isEmployee]);
  
  // Form State
  const [leaveType,   setLeaveType]   = useState('Annual Leave');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [reason,      setReason]      = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [startTime,   setStartTime]   = useState('');
  const [endTime,     setEndTime]     = useState('');

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format) => {
    const rawData = requests.map(r => ({
      "Employee": r.name, "Type": r.type, "Duration": r.duration, "Days": r.days, "Status": r.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(rawData);
    if (format === 'csv') {
      const blob = new Blob([XLSX.utils.sheet_to_csv(worksheet)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Leave_Tracker.csv`; a.click();
    } else {
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, worksheet, "Leaves");
      XLSX.writeFile(wb, `Leave_Tracker.xlsx`);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>Loading leave tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Track and request time off.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }} className="hide-on-print">
          <div style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={16} style={{ marginRight: '0.5rem' }} /> Export & Share
            </button>
            {showExportMenu && (
              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                <button className="btn btn-ghost" onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} /> CSV Format</button>
                <button className="btn btn-ghost" onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} /> Excel Sheet</button>
                <button className="btn btn-ghost" onClick={() => { window.print(); setShowExportMenu(false) }}><Printer size={16} /> Print Report</button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <CalendarIcon size={18} style={{ marginRight: '0.5rem' }} />
            Request Leave
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <SummaryCard title="Annual Leave Balance" value={balances.Paid} colorClass="bg-blue-500" />
        <SummaryCard title="Sick Leave Balance" value={balances.Sick} colorClass="bg-emerald-500" />
        <SummaryCard title="Casual Leave Balance" value={balances.Casual} colorClass="bg-amber-500" />
      </div>
      
      <style>{`
        .bg-blue-500 { background-color: var(--color-primary); }
        .bg-emerald-500 { background-color: var(--color-success); }
        .bg-amber-500 { background-color: var(--color-warning); }
      `}</style>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          <h2>Recent Leave Requests</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost active" style={{ color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', borderRadius: '0' }}>All</button>
            <button className="btn btn-ghost">Pending</button>
            <button className="btn btn-ghost">Approved</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((request) => (
            <div key={request.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="avatar" style={{ width: '40px', height: '40px' }}>
                  {request.name?.split(' ').map(n => n[0]).join('') || '??'}
                </div>
                <div>
                  <h4 style={{ fontWeight: '600' }}>{request.name}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} /> {request.type}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {request.duration} ({request.days} days)</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span className={`badge ${request.status === 'Approved' ? 'badge-success' : request.status === 'Pending' ? 'badge-warning' : 'badge-danger'}`}>
                  {request.status}
                </span>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p style={{textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)'}}>No leave records found.</p>}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Submit Request</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Request Type
                  <span style={{ fontSize: '0.75rem', color: isProbation ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: '600' }}>
                    Status: {isProbation ? 'PROBATION' : 'PERMANENT'}
                  </span>
                </label>
                <select className="form-input" style={{ width: '100%' }} value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                  {!isProbation && <option value="Annual Leave">Annual Leave</option>}
                  {!isProbation && <option value="Sick Leave">Sick Leave</option>}
                  {!isProbation && <option value="Personal Leave">Personal Leave</option>}
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  <option value="Out Duty Request">Out Duty Request</option>
                  <option value="Out Pass Request">Out Pass Request</option>
                </select>
                {isProbation && (leaveType === 'Annual Leave' || leaveType === 'Sick Leave' || leaveType === 'Personal Leave') && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: '600' }}>
                    Policy Enforced: Employees currently under probation are restricted strictly to Unpaid, Out Duty, or Out Pass Requests.
                  </p>
                )}
              </div>
              
              {leaveType === 'Out Pass Request' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Request Date *</label>
                    <input type="date" className="form-input" style={{ width: '100%', borderColor: !requestDate ? 'var(--color-danger)' : 'var(--color-border)' }}
                      value={requestDate} onChange={e => setRequestDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Start Time *</label>
                      <input type="time" className="form-input" style={{ width: '100%', borderColor: !startTime ? 'var(--color-danger)' : 'var(--color-border)' }}
                        value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">End Time *</label>
                      <input type="time" className="form-input" style={{ width: '100%', borderColor: !endTime ? 'var(--color-danger)' : 'var(--color-border)' }}
                        value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-input" style={{ width: '100%', borderColor: !startDate ? 'var(--color-danger)' : 'var(--color-border)' }}
                      value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">End Date *</label>
                    <input type="date" className="form-input" style={{ width: '100%', borderColor: !endDate ? 'var(--color-danger)' : 'var(--color-border)' }}
                      value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason *</label>
                <textarea className="form-input" rows="3" style={{ width: '100%', resize: 'vertical', borderColor: !reason.trim() ? 'var(--color-danger)' : 'var(--color-border)' }} 
                  value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Briefly describe your reason..."></textarea>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" 
                disabled={
                  leaveType === 'Out Pass Request'
                    ? !requestDate || !startTime || !endTime || !reason.trim()
                    : !startDate || !endDate || !reason.trim() || (new Date(startDate) > new Date(endDate))
                }
                onClick={async () => {
                  const isOutPass = leaveType === 'Out Pass Request';
                  let durationStr = '';
                  let calcDays = 0;
                  
                  if (isOutPass) {
                    durationStr = `${requestDate} (${startTime} - ${endTime})`;
                    calcDays = 0;
                  } else {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const diffTime = Math.abs(end - start);
                    calcDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    durationStr = `${startDate} - ${endDate}`;
                  }
                                   try {
                    let finalEmpId = resolvedMyEmpId;
                    const emps = await dataService.getEmployees().catch(() => []);
                    
                    if (!finalEmpId) {
                      const matched = emps.find(e => 
                        (e.email && e.email.trim().toLowerCase() === currentUser.email?.trim().toLowerCase()) ||
                        (e.name && e.name.trim().toLowerCase() === currentUser.name?.trim().toLowerCase())
                      );
                      if (matched) {
                        finalEmpId = matched.id;
                      }
                    }

                    if (!finalEmpId) {
                      alert("Failed to submit request: Your user account is not linked to any employee profile. Please contact HR.");
                      return;
                    }

                    // Check if manager is assigned
                    let status = 'Pending';
                    const empProfile = emps.find(e => String(e.id) === String(finalEmpId));
                    const hasManager = empProfile && empProfile.managerIds && empProfile.managerIds.length > 0;
                    if (!hasManager) {
                      status = 'Pending Manager Assignment';
                      console.warn(`Leave request raised by employee ${currentUser.name} (ID: ${finalEmpId}) has no assigned reporting manager.`);
                    }

                    const newRequest = {
                      id: Date.now(),
                      empId: finalEmpId,
                      name: currentUser.name,
                      type: leaveType,
                      startDate: isOutPass ? requestDate : startDate,
                      endDate: isOutPass ? requestDate : endDate,
                      duration: durationStr,
                      days: calcDays,
                      reason,
                      status: status,
                      appliedDate: new Date().toISOString().split('T')[0],
                      startTime: isOutPass ? startTime : '',
                      endTime: isOutPass ? endTime : ''
                    };
                    
                    const existing = await dataService.getLeaveRequests();
                    await dataService.saveLeaveRequests([...existing, newRequest]);
                    
                    setRequests(prev => [...prev, newRequest]);
                    alert('Request submitted successfully!');
                    setShowModal(false);
                    setStartDate(''); setEndDate(''); setReason('');
                    setRequestDate(''); setStartTime(''); setEndTime('');
                  } catch (err) {
                    console.error("Failed to submit request:", err);
                    alert("Database save failed: " + err.message);
                  });
                }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveManagement;

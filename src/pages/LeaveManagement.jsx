import React, { useState } from 'react';
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

  const [requests, setRequests] = useState(() => {
    const all = dataService.getLeaveRequests();
    if (isEmployee) {
      return all.filter(r => r.empId === Number(currentUser.id));
    }
    return all;
  });
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [leaveType,   setLeaveType]   = useState('Annual Leave');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [reason,      setReason]      = useState('');
  const [isProbation, setIsProbation] = useState(false);

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
        <SummaryCard title="Annual Leave Balance" value={dataService.getEmployeeBalance(isEmployee ? currentUser.id : 1, 'Paid')} colorClass="bg-blue-500" />
        <SummaryCard title="Sick Leave Balance" value={dataService.getEmployeeBalance(isEmployee ? currentUser.id : 1, 'Sick')} colorClass="bg-emerald-500" />
        <SummaryCard title="Casual Leave Balance" value={dataService.getEmployeeBalance(isEmployee ? currentUser.id : 1, 'Casual')} colorClass="bg-amber-500" />
      </div>
      
      {/* We need some utility classes here for the inline bg colors */}
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
                  {request.name.split(' ').map(n => n[0]).join('')}
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
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Submit Leave Request</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Leave Type
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <input type="checkbox" checked={isProbation} onChange={(e) => setIsProbation(e.target.checked)} style={{ width: '12px', height: '12px' }} /> Enable Probation Profile (Mock)
                  </label>
                </label>
                <select className="form-input" style={{ width: '100%' }}>
                  {!isProbation && <option>Annual Leave</option>}
                  {!isProbation && <option>Sick Leave</option>}
                  {!isProbation && <option>Personal Leave</option>}
                  <option>Unpaid Leave</option>
                </select>
                {isProbation && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: '600' }}>
                    Policy Enforced: Employees currently under probation are restricted strictly to Unpaid Leave.
                  </p>
                )}
              </div>
              
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
                disabled={!startDate || !endDate || !reason.trim() || (new Date(startDate) > new Date(endDate))}
                onClick={() => {
                  alert('Leave request submitted!');
                  setShowModal(false);
                  setStartDate(''); setEndDate(''); setReason('');
                }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveManagement;

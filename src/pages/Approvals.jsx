import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle, FileText, UserPlus, ShieldAlert } from 'lucide-react';
import { dataService } from '../utils/dataService';

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
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [reloads, setReloads] = useState(0);

  const manpowerReqs = useMemo(() => dataService.getManpowerRequests(), [reloads]);

  const handleAction = (id, action) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: action } : req
    ));
  };

  const handleHiringAction = (id, action) => {
    const list = dataService.getManpowerRequests();
    const updated = list.map(r => r.id === id ? { ...r, status: action } : r);
    dataService.saveManpowerRequests(updated);
    setReloads(r => r+1);
  };

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const actionedRequests = requests.filter(r => r.status !== 'Pending');
  const pendingHires = manpowerReqs.filter(r => r.status === 'Pending Approval');

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
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Leave Type</span>
                      <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FileText size={14} color="var(--color-primary)" /> {req.type}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Requested Duration</span>
                      <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CalendarIcon size={14} color="var(--color-primary)" /> {req.duration} ({req.days} days)
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Reason</span>
                      <span style={{ fontWeight: '400', fontStyle: 'italic', color: 'var(--color-text-main)' }}>"{req.reason}"</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Current Balance for {req.type}:</span>
                      <span className={`badge ${req.balanceRemaining - req.days >= 0 ? 'badge-blue' : 'badge-danger'}`} style={{ fontWeight: '600' }}>
                        {req.balanceRemaining} days
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                        Approve Leave
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
                  <li key={req.id} style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: '500' }}>{req.empName}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{req.type} ({req.days} days)</p>
                    </div>
                    <span className={`badge ${req.status === 'Approved' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {req.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Approvals;

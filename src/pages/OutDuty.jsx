import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Paperclip, AlertTriangle, CheckCircle2, FileText, Plus, Search, HelpCircle, ArrowRight, User, BookOpen } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const OutDuty = () => {
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isEmployee = userRole === 'employee';

  const [requests, setRequests] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [date, setDate] = useState('');
  const [outTime, setOutTime] = useState('');
  const [expectedInTime, setExpectedInTime] = useState('');
  const [purpose, setPurpose] = useState('Client visit');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [purposeDetails, setPurposeDetails] = useState('');
  const [destination, setDestination] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');

  // Auto-fetch profile
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const myProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
        setEmployeeProfile(myProfile);

        const [leaves, emps] = await Promise.all([
          dataService.getLeaveRequests(),
          dataService.getEmployees()
        ]);
        setEmployeesList(emps);

        const empIdToFilter = myProfile ? myProfile.id : currentUser?.id;
        
        // Filter requests of type 'Out Duty Request'
        const odRequests = leaves.filter(l => 
          l.type === 'Out Duty Request' && 
          (String(l.empId) === String(empIdToFilter) || String(l.emp_id) === String(empIdToFilter))
        ).map(l => ({
          id: l.id,
          empId: l.empId || l.emp_id,
          name: l.name,
          date: l.start_date || l.data?.date,
          outTime: l.data?.outTime || '',
          expectedInTime: l.data?.expectedInTime || '',
          purpose: l.data?.purpose || 'Client visit',
          purposeDetails: l.reason || l.data?.purposeDetails || '',
          destination: l.data?.destination || '',
          attachment: l.data?.attachment || null,
          attachmentName: l.data?.attachmentName || '',
          status: l.data?.status || l.status,
          approvalHistory: l.data?.approvalHistory || []
        }));

        setRequests(odRequests);
      } catch (err) {
        console.error("Failed to load Out Duty requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloads => reloads]); // Simple reloads tracking isn't needed if we fetch on mount

  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    // Sync function when reloads changes
    const reloadRequests = async () => {
      if (!employeeProfile) return;
      try {
        const leaves = await dataService.getLeaveRequests();
        const empIdToFilter = employeeProfile.id;
        const odRequests = leaves.filter(l => 
          l.type === 'Out Duty Request' && 
          (String(l.empId) === String(empIdToFilter) || String(l.emp_id) === String(empIdToFilter))
        ).map(l => ({
          id: l.id,
          empId: l.empId || l.emp_id,
          name: l.name,
          date: l.start_date || l.data?.date,
          outTime: l.data?.outTime || '',
          expectedInTime: l.data?.expectedInTime || '',
          purpose: l.data?.purpose || 'Client visit',
          purposeDetails: l.reason || l.data?.purposeDetails || '',
          destination: l.data?.destination || '',
          attachment: l.data?.attachment || null,
          attachmentName: l.data?.attachmentName || '',
          status: l.data?.status || l.status,
          approvalHistory: l.data?.approvalHistory || []
        }));
        setRequests(odRequests);
      } catch (e) {
        console.error(e);
      }
    };
    reloadRequests();
  }, [reloads, employeeProfile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment(event.target.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  const handleEditClick = (req) => {
    setIsEditing(true);
    setEditId(req.id);
    setDate(req.date);
    setOutTime(req.outTime);
    setExpectedInTime(req.expectedInTime);
    setPurpose(req.purpose.startsWith('Other:') ? 'Other' : req.purpose);
    setOtherPurpose(req.purpose.startsWith('Other:') ? req.purpose.replace('Other:', '').trim() : '');
    setPurposeDetails(req.purposeDetails);
    setDestination(req.destination);
    setAttachment(req.attachment);
    setAttachmentName(req.attachmentName);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const empId = employeeProfile ? employeeProfile.id : currentUser.id;
    const finalPurpose = purpose === 'Other' ? `Other: ${otherPurpose}` : purpose;

    // Fetch leaves & requests for overlap validations
    try {
      const allRequests = await dataService.getLeaveRequests();

      // 1. Leave Check
      const leaveOverlap = allRequests.find(l => {
        const isApprovedLeave = l.status === 'Approved' && !l.type.includes('Request');
        if (!isApprovedLeave) return false;
        
        const reqDate = new Date(date);
        const lStart = new Date(l.start_date);
        const lEnd = new Date(l.end_date);
        return reqDate >= lStart && reqDate <= lEnd && String(l.empId || l.emp_id) === String(empId);
      });

      if (leaveOverlap) {
        alert(`Cannot apply for Out Duty. You have an approved leave (${leaveOverlap.type}) on this date.`);
        return;
      }

      // 2. Overlap Time Check with existing approved/pending Out Duty/Out Pass requests on the same day
      const timeOverlap = allRequests.find(l => {
        if (String(l.empId || l.emp_id) !== String(empId)) return false;
        if (l.id === editId) return false; // Exclude self during edit
        if (l.status === 'Rejected') return false; // Ignore rejected requests

        const lDate = l.start_date || l.data?.date;
        if (lDate !== date) return false;

        const isMovement = l.type === 'Out Duty Request' || l.type === 'Out Pass Request';
        if (!isMovement) return false;

        const lOut = l.data?.outTime;
        const lIn = l.data?.expectedInTime;

        if (!lOut || !lIn || !outTime || !expectedInTime) return false;

        // Compare hours/minutes
        const tStart1 = outTime.replace(':', '');
        const tEnd1 = expectedInTime.replace(':', '');
        const tStart2 = lOut.replace(':', '');
        const tEnd2 = lIn.replace(':', '');

        // Overlap: start1 < end2 && start2 < end1
        return tStart1 < tEnd2 && tStart2 < tEnd1;
      });

      if (timeOverlap) {
        alert(`Cannot apply. You have an overlapping movement request (${timeOverlap.type}) on this day/time.`);
        return;
      }

      // Prepare payload
      const durationStr = `${date} (${outTime} - ${expectedInTime})`;

      const requestPayload = {
        // For edits: reuse existing id so the record is updated in place.
        // For new records: omit id — saveLeaveRequest will generate LR_ prefixed id.
        ...(isEditing && editId ? { id: editId } : {}),
        empId,
        emp_id: String(empId),
        name: employeeProfile ? employeeProfile.name : (currentUser.name || 'Employee'),
        type: 'Out Duty Request',
        startDate: date,
        endDate: date,
        start_date: date,
        end_date: date,
        duration: durationStr,
        days: 0,
        reason: purposeDetails,
        status: isEditing ? (requests.find(r => r.id === editId)?.status || 'Pending') : 'Pending',
        appliedDate: new Date().toISOString().split('T')[0],
        // Custom fields stored at top level (also accessible as data.* via JSONB)
        data: {
          date,
          outTime,
          expectedInTime,
          purpose: finalPurpose,
          purposeDetails,
          destination,
          attachment,
          attachmentName,
          status: isEditing ? (requests.find(r => r.id === editId)?.status || 'Pending') : 'Pending',
          approvalHistory: isEditing ? (requests.find(r => r.id === editId)?.approvalHistory || []) : []
        }
      };

      // Save single record to letter_templates JSONB store
      const savedRecord = await dataService.saveLeaveRequest(requestPayload);

      // Update local UI state immediately (no need to re-fetch all)
      if (isEditing) {
        setRequests(prev => prev.map(r => r.id === editId ? {
          ...r,
          date,
          outTime,
          expectedInTime,
          purpose: finalPurpose,
          purposeDetails,
          destination,
          attachment,
          attachmentName,
        } : r));
      } else {
        // Add the newly saved record mapped to the display format
        setRequests(prev => [...prev, {
          id: savedRecord.id,
          empId: savedRecord.empId || savedRecord.emp_id,
          name: savedRecord.name,
          date,
          outTime,
          expectedInTime,
          purpose: finalPurpose,
          purposeDetails,
          destination,
          attachment,
          attachmentName,
          status: savedRecord.status || 'Pending',
          approvalHistory: []
        }]);
      }

      alert(isEditing ? '✅ Out Duty request updated successfully!' : '✅ Out Duty request submitted successfully!');
      
      // Reset state
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      setDate('');
      setOutTime('');
      setExpectedInTime('');
      setPurpose('Client visit');
      setOtherPurpose('');
      setPurposeDetails('');
      setDestination('');
      setAttachment(null);
      setAttachmentName('');
    } catch (e) {
      console.error(e);
      alert('❌ Failed to save Out Duty request: ' + (e.message || e));
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.purpose.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.purposeDetails.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calendar View calculations
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'var(--color-success)';
      case 'Rejected': return 'var(--color-danger)';
      case 'Pending': return 'var(--color-warning)';
      case 'Correction Needed': return 'var(--color-primary)';
      case 'Returned': return 'rgba(37,99,235,0.7)';
      case 'Overdue': return 'rgba(249,115,22,1)'; // Orange
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={32} color="var(--color-primary)" />
            Out Duty Management
          </h1>
          <p className="page-subtitle">Request authorization for official movements and client visits.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsEditing(false); resetForm(); setShowModal(true); }}>
          <Plus size={16} /> Request Out Duty
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }} className="hide-on-print">
        {/* Metric widgets */}
        <div className="card" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Active Movements</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '800' }}>
            {requests.filter(r => r.status === 'Approved').length}
          </span>
        </div>
        <div className="card" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Pending Approvals</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-warning)' }}>
            {requests.filter(r => r.status === 'Pending').length}
          </span>
        </div>
        <div className="card" style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Corrections Requested</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary)' }}>
            {requests.filter(r => r.status === 'Correction Needed').length}
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Search requests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="form-input"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Correction Needed">Correction Needed</option>
              <option value="Returned">Returned</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('list')} style={{ padding: '0.4rem 0.8rem' }}>List</button>
            <button className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('calendar')} style={{ padding: '0.4rem 0.8rem' }}>Calendar</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
          </div>
        ) : viewMode === 'list' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <tr>
                  <th style={{ padding: '1rem 1.5rem' }}>Purpose & Destination</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Date & Expected Hours</th>
                  <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem' }}>History & Remarks</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--color-text-main)' }}>
                {filteredRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '700' }}>{req.purpose}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                        <MapPin size={12} /> {req.destination}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '600' }}>{req.date}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                        <Clock size={12} /> {req.outTime} - {req.expectedInTime}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: getStatusColor(req.status).replace(')', ', 0.1)'), 
                          color: getStatusColor(req.status),
                          borderColor: getStatusColor(req.status).replace(')', ', 0.2)'),
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', maxWidth: '300px' }}>
                      {req.approvalHistory && req.approvalHistory.length > 0 ? (
                        <div>
                          {req.approvalHistory.map((h, i) => (
                            <div key={i} style={{ marginBottom: '0.4rem', borderBottom: i < req.approvalHistory.length - 1 ? '1px dashed var(--color-border)' : 'none', paddingBottom: '0.2rem' }}>
                              <strong>{h.managerName}</strong> ({h.status}): 
                              <span style={{ fontStyle: 'italic', marginLeft: '0.25rem', color: 'var(--color-text-muted)' }}>"{h.remarks || 'No comments'}"</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No remarks yet</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {req.attachment && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '0.4rem', color: 'var(--color-primary)' }}
                            onClick={() => {
                              const w = window.open();
                              w.document.write(`<iframe src="${req.attachment}" style="border:none; width:100%; height:100%;"></iframe>`);
                            }}
                            title="View Attachment"
                          >
                            <Paperclip size={16} />
                          </button>
                        )}
                        {req.status === 'Correction Needed' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}
                            onClick={() => handleEditClick(req)}
                          >
                            Correct & Resubmit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No Out Duty requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Simple Calendar Highlight View */
          <div style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
            {/* Generate calendar for current month */}
            {Array.from({ length: 31 }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateKey = `2026-05-${dayNum < 10 ? '0' + dayNum : dayNum}`;
              const matchReqs = requests.filter(r => r.date === dateKey);

              return (
                <div 
                  key={idx} 
                  style={{ 
                    width: '90px', 
                    height: '90px', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '0.5rem',
                    backgroundColor: matchReqs.length > 0 ? getStatusColor(matchReqs[0].status).replace(')', ', 0.05)') : 'transparent',
                    borderColor: matchReqs.length > 0 ? getStatusColor(matchReqs[0].status).replace(')', ', 0.3)') : 'var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-muted)' }}>May {dayNum}</span>
                  {matchReqs.map(r => (
                    <div 
                      key={r.id} 
                      onClick={() => handleEditClick(r)}
                      style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 'bold', 
                        color: getStatusColor(r.status), 
                        marginTop: '0.25rem', 
                        cursor: r.status === 'Correction Needed' ? 'pointer' : 'default',
                        textDecoration: r.status === 'Correction Needed' ? 'underline' : 'none'
                      }}
                      title={`${r.purpose} (${r.outTime} - ${r.expectedInTime})`}
                    >
                      {r.purpose}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(37,99,235,0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-primary)' }}>
                {isEditing ? 'Edit / Correct Out Duty Request' : 'Request Out Duty'}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Please provide official details for your movement authorization.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Employee Details</label>
                  <input className="form-input" style={{ width: '100%', backgroundColor: 'var(--color-background)' }} disabled value={employeeProfile ? `${employeeProfile.name} (${employeeProfile.empCode})` : (currentUser.name || '')} />
                </div>

                <div className="form-group">
                  <label className="form-label">Movement Date *</label>
                  <input type="date" required className="form-input" style={{ width: '100%' }} value={date} onChange={e => setDate(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Out Time *</label>
                    <input type="time" required className="form-input" style={{ width: '100%' }} value={outTime} onChange={e => setOutTime(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Expected In Time *</label>
                    <input type="time" required className="form-input" style={{ width: '100%' }} value={expectedInTime} onChange={e => setExpectedInTime(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Movement Purpose *</label>
                  <select className="form-input" style={{ width: '100%' }} value={purpose} onChange={e => setPurpose(e.target.value)}>
                    <option value="Client visit">Client visit</option>
                    <option value="Bank work">Bank work</option>
                    <option value="Field work">Field work</option>
                    <option value="Vendor meeting">Vendor meeting</option>
                    <option value="Site visit">Site visit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {purpose === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Specify Purpose *</label>
                    <input type="text" required placeholder="e.g. Head Office visit" className="form-input" style={{ width: '100%' }} value={otherPurpose} onChange={e => setOtherPurpose(e.target.value)} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Location / Destination *</label>
                  <input type="text" required placeholder="e.g. Axis Bank, Sector 62 Branch" className="form-input" style={{ width: '100%' }} value={destination} onChange={e => setDestination(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose Details / Reason *</label>
                  <textarea className="form-input" rows="3" required placeholder="Describe task to be performed..." style={{ width: '100%', resize: 'vertical' }} value={purposeDetails} onChange={e => setPurposeDetails(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting Document (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input type="file" className="form-input" style={{ flexGrow: 1 }} onChange={handleFileChange} />
                    {attachmentName && <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>{attachmentName}</span>}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!date || !outTime || !expectedInTime || !destination || !purposeDetails}>
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function resetForm() {
    setDate('');
    setOutTime('');
    setExpectedInTime('');
    setPurpose('Client visit');
    setOtherPurpose('');
    setPurposeDetails('');
    setDestination('');
    setAttachment(null);
    setAttachmentName('');
  }
};

export default OutDuty;

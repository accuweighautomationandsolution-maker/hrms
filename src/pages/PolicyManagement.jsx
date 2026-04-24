import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, ShieldCheck, Download, Search, Filter, Plus, 
  ChevronRight, AlertCircle, CheckCircle, History, Users, Eye, 
  ArrowUpRight, Clock, FileSignature, Trash2, X
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import * as XLSX from 'xlsx';
import { useNotification } from '../context/NotificationContext';

const PolicyManagement = ({ userRole }) => {
  const { showNotification } = useNotification();
  const isAdmin = userRole === 'management';
  const [activeTab, setActiveTab] = useState('browser'); // 'browser' | 'tracker'
  const [searchQuery, setSearchQuery] = useState('');
  const [policies, setPolicies] = useState([]);
  const [acks, setAcks] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ title: '', category: 'HR Policies', version: '1.0', effectiveDate: '' });

  useEffect(() => {
    setPolicies(dataService.getPolicies());
    setAcks(dataService.getAcknowledgments());
  }, []);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [policies, searchQuery]);

  const currentUserId = 1; // Alice Smith (Simulated Context)
  const isAcknowledged = (policyId) => acks.some(a => a.policyId === policyId && a.empId === currentUserId);

  const handleAcknowledge = (policyId) => {
    const newAck = { policyId, empId: currentUserId, empName: 'Alice Smith' };
    const newList = dataService.saveAcknowledgment(newAck);
    setAcks(newList);
    showNotification('Policy acknowledged successfully.', 'success');
  };

  const handlePublish = () => {
    if (!newPolicy.title || !newPolicy.effectiveDate) {
      showNotification('Title and Effective Date are required.', 'error');
      return;
    }
    const policy = {
      ...newPolicy,
      id: `POL-${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      summary: 'Automatically generated summary for new organization policy.'
    };
    const updated = [...policies, policy];
    dataService.savePolicies(updated);
    setPolicies(updated);
    setShowUploadModal(false);
    showNotification('New policy published and dispatched to all employees.', 'success');
    setNewPolicy({ title: '', category: 'HR Policies', version: '1.0', effectiveDate: '' });
  };

  const handleDeletePolicy = (id) => {
    if (window.confirm('Delete this policy? This will remove all associated acknowledgment logs.')) {
      const updated = dataService.deletePolicy(id);
      setPolicies(updated);
      showNotification('Policy deleted successfully.', 'success');
    }
  };

  const handleExportAuditLog = () => {
    const rawData = acks.map(a => {
      const p = policies.find(pol => pol.id === a.policyId);
      return {
        "Timestamp": a.timestamp,
        "Employee Name": a.empName,
        "Policy Title": p ? p.title : a.policyId,
        "Action": "Electronically Signed"
      };
    });
    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compliance_Audit");
    XLSX.writeFile(wb, "Policy_Acknowledgment_Audit.xlsx");
    showNotification('Audit log exported successfully.', 'success');
  };

  const getAckStats = (policyId) => {
    const totalEmps = dataService.getEmployees().length;
    const signedCount = acks.filter(a => a.policyId === policyId).length;
    return {
      signed: signedCount,
      pending: totalEmps - signedCount,
      percentage: totalEmps > 0 ? Math.round((signedCount / totalEmps) * 100) : 0
    };
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Policy Hub</h1>
          <p className="page-subtitle">Central repository for organization guidelines, compliance, and legal documents.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Policy vX.0
          </button>
        )}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--color-surface)', padding: '0.5rem', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--color-border)' }}>
          <button 
            className={`btn ${activeTab === 'browser' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('browser')}
          >
            Policy Browser
          </button>
          <button 
            className={`btn ${activeTab === 'tracker' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('tracker')}
          >
            Acknowledgement Tracker
          </button>
        </div>
      )}

      {activeTab === 'browser' ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <div className="header-search" style={{ flex: 1, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Search policies by title or category..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-outline"><Filter size={18} /> Filter</button>
          </div>

          <div className="grid-3">
            {filteredPolicies.map(p => {
              const stats = isAdmin ? getAckStats(p.id) : null;
              const acknowledged = isAcknowledged(p.id);

              return (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                  {!isAdmin && acknowledged && (
                    <div style={{ position: 'absolute', top: '10px', right: '-30px', transform: 'rotate(45deg)', background: 'var(--color-success)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '4px 30px' }}>
                      SIGNED
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={24} />
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      v{p.version}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '600' }}>{p.category}</span>
                      <span style={{ color: 'var(--color-border)' }}>•</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Updated {p.uploadDate}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.summary}
                  </p>

                  {isAdmin && stats && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                        <span>Acknowledge Status</span>
                        <span style={{ fontWeight: 'bold' }}>{stats.percentage}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-background)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${stats.percentage}%`, height: '100%', backgroundColor: stats.percentage > 80 ? 'var(--color-success)' : 'var(--color-primary)' }}></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                        {stats.signed} of {stats.signed + stats.pending} Employees Signed
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }}>
                      <Eye size={16} /> View
                    </button>
                    {!isAdmin ? (
                      acknowledged ? (
                        <button className="btn btn-outline" style={{ flex: 1.5, pointerEvents: 'none', opacity: 0.7 }}>
                          <CheckCircle size={16} style={{ marginRight: '0.4rem' }} /> Signed
                        </button>
                      ) : (
                        <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={() => handleAcknowledge(p.id)}>
                          <FileSignature size={16} style={{ marginRight: '0.4rem' }} /> Sign Policy
                        </button>
                      )
                    ) : (
                      <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--color-danger)' }} onClick={() => handleDeletePolicy(p.id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isAdmin && (
               <div className="card" style={{ border: '2px dashed var(--color-border)', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setShowUploadModal(true)}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={24} color="var(--color-text-muted)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-text-muted)' }}>Add New Policy</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PDF documents only</p>
                  </div>
               </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
            <h2>Compliance Monitoring Matrix</h2>
            <button className="btn btn-outline" onClick={handleExportAuditLog}><Download size={16}/> Export Full Audit Log</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Employee</th>
                  <th style={{ padding: '1rem' }}>Department</th>
                  {policies.map(p => (
                    <th key={p.id} style={{ padding: '1rem', fontSize: '0.75rem', textAlign: 'center', maxWidth: '100px' }}>
                      {p.title.split(' ')[0]}...
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataService.getEmployees().map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{emp.name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{emp.department}</td>
                    {policies.map(p => {
                       const signed = acks.some(a => a.policyId === p.id && a.empId === emp.id);
                       return (
                         <td key={p.id} style={{ padding: '1rem', textAlign: 'center' }}>
                           {signed ? (
                             <ShieldCheck size={20} color="var(--color-success)" />
                           ) : (
                             <div className="badge badge-danger" style={{ fontSize: '0.65rem' }}>PENDING</div>
                           )}
                         </td>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Publish New Policy</h2>
                <button className="btn btn-ghost" onClick={() => setShowUploadModal(false)}><X size={20} /></button>
             </div>

             <div className="form-group">
                <label className="form-label">Policy Title</label>
                <input type="text" className="form-input" style={{ width: '100%' }} placeholder="e.g. Leave & Attendance Policy 2026" 
                  value={newPolicy.title} onChange={e => setNewPolicy({...newPolicy, title: e.target.value})} />
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" style={{ width: '100%' }} value={newPolicy.category} onChange={e => setNewPolicy({...newPolicy, category: e.target.value})}>
                    <option>HR Policies</option>
                    <option>IT Policies</option>
                    <option>Compliance</option>
                    <option>Legal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Version</label>
                  <input type="text" className="form-input" style={{ width: '100%' }} placeholder="1.0" 
                    value={newPolicy.version} onChange={e => setNewPolicy({...newPolicy, version: e.target.value})} />
                </div>
             </div>

             <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input type="date" className="form-input" style={{ width: '100%' }}
                  value={newPolicy.effectiveDate} onChange={e => setNewPolicy({...newPolicy, effectiveDate: e.target.value})} />
             </div>

             <div style={{ border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                <ArrowUpRight size={32} color="var(--color-primary)" style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>Drop PDF Document here</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Max size 10MB</p>
             </div>

             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handlePublish}>Dispatch Policy</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyManagement;

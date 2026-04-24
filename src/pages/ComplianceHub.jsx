import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Search, Bell, BookOpen, Download, Filter, 
  AlertTriangle, Info, Clock, ExternalLink, Plus, Save, 
  Trash2, FileText, ChevronRight, History, Zap 
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { generatePDF } from '../utils/exportUtils';

const ComplianceHub = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('updates'); // 'updates' | 'manuals' | 'admin'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [selectedManual, setSelectedManual] = useState(null);

  const [updates, setUpdates] = useState(dataService.getStatutoryUpdates());
  const [manuals, setManuals] = useState(dataService.getComplianceManuals());
  const [isEditing, setIsEditing] = useState(null); // { type, item }
  const [viewHistoryManual, setViewHistoryManual] = useState(null);

  // Admin Form State
  const [formData, setFormData] = useState({
    title: '', category: 'PF', priority: 'Informational', summary: '', details: '', refLink: '', tags: ''
  });

  const categories = ['All', 'PF', 'ESIC', 'Income Tax', 'Labour Law'];

  const handleSaveUpdate = () => {
    if (!formData.title || !formData.summary) return;
    const formattedUpdate = {
      ...formData,
      date: new Date().toISOString().split('T')[0],
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };
    const newList = dataService.saveStatutoryUpdate(formattedUpdate);
    setUpdates(newList);
    setFormData({ title: '', category: 'PF', priority: 'Informational', summary: '', details: '', refLink: '', tags: '' });
  };

  const handleDeleteUpdate = (id) => {
    if (window.confirm('Are you sure you want to delete this statutory update?')) {
      const newList = dataService.deleteStatutoryUpdate(id);
      setUpdates(newList);
    }
  };

  const handleSaveManual = (m) => {
    const newList = dataService.saveComplianceManual(m);
    setManuals(newList);
  };

  const filteredUpdates = useMemo(() => {
    return updates.filter(u => {
      const matchSearch = u.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'All' || u.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [updates, searchQuery, categoryFilter]);

  const filteredManuals = useMemo(() => {
    return manuals.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [manuals, searchQuery, categoryFilter]);

  const highlightText = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} style={{ backgroundColor: 'var(--color-warning)', color: '#000', borderRadius: '2px', padding: '0 2px' }}>{part}</mark> 
            : part
        )}
      </span>
    );
  };

  const priorityColor = (p) => {
    if (p === 'Critical') return 'var(--color-danger)';
    if (p === 'Important') return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="avatar bg-primary" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div>
            <h1 className="page-title">Statutory & Compliance Hub</h1>
            <p className="page-subtitle">Real-time legislative tracking and manuals repository</p>
          </div>
        </div>

        {/* Version History Modal */}
        {viewHistoryManual && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '450px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={20} color="var(--color-primary)"/> {viewHistoryManual.title} History</h3>
                <button onClick={() => setViewHistoryManual(null)} className="btn btn-ghost" style={{ padding: '0.25rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '8px', border: '1px solid var(--color-success)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-success)' }}>Current Active Version</div>
                  <div style={{ fontWeight: 700, margin: '0.25rem 0' }}>Version {viewHistoryManual.version}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Deployed on {viewHistoryManual.lastUpdated}</div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem' }}>ARCHIVAL LOG</h4>
                  {(!viewHistoryManual.previousVersions || viewHistoryManual.previousVersions.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>No previous versions recorded.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {viewHistoryManual.previousVersions.map((v, i) => (
                        <div key={i} style={{ padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>Version {v.version}</strong>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{v.date}</div>
                          </div>
                          <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>Archived</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0, position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={18} />
            <input 
              className="form-input" 
              style={{ paddingLeft: '2.5rem', width: '100%' }} 
              placeholder="Search updates or manual content..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {userRole === 'management' && (
            <button className="btn btn-primary" onClick={() => setActiveTab('admin')}>
              <Plus size={18} /> Admin Panel
            </button>
          )}
        </div>
      </div>

      {/* Stats Ticker / Summary */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-danger) 0%, #b91c1c 100%)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Critical Updates</h4>
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{updates.filter(u => u.priority === 'Critical').length}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Immediate action required</p>
            </div>
            <AlertTriangle size={32} opacity={0.3} />
          </div>
        </div>
        <div className="card">
          <h4 style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Manuals</h4>
          <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{manuals.length}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-primary">v4.2 Latest</span>
            <span className="badge badge-outline">3 Categories</span>
          </div>
        </div>
        <div className="card">
          <h4 style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Last Sync</h4>
          <h2 style={{ fontSize: '1.2rem', margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> April 14, 18:30 PM
          </h2>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }}>
            <Zap size={14} /> Trigger Manual Scan
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button 
            style={{ background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'updates' ? 700 : 500, color: activeTab === 'updates' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'updates' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('updates')}
          >
            Live Updates
          </button>
          <button 
            style={{ background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', fontSize: '1rem', fontWeight: activeTab === 'manuals' ? 700 : 500, color: activeTab === 'manuals' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'manuals' ? '2px solid var(--color-primary)' : 'none' }}
            onClick={() => setActiveTab('manuals')}
          >
            Statutory Manuals
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'updates' && (
        <div className="grid-2 animation-slide-up">
          {filteredUpdates.length === 0 ? (
            <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '5rem' }}>
              <Info size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h3>No match found for "{searchQuery}"</h3>
              <p className="text-muted">Try a different keyword or category</p>
            </div>
          ) : (
            filteredUpdates.map(u => (
              <div key={u.id} className="card hover-scale" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => setSelectedUpdate(u)}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: priorityColor(u.priority) }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-outline" style={{ borderColor: priorityColor(u.priority), color: priorityColor(u.priority) }}>
                    {u.priority} Update
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.date}</span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{highlightText(u.title, searchQuery)}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  {highlightText(u.summary, searchQuery)}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {u.tags.map(t => <span key={t} style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-background)', padding: '2px 8px', borderRadius: '4px' }}>#{t}</span>)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'manuals' && (
        <div className="grid-3 animation-slide-up">
          {filteredManuals.map(m => (
            <div key={m.id} className="card hover-scale" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} onClick={() => setSelectedManual(m)}>
              <div style={{ width: '80px', height: '100px', backgroundColor: 'var(--color-background)', border: '2px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <BookOpen size={40} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{highlightText(m.title, searchQuery)}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.category} • v{m.version}</p>
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.6, width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                Updated: {m.lastUpdated}
              </div>
              {searchQuery && m.content.toLowerCase().includes(searchQuery.toLowerCase()) && (
                <div style={{ fontSize: '0.7rem', fontStyle: 'italic', backgroundColor: 'rgba(255, 255, 0, 0.1)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                  ...{highlightText(m.content.slice(0, 100), searchQuery)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Modal for Updates */}
      {selectedUpdate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: '3rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <span className="badge badge-primary">{selectedUpdate.category} Notification</span>
              <button onClick={() => setSelectedUpdate(null)} className="btn btn-ghost">✕</button>
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{selectedUpdate.title}</h1>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <div><label style={{ opacity: 0.6 }}>Date Issued:</label><br/><strong>{selectedUpdate.date}</strong></div>
              <div><label style={{ opacity: 0.6 }}>Priority:</label><br/><strong style={{ color: priorityColor(selectedUpdate.priority) }}>{selectedUpdate.priority}</strong></div>
              <div><label style={{ opacity: 0.6 }}>Effective From:</label><br/><strong>2026-04-01</strong></div>
            </div>
            <div style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
              {selectedUpdate.details}
            </div>
            <div className="card" style={{ marginTop: '2.5rem', backgroundColor: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ExternalLink size={18}/> Reference Links</h4>
              <a href={selectedUpdate.refLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                Official Gazette Notification - EPFO/2026/{selectedUpdate.id} 
              </a>
            </div>
          </div>
        </div>
      )}

      {/* "View Only" Manual Viewer Modal */}
      {selectedManual && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '64px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <BookOpen size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0 }}>{selectedManual.title}</h3>
              <span className="badge badge-outline">v{selectedManual.version}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.6, borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
                <History size={16} /> Previous Versions Available
              </div>
              <button className="btn btn-outline" onClick={() => generatePDF('compliance-manual-capture', `${selectedManual.title}.pdf`)}>
                <Download size={18} /> Download PDF
              </button>
              <button onClick={() => setSelectedManual(null)} className="btn btn-primary">Close Viewer</button>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#525659', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <div id="compliance-manual-capture" style={{ width: '100%', maxWidth: '850px', backgroundColor: '#fff', color: '#000', padding: '4rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minHeight: '1200px', position: 'relative' }}>
              {/* Watermark Simulation */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', transform: 'rotate(-45deg)', opacity: 0.05, fontSize: '5rem', fontWeight: 900 }}>
                HRMS CONFIDENTIAL - VIEW ONLY
              </div>
              
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Manual Category: {selectedManual.category}</h1>
                <p style={{ margin: 0 }}>Official Statutory Compliance Documentation</p>
              </div>

              <div style={{ lineHeight: '2', fontSize: '1.2rem' }}>
                <p>{selectedManual.content}</p>
                <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <h3>Section 1.1: Applicability</h3>
                  <p>This document is applicable to all employees as defined under the HRMS Governance Board guidelines of 2026. Any changes made to the central legislation will supersede the contents of this handbook immediately.</p>
                </div>
                <div style={{ marginTop: '2rem' }}>
                  <h3>Section 1.2: Compliance Checkpoints</h3>
                  <ul>
                    <li>Bi-annual verification of contribution rates.</li>
                    <li>Digital submission of forms via the Unified Portal.</li>
                    <li>Audit ready reporting for internal and external agencies.</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: '4rem', padding: '2rem', background: '#f1f5f9', borderRadius: '8px' }}>
                <h4>Revision History</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Version</th>
                      <th style={{ padding: '0.5rem' }}>Date</th>
                      <th style={{ padding: '0.5rem' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>{selectedManual.version} (Active)</td>
                      <td style={{ padding: '0.5rem' }}>{selectedManual.lastUpdated}</td>
                      <td style={{ padding: '0.5rem' }}>Current compliance benchmark.</td>
                    </tr>
                    {selectedManual.previousVersions.map(v => (
                      <tr key={v.version} style={{ opacity: 0.6 }}>
                        <td style={{ padding: '0.5rem' }}>{v.version}</td>
                        <td style={{ padding: '0.5rem' }}>{v.date}</td>
                        <td style={{ padding: '0.5rem' }}>{v.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Tab */}
      {activeTab === 'admin' && (
        <div className="animation-slide-up">
          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}><Zap size={20} color="var(--color-primary)"/> Add Statutory Update</h3>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input 
                  type="text" className="form-input" style={{ width: '100%' }} 
                  placeholder="e.g. PF Interest Rate 2026" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-input" style={{ width: '100%' }}
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option>PF</option>
                    <option>ESIC</option>
                    <option>Income Tax</option>
                    <option>Labour Law</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select 
                    className="form-input" style={{ width: '100%' }}
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    <option>Informational</option>
                    <option>Important</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Short Summary (Dashboard Widget)</label>
                <input 
                  type="text" className="form-input" style={{ width: '100%' }} 
                  placeholder="2-3 lines overview" 
                  value={formData.summary}
                  onChange={e => setFormData({...formData, summary: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Detailed Explanation</label>
                <textarea 
                  className="form-input" style={{ width: '100%' }} rows="5"
                  value={formData.details}
                  onChange={e => setFormData({...formData, details: e.target.value})}
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input 
                  type="text" className="form-input" style={{ width: '100%' }} 
                  placeholder="tax, pf, 2026" 
                  value={formData.tags}
                  onChange={e => setFormData({...formData, tags: e.target.value})}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveUpdate}>
                <Plus size={18} /> Publish to Hub
              </button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}><BookOpen size={20} color="var(--color-primary)"/> Manage Repository Content</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Updates ({updates.length})</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {updates.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{u.title}</span>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{u.category} • {u.date}</div>
                      </div>
                      <button onClick={() => handleDeleteUpdate(u.id)} className="btn btn-ghost" style={{ color: 'var(--color-danger)', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '1rem 0 0', opacity: 0.6, fontSize: '0.8rem', textTransform: 'uppercase' }}>Manuals Vault ({manuals.length})</h4>
                {manuals.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{m.title}</h4>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Current v{m.version}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-ghost" 
                        style={{ fontSize: '0.75rem' }} 
                        title="View Version History"
                        onClick={() => setViewHistoryManual(m)}
                      >
                        <History size={16}/>
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '2rem', padding: '2rem', border: '2px dashed var(--color-border)', borderRadius: '12px', textAlign: 'center' }}>
                <Plus size={32} style={{ opacity: 0.2 }} />
                <p>Drag & Drop PDF to register new manual</p>
                <button className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Browse Workspace</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceHub;

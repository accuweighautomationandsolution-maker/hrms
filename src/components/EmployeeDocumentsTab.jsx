import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Trash2, Eye, UploadCloud, FilePlus, 
  Briefcase, ShieldCheck, Award, LogOut, CheckCircle, Save
} from 'lucide-react';
import { dataService } from '../utils/dataService';

const CATEGORIES = {
  'Onboarding & Employment': {
    icon: <Briefcase size={18} />,
    types: ['Offer Letter', 'Joining Letter', 'Appointment Letter', 'Confirmation Letter', 'Contract / Agreement Letter', 'NDA / Confidentiality Agreement', 'Probation Letter']
  },
  'Employment Lifecycle': {
    icon: <CheckCircle size={18} />,
    types: ['Promotion Letter', 'Increment Letter', 'Salary Revision Letter', 'Transfer Letter', 'Department Change Letter', 'Role Change Letter']
  },
  'HR & Compliance': {
    icon: <ShieldCheck size={18} />,
    types: ['Memo', 'Individual Notice', 'Warning Letter', 'Show Cause Notice', 'Suspension Letter', 'Termination Letter', 'Disciplinary Action Documents']
  },
  'Recognition & Development': {
    icon: <Award size={18} />,
    types: ['Appreciation / Achievement Letter', 'Reward & Recognition Letters', 'Training Certificates', 'Performance Review Documents']
  },
  'Exit Management': {
    icon: <LogOut size={18} />,
    types: ['Resignation Letter', 'Acceptance of Resignation', 'Relieving Letter', 'Experience Letter', 'Full & Final Settlement Documents', 'Exit Clearance Documents', 'Exit / Termination Documents']
  }
};

const EmployeeDocumentsTab = ({ empId, employeeName }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success'|'error', text: string }
  const [uploadForm, setUploadForm] = useState({ category: Object.keys(CATEGORIES)[0], docType: CATEGORIES[Object.keys(CATEGORIES)[0]].types[0], file: null });

  useEffect(() => {
    if (empId) {
      loadDocuments();
    }
  }, [empId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await dataService.getEmployeeDocs(empId);
      setDocuments(docs || []);
    } catch (e) {
      console.error("Vault: Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
        alert("File size exceeds 10MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadForm(prev => ({ 
          ...prev, 
          file: { 
            name: file.name, 
            size: file.size, 
            type: file.type, 
            content: ev.target.result 
          } 
        }));
      };
      reader.onerror = () => alert("Failed to read file.");
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.file) { setStatusMsg({ type: 'error', text: 'Please select a file first.' }); return; }
    if (!empId) { setStatusMsg({ type: 'error', text: 'Employee profile not saved yet. Save the profile before uploading.' }); return; }
    
    setUploading(true);
    setStatusMsg(null);
    
    // Safety Timeout: 30 seconds
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout after 30s. Check your connection and try again.')), 30000)
    );

    try {
      console.log(`Vault: Committing document for empId=${empId}, category=${uploadForm.category}`);
      
      await Promise.race([
        dataService.addEmployeeDoc({
          empId: empId,
          category: uploadForm.category,
          docType: uploadForm.docType,
          uploadedBy: 'HR Admin',
          status: 'Active',
          version: 1,
          ...uploadForm.file
        }),
        timeout
      ]);

      setStatusMsg({ type: 'success', text: `✓ "${uploadForm.file.name}" uploaded successfully.` });
      setShowUpload(false);
      setUploadForm(prev => ({ ...prev, file: null }));
      await loadDocuments();
    } catch (e) {
      console.error('Vault: Upload failure:', e);
      setStatusMsg({ type: 'error', text: `Upload Failed: ${e.message || 'Server did not respond. Try again.'}` });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Are you sure you want to delete this document permanently?')) {
      try {
        await dataService.deleteEmployeeDoc(docId, empId);
        setStatusMsg({ type: 'success', text: 'Document deleted.' });
        await loadDocuments();
      } catch (e) {
        setStatusMsg({ type: 'error', text: 'Failed to delete document.' });
      }
    }
  };

  const downloadDoc = (doc) => {
    try {
      if (doc.type === 'text/html' || (doc.content && doc.content.startsWith('<!DOCTYPE'))) {
         const printWindow = window.open('', '_blank');
         printWindow.document.write(doc.content);
         printWindow.document.close();
         setTimeout(() => {
           printWindow.print();
         }, 500);
      } else {
         const a = document.createElement('a');
         a.href = doc.content;
         a.download = doc.name;
         a.click();
      }
    } catch (e) {
      alert("Failed to open document.");
    }
  };

  // Grouping including "Other" for anything not in CATEGORIES
  const groupedDocs = documents.reduce((acc, doc) => {
    const cat = CATEGORIES[doc.category] ? doc.category : 'Other / Uncategorized';
    acc[cat] = acc[cat] || [];
    acc[cat].push(doc);
    return acc;
  }, {});

  // Extended categories list for rendering including 'Other' if it has docs
  const renderCategories = [...Object.keys(CATEGORIES)];
  if (groupedDocs['Other / Uncategorized']) {
    renderCategories.push('Other / Uncategorized');
  }

  if (loading) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
      <p>Syncing Vault Records...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Status Banner */}
      {statusMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          backgroundColor: statusMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem',
          fontWeight: '500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.6 }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)', margin: 0 }}>Employee Profile Vault</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Official digital records for {employeeName}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel' : <><UploadCloud size={18} /> Upload Document</>}
        </button>
      </div>

      {showUpload && (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>Secure Upload Pipeline</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Classification Category</label>
              <select className="form-input" style={{ width: '100%' }} value={uploadForm.category} onChange={e => setUploadForm(prev => ({ ...prev, category: e.target.value, docType: CATEGORIES[e.target.value].types[0] }))}>
                {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Document Designation</label>
              <select className="form-input" style={{ width: '100%' }} value={uploadForm.docType} onChange={e => setUploadForm(prev => ({ ...prev, docType: e.target.value }))}>
                {CATEGORIES[uploadForm.category].types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target File (PDF, Images - Max 10MB)</label>
            <input type="file" className="form-input" style={{ width: '100%' }} onChange={handleFileChange} accept=".pdf,image/*" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-ghost" onClick={() => setShowUpload(false)}>Dismiss</button>
            <button className="btn btn-success" onClick={handleUploadSubmit} disabled={!uploadForm.file || uploading}>
              {uploading ? 'Uploading...' : <><Save size={18} /> Commit to Vault</>}
            </button>
          </div>
        </div>
      )}

      {documents.length === 0 && !showUpload && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '2px dashed var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--color-surface)' }}>
          <ShieldCheck size={64} style={{ opacity: 0.1, marginBottom: '1.5rem', color: 'var(--color-primary)' }} />
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-main)' }}>Vault is Empty</h3>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>No official documents have been uploaded for this profile yet. Use the upload button to add records.</p>
        </div>
      )}

      {renderCategories.map(cat => {
        const docs = groupedDocs[cat] || [];
        if (docs.length === 0) return null;
        
        const isStandard = CATEGORIES[cat];
        
        return (
          <div key={cat} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '600' }}>
              <span style={{ color: isStandard ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {isStandard ? CATEGORIES[cat].icon : <FileText size={18} />}
              </span>
              <span style={{ fontSize: '0.95rem' }}>{cat}</span>
              <span className="badge badge-blue" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{docs.length} Records</span>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600' }}>Designation</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600' }}>Timestamp</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600' }}>Vers</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover-row">
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ padding: '6px', backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: '6px' }}>
                            <FileText size={14} color="var(--color-primary)" />
                          </div>
                          <div>
                            <div style={{ color: 'var(--color-text-main)' }}>{d.docType}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{d.name} ({(d.size / 1024).toFixed(1)} KB)</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}</td>
                      <td style={{ padding: '1rem' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{d.status}</span></td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>v{d.version}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} onClick={() => downloadDoc(d)} title="View / Download">
                            <Download size={18} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} onClick={() => handleDelete(d.id)} title="Purge Record">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeDocumentsTab;

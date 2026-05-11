import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Trash2, Eye, UploadCloud, FilePlus, 
  Briefcase, ShieldCheck, Award, LogOut, CheckCircle 
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
  const [uploadForm, setUploadForm] = useState({ category: Object.keys(CATEGORIES)[0], docType: CATEGORIES[Object.keys(CATEGORIES)[0]].types[0], file: null });

  useEffect(() => {
    loadDocuments();
  }, [empId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await dataService.getEmployeeDocs(empId);
      setDocuments(docs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadForm(prev => ({ ...prev, file: { name: file.name, size: file.size, type: file.type, content: ev.target.result } }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.file) return alert('Please select a file.');
    
    try {
      await dataService.addEmployeeDoc({
        empId: empId,
        category: uploadForm.category,
        docType: uploadForm.docType,
        uploadedBy: 'HR Admin', // In a real app, from auth state
        status: 'Active',
        version: 1,
        ...uploadForm.file
      });
      alert('Document uploaded successfully.');
      setShowUpload(false);
      setUploadForm(prev => ({ ...prev, file: null }));
      loadDocuments();
    } catch (e) {
      console.error(e);
      alert('Failed to upload document.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this document permanently?")) {
      await dataService.deleteEmployeeDoc(id);
      loadDocuments();
    }
  };

  const downloadDoc = (doc) => {
    if (doc.type === 'text/html') {
       // Convert HTML to a printable window
       const printWindow = window.open('', '_blank');
       printWindow.document.write(doc.content);
       printWindow.document.close();
       setTimeout(() => {
         printWindow.print();
       }, 500);
    } else {
       // Data URL download (e.g. base64 image or PDF)
       const a = document.createElement('a');
       a.href = doc.content;
       a.download = doc.name;
       a.click();
    }
  };

  const groupedDocs = documents.reduce((acc, doc) => {
    acc[doc.category] = acc[doc.category] || [];
    acc[doc.category].push(doc);
    return acc;
  }, {});

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading documents...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)', margin: 0 }}>Official Documents</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Manage records for {employeeName}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel Upload' : <><UploadCloud size={18} /> Upload New</>}
        </button>
      </div>

      {showUpload && (
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Upload Document</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" style={{ width: '100%' }} value={uploadForm.category} onChange={e => setUploadForm(prev => ({ ...prev, category: e.target.value, docType: CATEGORIES[e.target.value].types[0] }))}>
                {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Document Type</label>
              <select className="form-input" style={{ width: '100%' }} value={uploadForm.docType} onChange={e => setUploadForm(prev => ({ ...prev, docType: e.target.value }))}>
                {CATEGORIES[uploadForm.category].types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Select File (PDF, Image - Max 5MB)</label>
            <input type="file" className="form-input" style={{ width: '100%' }} onChange={handleFileChange} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-success" onClick={handleUploadSubmit} disabled={!uploadForm.file}>
              <Save size={18} /> Save to Profile
            </button>
          </div>
        </div>
      )}

      {documents.length === 0 && !showUpload && (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)' }}>
          <FilePlus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No official documents found for this employee.</p>
        </div>
      )}

      {Object.keys(CATEGORIES).map(cat => {
        const docs = groupedDocs[cat] || [];
        if (docs.length === 0) return null;
        
        return (
          <div key={cat} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              <span style={{ color: 'var(--color-primary)' }}>{CATEGORIES[cat].icon}</span>
              {cat} <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>{docs.length}</span>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '500' }}>Document Type</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '500' }}>Issue/Upload Date</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '500' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '500' }}>Ver</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: '500' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="var(--color-primary)" /> {d.docType}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem' }}><span className="badge badge-success">{d.status}</span></td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>v{d.version}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }} onClick={() => downloadDoc(d)} title="View / Download">
                            <Download size={16} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }} onClick={() => handleDelete(d.id)} title="Delete">
                            <Trash2 size={16} />
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

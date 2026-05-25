import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  Search,
  ShieldCheck,
  Info,
  FolderOpen
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const MyDocuments = () => {
    const currentUser = authService.getCurrentUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [docs, setDocs] = useState([]);
    const [activeEmp, setActiveEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const filteredDocs = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return docs.filter(d =>
            (d.docType || '').toLowerCase().includes(term) ||
            (d.category || '').toLowerCase().includes(term) ||
            (d.name || '').toLowerCase().includes(term)
        );
    }, [docs, searchTerm]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            setLoading(true);
            setError(null);
            try {
                // Step 1: Resolve this user's EMPLOYEE record (vault is keyed by employee DB id)
                const myProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
                setActiveEmp(myProfile);

                if (!myProfile) {
                    // No linked employee record found — show empty, don't crash
                    setDocs([]);
                    return;
                }

                // Step 2: Fetch vault docs using the resolved employee DB id
                const docsData = await dataService.getEmployeeDocs(myProfile.id);
                setDocs(Array.isArray(docsData) ? docsData : []);
            } catch (err) {
                console.error("Failed to load personal documents:", err);
                setError("Could not load your documents. Please try again.");
                setDocs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser?.id]);

    const handleView = (doc) => {
        try {
            if (!doc.content) {
                alert("Document content is not available for preview.");
                return;
            }
            if (doc.content.startsWith('http')) {
                // Signed URL from Supabase Storage — open in new tab
                window.open(doc.content, '_blank');
            } else if (doc.content.startsWith('<!DOCTYPE') || doc.type === 'text/html') {
                const w = window.open('', '_blank');
                w.document.write(doc.content);
                w.document.close();
            } else if (doc.content.startsWith('data:')) {
                // base64 data URL — convert to Blob URL and view in new tab
                const base64Parts = doc.content.split(',');
                const mimeType = base64Parts[0].match(/:(.*?);/)[1];
                const base64Data = base64Parts[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            } else {
                // General content fallback — open in new tab
                const w = window.open('', '_blank');
                w.document.write(doc.content);
                w.document.close();
            }
        } catch (e) {
            console.error("Failed to view document:", e);
            alert("Failed to open document for viewing.");
        }
    };

    const handleDownload = (doc) => {
        try {
            if (!doc.content) {
                alert("Document content is not available for download.");
                return;
            }
            if (doc.content.startsWith('http')) {
                // Signed URL from Supabase Storage
                fetch(doc.content)
                    .then(response => response.blob())
                    .then(blob => {
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = doc.name || 'document';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                    })
                    .catch(() => {
                        const a = document.createElement('a');
                        a.href = doc.content;
                        a.download = doc.name;
                        a.target = '_blank';
                        a.click();
                    });
            } else if (doc.content.startsWith('data:')) {
                // base64 data URL
                const a = document.createElement('a');
                a.href = doc.content;
                a.download = doc.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                const a = document.createElement('a');
                const blob = new Blob([doc.content], { type: doc.type || 'text/plain' });
                const blobUrl = URL.createObjectURL(blob);
                a.href = blobUrl;
                a.download = doc.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }
        } catch (e) {
            console.error("Failed to download document:", e);
            alert("Failed to download document.");
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">My Documents</h1>
                    <p className="page-subtitle">Secure access to your official HR documents, letters, and signed agreements.</p>
                </div>
                <div style={{ backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldCheck size={18} color="var(--color-success)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                        {activeEmp ? activeEmp.name : 'Employee'} — Verified Folder
                    </span>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {activeEmp?.category === 'Contractual Worker' && (
                <div style={{ 
                    padding: '1.25rem', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(37,99,235,0.05)', 
                    border: '1px solid rgba(37,99,235,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <Info size={24} color="var(--color-primary)" />
                    <div>
                        <h4 style={{ margin: 0 }}>Contract Information</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Your current contract is valid until <strong>{activeEmp?.contractEndDate || 'TBD'}</strong>. Automated renewal triggers every 6 months.
                        </p>
                    </div>
                </div>
            )}

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div className="header-search" style={{ width: '300px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Search documents..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} found
                    </span>
                </div>

                {filteredDocs.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '2px dashed var(--color-border)', borderRadius: '12px', backgroundColor: 'var(--color-surface)' }}>
                        <FolderOpen size={56} style={{ opacity: 0.15, marginBottom: '1rem', color: 'var(--color-primary)' }} />
                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-main)' }}>
                            {searchTerm ? 'No matching documents' : 'No Documents Yet'}
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', maxWidth: '360px', margin: '0 auto', fontSize: '0.875rem' }}>
                            {searchTerm 
                                ? 'Try a different search term.'
                                : 'Your HR-uploaded documents will appear here once added by the admin.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Document</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Category</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Uploaded On</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Uploaded By</th>
                                    <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocs.map(d => (
                                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover-row">
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'rgba(37,99,235,0.07)', color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{d.docType || d.name || 'Document'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                        {d.name} {d.size ? `· ${(d.size / 1024).toFixed(1)} KB` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)', borderRadius: '12px', fontWeight: '500' }}>
                                                {d.category || 'General'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                            {d.uploadedBy || 'HR Admin'}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem', display: 'inline-flex', alignItems: 'center' }}
                                                    onClick={() => handleView(d)}
                                                    title="View Online"
                                                >
                                                    <Eye size={15} /> View
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem', display: 'inline-flex', alignItems: 'center' }}
                                                    onClick={() => handleDownload(d)}
                                                    title="Download"
                                                >
                                                    <Download size={15} /> Download
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Need a hard copy or have questions about these documents? <br/>
                    Contact your HR Administrator.
                </p>
            </div>
        </div>
    );
};

export default MyDocuments;

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  Search,
  ShieldCheck,
  Info
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const MyDocuments = () => {
    const currentUser = authService.getCurrentUser();
    const [searchTerm, setSearchTerm] = useState('');
    const [docs, setDocs] = useState([]);
    const [activeEmp, setActiveEmp] = useState(null);
    const [loading, setLoading] = useState(true);

    const filteredDocs = useMemo(() => {
        return docs.filter(d => 
            d.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [docs, searchTerm]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [docsData, empsData] = await Promise.all([
                    dataService.getEmployeeDocs(currentUser.id),
                    dataService.getEmployees()
                ]);
                setDocs(docsData);
                const emp = empsData.find(e => e.id === currentUser.id);
                setActiveEmp(emp);
            } catch (err) {
                console.error("Failed to load personal documents:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser.id]);

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
                    <h1 className="page-title">My Letters & Agreements</h1>
                    <p className="page-subtitle">Secure access to your official HR documents, letters, and signed agreements.</p>
                </div>
                <div style={{ backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldCheck size={18} color="var(--color-success)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Verified Employee Folder</span>
                </div>
            </div>

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
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="header-search" style={{ width: '300px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Filter your letters..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Document Type</th>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Issuance Date</th>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <FileText size={48} color="var(--color-text-muted)" />
                                            <p>No documents found in your digital folder yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map(d => (
                                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'rgba(37,99,235,0.05)', color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{d.type}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Official Digital Copy</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            {new Date(d.uploadDate || Date.now()).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <span className={`badge badge-${d.status === 'Signed' ? 'success' : 'primary'}`}>
                                                {d.status === 'Signed' ? <CheckCircle size={10} style={{marginRight:4}} /> : <Clock size={10} style={{marginRight:4}} />}
                                                {d.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost" title="Quick View">
                                                    <Eye size={18} />
                                                </button>
                                                {d.signedLink && (
                                                    <a 
                                                        href={d.signedLink} 
                                                        download={`${d.type}_Signed.pdf`}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    >
                                                        <Download size={14} /> Download
                                                    </a>
                                                )}
                                                {!d.signedLink && (
                                                    <button className="btn btn-ghost" style={{ opacity: 0.5 }} disabled>
                                                        <Download size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Need a hard copy or have questions about these documents? <br/>
                    Contact HR Operations at <strong>support@antigravityhr.com</strong>
                </p>
            </div>
        </div>
    );
};

export default MyDocuments;

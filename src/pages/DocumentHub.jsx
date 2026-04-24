import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Upload, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  Send,
  Eye,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const DocumentHub = () => {
    const [activeTab, setActiveTab] = useState('generation');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    
    // Data states
    const [templates] = useState(dataService.getLetterTemplates());
    const [candidates, setCandidates] = useState(dataService.getCandidates());
    const [employees] = useState(dataService.getEmployees());
    const [documents, setDocuments] = useState(dataService.getEmployeeDocs());
    
    const previewRef = useRef(null);

    // Filter Logic
    const generationQueue = useMemo(() => {
        const queue = [];
        
        // Candidates selected -> Offer Letter
        candidates.filter(c => c.status === 'Selected').forEach(c => {
            queue.push({ id: `q_offer_${c.id}`, target: c, type: 'Offer Letter', category: 'Recruitment', priority: 'High', date: c.date });
        });

        // Candidates Offer Accepted -> Appointment Letter
        candidates.filter(c => c.status === 'Offer Accepted').forEach(c => {
            queue.push({ id: `q_app_${c.id}`, target: c, type: 'Appointment Letter', category: 'Onboarding', priority: 'Critical', date: new Date().toISOString().split('T')[0] });
        });

        // DOJ reached -> Joining Letter
        const today = new Date().toISOString().split('T')[0];
        employees.filter(e => e.joiningDate === today).forEach(e => {
            queue.push({ id: `q_join_${e.id}`, target: e, type: 'Joining Letter', category: 'Lifecycle', priority: 'Medium', date: today });
        });

        return queue.filter(q => q.target.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [candidates, employees, searchTerm]);

    const activeDocuments = useMemo(() => {
        return documents.filter(d => 
            d.empName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            d.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [documents, searchTerm]);

    // Letter Generation Helper
    const replaceTags = (content, data) => {
        let result = content;
        const replacements = {
            '{{employee_name}}': data.name,
            '{{designation}}': data.role || data.designation,
            '{{department}}': data.department,
            '{{salary}}': (data.ctc || data.grossSalary || 0).toLocaleString(),
            '{{joining_date}}': data.date || data.joiningDate || 'TBD',
            '{{company_name}}': 'Antigravity HR Solutions',
            '{{hr_name}}': authService.getCurrentUser()?.name || 'HR Manager'
        };

        Object.keys(replacements).forEach(tag => {
            result = result.split(tag).join(replacements[tag]);
        });
        return result;
    };

    const generatePDF = async (template, item) => {
        const html = replaceTags(template.content, item.target || item);
        
        // Modal logic for preview
        setSelectedDoc({ template, item, renderedHtml: html });
        setIsPreviewing(true);
    };

    const downloadPDF = async () => {
        if (!previewRef.current) return;
        
        const canvas = await html2canvas(previewRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${selectedDoc.template.type}_${selectedDoc.item.target?.name || selectedDoc.item.name}.pdf`);
        
        // After generation, add to record
        const newDoc = {
            empId: selectedDoc.item.target?.id || selectedDoc.item.id,
            empName: selectedDoc.item.target?.name || selectedDoc.item.name,
            type: selectedDoc.template.type,
            status: 'Generated',
            originalContent: selectedDoc.renderedHtml
        };
        const updated = dataService.addEmployeeDoc(newDoc);
        setDocuments(updated);
        setIsPreviewing(false);
    };

    const handleFileUpload = (docId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const list = dataService.getEmployeeDocs();
                const updated = list.map(d => {
                    if (d.id === docId) return { ...d, status: 'Signed', signedLink: reader.result };
                    return d;
                });
                dataService.saveEmployeeDocs(updated);
                setDocuments(updated);
                alert('Signed document successfully uploaded and locked.');
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Admin Document Hub</h1>
                    <p className="page-subtitle">Generate letters, track issuance, and manage signed employee records.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                {[
                    { id: 'generation', label: 'Generation Queue', icon: RotateCcw, count: generationQueue.length },
                    { id: 'active', label: 'Active Documents', icon: FileCheck, count: activeDocuments.length },
                    { id: 'templates', label: 'Template Library', icon: FileText, count: templates.length }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '1rem 0.5rem',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                            fontWeight: activeTab === tab.id ? '700' : '500',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span style={{ 
                                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : '#e2e8f0', 
                                color: activeTab === tab.id ? 'white' : 'var(--color-text-muted)', 
                                padding: '1px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem' 
                            }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div className="header-search" style={{ width: '400px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'generation' ? "Search candidates/employees queue..." : "Search issued letters..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab === 'templates' && (
                        <Link to="/letter-templates" className="btn btn-primary">Manage Templates</Link>
                    )}
                </div>

                {activeTab === 'generation' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Issuance Type</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Target Recipient</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Trigger Condition</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Priority</th>
                                    <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {generationQueue.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No pending document triggers detected.</td></tr>
                                ) : (
                                    generationQueue.map(q => (
                                        <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: '600' }}>{q.type}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>{q.category}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: '500' }}>{q.target.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{q.target.role || q.target.designation}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <CheckCircle size={14} color="var(--color-success)" />
                                                    {q.type === 'Offer Letter' ? 'Selection Confirmed' : q.type === 'Appointment Letter' ? 'Offer Accepted' : 'Joining Today'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <span className={`badge badge-${q.priority === 'Critical' ? 'danger' : q.priority === 'High' ? 'warning' : 'primary'}`}>
                                                    {q.priority}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                    onClick={() => generatePDF(templates.find(t => t.type === q.type) || templates[0], q)}
                                                >
                                                    <FileText size={14} /> Draft Letter
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'active' && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Document Detail</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Generated Date</th>
                                    <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
                                    <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeDocuments.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No issued documents found in history.</td></tr>
                                ) : (
                                    activeDocuments.map(d => (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <div style={{ fontWeight: '600' }}>{d.type}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {d.id}</div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem' }}>{d.empName}</td>
                                            <td style={{ padding: '1.25rem 1rem' }}>{new Date(d.uploadDate).toLocaleDateString()}</td>
                                            <td style={{ padding: '1.25rem 1rem' }}>
                                                <span className={`badge badge-${d.status === 'Signed' ? 'success' : 'warning'}`}>
                                                    {d.status === 'Signed' ? <CheckCircle size={10} style={{marginRight:4}} /> : <Clock size={10} style={{marginRight:4}} />}
                                                    {d.status === 'Signed' ? 'Locked & Signed' : 'Awaiting Signature'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost" title="View Original"><Eye size={16} /></button>
                                                    {d.status !== 'Signed' && (
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                                            onClick={() => handleFileUpload(d.id)}
                                                        >
                                                            <Upload size={14} /> Upload Signed
                                                        </button>
                                                    )}
                                                    {d.status === 'Signed' && (
                                                        <button className="btn btn-ghost" style={{ color: 'var(--color-success)' }}>
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
                )}
            </div>

            {/* Document Preview Modal */}
            {isPreviewing && selectedDoc && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Preview: {selectedDoc.template.type}</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Target: {selectedDoc.item.target?.name || selectedDoc.item.name}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-ghost" onClick={() => setIsPreviewing(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={downloadPDF}>
                                    <Printer size={18} /> Confirm & Download PDF
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '3rem', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                            <div 
                                ref={previewRef}
                                style={{ 
                                    backgroundColor: 'white', 
                                    width: '210mm', 
                                    minHeight: '297mm', 
                                    padding: '25mm', 
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                    color: '#000'
                                }}
                                dangerouslySetInnerHTML={{ __html: selectedDoc.renderedHtml }}
                            />
                        </div>
                        
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderTop: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <AlertTriangle size={20} color="var(--color-warning)" />
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e' }}>
                                <strong>Manual Verification required:</strong> Ensure all variables (tag placeholders) have been correctly replaced before confirming conversion to PDF.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentHub;

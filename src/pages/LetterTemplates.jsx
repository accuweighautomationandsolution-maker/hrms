import React, { useState, useMemo } from 'react';
import RichTextEditor from '../components/RichTextEditor';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  Variable, 
  Eye,
  Settings,
  X
} from 'lucide-react';
import { dataService } from '../utils/dataService';

const VARIABLE_TAGS = [
    { tag: '{{employee_name}}', description: 'Full Name of the Employee' },
    { tag: '{{designation}}', description: 'Role / Designation' },
    { tag: '{{department}}', description: 'Department Name' },
    { tag: '{{salary}}', description: 'Annual CTC (Formatted)' },
    { tag: '{{joining_date}}', description: 'Expected / Actual Date of Joining' },
    { tag: '{{contract_start_date}}', description: 'Contract Commencement Date' },
    { tag: '{{contract_end_date}}', description: 'Contract Expiry Date' },
    { tag: '{{company_name}}', description: 'Antigravity HR Solutions' },
    { tag: '{{hr_name}}', description: 'Name of issuing HR Manager' }
];

const LetterTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                const data = await dataService.getLetterTemplates();
                setTemplates(data || []);
            } catch (err) {
                console.error("Failed to load templates:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ type: '', subject: '', content: '' });

    const openEdit = (template = null) => {
        if (template) {
            setSelectedTemplate(template);
            setEditForm({ ...template });
        } else {
            setSelectedTemplate(null);
            setEditForm({ type: '', subject: '', content: '<h1>New Template</h1><p>Start typing here...</p>' });
        }
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!editForm.type || !editForm.subject || !editForm.content) {
            alert('Please fill all template fields.');
            return;
        }

        let newList;
        if (selectedTemplate) {
            newList = templates.map(t => t.id === selectedTemplate.id ? { ...t, ...editForm } : t);
        } else {
            newList = [...templates, { ...editForm, id: `temp_${Date.now()}` }];
        }

        setTemplates(newList);
        await dataService.saveLetterTemplates(newList);
        setIsEditing(false);
        alert('Template saved successfully.');
    };

    const deleteTemplate = async (id) => {
        if (window.confirm('Delete this template permanently?')) {
            const newList = templates.filter(t => t.id !== id);
            setTemplates(newList);
            await dataService.saveLetterTemplates(newList);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const insertTag = (tag) => {
        // Simple append for now, more advanced would be cursor position insertion
        setEditForm(prev => ({ ...prev, content: prev.content + ' ' + tag + ' ' }));
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Letter Template Engine</h1>
                    <p className="page-subtitle">Design dynamic, standardized documentation using Rich Text and smart variables.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openEdit()}>
                    <Plus size={18} /> Create New Template
                </button>
            </div>

            {!isEditing ? (
                <div className="grid-3">
                    {templates.map(t => (
                        <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0 }}>{t.type}</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created: {t.date || 'System Standard'}</p>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', flex: 1 }}>{t.subject}</p>
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openEdit(t)}>
                                    <Settings size={14} /> Edit
                                </button>
                                <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => deleteTemplate(t.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>{selectedTemplate ? 'Modify Template' : 'New Template Construction'}</h3>
                            <button className="btn btn-ghost" onClick={() => setIsEditing(false)}><X size={20}/></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Letter Type</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Promotion Letter" 
                                    className="form-input" 
                                    value={editForm.type}
                                    onChange={e => setEditForm(prev => ({...prev, type: e.target.value}))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Default Email/Letter Subject</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Congratulations on your promotion!" 
                                    className="form-input" 
                                    value={editForm.subject}
                                    onChange={e => setEditForm(prev => ({...prev, subject: e.target.value}))}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label className="form-label">Body Content (HTML Editor)</label>
                            <RichTextEditor 
                                value={editForm.content} 
                                onChange={(content) => setEditForm(prev => ({...prev, content}))}
                                height="400px"
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-outline" onClick={() => setIsEditing(false)}>Discard</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} /> Save Template
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                            <Variable size={18} color="var(--color-primary)" />
                            <h4 style={{ margin: 0 }}>Variables Map</h4>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Click a tag to append it to the document body.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {VARIABLE_TAGS.map(v => (
                                <button 
                                    key={v.tag} 
                                    className="btn btn-ghost" 
                                    style={{ display: 'block', textAlign: 'left', padding: '0.5rem', backgroundColor: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}
                                    onClick={() => insertTag(v.tag)}
                                >
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary)' }}>{v.tag}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{v.description}</div>
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Eye size={14} color="var(--color-danger)" />
                                <span style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--color-danger)' }}>Critical Note</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                Formatting and variables are locked for employees. Test variables in Preview mode in the Document Hub.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LetterTemplates;

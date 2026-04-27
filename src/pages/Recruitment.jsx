import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  ArrowRight,
  Filter,
  Search,
  Mail,
  Briefcase
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { Link, useNavigate } from 'react-router-dom';

const Recruitment = () => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCandidates = async () => {
            setLoading(true);
            try {
                const data = await dataService.getCandidates();
                setCandidates(data);
            } catch (err) {
                console.error("Failed to load candidates:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCandidates();
    }, []);

    const stats = useMemo(() => {
        return {
            total: candidates.length,
            applied: candidates.filter(c => c.status === 'Applied').length,
            selected: candidates.filter(c => c.status === 'Selected' || c.status === 'Offer Sent').length,
            onboarded: candidates.filter(c => c.status === 'Joined').length
        };
    }, [candidates]);

    const filteredCandidates = useMemo(() => {
        return candidates.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.role.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [candidates, searchTerm, filterStatus]);

    const updateStatus = async (id, newStatus) => {
        const updated = candidates.map(c => {
            if (c.id === id) return { ...c, status: newStatus };
            return c;
        });
        setCandidates(updated);
        await dataService.saveCandidates(updated);
    };

    const onboardCandidate = (candidate) => {
        // Redirect to Employee Directory with candidate info pre-filled
        navigate('/directory', { 
            state: { 
                onboardCandidate: true, 
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                role: candidate.role,
                department: candidate.department,
                salaryData: { grossSalary: candidate.ctc }
            } 
        });
    };

    const getStatusVariant = (status) => {
        switch(status) {
            case 'Applied': return 'warning';
            case 'Selected': return 'primary';
            case 'Offer Sent': return 'info';
            case 'Offer Accepted': return 'success';
            case 'Joined': return 'success';
            case 'Rejected': return 'danger';
            default: return 'default';
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
                    <h1 className="page-title">Recruitment Pipeline</h1>
                    <p className="page-subtitle">Track candidates, manage selection, and pulse-check hire requests.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => window.location.reload()}>
                        <Clock size={18} /> Refresh
                    </button>
                    <button className="btn btn-primary" onClick={() => alert('Feature: Add External Candidate Link coming soon!')}>
                        <UserPlus size={18} /> Source Candidate
                    </button>
                </div>
            </div>

            {/* Quick Stats Dashboard */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                {[
                    { label: 'Active Pipeline', value: stats.total, color: 'var(--color-primary)' },
                    { label: 'New Applicants', value: stats.applied, color: 'var(--color-warning)' },
                    { label: 'Selected / Offer', value: stats.selected, color: 'var(--color-info)' },
                    { label: 'Hired & Sync\'d', value: stats.onboarded, color: 'var(--color-success)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="header-search" style={{ width: '300px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <Search size={18} color="var(--color-text-muted)" />
                            <input 
                                type="text" 
                                placeholder="Search by name or role..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="form-input" 
                            style={{ width: '150px' }}
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Applied">Applied</option>
                            <option value="Selected">Selected</option>
                            <option value="Offer Sent">Offer Sent</option>
                            <option value="Offer Accepted">Offer Accepted</option>
                            <option value="Joined">Joined</option>
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Candidate Detail</th>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Role & Dept</th>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Expected CTC</th>
                                <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCandidates.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontWeight: '600' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Mail size={12} /> {c.email}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <div style={{ fontWeight: '500' }}>{c.role}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>{c.department}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem', fontWeight: '600' }}>
                                        ₹{(c.ctc || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem' }}>
                                        <span className={`badge badge-${getStatusVariant(c.status)}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            {c.status === 'Applied' && (
                                                <button 
                                                    className="btn btn-outline" 
                                                    style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    onClick={() => updateStatus(c.id, 'Selected')}
                                                >
                                                    <CheckCircle size={14} /> Mark Selected
                                                </button>
                                            )}
                                            
                                            {(c.status === 'Selected' || c.status === 'Offer Sent') && (
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    onClick={() => navigate('/document-hub', { state: { targetCandidate: c, documentType: 'Offer Letter' } })}
                                                >
                                                    <FileText size={14} /> Offer Letter
                                                </button>
                                            )}

                                            {c.status === 'Offer Accepted' && (
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    onClick={() => onboardCandidate(c)}
                                                >
                                                    <UserPlus size={14} /> Onboard Now
                                                </button>
                                            )}

                                            {c.status !== 'Joined' && c.status !== 'Rejected' && (
                                                <button 
                                                    className="btn btn-ghost" 
                                                    style={{ color: 'var(--color-danger)', padding: '0.4rem' }}
                                                    onClick={() => updateStatus(c.id, 'Rejected')}
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hiring Requests Link Box */}
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '10px' }}>
                        <Briefcase size={24} color="var(--color-primary)" />
                    </div>
                    <div>
                        <h4 style={{ margin: 0 }}>View Active Manpower Requisitions</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Check budget utilization and approved hiring slots before selection.</p>
                    </div>
                </div>
                <Link to="/hiring-requests" className="btn btn-outline">
                    Check Requisitions <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
};

export default Recruitment;

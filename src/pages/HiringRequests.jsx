import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, 
  CheckCircle, 
  Send,
  Clock,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { dataService } from '../utils/dataService';

const formatCurrency = (i) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(i);

const HiringRequests = () => {
    const [department, setDepartment] = useState('');
    const [role, setRole] = useState('');
    const [proposedCTC, setProposedCTC] = useState('');
    const [justification, setJustification] = useState('');
    
    // Auto-refresh hook states
    const [reloads, setReloads] = useState(0); 
    const handleRefresh = () => setReloads(r => r+1);

    const [requestsData, setRequestsData] = useState([]);
    const [budgetsData, setBudgetsData] = useState([]);
    const [utilizationMap, setUtilizationMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [reqs, budgets] = await Promise.all([
                    dataService.getManpowerRequests(),
                    dataService.getDeptBudgets()
                ]);
                setRequestsData(reqs);
                setBudgetsData(budgets);

                const uMap = {};
                await Promise.all(budgets.map(async (b) => {
                    uMap[b.department] = await dataService.getBudgetUtilization(b.department);
                }));
                setUtilizationMap(uMap);
            } catch (err) {
                console.error("Failed to load hiring data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [reloads]);
    
    // Live Prediction calculation
    const budgetContext = useMemo(() => {
        if (!department) return null;
        const targetBudget = budgetsData.find(b => b.department === department);
        if (!targetBudget) return null;

        const utilized = utilizationMap[department] || 0;
        const projectedCTC = Number(proposedCTC) || 0;
        const newTotal = utilized + projectedCTC;
        
        const absoluteLimit = targetBudget.totalBudget * (1 + (targetBudget.buffer / 100));
        const isExceeded = newTotal > targetBudget.totalBudget;
        const isCritical = newTotal > absoluteLimit;

        return {
            utilized,
            limit: targetBudget.totalBudget,
            absoluteLimit,
            projectedTotal: newTotal,
            isExceeded,
            isCritical,
            breachAmount: Math.max(0, newTotal - targetBudget.totalBudget)
        };
    }, [department, proposedCTC, budgetsData, reloads]);

    const submitRequest = async () => {
        if (!department || !role || !proposedCTC || !justification) {
            alert('Please fill out all requisition fields.');
            return;
        }
        
        if (budgetContext && budgetContext.isCritical) {
            const override = window.confirm(`This crosses your hard Buffer bounds for ${department} by ${formatCurrency(budgetContext.projectedTotal - budgetContext.absoluteLimit)}. You must explicitly ask for Director permission. Proceed?`);
            if(!override) return;
        }

        const newReq = {
            id: Date.now(),
            department,
            role,
            proposedCTC: Number(proposedCTC),
            justification,
            date: new Date().toISOString().split('T')[0],
            status: (budgetContext && budgetContext.isExceeded) ? 'Pending Approval' : 'Auto-Approved',
            breachAmount: (budgetContext && budgetContext.isExceeded) ? budgetContext.breachAmount : 0
        };

        const existing = await dataService.getManpowerRequests();
        await dataService.saveManpowerRequests([newReq, ...existing]);
        
        // Reset
        setRole('');
        setProposedCTC('');
        setJustification('');
        handleRefresh();
        alert('Requisition processed successfully.');
    };

    const deleteRequest = async (id) => {
        if (window.confirm('Are you sure you want to delete this requisition record?')) {
            const existing = await dataService.getManpowerRequests();
            const filtered = existing.filter(r => r.id !== id);
            await dataService.saveManpowerRequests(filtered);
            handleRefresh();
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
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Manpower Requisitions</h1>
                    <p className="page-subtitle">File hiring requests that automatically test against active department constraints.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Form Requisition Engine */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <UserPlus size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>New Hire Request</h2>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Target Department</label>
                        <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)}>
                            <option value="">Select Department...</option>
                            {budgetsData.map(b => <option key={b.id} value={b.department}>{b.department}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Role Designation</label>
                            <input type="text" className="form-input" placeholder="e.g. Senior Frontend Engineer" value={role} onChange={e => setRole(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Proposed Annual CTC (₹)</label>
                            <input type="number" className="form-input" placeholder="1000000" value={proposedCTC} onChange={e => setProposedCTC(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Detailed Business Justification</label>
                        <textarea className="form-input" rows="3" placeholder="Why are we hiring this role?" value={justification} onChange={e => setJustification(e.target.value)}></textarea>
                    </div>

                    {budgetContext && (
                        <div style={{ padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: `2px solid ${budgetContext.isExceeded ? 'var(--color-danger)' : 'var(--color-success)'}`, backgroundColor: budgetContext.isExceeded ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {budgetContext.isExceeded ? <ShieldAlert size={28} color="var(--color-danger)" /> : <CheckCircle size={28} color="var(--color-success)" />}
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem', color: budgetContext.isExceeded ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {budgetContext.isExceeded ? 'Approval Override Required' : 'Pre-Cleared: Within Allocated Budget'}
                                        </h4>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            Projected Dept CTC: {formatCurrency(budgetContext.projectedTotal)} / {formatCurrency(budgetContext.limit)}
                                        </span>
                                    </div>
                                </div>
                                {budgetContext.isExceeded && (
                                    <div style={{ backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                                        + {formatCurrency(budgetContext.breachAmount)} Breach
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className={`btn btn-${budgetContext?.isExceeded ? 'danger' : 'primary'}`} onClick={submitRequest} style={{ padding: '0.75rem 2rem' }}>
                            <Send size={18} style={{ marginRight: '0.5rem' }} /> {budgetContext?.isExceeded ? 'Force Submission for Override' : 'Dispatch Hire Request'}
                        </button>
                    </div>
                </div>

                {/* History Matrix */}
                <div className="card">
                     <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Active Queues</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         {requestsData.length === 0 ? (
                             <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No active requests found.</div>
                         ) : (
                             requestsData.slice(0,50).map(r => (
                                 <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                                     <div style={{ flex: 1 }}>
                                         <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{r.role}</div>
                                         <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{r.department} • {formatCurrency(r.proposedCTC)}</div>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                         <span className={`badge badge-${r.status === 'Auto-Approved' ? 'success' : r.status === 'Approved (Override)' ? 'primary' : r.status === 'Rejected' ? 'danger' : 'warning'}`}>
                                             {r.status === 'Pending Approval' ? <Clock size={12} style={{marginRight:4}} /> : null}
                                             {r.status}
                                         </span>
                                         <button onClick={() => deleteRequest(r.id)} className="btn btn-ghost" style={{ color: 'var(--color-danger)', padding: '0.25rem' }}>
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default HiringRequests;

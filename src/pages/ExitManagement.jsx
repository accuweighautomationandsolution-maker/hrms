import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    Users, ShieldCheck, Calculator, AlertCircle, CheckCircle, 
    Download, Printer, FileText, X, Mail, Search, Info, Plus, 
    FileSpreadsheet, MapPin, ChevronDown, ChevronUp, Lock, Award, History, Settings, Trash2, Paperclip, Eye, Coins, MessageSquareShare
} from 'lucide-react';
import FeedbackPortal from '../components/FeedbackPortal';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { dataService } from '../utils/dataService';
import { formatCurrency } from '../utils/payrollCalculator';
import { calculateServiceTenure, checkGratuityEligibility, calculateGratuityAmount, parseDOJ } from '../utils/gratuityCalculator';
import { calculateProratedBonus, calculateMonthlyBonus } from '../utils/bonusCalculator';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ExitManagement = () => {
    // ── Application Stage ──────────────────────────────────────────────────
    const [exits, setExits] = useState(dataService.getExitRecords());
    const [employees, setEmployees] = useState(dataService.getEmployees());
    const [advances] = useState(dataService.getAdvanceLoans ? dataService.getAdvanceLoans() : []);
    const [expenses] = useState(dataService.getExpenses());
    const [leaves] = useState(dataService.getLeaveBalances());
    const [gratConfig, setGratConfig] = useState(dataService.getGratuityConfig());
    const [hoMaster, setHoMaster] = useState(dataService.getHandoverMaster());
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedExit, setSelectedExit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configTab, setConfigTab] = useState('legal');

    // Feedback Portal State
    const [feedbackConfig, setFeedbackConfig] = useState({ isOpen: false, empId: null, type: 'Exit Evaluation' });

    // ── Forms & Modals ─────────────────────────────────────────────────────
    const [initiateModal, setInitiateModal] = useState(false);
    const [fnfModal, setFnfModal] = useState(false);
    const [overrideModal, setOverrideModal] = useState(false);
    const [bonusConfig] = useState(dataService.getBonusConfig());
    const [proofModal, setProofModal] = useState(null); // { exitId, itemId }
    
    // Initiate Form State
    const [initEmpId, setInitEmpId] = useState('');
    const [initExitType, setInitExitType] = useState('Resignation');
    const [initDate, setInitDate] = useState(new Date().toISOString().split('T')[0]);
    const [initNotice, setInitNotice] = useState(30);
    const [initLwd, setInitLwd] = useState('');
    const [initReason, setInitReason] = useState('');

    // Config: Add Item State
    const [newItem, setNewItem] = useState({ label: '', category: 'Work', mandatory: true });

    // Active Employees for Initialization
    const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'Inactive' && !exits.find(ex => ex.empId === e.id && ex.status !== 'Completed')), [employees, exits]);

    // ── Aggregations & Charts ────────────────────────────────────────────────
    const filteredExits = useMemo(() => {
        let res = exits;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            res = res.filter(e => e.name.toLowerCase().includes(term) || e.department.toLowerCase().includes(term));
        }
        return res;
    }, [exits, searchTerm]);

    const stats = useMemo(() => {
        const totalStrength = employees.filter(e => e.status !== 'Inactive').length || 1;
        const currentMonthExits = exits.filter(e => {
            const d = new Date(e.initDate);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        return {
            totalPending: exits.filter(e => e.status !== 'Completed').length,
            inClearance: exits.filter(e => e.status === 'Clearance').length,
            fnfPending: exits.filter(e => e.status === 'FnF Pending').length,
            completed: exits.filter(e => e.status === 'Completed').length,
            attritionRate: ((currentMonthExits / totalStrength) * 100).toFixed(1)
        };
    }, [exits, employees]);

    const reasonPieData = useMemo(() => {
        const counts = {};
        exits.forEach(e => counts[e.reason] = (counts[e.reason] || 0) + 1);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [exits]);

    const deptBarData = useMemo(() => {
        const counts = {};
        exits.forEach(e => counts[e.department] = (counts[e.department] || 0) + 1);
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b)=>b.count - a.count);
    }, [exits]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleInitiateSubmit = () => {
        if (!initEmpId) return;
        const emp = employees.find(e => e.id === Number(initEmpId));
        const masterHandover = dataService.getHandoverMaster();
        const newRecord = {
            id: `EX-00${exits.length + 1}`,
            empId: emp.id,
            name: emp.name,
            department: emp.department,
            exitType: initExitType,
            initDate: initDate,
            lwd: initLwd,
            noticePeriod: initNotice,
            reason: initReason || 'N/A',
            status: 'Clearance',
            stage: 2,
            handover: masterHandover.map(h => ({ ...h, status: 'Pending', remarks: '', verifiedAt: null, proof: null })),
            overrides: [],
            activity: [{ date: new Date().toISOString(), action: 'Separation Initiated', user: 'HR System' }]
        };
        const updated = [...exits, newRecord];
        setExits(updated);
        dataService.saveExitRecords(updated);
        setInitiateModal(false);
    };

    const updateHandoverStatus = (exitId, itemId, newStatus) => {
        const updated = exits.map(ex => {
            if (ex.id === exitId) {
                const item = ex.handover.find(h => h.id === itemId);
                // Enforcement: Proof required for completion of mandatory items
                if (newStatus === 'Completed' && item.mandatory && !item.proof) {
                    alert(`Action Restricted: '${item.label}' is a Mandatory item. Please upload proof/attachment first.`);
                    return ex;
                }

                const newHO = ex.handover.map(h => h.id === itemId ? { ...h, status: newStatus, verifiedAt: new Date().toISOString() } : h);
                const allMandatoryCleared = newHO.filter(h => h.mandatory).every(h => h.status === 'Completed');
                let newStage = ex.stage;
                let newOverallStatus = ex.status;
                if (allMandatoryCleared) {
                    newStage = 3;
                    newOverallStatus = 'FnF Pending';
                } else if (ex.stage >= 3) {
                    newStage = 2;
                    newOverallStatus = 'Clearance';
                }

                const act = { 
                    date: new Date().toISOString(), 
                    action: `${item.label} set to ${newStatus}`, 
                    user: 'Reporting Manager' 
                };

                return { ...ex, handover: newHO, stage: newStage, status: newOverallStatus, activity: [act, ...(ex.activity || [])] };
            }
            return ex;
        });
        setExits(updated);
        dataService.saveExitRecords(updated);
        if (selectedExit && selectedExit.id === exitId) {
            setSelectedExit(updated.find(ex => ex.id === exitId));
        }
    };

    const attachProofToItem = (exitId, itemId, proofName) => {
        const updated = exits.map(ex => {
            if (ex.id === exitId) {
                const newHO = ex.handover.map(h => h.id === itemId ? { ...h, proof: proofName } : h);
                const act = { date: new Date().toISOString(), action: `Attached proof: ${proofName}`, user: 'System' };
                return { ...ex, handover: newHO, activity: [act, ...(ex.activity || [])] };
            }
            return ex;
        });
        setExits(updated);
        dataService.saveExitRecords(updated);
        if (selectedExit && selectedExit.id === exitId) {
            setSelectedExit(updated.find(ex => ex.id === exitId));
        }
        setProofModal(null);
    };

    const handleOverrideClearance = (justification) => {
        if (!selectedExit || !justification) return;
        const updated = exits.map(ex => {
            if (ex.id === selectedExit.id) {
                const act = { date: new Date().toISOString(), action: 'Compliance Bypass Authorized', user: 'HR Admin', remark: justification };
                return {
                    ...ex,
                    stage: 3,
                    status: 'FnF Pending',
                    overrides: [...(ex.overrides || []), { 
                        date: new Date().toISOString(), 
                        user: 'HR Admin', 
                        justification,
                        reason: 'Management Risk Acceptance'
                    }],
                    activity: [act, ...(ex.activity || [])]
                };
            }
            return ex;
        });
        setExits(updated);
        dataService.saveExitRecords(updated);
        setSelectedExit(updated.find(ex => ex.id === selectedExit.id));
        setOverrideModal(false);
    };

    const deleteExitRecord = (id) => {
        if (window.confirm('CRITICAL ACTION: This will permanently purge the separation record and all handover data. Proceed?')) {
            const updated = dataService.deleteExitRecord(id);
            setExits(updated);
            if (selectedExit && selectedExit.id === id) setSelectedExit(null);
        }
    };

    const completeFnF = (exitObj) => {
        dataService.completeFnFSystemProcess(exitObj.empId);
        const emps = dataService.getEmployees();
        setEmployees(emps);
        const updatedExits = dataService.getExitRecords();
        setExits(updatedExits);
        setFnfModal(false);
        setSelectedExit(null);
    };

    // ── Config Handlers ──────────────────────
    const handleAddItem = () => {
        if (!newItem.label) return;
        const upd = dataService.addHandoverItem(newItem);
        setHoMaster(upd);
        setNewItem({ label: '', category: 'Work', mandatory: true });
    };

    const handleDeleteItem = (id) => {
        const upd = dataService.deleteHandoverItem(id);
        setHoMaster(upd);
    };

    // ── FnF Matrix Component ──────────────────────
    const FnFMatrix = ({ exitInfo }) => {
        const emp = employees.find(e => e.id === exitInfo.empId);
        if(!emp) return null;

        const baseSalary = emp.grossSalary || 0;
        const dayRate = baseSalary / 30;
        
        let pendingLoans = 0;
        const myLoans = advances?.filter(a => a.employeeId === emp.id && a.status === 'Approved') || [];
        myLoans.forEach(l => pendingLoans += (l.amount - l.repaid));

        const tenure = calculateServiceTenure(emp.joiningDate, exitInfo.lwd);
        const elig = checkGratuityEligibility(emp, tenure, gratConfig);
        const basicSalaryForGrat = Math.round(baseSalary * 0.55);
        const gratResult = elig.eligible ? calculateGratuityAmount(basicSalaryForGrat, tenure, gratConfig) : { amount: 0 };

        const myLeaves = leaves[emp.id] || { Paid: 0 };
        const leaveEncashmentPay = Math.round((myLeaves.Paid || 0) * dayRate);

        const lwdDate = new Date(exitInfo.lwd).getDate();
        const finalMonthPay = Math.round(lwdDate * dayRate);

        const initD = new Date(exitInfo.initDate);
        const lwdD = new Date(exitInfo.lwd);
        const daysServed = Math.floor((lwdD - initD) / (1000 * 60 * 60 * 24));
        const shortfall = Math.max(0, exitInfo.noticePeriod - daysServed);
        const noticeRecovery = Math.round(shortfall * dayRate);

        // 5. Statutory Bonus logic
        const startOfFY = `${new Date().getFullYear()}-04-01`;
        const bonusProrated = calculateProratedBonus(emp, startOfFY, exitInfo.lwd, bonusConfig);
        const priorYearBonus = calculateProratedBonus(emp, `${new Date().getFullYear()-1}-04-01`, `${new Date().getFullYear()}-03-31`, bonusConfig);
        const priorYearAmount = priorYearBonus.eligible ? priorYearBonus.totalAmount : 0;

        const grossPayable = finalMonthPay + leaveEncashmentPay + gratResult.amount + (bonusProrated.eligible ? bonusProrated.totalAmount : 0) + priorYearAmount;
        const grossRecoverable = pendingLoans + noticeRecovery;
        const netFnF = grossPayable - grossRecoverable;

        return (
            <div className="card" style={{ padding: '2rem', border: 'none', boxShadow: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: elig.eligible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${elig.eligible ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                        <Award size={24} color={elig.eligible ? 'var(--color-success)' : 'var(--color-danger)'} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Gratuity Eligibility: {elig.eligible ? 'YES' : 'NO'}</div>
                            <div style={{ fontSize: '0.75rem' }}>Tenure: {tenure.years}Y {tenure.months}M {tenure.days}D</div>
                        </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: bonusProrated.eligible ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${bonusProrated.eligible ? 'var(--color-success)' : 'var(--color-border)'}` }}>
                        <Coins size={24} color={bonusProrated.eligible ? 'var(--color-success)' : 'var(--color-text-muted)'} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Statutory Bonus: {bonusProrated.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}</div>
                            <div style={{ fontSize: '0.75rem' }}>{bonusProrated.eligible ? `Basis: ${formatCurrency(bonusProrated.basis)} @ ${bonusProrated.percentage}%` : 'Threshold or Tenure not met'}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                    <div>
                        <h4 style={{ borderBottom: '2px solid var(--color-success)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-success)' }}>PAYABLES (Earnings)</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Final Month Days ({lwdDate})</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(finalMonthPay)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Leave Encashment ({myLeaves.Paid} days)</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(leaveEncashmentPay)}</span>
                        </div>
                        {elig.eligible && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Award size={14}/> Gratuity Payout</span>
                                <span>{formatCurrency(gratResult.amount)}</span>
                            </div>
                        )}
                        {bonusProrated.eligible && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#8b5cf6', fontWeight: 700 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Coins size={14}/> Stat. Bonus (Pro-rated FY)</span>
                                <span>{formatCurrency(bonusProrated.totalAmount)}</span>
                            </div>
                        )}
                        {priorYearAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#d946ef', fontWeight: 700 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><History size={14}/> Stat. Bonus (Prior FY Unpaid)</span>
                                <span>{formatCurrency(priorYearAmount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontWeight: 800 }}>
                            <span>Total Gross Payable</span>
                            <span>{formatCurrency(grossPayable)}</span>
                        </div>
                    </div>
                    <div>
                         <h4 style={{ borderBottom: '2px solid var(--color-danger)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>RECOVERIES (Dues)</h4>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Notice Period Recovery ({shortfall} days)</span>
                            <span style={{ fontWeight: 600, color: shortfall > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{formatCurrency(noticeRecovery)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Loan / Advance Recovery</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(pendingLoans)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontWeight: 800, color: 'var(--color-danger)' }}>
                            <span>Total Recoveries</span>
                            <span>{formatCurrency(grossRecoverable)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: netFnF >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', marginTop: '2rem', borderRadius: '8px', border: `1px solid ${netFnF >=0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Final Settlement</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: netFnF >=0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{formatCurrency(Math.abs(netFnF))}</div>
                    </div>
                    <button className={`btn ${netFnF >=0 ? 'btn-success' : 'btn-danger'}`} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => completeFnF(exitInfo)}>
                        <CheckCircle size={20} /> Authorize & Settle
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Separation & Handover Protocol</h1>
                    <p className="page-subtitle">Unified compliance suite for asset recovery, financial closure, and exit intelligence.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }} className="hide-on-print">
                    <button className="btn btn-outline" title="System Settings" onClick={() => setShowConfigModal(true)}><Settings size={18} /></button>
                    <div style={{ position: 'relative' }}>
                        <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                            <Download size={16} /> Export
                        </button>
                        {showExportMenu && (
                            <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
                                <button className="btn btn-ghost" onClick={() => setShowExportMenu(false)}><FileText size={14} /> CSV</button>
                                <button className="btn btn-ghost" onClick={() => setShowExportMenu(false)}><FileSpreadsheet size={14} /> XLSX</button>
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" onClick={() => setInitiateModal(true)}><Plus size={18} /> Initiate Exit</button>
                </div>
            </div>

            <div className="hide-on-print" style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                {['dashboard', 'active'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '1rem 0', backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === t ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeTab === t ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: activeTab === t ? 700 : 500, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                        {t === 'dashboard' ? 'Audit Insights' : `Pipeline Tracker (${stats.totalPending})`}
                    </button>
                ))}
            </div>

            {activeTab === 'dashboard' && (
                <>
                    <div className="grid-4" style={{ marginBottom: '2rem' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>In Progress</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.totalPending}</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Avg Clearance</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>4.2 <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>Days</span></div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Attrition Rate</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.attritionRate}%</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Archived (YTD)</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.completed}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card">
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Attrition by Department</h4>
                            <div style={{ height: '260px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptBarData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={11} />
                                        <YAxis fontSize={11} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="card">
                            <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Exit Reason Distribution</h4>
                            <div style={{ height: '260px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={reasonPieData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                            {reasonPieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'active' && (
                <div className="card" style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
                         <div className="form-group" style={{ margin: 0, position: 'relative', width: '300px' }}>
                             <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} color="var(--color-text-muted)" />
                             <input type="text" className="form-input" placeholder="Search offboarding records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
                         </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '1rem' }}>ID</th>
                                    <th style={{ padding: '1rem' }}>Employee</th>
                                    <th style={{ padding: '1rem' }}>Type</th>
                                    <th style={{ padding: '1rem' }}>LWD</th>
                                    <th style={{ padding: '1rem' }}>Handover Status</th>
                                    <th style={{ padding: '1rem' }}>Current State</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExits.map((e) => {
                                    const handover = e.handover || [];
                                    const mandatoryCount = handover.filter(h => h.mandatory).length;
                                    const mandatoryDone = handover.filter(h => h.mandatory && h.status === 'Completed').length;
                                    const allDone = mandatoryCount > 0 && mandatoryDone === mandatoryCount;
                                    return (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{e.id}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 700 }}>{e.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{e.department}</div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{e.exitType}</td>
                                            <td style={{ padding: '1rem', fontWeight: 700 }}>{e.lwd}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: allDone ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                                    {allDone ? <CheckCircle size={14}/> : <History size={14}/>}
                                                    {mandatoryDone}/{mandatoryCount} CRITICAL ITEMS
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={`badge ${e.status === 'Completed' ? 'badge-success' : e.status === 'FnF Pending' ? 'badge-primary' : 'badge-warning'}`}>
                                                    {e.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button 
                                                        className="btn btn-ghost" 
                                                        style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => setFeedbackConfig({ isOpen: true, empId: e.empId, type: 'Exit Evaluation' })}
                                                    >
                                                        <MessageSquareShare size={14}/> Feedback
                                                    </button>
                                                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setSelectedExit(e)}>Open Workspace</button>
                                                    <button 
                                                        className="btn btn-ghost" 
                                                        style={{ color: 'var(--color-danger)', padding: '0.25rem' }}
                                                        onClick={() => deleteExitRecord(e.id)}
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* HANDOVER WORKSPACE MODAL */}
            {selectedExit && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '950px', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={22} color="var(--color-primary)" /> Handover Hub: {selectedExit.name}</h2>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Reporting Manager: Verified Workspace for {selectedExit.department}</p>
                            </div>
                            <button onClick={() => setSelectedExit(null)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={20}/></button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1px', backgroundColor: 'var(--color-border)', minHeight: '600px' }}>
                            {/* Main Checklist Column */}
                            <div style={{ backgroundColor: '#fff', padding: '2rem' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                     {['Work', 'IT', 'Admin', 'Finance'].map(cat => {
                                         const items = (selectedExit.handover || []).filter(h => h.category === cat);
                                         return (
                                             <div key={cat} style={{ textAlign: 'center' }}>
                                                 <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{cat}</div>
                                                 <div style={{ fontSize: '1rem', fontWeight: 700 }}>{items.filter(h => h.status === 'Completed').length}/{items.length}</div>
                                             </div>
                                         );
                                     })}
                                 </div>

                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {['Work', 'IT', 'Admin', 'Finance'].map(cat => (
                                        <div key={cat}>
                                            <h4 style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                                                {cat.toUpperCase()} CLEARANCE
                                            </h4>
                                            {(selectedExit.handover || []).filter(h => h.category === cat).map(item => (
                                                <div key={item.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: item.proof ? 'rgba(59,130,246,0.02)' : '#fff' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {item.status === 'Completed' ? <CheckCircle size={16} color="var(--color-success)"/> : <AlertCircle size={16} color="var(--color-warning)"/>}
                                                            {item.label} {item.mandatory && <span style={{ color: 'var(--color-danger)', fontSize: '14px' }}>*</span>}
                                                        </div>
                                                        {item.proof && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                                                                <Paperclip size={10}/> Evidence: {item.proof}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '0.4rem', border: 'none' }} 
                                                            title="Attach Proof" 
                                                            onClick={() => setProofModal({ exitId: selectedExit.id, itemId: item.id })}
                                                        >
                                                            <Paperclip size={16} color={item.proof ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                                                        </button>
                                                        <button 
                                                            className={`btn ${item.status === 'Completed' ? 'btn-outline' : 'btn-success'}`} 
                                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', minWidth: '80px' }} 
                                                            onClick={() => updateHandoverStatus(selectedExit.id, item.id, item.status === 'Completed' ? 'Pending' : 'Completed')}
                                                        >
                                                            {item.status === 'Completed' ? 'Undo' : 'Verify'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                 </div>
                            </div>

                            {/* Sidebar Column: Summary & Activity */}
                            <div style={{ backgroundColor: '#f9fafb', padding: '2rem' }}>
                                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={16}/> Settlement Status</h4>
                                    {selectedExit.stage >= 3 ? (
                                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setFnfModal(true)}>Open FnF Statement</button>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '1rem', fontStyle: 'italic' }}>Blocked: Mandatory clearances pending or proof missing.</div>
                                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', width: '100%', textDecoration: 'underline' }} onClick={() => setOverrideModal(true)}>HR Admin Override</button>
                                        </>
                                    )}
                                </div>

                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={16}/> Activity & Audit Log</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                                    {(selectedExit.activity || []).map((a, i) => (
                                        <div key={i} style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: '1rem', position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-border)' }}></div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.action}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(a.date).toLocaleTimeString()} by {a.user}</div>
                                            {a.remark && <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.2rem', fontStyle: 'italic' }}>Note: {a.remark}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FNF SETTLEMENT MODAL */}
            {fnfModal && (
                 <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '950px', maxHeight: '95vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calculator size={24} /> Full & Final Settlement (FnF)</h2>
                            <button onClick={() => setFnfModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={24} /></button>
                        </div>
                        <FnFMatrix exitInfo={selectedExit} />
                    </div>
                 </div>
            )}

            {/* CONFIG MODAL - DUAL TAB */}
            {showConfigModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: 0 }}>
                         <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                            <button onClick={() => setConfigTab('legal')} style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: configTab === 'legal' ? '3px solid var(--color-primary)' : 'none', fontWeight: configTab === 'legal' ? 800 : 500 }}>Gratuity Rules</button>
                            <button onClick={() => setConfigTab('handover')} style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', borderBottom: configTab === 'handover' ? '3px solid var(--color-primary)' : 'none', fontWeight: configTab === 'handover' ? 800 : 500 }}>Master Checklist</button>
                            <button onClick={() => setShowConfigModal(false)} style={{ padding: '1rem', background: 'none', border: 'none' }}><X size={20}/></button>
                         </div>
                         
                         <div style={{ padding: '2rem' }}>
                             {configTab === 'legal' && (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                     <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                                         <label className="form-label">Calculated Gratuity (5-Year Rule)</label>
                                         <input type="checkbox" checked={gratConfig.enabled} onChange={(e) => setGratConfig({...gratConfig, enabled: e.target.checked})} />
                                     </div>
                                     <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                                         <label className="form-label">4.8 Year Judicial Exception</label>
                                         <input type="checkbox" checked={gratConfig.enable48Rule} onChange={(e) => setGratConfig({...gratConfig, enable48Rule: e.target.checked})} />
                                     </div>
                                     <button className="btn btn-primary" onClick={() => { dataService.saveGratuityConfig(gratConfig); setShowConfigModal(false); }}>Save Policy</button>
                                 </div>
                             )}

                             {configTab === 'handover' && (
                                 <div>
                                     <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                         {hoMaster.map(h => (
                                             <div key={h.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                 <div style={{ fontSize: '0.9rem' }}>
                                                     {h.label} {h.mandatory && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                                                     <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Category: {h.category}</div>
                                                 </div>
                                                 <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--color-danger)' }} onClick={() => handleDeleteItem(h.id)}><Trash2 size={16}/></button>
                                             </div>
                                         ))}
                                     </div>
                                     <div className="grid-2" style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '8px' }}>
                                         <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                             <input type="text" className="form-input" placeholder="New Item Label..." value={newItem.label} onChange={e => setNewItem({...newItem, label: e.target.value})} />
                                         </div>
                                         <select className="form-input" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                             <option>Work</option><option>IT</option><option>Admin</option><option>Finance</option>
                                         </select>
                                         <button className="btn btn-primary" onClick={handleAddItem} disabled={!newItem.label}>Add Mandatory Item</button>
                                     </div>
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
            )}

            {/* OVERRIDE MODAL */}
            {overrideModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>Compliance Overrule</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Authorize FnF settlement despite pending handovers? This action is logged permanently.</p>
                        <textarea id="ovr_reason_ref" className="form-input" rows="3" placeholder="Enter justification for exception..."></textarea>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setOverrideModal(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleOverrideClearance(document.getElementById('ovr_reason_ref').value)}>Authorized: Bypass</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROOF MODAL (Simulated) */}
            {proofModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Attach Handover Evidence</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Upload screenshots or documents as proof of completion.</p>
                        <input type="file" className="form-input" id="proof_file" />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setProofModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                                const file = document.getElementById('proof_file').files[0]?.name || "handover_screenshot.png";
                                attachProofToItem(proofModal.exitId, proofModal.itemId, file);
                            }}>Upload & Verify</button>
                        </div>
                    </div>
                </div>
            )}

            {/* INITIATE EXIT MODAL */}
            {initiateModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Exit Initiation Profile</h2>
                            <button onClick={() => setInitiateModal(false)} style={{ border: 'none', background: 'none' }}><X size={20}/></button>
                        </div>
                        <div className="grid-2">
                             <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                 <label className="form-label">Search Active Employee</label>
                                 <select className="form-input" value={initEmpId} onChange={e => {
                                     const eid = e.target.value;
                                     setInitEmpId(eid);
                                     const emp = employees.find(ep => ep.id === Number(eid));
                                     if (emp) setInitNotice(emp.role === 'Manager' ? 60 : 30);
                                 }}>
                                     <option value="">Select separatee...</option>
                                     {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
                                 </select>
                             </div>
                             <div className="form-group">
                                 <label className="form-label">Exit Category</label>
                                 <select className="form-input" value={initExitType} onChange={e => setInitExitType(e.target.value)}>
                                     <option>Resignation</option><option>Termination</option><option>Retirement</option><option>Absconding</option>
                                 </select>
                             </div>
                             <div className="form-group">
                                 <label className="form-label">Initiation Date</label>
                                 <input type="date" className="form-input" value={initDate} onChange={e => setInitDate(e.target.value)} />
                             </div>
                             <div className="form-group">
                                 <label className="form-label">Notice Period (Days)</label>
                                 <input type="number" className="form-input" value={initNotice} onChange={e => setInitNotice(Number(e.target.value))} />
                             </div>
                             <div className="form-group">
                                 <label className="form-label">Last Working Day (LWD)</label>
                                 <input type="date" className="form-input" value={initLwd} onChange={e => setInitLwd(e.target.value)} />
                             </div>
                             <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                 <label className="form-label">Exit Intent / Remarks</label>
                                 <textarea className="form-input" rows="2" value={initReason} onChange={e => setInitReason(e.target.value)} />
                             </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setInitiateModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleInitiateSubmit}>Lock Profile & Initialize</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Feedback Portal */}
            <FeedbackPortal 
                isOpen={feedbackConfig.isOpen}
                empId={feedbackConfig.empId}
                reviewType={feedbackConfig.type}
                onClose={() => setFeedbackConfig(p => ({ ...p, isOpen: false }))}
            />
        </div>
    );
};

export default ExitManagement;

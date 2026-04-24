import React, { useState, useMemo } from 'react';
import { 
    Coins, Calculator, Calendar, FileText, Download, 
    Settings, Users, Info, ChevronRight, CheckCircle, AlertCircle, TrendingUp
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { dataService } from '../utils/dataService';
import { formatCurrency } from '../utils/payrollCalculator';
import { calculateMonthlyBonus } from '../utils/bonusCalculator';
import * as XLSX from 'xlsx';
import { useNotification } from '../context/NotificationContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const BonusManagement = () => {
    // ── Application Stage ──────────────────────────────────────────────────
    const { showNotification } = useNotification();
    const [employees] = useState(dataService.getEmployees());
    const [config, setConfig] = useState(dataService.getBonusConfig());
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [payouts, setPayouts] = useState(dataService.getBonusPayments());
    const [isDisbursing, setIsDisbursing] = useState(false);

    // ── Data Aggregations ──────────────────────────────────────────────────
    const accruals = useMemo(() => {
        return employees.map(emp => {
            const bonus = calculateMonthlyBonus(emp, config);
            return {
                id: emp.id,
                name: emp.name,
                department: emp.department,
                gross: emp.grossSalary || 0,
                ...bonus
            };
        });
    }, [employees, config]);

    const stats = useMemo(() => {
        const eligible = accruals.filter(a => a.eligible);
        const totalLiability = eligible.reduce((sum, a) => sum + a.amount, 0);
        const ineligible = accruals.filter(a => !a.eligible);
        
        return {
            totalLiability,
            eligibleCount: eligible.length,
            ineligibleCount: ineligible.length,
            totalProvisionYearly: totalLiability * 12,
            avgBonus: eligible.length > 0 ? Math.round(totalLiability / eligible.length) : 0
        };
    }, [accruals]);

    const deptData = useMemo(() => {
        const depts = {};
        accruals.filter(a => a.eligible).forEach(a => {
            depts[a.department] = (depts[a.department] || 0) + a.amount;
        });
        return Object.entries(depts).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount);
    }, [accruals]);

    const monthlyTrendData = [
        { month: 'Apr', amount: stats.totalLiability },
        { month: 'May', amount: stats.totalLiability + 5000 },
        { month: 'Jun', amount: stats.totalLiability + 2000 },
        { month: 'Jul', amount: stats.totalLiability - 3000 },
        { month: 'Aug', amount: stats.totalLiability },
        { month: 'Sep', amount: stats.totalLiability + 8000 }
    ];

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleSaveConfig = (newConf) => {
        dataService.saveBonusConfig(newConf);
        setConfig(newConf);
        showNotification('Statutory bonus configuration updated.', 'success');
    };

    const handleDisburse = () => {
        const eligible = accruals.filter(a => a.eligible);
        if (eligible.length === 0) {
            showNotification('No eligible employees for bonus disbursal.', 'error');
            return;
        }

        if (window.confirm(`Are you sure you want to disburse ₹${stats.totalLiability.toLocaleString()} as bonus for ${selectedMonth+1}/${selectedYear}?`)) {
            setIsDisbursing(true);
            setTimeout(() => {
                eligible.forEach(e => {
                    dataService.saveBonusPayment({
                        empId: e.id,
                        empName: e.name,
                        amount: e.amount,
                        month: selectedMonth,
                        year: selectedYear,
                        basis: e.basis,
                        percentage: e.percentage
                    });
                });
                setPayouts(dataService.getBonusPayments());
                setIsDisbursing(false);
                showNotification(`Monthly Bonus for ${selectedMonth+1}/${selectedYear} disbursed successfully.`, 'success');
            }, 1000);
        }
    };

    const handleExport = (type) => {
        const data = accruals.map(a => ({
            "Emp ID": a.id,
            "Name": a.name,
            "Dept": a.department,
            "Gross": a.gross,
            "Basis": a.basis || 0,
            "Bonus(%)": a.percentage || 0,
            "Monthly Accrual": a.amount,
            "Yearly (Est)": a.amount * 12,
            "Status": a.eligible ? "Eligible" : "Not Eligible"
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BonusReport");
        XLSX.writeFile(workbook, `Bonus_Accrual_${selectedYear}.xlsx`);
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Statutory Bonus Intelligence</h1>
                    <p className="page-subtitle">Multi-compliance dashboard for Payment of Bonus Act, 1965 management.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => handleExport()}>
                        <Download size={16} /> Export Reports
                    </button>
                    <button className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('config')}>
                        <Settings size={16} /> Configuration
                    </button>
                </div>
            </div>

            {/* Sub Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <button onClick={() => setActiveTab('dashboard')} style={{ padding: '1rem 1.5rem', borderBottom: activeTab === 'dashboard' ? '3px solid var(--color-primary)' : 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === 'dashboard' ? 800 : 500 }}>Dashboard</button>
                <button onClick={() => setActiveTab('reports')} style={{ padding: '1rem 1.5rem', borderBottom: activeTab === 'reports' ? '3px solid var(--color-primary)' : 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === 'reports' ? 800 : 500 }}>Accrual Reports</button>
            </div>

            {activeTab === 'dashboard' && (
                <>
                    <div className="grid-4" style={{ marginBottom: '2rem' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Monthly Liability Provision</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(stats.totalLiability)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Eligible Employees</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.eligibleCount} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>of {employees.length}</span></div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Current Bonus Basis (Avg)</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(stats.avgBonus)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Annual Provision</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatCurrency(stats.totalProvisionYearly)}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18}/> Bonus Provisioning Trend (Accrual)</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" fontSize={11} />
                                        <YAxis fontSize={11} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Liability by Department</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" fontSize={11} hide />
                                        <YAxis dataKey="name" type="category" fontSize={11} width={80} />
                                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.02)' }}/>
                                        <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'reports' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: 0 }}>Statutory Accrual Ledger — {selectedYear}</h3>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <select className="form-input" style={{ width: '120px' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <button 
                                className="btn btn-primary" 
                                disabled={isDisbursing}
                                onClick={handleDisburse}
                                style={{ gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            >
                                <CheckCircle size={14} /> {isDisbursing ? 'Processing...' : 'Disburse Monthly Bonus'}
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '1rem' }}>Employee</th>
                                    <th style={{ padding: '1rem' }}>Department</th>
                                    <th style={{ padding: '1rem' }}>Gross Salary</th>
                                    <th style={{ padding: '1rem' }}>Bonus Basis</th>
                                    <th style={{ padding: '1rem' }}>Percentage</th>
                                    <th style={{ padding: '1rem' }}>Monthly Accrual</th>
                                    <th style={{ padding: '1rem' }}>Payout Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accruals.map(a => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{a.name}</td>
                                        <td style={{ padding: '1rem' }}>{a.department}</td>
                                        <td style={{ padding: '1rem' }}>{formatCurrency(a.gross)}</td>
                                        <td style={{ padding: '1rem' }}>{formatCurrency(a.basis || 0)}</td>
                                        <td style={{ padding: '1rem' }}>{a.percentage || 8.33}%</td>
                                        <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(a.amount)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {payouts.some(p => p.empId === a.id && p.month === selectedMonth && p.year === selectedYear) ? (
                                                <span className="badge badge-success" style={{ gap: '0.3rem', display: 'flex', alignItems: 'center', width: 'fit-content' }}>
                                                    <CheckCircle size={12} /> DISBURSED
                                                </span>
                                            ) : (
                                                <span className={`badge ${a.eligible ? 'badge-primary' : 'badge-danger'}`}>
                                                    {a.eligible ? 'ACCRUED' : 'INELIGIBLE'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={22}/> Statutory Policy Controls</h3>
                    <div className="grid-2" style={{ gap: '2rem' }}>
                        <div className="form-group">
                            <label className="form-label">Eligibility Threshold (Gross)</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800 }}>₹</span>
                                <input type="number" className="form-input" value={config.salaryThreshold} onChange={e => setConfig({ ...config, salaryThreshold: Number(e.target.value) })} />
                            </div>
                            <small style={{ color: 'var(--color-text-muted)' }}>Employees earning above this are excluded.</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bonus Percentage (%)</label>
                            <input type="number" step="0.01" className="form-input" value={config.bonusPercentage} onChange={e => setConfig({ ...config, bonusPercentage: Number(e.target.value) })} />
                            <small style={{ color: 'var(--color-text-muted)' }}>Standard (India): 8.33% to 20%.</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Calculation Ceiling (Base)</label>
                            <input type="number" className="form-input" value={config.calculationCeiling} onChange={e => setConfig({ ...config, calculationCeiling: Number(e.target.value) })} />
                            <small style={{ color: 'var(--color-text-muted)' }}>Statutory limit (usually ₹7,000).</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Current Minimum Wage</label>
                            <input type="number" className="form-input" value={config.minWageOverride} onChange={e => setConfig({ ...config, minWageOverride: Number(e.target.value) })} />
                            <small style={{ color: 'var(--color-text-muted)' }}>System uses MAX(Ceiling, MinWage).</small>
                        </div>
                    </div>
                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={() => handleSaveConfig(config)}>Update Statutory Protocol</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BonusManagement;

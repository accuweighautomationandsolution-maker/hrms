import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building, MapPin, TrendingUp, PieChart as PieChartIcon, 
  Download, Filter, Search, IndianRupee, FileSpreadsheet, 
  FileText, Printer, Mail, X, CheckCircle, XCircle, Plus, Eye, AlertTriangle, Layers
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { dataService } from '../utils/dataService';
import { generatePDF, dispatchMockEmail } from '../utils/exportUtils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const SiteExpenseReport = () => {
    // ── Application State ──────────────────────────────────────────────────
    const [rawExpenses, setRawExpenses] = useState(dataService.getExpenses());
    const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'ledger', 'submit'
    const [selectedSiteModal, setSelectedSiteModal] = useState(null); // Site name for drill-down
    
    // Filters & UI State
    const [filterSite, setFilterSite] = useState('All Sites');
    const [filterCat, setFilterCat] = useState('All Categories');
    const [filterStatus, setFilterStatus] = useState('All Status');
    const [dateRange, setDateRange] = useState('All Time');
    const [searchTerm, setSearchTerm] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Form State (for Tab 3)
    const [formData, setFormData] = useState({
        empId: '', date: new Date().toISOString().split('T')[0], site: '', 
        category: 'Travel / Tickets', amount: '', paymentMode: 'Card', description: ''
    });

    // ── Derived Data & Filtering ───────────────────────────────────────────
    const uniqueSites = useMemo(() => [...new Set(rawExpenses.map(r => r.site))].sort(), [rawExpenses]);
    const uniqueCategories = useMemo(() => [...new Set(rawExpenses.map(r => r.category))].sort(), [rawExpenses]);
    const employeesList = useMemo(() => dataService.getEmployees(), []);

    const filteredData = useMemo(() => {
        let data = [...rawExpenses];
        if (filterSite !== 'All Sites') data = data.filter(r => r.site === filterSite);
        if (filterCat !== 'All Categories') data = data.filter(r => r.category === filterCat);
        if (filterStatus !== 'All Status') data = data.filter(r => r.status === filterStatus);
        
        if (dateRange === 'Current Year') {
            const curYr = new Date().getFullYear();
            data = data.filter(r => new Date(r.date).getFullYear() === curYr);
        } else if (dateRange === 'Last 30 Days') {
            const dayLimit = new Date(); dayLimit.setDate(dayLimit.getDate() - 30);
            data = data.filter(r => new Date(r.date) >= dayLimit);
        }

        if (amountMin) data = data.filter(r => r.amount >= Number(amountMin));
        if (amountMax) data = data.filter(r => r.amount <= Number(amountMax));

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(r => 
                r.name.toLowerCase().includes(term) || 
                r.site.toLowerCase().includes(term) ||
                (r.description && r.description.toLowerCase().includes(term))
            );
        }
        return data.sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [rawExpenses, filterSite, filterCat, filterStatus, dateRange, searchTerm, amountMin, amountMax]);

    const summary = useMemo(() => {
        let approved = 0, rejected = 0, pending = 0;
        const siteTotals = {};
        const catTotals = {};

        filteredData.forEach(r => {
            if (r.status === 'Approved') { approved += r.amount; siteTotals[r.site] = (siteTotals[r.site] || 0) + r.amount; }
            else if (r.status === 'Rejected') { rejected += r.amount; }
            else { pending++; }
            catTotals[r.category] = (catTotals[r.category] || 0) + (r.status === 'Approved' ? r.amount : 0);
        });

        const topSite = Object.keys(siteTotals).sort((a,b) => siteTotals[b] - siteTotals[a])[0] || 'N/A';
        const topCat = Object.keys(catTotals).sort((a,b) => catTotals[b] - catTotals[a])[0] || 'N/A';

        return { approved, rejected, pending, topSite, topCat, siteTotals, catTotals };
    }, [filteredData]);

    // ── Chart Preparation ──────────────────────────────────────────────────
    const siteBarData = useMemo(() => Object.entries(summary.siteTotals).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount).slice(0, 5), [summary.siteTotals]);
    const catPieData = useMemo(() => Object.entries(summary.catTotals).map(([name, value]) => ({ name, value })).filter(c => c.value > 0).sort((a,b) => b.value - a.value), [summary.catTotals]);
    const trendData = useMemo(() => {
        const monthly = {};
        filteredData.filter(r => r.status === 'Approved').forEach(r => {
            const month = r.date.substring(0, 7);
            monthly[month] = (monthly[month] || 0) + r.amount;
        });
        return Object.entries(monthly).map(([month, amount]) => ({ month, amount })).sort((a,b) => a.month.localeCompare(b.month));
    }, [filteredData]);

    // ── Handlers ────────────────────────────────────────────────────────────
    const updateExpenseStatus = (id, newStatus) => {
        const updated = rawExpenses.map(r => r.id === id ? { ...r, status: newStatus } : r);
        setRawExpenses(updated);
        dataService.saveExpenses(updated);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const emp = employeesList.find(emp => emp.id === Number(formData.empId));
        const newExpense = {
            id: Date.now(),
            ...formData,
            empId: Number(formData.empId),
            name: emp ? emp.name : 'Unknown User',
            department: emp ? emp.department : 'General',
            amount: Number(formData.amount),
            status: 'Pending',
            attachments: 0
        };
        const updated = [newExpense, ...rawExpenses];
        setRawExpenses(updated);
        dataService.saveExpenses(updated);
        setActiveTab('ledger');
        setFormData({ empId: '', date: new Date().toISOString().split('T')[0], site: '', category: 'Travel / Tickets', amount: '', paymentMode: 'Card', description: '' });
    };

    const handleExport = (format) => {
        const rawData = filteredData.map(r => ({
            "Date": r.date, "Site": r.site, "Employee": r.name, "Category": r.category, "Amount": r.amount, "Mode": r.paymentMode || 'N/A', "Status": r.status, "Notes": r.description || ''
        }));
        const ws = XLSX.utils.json_to_sheet(rawData);
        if (format === 'csv') {
            const blob = new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Site_Expenses.csv`; a.click();
        } else {
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Expenses");
            XLSX.writeFile(wb, `Site_Expenses.xlsx`);
        }
    };

    return (
        <div className="page-container">
            {/* Header Section */}
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Site-wise Expense Analytics</h1>
                    <p className="page-subtitle">Track project expenditures, manage approvals, and analyze cost distributions across all operational hubs.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }} className="hide-on-print">
                     <div style={{ position: 'relative' }}>
                          <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                               <Download size={16} /> Export & Share
                          </button>
                          {showExportMenu && (
                              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                                   <button className="btn btn-ghost" onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} /> CSV Format</button>
                                    <button className="btn btn-ghost" onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} /> Excel Workbook</button>
                                    <button className="btn btn-ghost" onClick={() => { generatePDF('site-expense-report-capture', 'Site_Expense_Report.pdf'); setShowExportMenu(false) }}><Printer size={16} /> Professional PDF</button>
                                    <button className="btn btn-ghost" onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} /> Email Finance</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="hide-on-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                {[
                    { id: 'analytics', label: 'Analytics Dashboard', icon: TrendingUp },
                    { id: 'ledger', label: 'Audit Ledger & Approvals', icon: FileText },
                    { id: 'submit', label: 'Submit Site Expense', icon: Plus }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`} style={{ gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'analytics' && (
                <div id="site-expense-report-capture">
                <div style={{ padding: '0.25rem' }}>
                    {/* KPI Cards */}
                    <div className="grid-4" style={{ marginBottom: '2rem' }}>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Approved</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(summary.approved)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Audit Savings (Rejected)</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(summary.rejected)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pending Approvals</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{summary.pending} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>Tickets</span></div>
                        </div>
                        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Highest Spend Hub</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{summary.topSite}</div>
                        </div>
                    </div>

                    {/* Chart Dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                         <div className="card">
                             <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building size={18} /> Top 5 Expense Sites</h3>
                             <div style={{ height: '300px' }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={siteBarData} layout="vertical">
                                         <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                         <XAxis type="number" hide />
                                         <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                                         <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                         <Bar dataKey="amount" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                                     </BarChart>
                                 </ResponsiveContainer>
                             </div>
                         </div>
                         <div className="card">
                             <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PieChartIcon size={18} /> Expense Composition</h3>
                             <div style={{ height: '300px' }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                         <Pie data={catPieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                             {catPieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                         </Pie>
                                         <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                         <Legend />
                                     </PieChart>
                                 </ResponsiveContainer>
                             </div>
                         </div>
                         <div className="card" style={{ gridColumn: 'span 2' }}>
                             <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> Financial Time-Series Trend (Approved)</h3>
                             <div style={{ height: '300px' }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <LineChart data={trendData}>
                                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                         <XAxis dataKey="month" fontSize={12} />
                                         <YAxis tickFormatter={(v) => `₹${v/1000}k`} fontSize={12} />
                                         <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                                         <Line type="monotone" dataKey="amount" stroke="var(--color-success)" strokeWidth={3} dot={{ r: 5 }} />
                                     </LineChart>
                                 </ResponsiveContainer>
                             </div>
                         </div>
                    </div>

                    {/* Site-wise Threshold Alerts */}
                    <div className="card" style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                         <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9a3412' }}><AlertTriangle size={18} /> Operational Budget Health</h3>
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                              {uniqueSites.map(site => {
                                  const total = summary.siteTotals[site] || 0;
                                  const threshold = 50000;
                                  const pct = (total / threshold) * 100;
                                  return (
                                      <div key={site} style={{ padding: '0.75rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                           <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>{site}</div>
                                           <div style={{ height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? 'var(--color-danger)' : pct > 50 ? 'var(--color-warning)' : 'var(--color-success)' }}></div>
                                           </div>
                                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                                                <span>{formatCurrency(total)}</span>
                                                <span style={{ color: pct > 80 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{pct.toFixed(0)}%</span>
                                           </div>
                                      </div>
                                  )
                              })}
                         </div>
                    </div>
                </div>
                </div>
            )}

            {activeTab === 'ledger' && (
                <>
                    {/* Advanced Filters */}
                    <div className="card hide-on-print" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'flex-end', backgroundColor: 'var(--color-surface)' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Operating Site</label>
                            <select className="form-input" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                                <option>All Sites</option>
                                {uniqueSites.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Expense Class</label>
                            <select className="form-input" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                                <option>All Categories</option>
                                {uniqueCategories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Approval State</label>
                            <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option>All Status</option>
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Time Interval</label>
                            <select className="form-input" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                                <option>All Time</option>
                                <option>Current Year</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                             <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} color="var(--color-text-muted)" />
                             <input type="text" className="form-input" placeholder="Keyword Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem' }}>Transaction Audit Ledger</h3>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Showing {filteredData.length} records</div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '1rem' }}>Date</th>
                                        <th style={{ padding: '1rem' }}>Site Trace</th>
                                        <th style={{ padding: '1rem' }}>Employee Profiling</th>
                                        <th style={{ padding: '1rem' }}>Category & Mode</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Amount (₹)</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Approval Lifecycle</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{r.date}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div onClick={() => setSelectedSiteModal(r.site)} style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <MapPin size={12} /> {r.site}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600 }}>{r.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{r.department}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.category}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', display: 'inline-block', backgroundColor: 'rgba(37,99,235,0.05)', padding: '1px 6px', borderRadius: '4px' }}>{r.paymentMode}</div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '1rem' }}>{formatCurrency(r.amount)}</td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span className={`badge ${r.status === 'Approved' ? 'badge-success' : r.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                    {r.status === 'Pending' ? (
                                                        <>
                                                            <button onClick={() => updateExpenseStatus(r.id, 'Approved')} className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)', borderColor: 'var(--color-success)' }} title="Approve"><CheckCircle size={14} /></button>
                                                            <button onClick={() => updateExpenseStatus(r.id, 'Rejected')} className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} title="Reject"><XCircle size={14} /></button>
                                                        </>
                                                    ) : (
                                                        <button className="btn btn-ghost" style={{ padding: '0.4rem' }}><Eye size={14} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'submit' && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Plus size={20} color="var(--color-primary)" /> Submit Field Expense Ticket</h2>
                        <form onSubmit={handleFormSubmit}>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Employee</label>
                                    <select className="form-input" value={formData.empId} onChange={e => setFormData({...formData, empId: e.target.value})} required>
                                        <option value="">Select Employee</option>
                                        {employeesList.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Expenditure</label>
                                    <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Active Operational Site</label>
                                    <select className="form-input" value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} required>
                                        <option value="">Select Hub</option>
                                        {uniqueSites.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expense Category</label>
                                    <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option>Travel / Tickets</option>
                                        <option>Accommodation</option>
                                        <option>Food</option>
                                        <option>Local Conveyance</option>
                                        <option>Miscellaneous</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <div style={{ position: 'relative' }}>
                                         <IndianRupee size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} color="var(--color-text-muted)" />
                                         <input type="number" className="form-input" style={{ paddingLeft: '2.25rem' }} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-input" value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})}>
                                        <option>Cash</option>
                                        <option>Card</option>
                                        <option>UPI / Digital</option>
                                        <option>Company Account</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Description & Remarks</label>
                                    <textarea className="form-input" rows="4" placeholder="Briefly explain the nature of this expense..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('ledger')}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Dispatch for Approval</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Site Drill-Down Modal */}
            {selectedSiteModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                               <div>
                                   <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers size={20} /> Site Drill-Down: {selectedSiteModal}</h2>
                                   <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Approved employee-wise distribution for this hub.</p>
                               </div>
                               <button onClick={() => setSelectedSiteModal(null)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={20} /></button>
                          </div>
                          
                          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                               {Object.entries(
                                   filteredData.filter(r => r.site === selectedSiteModal && r.status === 'Approved').reduce((acc, curr) => {
                                       acc[curr.name] = (acc[curr.name] || 0) + curr.amount;
                                       return acc;
                                   }, {})
                               ).sort((a,b) => b[1] - a[1]).map(([name, amt]) => (
                                   <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <span style={{ fontWeight: 600 }}>{name}</span>
                                        <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{formatCurrency(amt)}</span>
                                   </div>
                               ))}
                          </div>

                          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                               <button className="btn btn-primary" onClick={() => setSelectedSiteModal(null)}>Close Insight</button>
                          </div>
                     </div>
                </div>
            )}

            {/* Email Modal Integration */}
            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}><Mail size={20} /> Dispatch Analytics to Finance</h2>
                            <button onClick={() => setShowEmailModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}><X size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Recipient Addresses</label>
                            <input type="text" className="form-input" defaultValue="finance.audit@accuweigh.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            <input type="text" className="form-input" defaultValue={`Expense Report: ${filterSite} - ${new Date().toLocaleDateString()}`} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message Summary</label>
                            <textarea className="form-input" rows="4" readOnly value={`Attached is the summarized expense analytics for ${filterSite}. \nApproved: ${formatCurrency(summary.approved)}\nAudit Savings: ${formatCurrency(summary.rejected)}\nTickets Audited: ${filteredData.length}`}></textarea>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { alert('Report dispatched successfully!'); setShowEmailModal(false); }}>Send PDF & XLSX Attachments</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteExpenseReport;

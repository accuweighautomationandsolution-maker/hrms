import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  IndianRupee, 
  Download, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  FileSpreadsheet,
  Printer,
  Mail,
  X
} from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { generatePDF, dispatchMockEmail } from '../utils/exportUtils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const AdvanceReport = () => {
    const currentUser = authService.getCurrentUser();
    const isEmployee = authService.getUserRole() === 'employee';
    const [selectedEmpId, setSelectedEmpId] = useState(isEmployee && currentUser ? currentUser.id : 'all');
    const [selectedType, setSelectedType] = useState('all');
    const [year, setYear] = useState(new Date().getFullYear());
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    
    // Data Loading
    const allAdvances = useMemo(() => dataService.getAdvanceHistory(), []);
    const employees = useMemo(() => dataService.getEmployees(), []);

    // Filter Logic
    const reportData = useMemo(() => {
        return allAdvances.filter(adv => {
            const dateObj = new Date(adv.issueDate);
            if (dateObj.getFullYear() !== year) return false;
            if (selectedEmpId !== 'all' && adv.empId !== Number(selectedEmpId)) return false;
            if (selectedType !== 'all' && adv.type !== selectedType) return false;
            return true;
        }).map(adv => {
            const emp = employees.find(e => e.id === adv.empId) || { name: 'Unknown' };
            return { ...adv, employeeName: emp.name };
        });
    }, [allAdvances, employees, year, selectedEmpId, selectedType]);

    // Summary Statistics
    const summary = useMemo(() => {
        let totalIssued = 0;
        let amountRecovered = 0;

        reportData.forEach(adv => {
            totalIssued += adv.amount;

            if (adv.status === 'Settled') {
                amountRecovered += adv.amount;
            } else if (adv.type === 'Personal Advance') {
                // Simulate recovered amount for active loans
                const issueDate = new Date(adv.issueDate);
                const now = new Date();
                const monthsPassed = (now.getFullYear() - issueDate.getFullYear()) * 12 + (now.getMonth() - issueDate.getMonth());
                
                const emi = adv.amount / adv.installments;
                const recovered = Math.min(adv.amount, Math.max(0, monthsPassed) * emi);
                amountRecovered += recovered;
            }
        });

        return {
            totalIssued,
            amountRecovered: Math.round(amountRecovered),
            pendingBalance: Math.round(totalIssued - amountRecovered)
        };
    }, [reportData]);

    // Graph Data Parsers
    const typeDistributionData = useMemo(() => {
        const dist = { 'Personal Advance': 0, 'Official Site Advance': 0 };
        reportData.forEach(adv => { dist[adv.type] += adv.amount; });
        return [
            { name: 'Personal Advance', value: dist['Personal Advance'] },
            { name: 'Official Site Advance', value: dist['Official Site Advance'] }
        ].filter(d => d.value > 0);
    }, [reportData]);

    const siteCategoryData = useMemo(() => {
        const catMap = {};
        reportData.filter(adv => adv.type === 'Official Site Advance' && adv.siteDetails).forEach(adv => {
            Object.entries(adv.siteDetails).forEach(([cat, amt]) => {
                catMap[cat] = (catMap[cat] || 0) + amt;
            });
        });
        return Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
    }, [reportData]);

    const lineTrendData = useMemo(() => {
        const mp = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0 };
        reportData.forEach(adv => {
            const m = new Date(adv.issueDate).getMonth();
            mp[m] += adv.amount;
        });
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return Object.keys(mp).map(k => ({ month: months[k], amount: mp[k] }));
    }, [reportData]);

    const handleExport = (format) => {
        const rawData = reportData.map(r => ({
            "Issue Date": r.issueDate,
            "Employee Name": r.employeeName,
            "Advance Type": r.type,
            "Amount Issued": r.amount,
            "Status": r.status
        }));

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Advance_Report_${year}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Advance_Report");
            XLSX.writeFile(workbook, `Advance_Report_${year}.xlsx`);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Advance & Loan Report</h1>
                    <p className="page-subtitle">Interactive visualization and transaction logs for company disbursements.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }} className="hide-on-print">
                     <div style={{ position: 'relative' }}>
                          <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                               <Download size={16} style={{ marginRight: '0.5rem' }} /> Export & Share
                          </button>
                          {showExportMenu && (
                              <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> CSV Data</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Excel Workbook</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('advance-report-capture', `Advance_Report_${year}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div id="advance-report-capture">
            {/* Filter Panel */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={18} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Filters</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <select className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>
                    {!isEmployee && (
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                            <select className="form-input" value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
                                <option value="all">All Employees</option>
                                {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <select className="form-input" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                            <option value="all">All Advance Types</option>
                            <option value="Personal Advance">Personal Advances</option>
                            <option value="Official Site Advance">Site Visit Advances</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Layer */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Amount Issued</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>₹{summary.totalIssued.toLocaleString()}</div>
                </div>
                <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Amount Recovered (Est.)</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-success)' }}>₹{summary.amountRecovered.toLocaleString()}</div>
                </div>
                <div className="card" style={{ borderTop: '4px solid var(--color-warning)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Pending Balance</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>₹{summary.pendingBalance.toLocaleString()}</div>
                </div>
            </div>

            {/* Visualizer Row */}
            {reportData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* Line Trend */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></span> Issuance Trend ({year})
                        </h3>
                        <div style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={lineTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} width={60} tickFormatter={(val) => `₹${val}`} />
                                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pies & Bars Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {selectedType !== 'Official Site Advance' && (
                            <div className="card" style={{ gridColumn: selectedType === 'Personal Advance' ? '1 / 3' : '1' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Type Distribution</h3>
                                <div style={{ height: '220px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={typeDistributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                                {typeDistributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {selectedType !== 'Personal Advance' && siteCategoryData.length > 0 && (
                            <div className="card" style={{ gridColumn: selectedType === 'Official Site Advance' ? '1 / 3' : '2' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Site Categories Base</h3>
                                <div style={{ height: '220px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={siteCategoryData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <RechartsTooltip />
                                            <Bar dataKey="value" fill="var(--color-success)" radius={[4,4,0,0]} barSize={30} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Transaction Ledger</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Found {reportData.length} records</div>
                </div>
                
                {reportData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                    <th style={{ padding: '1rem' }}>Issue Date</th>
                                    <th style={{ padding: '1rem' }}>Advance Type</th>
                                    <th style={{ padding: '1rem' }}>Employee</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.sort((a,b) => new Date(b.issueDate) - new Date(a.issueDate)).map((adv) => (
                                    <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                                <IndianRupee size={16} color="var(--color-text-muted)" />
                                                {new Date(adv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div>{adv.type}</div>
                                            {adv.siteDetails && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                                    {Object.keys(adv.siteDetails).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: '600' }}>{adv.employeeName}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className={`badge ${adv.status === 'Settled' ? 'badge-success' : 'badge-warning'}`}>
                                                {adv.status === 'Settled' ? <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> : <Clock size={12} style={{ marginRight: '4px' }} />}
                                                {adv.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>₹{adv.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                        <Search size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No advances found matching the current filters.</p>
                    </div>
                )}
            </div>

            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email Advance Report</h2>
                            <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Recipient Addresses (comma separated)</label>
                            <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem' }} placeholder="finance@company.com" />
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Attached Formats</label>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> PDF Summary</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> Excel (.xlsx)</label>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Brief Message Text</label>
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the Advance & Loan report for ${year}. The total amount issued evaluated to ₹${summary.totalIssued.toLocaleString()}.`}></textarea>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => { alert('Report successfully queued for email automation!'); setShowEmailModal(false); }}>
                            Dispatch Email
                        </button>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default AdvanceReport;

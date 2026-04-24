import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calculator, 
  Download, 
  Search, 
  Filter,
  Users,
  FileSpreadsheet,
  FileText,
  Printer,
  Mail,
  X
} from 'lucide-react';
import { dataService } from '../utils/dataService';
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

const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
};

const PayrollReport = () => {
    const [periodType, setPeriodType] = useState('Quarterly'); // Monthly, Quarterly, Half-Yearly, Yearly
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [quarter, setQuarter] = useState('Q1');
    const [half, setHalf] = useState('H1');
    const [selectedEmpId, setSelectedEmpId] = useState('all');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    
    // Data Loading
    const allPayroll = useMemo(() => dataService.getPayrollHistory(), []);
    const employees = useMemo(() => dataService.getEmployees(), []);

    // Active Months Array computation
    const activeMonths = useMemo(() => {
        if (periodType === 'Yearly') return [0,1,2,3,4,5,6,7,8,9,10,11];
        if (periodType === 'Half-Yearly') return half === 'H1' ? [0,1,2,3,4,5] : [6,7,8,9,10,11];
        if (periodType === 'Quarterly') {
           if (quarter === 'Q1') return [0,1,2];
           if (quarter === 'Q2') return [3,4,5];
           if (quarter === 'Q3') return [6,7,8];
           if (quarter === 'Q4') return [9,10,11];
        }
        return [month]; // Monthly
    }, [periodType, half, quarter, month]);

    // Filter Logic
    const reportData = useMemo(() => {
        return allPayroll.filter(pr => {
            if (pr.year !== year) return false;
            if (!activeMonths.includes(pr.month)) return false;
            if (selectedEmpId !== 'all' && pr.empId !== Number(selectedEmpId)) return false;
            return true;
        }).map(pr => {
            const emp = employees.find(e => e.id === pr.empId) || { name: 'Unknown', empCode: 'UNK' };
            return { ...pr, employeeName: emp.name, empCode: emp.empCode };
        });
    }, [allPayroll, employees, year, activeMonths, selectedEmpId]);

    // Summary Statistics
    const summary = useMemo(() => {
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        reportData.forEach(pr => {
            totalGross += pr.gross;
            totalDeductions += pr.deductions.total;
            totalNet += pr.netPay;
        });

        return {
            totalGross,
            totalDeductions,
            totalNet
        };
    }, [reportData]);

    // Graph Data Parsers
    const trendData = useMemo(() => {
        // Group by month
        const mp = {};
        activeMonths.forEach(m => {
            mp[m] = { month: MONTH_NAMES[m].substring(0,3), netPay: 0, deductions: 0, gross: 0 };
        });

        reportData.forEach(pr => {
            if(mp[pr.month]) {
                mp[pr.month].netPay += pr.netPay;
                mp[pr.month].deductions += pr.deductions.total;
                mp[pr.month].gross += pr.gross;
            }
        });
        
        return activeMonths.map(m => mp[m]);
    }, [reportData, activeMonths]);

    const deductionPieData = useMemo(() => {
        let pf = 0, esic = 0, pt = 0, tds = 0, advance = 0;
        reportData.forEach(pr => {
            pf += pr.deductions.pf;
            esic += pr.deductions.esic;
            pt += pr.deductions.pt;
            tds += pr.deductions.tds;
            advance += pr.deductions.advance;
        });
        return [
            { name: 'Provident Fund', value: pf },
            { name: 'ESIC', value: esic },
            { name: 'Prof Tax', value: pt },
            { name: 'TDS (Income Tax)', value: tds },
            { name: 'Advance Recovery', value: advance }
        ].filter(d => d.value > 0);
    }, [reportData]);

    const handleExport = (format) => {
        const rawData = reportData.map(r => ({
            "Month": MONTH_NAMES[r.month],
            "Year": r.year,
            "Emp Code": r.empCode,
            "Employee Name": r.employeeName,
            "Gross Pay": r.gross,
            "PF": r.deductions.pf,
            "ESIC": r.deductions.esic,
            "PT": r.deductions.pt,
            "TDS": r.deductions.tds,
            "Advance": r.deductions.advance,
            "Total Deductions": r.deductions.total,
            "Net Pay": r.netPay
        }));

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payroll_Report_${periodType}_${year}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll_Report");
            XLSX.writeFile(workbook, `Payroll_Report_${periodType}_${year}.xlsx`);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Payroll Report</h1>
                    <p className="page-subtitle">Aggregate and analyze payroll expenses historically across periods.</p>
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
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('payroll-report-capture', `Payroll_Report_${periodType}_${year}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div id="payroll-report-capture">
            {/* Filter Panel */}
            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={18} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Filters</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                        <select className="form-input" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Half-Yearly">Half-Yearly</option>
                            <option value="Yearly">Yearly</option>
                        </select>
                    </div>
                    
                    {periodType === 'Monthly' && (
                        <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                            <select className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                                {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </div>
                    )}
                    {periodType === 'Quarterly' && (
                        <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                            <select className="form-input" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                                <option value="Q1">Q1 (Jan-Mar)</option>
                                <option value="Q2">Q2 (Apr-Jun)</option>
                                <option value="Q3">Q3 (Jul-Sep)</option>
                                <option value="Q4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                    )}
                    {periodType === 'Half-Yearly' && (
                        <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                            <select className="form-input" value={half} onChange={(e) => setHalf(e.target.value)}>
                                <option value="H1">H1 (Jan-Jun)</option>
                                <option value="H2">H2 (Jul-Dec)</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                        <select className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ flex: 2, minWidth: '200px', margin: 0 }}>
                        <select className="form-input" value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}>
                            <option value="all">All Employees Overview</option>
                            <optgroup label="Individuals">
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
                            </optgroup>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Layer */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Gross Committed</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalGross)}</div>
                </div>
                <div className="card" style={{ borderTop: '4px solid var(--color-danger)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Deductions Withheld</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{formatCurrency(summary.totalDeductions)}</div>
                </div>
                <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Net Payable</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{formatCurrency(summary.totalNet)}</div>
                </div>
            </div>

            {/* Visualizer Row */}
            {reportData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* Line Trend & Stacked Bar Mix via Composed/Recharts logic (We will just use two charts here) */}
                    <div className="card" style={{ gridColumn: '1 / 3' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calculator size={16} color="var(--color-primary)" /> Payroll Trend Analytics ({periodType})
                        </h3>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" />
                                    <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Bar dataKey="netPay" stackId="a" fill="var(--color-success)" name="Net Payout" radius={[0,0,4,4]} />
                                    <Bar dataKey="deductions" stackId="a" fill="var(--color-danger)" name="Deductions" radius={[4,4,0,0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pies Grid */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Deductions Breakdown</h3>
                        <div style={{ height: '220px' }}>
                            {deductionPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={deductionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                            {deductionPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                                    No deductions found
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>Cost Composition</h3>
                        <div style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Net Pay to Employees', value: summary.totalNet },
                                        { name: 'Statutory/Deductions', value: summary.totalDeductions }
                                    ]} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                                        <Cell fill="var(--color-success)" />
                                        <Cell fill="var(--color-danger)" />
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Historical Ledger</h3>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Found {reportData.length} records</div>
                </div>
                
                {reportData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                    <th style={{ padding: '1rem' }}>Period</th>
                                    <th style={{ padding: '1rem' }}>Employee</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Gross Pay</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Total Deductions</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Net Pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.sort((a,b) => b.month - a.month).map((pr, idx) => (
                                    <tr key={`${pr.id}-${idx}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>
                                            {MONTH_NAMES[pr.month]} {pr.year}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>{pr.employeeName}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{pr.empCode}</div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>
                                            {formatCurrency(pr.gross)}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: '600' }}>
                                                {formatCurrency(pr.deductions.total)}
                                            </span>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                                {pr.deductions.pf > 0 ? 'PF, ' : ''}{pr.deductions.esic > 0 ? 'ESIC, ' : ''}{pr.deductions.pt > 0 ? 'PT' : ''}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: 'var(--color-success)', fontSize: '1.05rem' }}>
                                            {formatCurrency(pr.netPay)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                        <Search size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No payroll data found for the selected period.</p>
                    </div>
                )}
            </div>

            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email Payroll Report</h2>
                            <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Recipient Addresses (comma separated)</label>
                            <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem' }} placeholder="finance@company.com, directors@company.com" />
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
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the ${periodType} Payroll report for ${year}. Total Net Payable sum evaluated to ${formatCurrency(summary.totalNet)}.`}></textarea>
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

export default PayrollReport;

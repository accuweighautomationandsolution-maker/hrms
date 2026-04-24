import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FileText, Download, Users, User, IndianRupee, Printer, Search, FileSpreadsheet, Mail, X } from 'lucide-react';
import { calculateSalaryComponents } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { generatePDF, dispatchMockEmail } from '../utils/exportUtils';

const PFReport = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedEmpId, setSelectedEmpId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    const employees = dataService.getEmployees().filter(e => e.hasPF !== false && e.uanNumber !== 'N/A');

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const reportData = useMemo(() => {
        const list = selectedEmpId === 'all' ? employees : employees.filter(e => e.id === Number(selectedEmpId));
        
        return list.map(emp => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const presentDays = dataService.getPresentDaysCount(emp.id, month, year);
            const ncpDays = daysInMonth - presentDays;
            
            // Re-calculate based on actual days worked for precision
            const components = calculateSalaryComponents(emp.grossSalary || emp.dayRate || 0, true, 0, emp.category, presentDays, daysInMonth);
            
            const epfWages = components.pfReport.epfWages;
            const epsWages = components.pfReport.epsWages; // Capped at 15k by calc
            const edliWages = epsWages; // Statutory sync
            
            return {
                id: emp.id,
                name: emp.name,
                uan: emp.uanNumber || '000000000000',
                grossWages: Math.round(components.earnings.gross),
                epfWages: Math.round(epfWages),
                epsWages: Math.round(epsWages),
                edliWages: Math.round(edliWages),
                eeContri: Math.round(components.pfReport.eeShare),
                epsContri: Math.round(components.pfReport.erPension),
                diffContri: Math.round(components.pfReport.erEPF),
                edliContri: Math.round(components.pfReport.edli),
                adminContri: Math.round(components.pfReport.admin),
                ncpDays: ncpDays,
                refundAdvances: 0,
                total: components.pfReport.eeShare + components.pfReport.erPension + components.pfReport.erEPF
            };
        }).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [selectedEmpId, year, month, employees, searchTerm]);

    const totals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            ee: acc.ee + curr.eeContri,
            erPension: acc.erPension + curr.epsContri,
            erEPF: acc.erEPF + curr.diffContri,
            edli: acc.edli + curr.edliContri,
            admin: acc.admin + curr.adminContri,
            gross: acc.gross + curr.grossWages
        }), { ee: 0, erPension: 0, erEPF: 0, edli: 0, admin: 0, gross: 0 });
    }, [reportData]);

    const handleExport = (format) => {
        const header = [
            "UAN", "MEMBER NAME", "GROSS WAGES", "EPF WAGES", "EPS WAGES", 
            "EDLI WAGES", "EPF CONTRI REMITTED", "EPS CONTRI REMITTED", 
            "EPF EPS DIFF REMITTED", "NCP DAYS", "REFUND OF ADVANCES"
        ];
        
        const rows = reportData.map(d => [
            d.uan, d.name, d.grossWages, d.epfWages, d.epsWages, 
            d.edliWages, d.eeContri, d.epsContri, d.diffContri, d.ncpDays, "NIL"
        ]);
        
        const rawData = reportData.map(d => ({
            "UAN": d.uan,
            "MEMBER NAME": d.name,
            "GROSS WAGES": d.grossWages,
            "EPF WAGES": d.epfWages,
            "EPS WAGES": d.epsWages,
            "EDLI WAGES": d.edliWages,
            "EPF CONTRI REMITTED": d.eeContri,
            "EPS CONTRI REMITTED": d.epsContri,
            "EPF EPS DIFF REMITTED": d.diffContri,
            "NCP DAYS": d.ncpDays,
            "REFUND OF ADVANCES": "NIL"
        }));

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `PF_ECR_${monthNames[month]}_${year}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "PF_ECR");
            XLSX.writeFile(workbook, `PF_ECR_${monthNames[month]}_${year}.xlsx`);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">PF Statutory Report</h1>
                    <p className="page-subtitle">Provident Fund compliance and ECR export module.</p>
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
                                    <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('pf-report-capture', `PF_ECR_${monthNames[month]}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                                    <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div id="pf-report-capture">
            <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label className="form-label">Select Month / Year</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <select className="form-input" style={{ flex: 1 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select className="form-input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
                                <option>2024</option>
                                <option>2025</option>
                                <option>2026</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Select Employee</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            value={selectedEmpId}
                            onChange={e => setSelectedEmpId(e.target.value)}
                        >
                            <option value="all">All Employees (Aggregate)</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode || e.id})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Quick Search</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search by name..." 
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Employee Share (12%)</span>
                        <Users size={20} color="var(--color-primary)" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>₹{totals.ee.toLocaleString('en-IN')}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Remitted from basic salaries</p>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Employer Share (3.67% + 8.33%)</span>
                        <IndianRupee size={20} color="var(--color-success)" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>₹{(totals.erPension + totals.erEPF).toLocaleString('en-IN')}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pension + EPF Difference</p>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Total PF Liability</span>
                        <FileText size={20} color="var(--color-warning)" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>₹{(totals.ee + totals.erPension + totals.erEPF + totals.edli + totals.admin).toLocaleString('en-IN')}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Includes Admin & EDLI (1%)</p>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>Contribution Breakdown</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Showing {reportData.length} Members</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>UAN / Member</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Gross Wages</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>EPF Wages</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>EPS Wages</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>EE Contri (12%)</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>EPS Contri (8.33%)</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Diff (3.67%)</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>NCP Days</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.85rem' }}>{item.uan}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.name}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>₹{item.grossWages.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>₹{item.epfWages.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>₹{item.epsWages.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: '600' }}>₹{item.eeContri.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-success)', fontWeight: '600' }}>₹{item.epsContri.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-success)', fontWeight: '600' }}>₹{item.diffContri.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span className={`badge ${item.ncpDays > 0 ? 'badge-danger' : 'badge-success'}`} style={{ padding: '0.2rem 0.5rem' }}>{item.ncpDays}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>

            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email PF Report</h2>
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
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the latest statutory PF ECR report for ${monthNames[month]} ${year}. Total PF Liability stands at ₹${(totals.ee + totals.erPension + totals.erEPF + totals.edli + totals.admin).toLocaleString('en-IN')}.`}></textarea>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => { alert('Report successfully queued for email automation!'); setShowEmailModal(false); }}>
                            Dispatch Email
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PFReport;

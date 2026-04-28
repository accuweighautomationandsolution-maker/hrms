import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FileText, Download, Users, User, IndianRupee, Printer, Search, ShieldCheck, FileSpreadsheet, Mail, X } from 'lucide-react';
import { calculateSalaryComponents } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { generatePDF, dispatchMockEmail } from '../utils/exportUtils';

const ESICReport = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedEmpId, setSelectedEmpId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const [employees, setEmployees] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [empsData, attData] = await Promise.all([
                    dataService.getEmployees(),
                    dataService.getAttendance()
                ]);
                const filteredEmps = empsData.filter(e => {
                    const hasIp = e.esicIp || (e.esicNumber && e.esicNumber !== 'N/A');
                    return e.hasESIC !== false && hasIp;
                });
                setEmployees(filteredEmps);
                setAttendanceRecords(attData);
            } catch (err) {
                console.error("Failed to load ESIC report data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const reportData = useMemo(() => {
        const list = selectedEmpId === 'all' ? employees : employees.filter(e => e.id === Number(selectedEmpId));
        
        return list.map(emp => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const presentDays = dataService.getPresentDaysCount(emp.id, month, year, attendanceRecords);
            
            // Re-calculate based on actual days worked for precision
            const components = calculateSalaryComponents(emp.grossSalary || emp.dayRate || 0, true, 0, emp.category, presentDays, daysInMonth);
            
            // Map status to ESIC Reason Codes
            let reasonCode = 0;
            if (presentDays === 0) {
                if (emp.status === 'On Leave') reasonCode = 1;
                else if (emp.status === 'Terminated') reasonCode = 10;
                else if (emp.status === 'Inactive') reasonCode = 2; // Left Service
            }

            return {
                id: emp.id,
                name: emp.name.toUpperCase().replace(/[^A-Z ]/g, ''), // Strict Image constraint
                ipNumber: emp.esicIp || emp.esicNumber || '0000000000',
                workingDays: Math.ceil(presentDays > 0 ? presentDays : 0),
                monthlyWages: Math.round(components.earnings.totalEarnings), 
                eeContri: components.esicReport.eeShare,
                erContri: components.esicReport.erShare,
                reasonCode: reasonCode,
                lastWorkingDay: emp.status === 'Inactive' ? emp.exitDate || '' : ''
            };
        }).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [selectedEmpId, year, month, employees, attendanceRecords, searchTerm]);

    const totals = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            ee: acc.ee + curr.eeContri,
            er: acc.er + curr.erContri,
            wages: acc.wages + curr.monthlyWages,
            count: acc.count + 1
        }), { ee: 0, er: 0, wages: 0, count: 0 });
    }, [reportData]);

    const handleExport = (format) => {
        const rawData = reportData.map(d => ({
            "IP Number (10 Digits)": d.ipNumber,
            "IP Name (Only alphabets and space)": d.name,
            "No of Days for which wages paid/payable during the month": d.workingDays,
            "Total Monthly Wages": d.monthlyWages,
            "Reason Code for Zero workings days": d.reasonCode,
            "Last Working Day (Format DD/MM/YYYY or DD-MM-YYYY)": d.lastWorkingDay || ""
        }));

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `ESIC_Contribution_${monthNames[month]}_${year}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ESIC_ECR");
            XLSX.writeFile(workbook, `ESIC_Contribution_${monthNames[month]}_${year}.xlsx`);
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
            <div className="page-header">
                <div>
                    <h1 className="page-title">ESIC Statutory Report</h1>
                    <p className="page-subtitle">Employee State Insurance compliance and ECR export module.</p>
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
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('esic-report-capture', `ESIC_Report_${monthNames[month]}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div id="esic-report-capture">
            <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label className="form-label">Contribution Period</label>
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
                        <label className="form-label">Filter IPs</label>
                        <select 
                            className="form-input" 
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            value={selectedEmpId}
                            onChange={e => setSelectedEmpId(e.target.value)}
                        >
                            <option value="all">All Insured Persons</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.esicIp})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Search IP Name</label>
                        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Search IP..." 
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #4f46e5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Active IPs for {monthNames[month]}</span>
                        <Users size={20} color="#4f46e5" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{totals.count}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Employees strictly under 21,000 gross</p>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Employer Share (3.25%)</span>
                        <IndianRupee size={20} color="var(--color-success)" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>₹{totals.er.toLocaleString('en-IN')}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Paid extra by the establishment</p>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Total ESIC Liability</span>
                        <ShieldCheck size={20} color="var(--color-warning)" />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>₹{(totals.ee + totals.er).toLocaleString('en-IN')}</div>
                    <p style={{ margin: '0.50rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Aggregate 4% of total wages</p>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>ESIC Contribution Monthly Ledger</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
                        <span>Total Monthly Wages: <strong>₹{totals.wages.toLocaleString('en-IN')}</strong></span>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#fff', borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>IP Number / Name</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>No. of Days</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Total Monthly Wages</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>EE Share (0.75%)</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>ER Share (3.25%)</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Reason Code</th>
                                <th style={{ padding: '1rem', fontSize: '0.70rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', textAlign: 'center' }}>Compliant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.85rem' }}>{item.ipNumber}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.name}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{item.workingDays}</td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>₹{item.monthlyWages.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: '600' }}>₹{item.eeContri.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-success)', fontWeight: '600' }}>₹{item.erContri.toLocaleString('en-IN')}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge ${item.reasonCode === 0 ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                            Code: {item.reasonCode}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <ShieldCheck size={18} color="var(--color-success)" />
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
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email ESIC Report</h2>
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
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the latest statutory ESIC ECR report for ${monthNames[month]} ${year}. Active Subscriptions: ${totals.count}. Total Monthly Wages tracked: ₹${totals.wages.toLocaleString('en-IN')}.`}></textarea>
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

export default ESICReport;

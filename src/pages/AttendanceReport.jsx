import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  Users, 
  User, 
  Clock, 
  CalendarDays, 
  Search, 
  BarChart, 
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
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
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const AttendanceReport = () => {
    const currentUser = authService.getCurrentUser();
    const userRole = authService.getUserRole();
    const isEmployee = userRole === 'employee';

    const [selectedEmpId, setSelectedEmpId] = useState(isEmployee ? currentUser.id : 'all');
    const [periodType, setPeriodType] = useState('monthly'); // monthly, quarterly, half, yearly
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [quarter, setQuarter] = useState(1); // 1, 2, 3, 4
    const [half, setHalf] = useState(1); // 1, 2
    
    const [searchTerm, setSearchTerm] = useState('');
    
    const [employees, setEmployees] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [emps, leaves, att] = await Promise.all([
                    dataService.getEmployees(),
                    dataService.getLeaveRequests(),
                    dataService.getAttendance()
                ]);
                setEmployees(emps);
                setLeaveRequests(leaves);
                setAttendanceRecords(att);
            } catch (err) {
                console.error("Failed to load attendance report data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const dateRange = useMemo(() => {
        let start, end;
        if (periodType === 'monthly') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0);
        } else if (periodType === 'quarterly') {
            start = new Date(year, (quarter - 1) * 3, 1);
            end = new Date(year, quarter * 3, 0);
        } else if (periodType === 'half') {
            start = new Date(year, (half - 1) * 6, 1);
            end = new Date(year, half * 6, 0);
        } else {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        }
        return { start, end };
    }, [periodType, year, month, quarter, half]);

    const reportData = useMemo(() => {
        const emps = selectedEmpId === 'all' 
            ? employees 
            : employees.filter(e => e.id === Number(selectedEmpId));
            
        const results = [];
        
        emps.forEach(emp => {
            const rawData = dataService.getReportRangeData(emp.id, dateRange.start, dateRange.end, attendanceRecords);
            
            const logs = rawData.map(day => {
                // Check if on leave
                const isOnLeave = leaveRequests.find(l => 
                    l.empId === emp.id && 
                    l.status === 'Approved' && 
                    day.date >= l.startDate && 
                    day.date <= l.endDate
                );

                const dateObj = new Date(day.date);
                const dateNum = dateObj.getDate();
                const isFirstOrThirdSat = day.dayName === 'Sat' && ((dateNum >= 1 && dateNum <= 7) || (dateNum >= 15 && dateNum <= 21));

                let status = 'Absent';
                if (day.log && day.log.punchIn) status = 'Present';
                else if (isOnLeave) status = 'On Leave';
                else if (day.dayName === 'Sun' || isFirstOrThirdSat) status = 'Weekly Off';

                return {
                    ...day,
                    status,
                    employeeName: emp.name,
                    empCode: emp.empCode
                };
            });
            
            const summary = {
                present: logs.filter(l => l.status === 'Present').length,
                absent: logs.filter(l => l.status === 'Absent').length,
                leave: logs.filter(l => l.status === 'On Leave').length,
                total: logs.filter(l => l.status !== 'Weekly Off').length
            };

            results.push({
                employee: emp,
                logs,
                summary
            });
        });
        
        return results.filter(r => r.employee.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [selectedEmpId, dateRange, employees, searchTerm]);

    const globalSummary = useMemo(() => {
        return reportData.reduce((acc, curr) => ({
            present: acc.present + (curr.summary?.present || 0),
            absent: acc.absent + (curr.summary?.absent || 0),
            leave: acc.leave + (curr.summary?.leave || 0)
        }), { present: 0, absent: 0, leave: 0 });
    }, [reportData]);

    const [detailedEmp, setDetailedEmp] = useState(null);

    const handleExport = (format) => {
        const rawData = [];
        reportData.forEach(res => {
            res.logs.forEach(l => {
                rawData.push({
                    "Emp Code": res.employee.empCode,
                    "Name": res.employee.name,
                    "Date": l.date,
                    "Day": l.dayName,
                    "Punch In": l.log?.punchIn || '-',
                    "Punch Out": l.log?.punchOut || '-',
                    "Status": l.status
                });
            });
        });

        if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Attendance_Report_${periodType}_${year}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(rawData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance_Report");
            XLSX.writeFile(workbook, `Attendance_Report_${periodType}_${year}.xlsx`);
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
        <div className="page-container" style={{ position: 'relative' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Reporting</h1>
                    <p className="page-subtitle">Monthly, Quarterly, and Yearly statutory attendance forensics.</p>
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
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('attendance-report-capture', `Attendance_Report_${year}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                                   <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                              </div>
                          )}
                     </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {!isEmployee && (
                      <div>
                          <label className="form-label">Scope</label>
                          <select className="form-input" style={{ width: '100%' }} value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}>
                              <option value="all">All Employees</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
                          </select>
                      </div>
                    )}

                    <div>
                        <label className="form-label">Period Type</label>
                        <select className="form-input" style={{ width: '100%' }} value={periodType} onChange={e => setPeriodType(e.target.value)}>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="half">Half Yearly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label">Selection</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {periodType === 'monthly' && (
                                <select className="form-input" style={{ flex: 1 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                                    {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            )}
                            {periodType === 'quarterly' && (
                                <select className="form-input" style={{ flex: 1 }} value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
                                    <option value={1}>Quarter 1 (Jan-Mar)</option>
                                    <option value={2}>Quarter 2 (Apr-Jun)</option>
                                    <option value={3}>Quarter 3 (Jul-Sep)</option>
                                    <option value={4}>Quarter 4 (Oct-Dec)</option>
                                </select>
                            )}
                            {periodType === 'half' && (
                                <select className="form-input" style={{ flex: 1 }} value={half} onChange={e => setHalf(Number(e.target.value))}>
                                    <option value={1}>First Half (H1)</option>
                                    <option value={2}>Second Half (H2)</option>
                                </select>
                            )}
                            <select className="form-input" style={{ width: '100px' }} value={year} onChange={e => setYear(Number(e.target.value))}>
                                <option>2024</option>
                                <option>2025</option>
                                <option>2026</option>
                            </select>
                        </div>
                    </div>

                    {!isEmployee && (
                      <div>
                          <label className="form-label">Find Employee</label>
                          <div style={{ position: 'relative' }}>
                              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                              <input 
                                  type="text" 
                                  className="form-input" 
                                  placeholder="Search..." 
                                  style={{ width: '100%', paddingLeft: '2.5rem' }} 
                                  value={searchTerm}
                                  onChange={e => setSearchTerm(e.target.value)}
                              />
                          </div>
                      </div>
                    )}
                </div>
            </div>

            {!isEmployee && (
              <div className="grid-3" style={{ marginBottom: '2rem' }}>
                  <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Global Present Days</span>
                          <CheckCircle2 size={18} color="var(--color-success)" />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{globalSummary.present}</div>
                  </div>
                  <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Global Absent Days</span>
                          <XCircle size={18} color="var(--color-danger)" />
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{globalSummary.absent}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                      <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Global Approved Leaves</span>
                              <HelpCircle size={18} color="var(--color-primary)" />
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{globalSummary.leave}</div>
                      </div>
                  </div>
              </div>
            )}

            {/* Visual Charts Section */}
            <div className={`grid-${isEmployee ? '2' : '3'}`} style={{ marginBottom: '2rem', gridTemplateColumns: isEmployee ? '1fr 2fr' : 'minmax(0, 1fr) minmax(0, 1.5fr)' }}>
                <div className="card">
                    <h3>{isEmployee ? 'My Attendance Distribution' : 'Attendance Distribution'}</h3>
                    <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                 <Pie
                                    data={[
                                        { name: 'Present', value: isEmployee ? (reportData[0]?.summary?.present || 0) : globalSummary.present },
                                        { name: 'Absent', value: isEmployee ? (reportData[0]?.summary?.absent || 0) : globalSummary.absent },
                                        { name: 'On Leave', value: isEmployee ? (reportData[0]?.summary?.leave || 0) : globalSummary.leave }
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="var(--color-success)" />
                                    <Cell fill="var(--color-danger)" />
                                    <Cell fill="var(--color-primary)" />
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {!isEmployee ? (
                  <div className="card">
                      <h3>Present Days by Employee (Top 10)</h3>
                      <div style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={reportData.map(r => ({ name: r.employee.name.split(' ')[0], value: r.summary.present })).sort((a,b)=>b.value-a.value).slice(0, 10)}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                                  <Bar 
                                      dataKey="value" 
                                      name="Present Days"
                                      fill="var(--color-success)" 
                                      radius={[4, 4, 0, 0]} 
                                      barSize={40}
                                      animationDuration={1500}
                                  />
                              </RechartsBarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                ) : (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <Clock size={48} color="var(--color-primary)" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>{reportData[0]?.summary?.present || 0} Days Present</h2>
                      <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>You are strictly tracking towards your statutory attendance targets for {monthNames[month]} {year}.</p>
                  </div>
                )}
            </div>

            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                                <th style={{ padding: '1rem' }}>Employee</th>
                                <th style={{ padding: '1rem' }}>Period Stats</th>
                                <th style={{ padding: '1rem' }}>Attendance Matrix</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((res, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600' }}>{res.employee.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{res.employee.empCode}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span className="badge badge-success">P: {res.summary.present}</span>
                                            <span className="badge badge-danger">A: {res.summary.absent}</span>
                                            <span className="badge badge-primary">L: {res.summary.leave}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            {res.logs.slice(0, 31).map((l, i) => (
                                                <div 
                                                    key={i} 
                                                    title={`${l.date} - ${l.status}`}
                                                    style={{ 
                                                        width: '10px', 
                                                        height: '10px', 
                                                        borderRadius: '2px',
                                                        backgroundColor: l.status === 'Present' ? 'var(--color-success)' : 
                                                                         l.status === 'On Leave' ? 'var(--color-primary)' :
                                                                         l.status === 'Weekly Off' ? 'var(--color-border)' : 'var(--color-danger)'
                                                    }}
                                                ></div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => setDetailedEmp(res)}>
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Audit Modal */}
            {detailedEmp && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Attendance Audit Log</h2>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                    {detailedEmp.employee.name} ({detailedEmp.employee.empCode}) • {periodType.toUpperCase()} {year}
                                </p>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setDetailedEmp(null)} style={{ padding: '0.5rem', fontSize: '1.5rem' }}>✕</button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: '0.75rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem' }}>Day</th>
                                        <th style={{ padding: '0.75rem' }}>Punch In</th>
                                        <th style={{ padding: '0.75rem' }}>Punch Out</th>
                                        <th style={{ padding: '0.75rem' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedEmp.logs.map((log, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: log.dayName === 'Sun' ? '#f8fafc' : 'transparent' }}>
                                            <td style={{ padding: '0.75rem' }}>{log.date}</td>
                                            <td style={{ padding: '0.75rem' }}>{log.dayName}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: log.log?.punchIn ? '600' : '400' }}>{log.log?.punchIn || '-'}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: log.log?.punchOut ? '600' : '400' }}>{log.log?.punchOut || '-'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span className={`badge ${
                                                    log.status === 'Present' ? 'badge-success' : 
                                                    log.status === 'On Leave' ? 'badge-primary' :
                                                    log.status === 'Weekly Off' ? 'badge-ghost' : 'badge-danger'
                                                }`} style={{ fontSize: '0.7rem' }}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => setDetailedEmp(null)}>Close Audit</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showEmailModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email Attendance Report</h2>
                            <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Recipient Addresses (comma separated)</label>
                            <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem' }} placeholder="hr@company.com" />
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
                            <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the ${periodType} statutory Attendance report for ${year}. Total aggregated Present Days equals ${globalSummary.present}.`}></textarea>
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

export default AttendanceReport;

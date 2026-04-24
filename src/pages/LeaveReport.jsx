import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  Download, 
  BarChart, 
  PieChart as PieChartIcon, 
  Users, 
  Calendar, 
  Filter, 
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { generatePDF, dispatchMockEmail } from '../utils/exportUtils';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const LeaveReport = () => {
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [period, setSelectedPeriod] = useState('Yearly');
  const [scope, setSelectedScope] = useState('all'); // all or team
  const [empId, setEmpId] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const employees = dataService.getEmployees();
  const departments = [...new Set(employees.map(e => e.department))];
  
  // Use actual logged-in user instead of hardcoded
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isEmployee = userRole === 'employee';
  const currentUserId = currentUser ? currentUser.id : 1; 

  const filteredData = useMemo(() => {
    const filters = {
      departments: selectedDepts,
      empId: isEmployee ? currentUserId : empId,
      managerId: (!isEmployee && scope === 'team') ? currentUserId : null
    };

    // Note: In real app, we'd also pass date range based on 'period'
    return dataService.getLeavesByCriteria(filters);
  }, [selectedDepts, empId, scope]);

  const analytics = useMemo(() => {
    return dataService.getLeaveAnalytics(filteredData.leaves);
  }, [filteredData]);

  // Transform Type Distribution for Pie Chart
  const pieData = Object.entries(analytics.typeDistribution).map(([name, value]) => ({ name, value }));
  
  // Transform Trend for Bar/Line Chart
  const trendData = Object.entries(analytics.monthlyTrend).map(([name, value]) => ({ name, value }));

  const toggleDept = (dept) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleExport = (format) => {
    const rawData = filteredData.leaves.map(l => {
        const emp = filteredData.employees.find(e => e.id === l.empId);
        return {
            "Employee ID": emp?.empCode || 'N/A',
            "Name": l.name,
            "Department": emp?.department || 'N/A',
            "Leave Type": l.type,
            "Start Date": l.startDate,
            "End Date": l.endDate,
            "Days": l.days,
            "Status": l.status
        };
    });

    if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Leave_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Leave_Report");
        XLSX.writeFile(workbook, `Leave_Report_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Analytics & Reporting</h1>
          <p className="page-subtitle">Historical forensics, pattern analysis, and team auditing.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }} className="hide-on-print">
            <button className="btn btn-outline" onClick={() => setShowScheduleModal(true)}>
               <Mail size={18} style={{ marginRight: '0.5rem' }} /> Schedule Reports
            </button>
            <div style={{ position: 'relative' }}>
                <button className="btn btn-primary" onClick={() => setShowExportMenu(!showExportMenu)}>
                     <Download size={16} style={{ marginRight: '0.5rem' }} /> Export & Share
                </button>
                {showExportMenu && (
                    <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                         <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> CSV Data</button>
                         <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Excel Workbook</button>
                         <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { generatePDF('leave-report-capture', `Leave_Report_${period}.pdf`); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Professional PDF</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div id="leave-report-capture">
      {/* Filters Toolbar */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {!isEmployee && (
            <div>
              <label className="form-label">Scope & Access Control</label>
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <button 
                      onClick={() => setSelectedScope('all')}
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', backgroundColor: scope === 'all' ? 'var(--color-primary)' : 'white', color: scope === 'all' ? 'white' : 'var(--color-text-muted)' }}
                  >Admin (All)</button>
                  <button 
                      onClick={() => setSelectedScope('team')}
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: '600', backgroundColor: scope === 'team' ? 'var(--color-primary)' : 'white', color: scope === 'team' ? 'white' : 'var(--color-text-muted)' }}
                  >Manager (Team)</button>
              </div>
            </div>
          )}

          {!isEmployee && (
            <div>
              <label className="form-label">Filter Department(s)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {departments.map(dept => (
                      <button 
                          key={dept}
                          onClick={() => toggleDept(dept)}
                          className={`badge ${selectedDepts.includes(dept) ? 'badge-blue' : 'badge-ghost'}`}
                          style={{ cursor: 'pointer', border: '1px solid var(--color-border)' }}
                      >
                          {dept}
                      </button>
                  ))}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Period</label>
            <select className="form-input" style={{ width: '100%' }} value={period} onChange={e => setSelectedPeriod(e.target.value)}>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Half-Yearly</option>
                <option>Yearly</option>
            </select>
          </div>

          {!isEmployee && (
            <div>
              <label className="form-label">Employee</label>
              <select className="form-input" style={{ width: '100%' }} value={empId} onChange={e => setEmpId(e.target.value)}>
                  <option value="all">All Selected</option>
                  {filteredData.employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Summaries */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Approved Leaves</span>
                <CheckCircle2 size={18} color="var(--color-success)" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{analytics.statusBreakdown.Approved}</div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>Total {analytics.totalDays} business days</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Pending Requests</span>
                <Clock size={18} color="var(--color-warning)" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{analytics.statusBreakdown.Pending}</div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>Requires immediate action</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Rejections</span>
                <XCircle size={18} color="var(--color-danger)" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{analytics.statusBreakdown.Rejected}</div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>Policy violation rate: {((analytics.statusBreakdown.Rejected / (filteredData.leaves.length || 1)) * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid-3" style={{ marginBottom: '2rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)' }}>
         <div className="card">
            <h3>Type Distribution</h3>
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
         </div>

         <div className="card">
            <h3>Monthly Trend (Leaves Frequency)</h3>
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} />
                        <Bar 
                            dataKey="value" 
                            fill="var(--color-primary)" 
                            radius={[4, 4, 0, 0]} 
                            barSize={40}
                            animationDuration={1500}
                        />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <h3>Detailed Employee Balances & Usage</h3>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                <th style={{ padding: '1rem' }}>Employee</th>
                <th style={{ padding: '1rem' }}>Department</th>
                <th style={{ padding: '1rem' }}>Total Availed</th>
                <th style={{ padding: '1rem' }}>S / C / P (Remaining)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.employees.map(emp => {
                const empLeaves = filteredData.leaves.filter(l => l.empId === emp.id && l.status === 'Approved');
                const availeDays = empLeaves.reduce((a, b) => a + b.days, 0);
                const balance = dataService.getLeaveBalances()[emp.id] || { Sick: 0, Casual: 0, Paid: 0 };
                
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.empCode}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem' }}>{emp.department}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '100px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, (availeDays / 30) * 100)}%`, height: '100%', backgroundColor: 'var(--color-primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{availeDays} Days</span>
                        </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <span className="badge badge-success" title="Sick">S: {balance.Sick}</span>
                            <span className="badge badge-warning" title="Casual">C: {balance.Casual}</span>
                            <span className="badge badge-blue" title="Paid">P: {balance.Paid}</span>
                        </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.25rem' }}><FileText size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Email Simulation Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Schedule Automated Reports</h2>
                    <button onClick={() => setShowScheduleModal(false)}>✕</button>
                </div>
                
                <div className="form-group">
                    <label className="form-label">Recipient Roles</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem' }}><input type="checkbox" defaultChecked /> HR Team (Aggregated)</label>
                        <label style={{ fontSize: '0.875rem' }}><input type="checkbox" defaultChecked /> Department Managers (Dept-Specific)</label>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Delivery Interval</label>
                    <select className="form-input">
                        <option>Monthly (1st of every month)</option>
                        <option>Quarterly (End of Quarter)</option>
                        <option>Real-time (On rejection/approval)</option>
                    </select>
                </div>

                <div className="notice-item" style={{ fontSize: '0.8rem', backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <p style={{ color: '#0369a1', margin: 0 }}>
                        <strong>Workflow Simulation:</strong> On the 1st of every month, the server will trigger a background job to generate this Excel report filtered by individual departments and email them as attachments.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                     <button className="btn btn-outline" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                     <button className="btn btn-primary" onClick={() => { alert('Report scheduled successfully!'); setShowScheduleModal(false); }}>Enable Automation</button>
                </div>
            </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default LeaveReport;

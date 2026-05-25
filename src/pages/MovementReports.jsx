import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, Search, Download, AlertTriangle, UserCheck, ShieldAlert, FileText, Filter } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { useNotification } from '../context/NotificationContext';
import * as XLSX from 'xlsx';

const MovementReports = () => {
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'duty';

  const [activeTab, setActiveTab] = useState(initialTab); // 'duty' | 'pass' | 'exits' | 'overdue'
  const [loading, setLoading] = useState(true);

  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'management' || userRole === 'admin';
  const [myEmpId, setMyEmpId] = useState(null);

  useEffect(() => {
    const fetchManagerProfile = async () => {
      try {
        const myProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
        if (myProfile) {
          setMyEmpId(myProfile.id);
        }
      } catch (err) {
        console.error("Failed to load manager profile:", err);
      }
    };
    fetchManagerProfile();
  }, [currentUser]);

  // Data State
  const [requests, setRequests] = useState([]);
  const [exits, setExits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Sync state if tab param changes in URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['duty', 'pass', 'exits', 'overdue'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leavesList, exitsList, emps, depts] = await Promise.all([
          dataService.getLeaveRequests().catch(() => []),
          dataService.getUnauthorizedExits().catch(() => []),
          dataService.getEmployees().catch(() => []),
          dataService.getDepartments().catch(() => [])
        ]);

        setRequests(leavesList);
        setExits(exitsList);
        setEmployees(emps);
        setDepartments(depts);
      } catch (err) {
        console.error("Failed to load reports data:", err);
        showNotification("Failed to load movement report data.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter Logic Helper
  const getEmployeeDept = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    return emp ? emp.department : 'Unknown';
  };

  // Resolve reportees for non-admin managers
  const reporteeIds = useMemo(() => {
    if (isAdmin || !myEmpId) return [];
    return employees
      .filter(e => e.managerIds && e.managerIds.map(String).includes(String(myEmpId)))
      .map(e => String(e.id));
  }, [employees, isAdmin, myEmpId]);

  // 1. Filtered Out Duty Requests
  const outDutyData = useMemo(() => {
    return requests.filter(l => {
      if (l.type !== 'Out Duty Request') return false;
      const targetEmpId = String(l.emp_id || l.empId);
      if (!isAdmin && !reporteeIds.includes(targetEmpId)) return false;

      const dept = getEmployeeDept(l.emp_id || l.empId) || '';
      const empName = l.employees?.name || l.data?.name || l.data?.empName || l.name || '';
      
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.data?.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.data?.destination || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDept === 'All' || dept === selectedDept;
      
      const reqDate = l.start_date || l.data?.date || '';
      const matchesStart = !startDate || reqDate >= startDate;
      const matchesEnd = !endDate || reqDate <= endDate;

      return matchesSearch && matchesDept && matchesStart && matchesEnd;
    });
  }, [requests, employees, searchQuery, selectedDept, startDate, endDate, isAdmin, reporteeIds]);

  // 2. Filtered Out Pass Requests
  const outPassData = useMemo(() => {
    return requests.filter(l => {
      if (l.type !== 'Out Pass Request') return false;
      const targetEmpId = String(l.emp_id || l.empId);
      if (!isAdmin && !reporteeIds.includes(targetEmpId)) return false;

      const dept = getEmployeeDept(l.emp_id || l.empId) || '';
      const empName = l.employees?.name || l.data?.name || l.data?.empName || l.name || '';
      
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.data?.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDept === 'All' || dept === selectedDept;
      
      const reqDate = l.start_date || l.data?.date || '';
      const matchesStart = !startDate || reqDate >= startDate;
      const matchesEnd = !endDate || reqDate <= endDate;

      return matchesSearch && matchesDept && matchesStart && matchesEnd;
    });
  }, [requests, employees, searchQuery, selectedDept, startDate, endDate, isAdmin, reporteeIds]);

  // 3. Filtered Unauthorized Exits
  const exitsData = useMemo(() => {
    return exits.filter(e => {
      const targetEmpId = String(e.empId || e.emp_id);
      if (!isAdmin && !reporteeIds.includes(targetEmpId)) return false;

      const matchesSearch = (e.empName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (e.punchOutTime || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDept === 'All' || e.department === selectedDept;
      
      const matchesStart = !startDate || e.date >= startDate;
      const matchesEnd = !endDate || e.date <= endDate;

      return matchesSearch && matchesDept && matchesStart && matchesEnd;
    });
  }, [exits, searchQuery, selectedDept, startDate, endDate, isAdmin, reporteeIds]);

  // 4. Filtered Overdue Returns
  const overdueData = useMemo(() => {
    return requests.filter(l => {
      const isMovement = l.type === 'Out Duty Request' || l.type === 'Out Pass Request';
      if (!isMovement || l.status !== 'Overdue') return false;
      const targetEmpId = String(l.emp_id || l.empId);
      if (!isAdmin && !reporteeIds.includes(targetEmpId)) return false;

      const dept = getEmployeeDept(l.emp_id || l.empId) || '';
      const empName = l.employees?.name || l.data?.name || l.data?.empName || l.name || '';
      
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.data?.purpose || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = selectedDept === 'All' || dept === selectedDept;
      
      const reqDate = l.start_date || l.data?.date || '';
      const matchesStart = !startDate || reqDate >= startDate;
      const matchesEnd = !endDate || reqDate <= endDate;

      return matchesSearch && matchesDept && matchesStart && matchesEnd;
    });
  }, [requests, employees, searchQuery, selectedDept, startDate, endDate, isAdmin, reporteeIds]);

  // Active dataset depending on activeTab
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'duty': return outDutyData;
      case 'pass': return outPassData;
      case 'exits': return exitsData;
      case 'overdue': return overdueData;
      default: return [];
    }
  }, [activeTab, outDutyData, outPassData, exitsData, overdueData]);

  // Handle excel export
  const handleExport = () => {
    if (activeDataset.length === 0) {
      showNotification("No data available to export with current filters.", "warning");
      return;
    }

    let rawData = [];
    let filename = "";

    if (activeTab === 'duty' || activeTab === 'pass') {
      rawData = activeDataset.map(l => {
        const empName = l.employees?.name || l.data?.name || l.data?.empName || l.name || 'Unknown';
        return {
          "Request ID": l.id,
          "Employee Name": empName,
          "Department": getEmployeeDept(l.emp_id || l.empId),
          "Movement Date": l.start_date || l.data?.date,
          "Out Time": l.data?.outTime,
          "Expected In Time": l.data?.expectedInTime,
          "Actual In Time": l.data?.actualInTime || "N/A",
          "Purpose": l.data?.purpose,
          "Reason/Details": l.reason || l.data?.purposeDetails,
          "Destination/Location": l.data?.destination || "N/A",
          "Status": l.status,
          "Applied Date": l.data?.appliedDate || "N/A"
        };
      });
      filename = activeTab === 'duty' ? "Out_Duty_Report.xlsx" : "Out_Pass_Report.xlsx";
    } else if (activeTab === 'exits') {
      rawData = activeDataset.map(e => ({
        "Log ID": e.id,
        "Employee Name": e.empName,
        "Department": e.department,
        "Date": e.date,
        "Punch Out Time": e.punchOutTime,
        "Log Status": e.status,
        "Log Timestamp": e.timestamp
      }));
      filename = "Unauthorized_Exits_Report.xlsx";
    } else if (activeTab === 'overdue') {
      rawData = activeDataset.map(l => {
        const empName = l.employees?.name || l.data?.name || l.data?.empName || l.name || 'Unknown';
        return {
          "Request ID": l.id,
          "Employee Name": empName,
          "Department": getEmployeeDept(l.emp_id || l.empId),
          "Type": l.type,
          "Date": l.start_date || l.data?.date,
          "Out Time": l.data?.outTime,
          "Expected Return": l.data?.expectedInTime || l.data?.endTime,
          "Detection Timestamp": l.data?.overdueDetectedAt || "N/A"
        };
      });
      filename = "Overdue_Returns_Report.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
    showNotification(`${filename} exported successfully.`, "success");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'var(--color-success)';
      case 'Rejected': return 'var(--color-danger)';
      case 'Pending': return 'var(--color-warning)';
      case 'Correction Needed': return 'var(--color-primary)';
      case 'Returned': return 'rgba(37,99,235,0.7)';
      case 'Overdue': return 'rgba(249,115,22,1)';
      default: return 'var(--color-text-muted)';
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
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={32} color="var(--color-primary)" />
            Employee Movement & Exit Reports
          </h1>
          <p className="page-subtitle">Export official Out Duty records, gate passes, unauthorized exits, and overdue return metrics.</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={activeDataset.length === 0}>
          <Download size={18} style={{ marginRight: '0.5rem' }} /> Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--color-surface)', padding: '0.5rem', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--color-border)' }}>
        <button 
          className={`btn ${activeTab === 'duty' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('duty'); setSearchParams({ tab: 'duty' }); }}
        >
          Out Duty Requests
        </button>
        <button 
          className={`btn ${activeTab === 'pass' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('pass'); setSearchParams({ tab: 'pass' }); }}
        >
          Out Pass (Personal)
        </button>
        <button 
          className={`btn ${activeTab === 'exits' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('exits'); setSearchParams({ tab: 'exits' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <ShieldAlert size={16} /> Unauthorized Exits
        </button>
        <button 
          className={`btn ${activeTab === 'overdue' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setActiveTab('overdue'); setSearchParams({ tab: 'overdue' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <AlertTriangle size={16} /> Overdue Returns
        </button>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} /> Filter Parameters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Employee / Reason Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '2.25rem' }}
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select 
              className="form-input" 
              style={{ width: '100%' }}
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '100%' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '100%' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Report Data Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
            Showing {activeDataset.length} records matching filters
          </span>
        </div>

        {activeDataset.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <CalendarIcon size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <h3>No Records Found</h3>
            <p>Try clearing your filters or selecting a different date range.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {activeTab === 'duty' || activeTab === 'pass' ? (
                  <tr>
                    <th style={{ padding: '1rem 1.5rem' }}>Employee Details</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Movement Date</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Expected Timing</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Actual Return</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Reason & Destination</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  </tr>
                ) : activeTab === 'exits' ? (
                  <tr>
                    <th style={{ padding: '1rem 1.5rem' }}>Employee Details</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Exit Date</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Punch Out Time</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Logged Status</th>
                    <th style={{ padding: '1rem 1.5rem' }}>System Log Timestamp</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ padding: '1rem 1.5rem' }}>Employee Details</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Request Type</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Expected Timing</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                  </tr>
                )}
              </thead>
              <tbody style={{ color: 'var(--color-text-main)' }}>
                {activeDataset.map(row => {
                  const empName = row.employees?.name || row.data?.name || row.data?.empName || row.name || row.empName || 'Unknown';
                  const dept = getEmployeeDept(row.emp_id || row.empId) || row.department || 'Unknown';

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ fontWeight: '700' }}>{empName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{dept}</div>
                      </td>

                      {/* Out Duty & Out Pass Columns */}
                      {(activeTab === 'duty' || activeTab === 'pass') && (
                        <>
                          <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600' }}>
                            {row.start_date || row.data?.date}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                              <Clock size={12} /> {row.data?.outTime} - {row.data?.expectedInTime}
                            </div>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            {row.data?.actualInTime ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: row.data?.isLateReturn ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                <Clock size={12} /> {row.data.actualInTime} {row.data.isLateReturn && '(Late)'}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Not returned</span>
                            )}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem', maxWidth: '300px' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{row.data?.purpose}</div>
                            {row.data?.destination && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                                <MapPin size={10} /> {row.data.destination}
                              </div>
                            )}
                            <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                              "{row.reason || row.data?.purposeDetails}"
                            </div>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: getStatusColor(row.status).replace(')', ', 0.1)'), 
                                color: getStatusColor(row.status),
                                borderColor: getStatusColor(row.status).replace(')', ', 0.2)'),
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                fontSize: '0.75rem'
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Unauthorized Exits Columns */}
                      {activeTab === 'exits' && (
                        <>
                          <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600' }}>
                            {row.date}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--color-danger)', fontWeight: '700' }}>
                              <Clock size={14} /> {row.punchOutTime}
                            </span>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date(row.timestamp).toLocaleString()}
                          </td>
                        </>
                      )}

                      {/* Overdue Returns Columns */}
                      {activeTab === 'overdue' && (
                        <>
                          <td style={{ padding: '1.2rem 1.5rem', fontWeight: '700', color: 'var(--color-warning)' }}>
                            {row.type === 'Out Duty Request' ? 'Out Duty' : 'Out Pass'}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600' }}>
                            {row.start_date || row.data?.date}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                              <Clock size={12} /> {row.data?.outTime} - {row.data?.expectedInTime || row.data?.endTime}
                            </div>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem', backgroundColor: 'rgba(249,115,22,0.1)', color: 'rgba(249,115,22,1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                              Overdue Return
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementReports;

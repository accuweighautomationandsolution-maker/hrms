import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { IndianRupee, Download, Search, Filter, Eye, AlertCircle, Info, FileText, FileSpreadsheet, Printer, Mail, X, Lock, History, Check } from 'lucide-react';
import { calculateSalaryComponents, formatCurrency, getHolidayDates, numberToWords } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { useNotification } from '../context/NotificationContext';
import { generatePDF } from '../utils/exportUtils';

const Payroll = () => {
  const { showNotification } = useNotification();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';

  const [dbRecords, setDbRecords] = useState({});
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [historyModalRecord, setHistoryModalRecord] = useState(null);

  // Payment Details Form fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Bank transfer');
  const [txnRef, setTxnRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Internal Constants (Moved inside to avoid initialization issues)
  const MONTH_NAMES = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);
  
  const NOW_DATE = useMemo(() => new Date(), []);
  const INITIAL_YEAR = NOW_DATE.getFullYear();
  const INITIAL_MONTH = NOW_DATE.getMonth();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [year, setYear] = useState(INITIAL_YEAR);
  const [month, setMonth] = useState(INITIAL_MONTH);
  const [employees, setEmployees] = useState([]);
  const [holidayList, setHolidayList] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [balanceMap, setBalanceMap] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [holidayWorked, setHolidayWorked] = useState([]);

  // ── INTERNAL HELPERS (Inlined for stability) ───────────────────────────

  const HolidayPanel = ({ year, month, workedDays, holidayList, onToggle }) => {
    const holidays = useMemo(() => getHolidayDates(year, month, holidayList), [year, month, holidayList]);
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h5 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          🗓️ Official Holidays — {MONTH_NAMES[month]} {year}
        </h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {holidays.map((h) => {
            const worked = workedDays.includes(h.day);
            return (
              <button
                key={h.day}
                onClick={() => onToggle(h.day)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  border: `2px solid ${worked ? 'var(--color-warning)' : 'var(--color-border)'}`,
                  backgroundColor: worked ? 'rgba(245,158,11,0.12)' : 'var(--color-background)',
                  color: worked ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}>
                {h.date} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{h.type}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const ContractualPayslipModal = ({ employee, onClose }) => {
    const [daysPresent, setDaysPresent] = useState(employee.daysPresent || 0);
    const [hw, setHw] = useState([]);
    const shiftHrs = 9.5;
    const basePay = Math.round((Number(employee.dayRate) || 0) * (Number(daysPresent) || 0));
    const holidayOTHrs = hw.length * (shiftHrs - 0.5);
    const holidayOTPay = Math.round((employee.dayRate / shiftHrs) * holidayOTHrs);

    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '700px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
             <h3>Contractor Payout — {employee.name}</h3>
             <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <HolidayPanel year={year} month={month} workedDays={hw} onToggle={d => setHw(p => p.includes(d) ? p.filter(v => v !== d) : [...p, d])} />
          <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Attendance Days</span><span>{daysPresent}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Holiday OT (Hrs)</span><span>{holidayOTHrs.toFixed(1)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '1rem', fontWeight: '800', fontSize: '1.25rem' }}>
                <span>Net Payable</span>
                <span>₹{(basePay + holidayOTPay).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PayslipModal = ({ employee, onClose }) => {
    const { payrollContext } = employee;
    const { earnings, deductions, netPay } = payrollContext;
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '850px', padding: '2rem', maxHeight: '95vh', overflowY: 'auto' }}>
          <div id="payslip-capture">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ margin: 0, color: 'var(--color-primary)' }}>ACCUWEIGH HRMS</h1>
              <p style={{ margin: 0, fontWeight: '700' }}>Payslip for {MONTH_NAMES[month]} {year}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <p><strong>Employee:</strong> {employee.name} ({employee.empCode})</p>
                <p><strong>Designation:</strong> {employee.role}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                <p><strong>Total Earnings:</strong> {formatCurrency(earnings.gross)}</p>
                <p><strong>Total Deductions:</strong> {formatCurrency(deductions.total)}</p>
              </div>
            </div>
            <div style={{ backgroundColor: 'rgba(37,99,235,0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '700' }}>NET TAKE HOME</p>
                <h2 style={{ margin: 0, fontSize: '2rem' }}>{formatCurrency(netPay)}</h2>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={() => {
              if (employee.payrollGenerated && !employee.payslipGenerated) {
                handleUpdateStatus(employee.id, { payslipGenerated: true });
              }
              generatePDF('payslip-capture', `Payslip_${employee.empCode}_${MONTH_NAMES[month]}.pdf`);
            }}>Download PDF</button>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ── MAIN COMPONENT LOGIC ───────────────────────────────────────────────

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    const sid = String(id);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedIds(next);
  };

  const toggleSelectAll = (filtered) => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => String(e.id))));
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [emps, hols, dbRecs] = await Promise.all([
          dataService.getEmployees().catch(() => []),
          dataService.getCustomHolidays().catch(() => []),
          dataService.getPayrollRecordsByMonth(month, year).catch(() => [])
        ]);
        
        const attMap = {};
        const balMap = {};
        
        await Promise.all(emps.map(async (emp) => {
          const [count, balance] = await Promise.all([
            dataService.getPresentDaysCount(emp.id, month, year).catch(() => 0),
            dataService.getEmployeeBalance(emp.id).catch(() => 0)
          ]);
          attMap[emp.id] = count;
          balMap[emp.id] = balance;
        }));

        const dbRecsMap = {};
        dbRecs.forEach(r => {
          if (r && r.empId) {
            dbRecsMap[String(r.empId)] = r;
          }
        });

        if (isMounted) {
          setEmployees(emps);
          setHolidayList(hols);
          setAttendanceMap(attMap);
          setBalanceMap(balMap);
          setDbRecords(dbRecsMap);
        }
      } catch (err) {
        console.error("Failed to load payroll:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    setSelectedIds(new Set());
    return () => { isMounted = false; };
  }, [month, year]);

  const employeesWithPayroll = useMemo(() => {
    return employees.map(emp => {
      const daysPresent = attendanceMap[emp.id] || 0;
      const dbRec = dbRecords[String(emp.id)] || {};
      const calculatedContext = emp.category !== 'Contractual Worker'
        ? calculateSalaryComponents(emp.grossSalary, true, emp.advanceLoanEMI || 0, emp.category, daysPresent, 30, { hasPF: !!emp.uanNumber, hasESIC: !!emp.esicNumber })
        : null;

      return {
        ...emp,
        daysPresent,
        balanceLeaves: balanceMap[emp.id],
        payrollGenerated: !!dbRec.payrollGenerated,
        payslipGenerated: !!dbRec.payslipGenerated,
        paymentDone: !!dbRec.paymentDone,
        paymentDate: dbRec.paymentDate || '',
        paymentMode: dbRec.paymentMode || '',
        txnRef: dbRec.txnRef || '',
        statusHistory: dbRec.statusHistory || [],
        payrollContext: dbRec.payrollGenerated && dbRec.payrollContext 
          ? dbRec.payrollContext 
          : calculatedContext
      };
    });
  }, [employees, attendanceMap, balanceMap, dbRecords, month, year]);

  const filteredEmployees = useMemo(() => {
    return employeesWithPayroll.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.empCode && e.empCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employeesWithPayroll, searchTerm]);

  const handleUpdateStatus = async (empId, updates) => {
    const isAuthorized = userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';
    if (!isAuthorized) {
      showNotification("Access Denied: Only Admin/HR can update payroll status", "error");
      return;
    }
    
    const emp = employeesWithPayroll.find(e => String(e.id) === String(empId));
    if (!emp) return;

    // Check workflow dependencies
    if (updates.payslipGenerated && !emp.payrollGenerated && !updates.payrollGenerated) {
      showNotification("Cannot generate payslip: Payroll must be generated first", "warning");
      return;
    }
    if (updates.paymentDone && !emp.payslipGenerated && !updates.payslipGenerated) {
      showNotification("Cannot mark payment done: Payslip must be generated first", "warning");
      return;
    }
    if (updates.payrollGenerated === false && emp.payslipGenerated) {
      showNotification("Cannot revert payroll: Payslip is already generated. Revert payslip first.", "warning");
      return;
    }
    if (updates.payslipGenerated === false && emp.paymentDone) {
      showNotification("Cannot revert payslip: Payment has already been completed. Revert payment first.", "warning");
      return;
    }

    if (updates.payrollGenerated && !emp.payrollGenerated) {
      updates.payrollContext = emp.payrollContext;
    }

    try {
      const updatedRecord = await dataService.updatePayrollRecord(
        month, 
        year, 
        empId, 
        updates, 
        authService.getCurrentUser()?.name || 'Admin'
      );
      if (updatedRecord) {
        setDbRecords(prev => ({
          ...prev,
          [String(empId)]: updatedRecord
        }));
        showNotification("Payroll status updated", "success");
      } else {
        showNotification("Failed to save status", "error");
      }
    } catch (e) {
      console.error(e);
      showNotification("Failed to update payroll status", "error");
    }
  };

  const handleSavePaymentDetails = async () => {
    if (!paymentModalData) return;
    const empId = paymentModalData.id;
    const updates = {
      paymentDone: true,
      paymentDate,
      paymentMode,
      txnRef,
      notes: `Marked Paid — Date: ${paymentDate}, Mode: ${paymentMode}, Ref: ${txnRef || 'N/A'}` + (paymentNotes ? ` (${paymentNotes})` : '')
    };

    await handleUpdateStatus(empId, updates);
    setPaymentModalData(null);
    setTxnRef('');
    setPaymentNotes('');
  };

  const handleBulkFinalize = async () => {
    const isAuthorized = userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';
    if (!isAuthorized) {
      showNotification("Access Denied: Only Admin/HR can process payroll", "error");
      return;
    }

    const targetEmps = employeesWithPayroll.filter(e => selectedIds.has(String(e.id)));
    if (targetEmps.length === 0) {
      showNotification("Select employees first", "warning");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    try {
      const adminName = authService.getCurrentUser()?.name || 'Admin';
      for (const emp of targetEmps) {
        if (emp.payrollGenerated) {
          successCount++;
          continue;
        }

        const updates = {
          payrollGenerated: true,
          payrollContext: emp.payrollContext,
          createdAt: new Date().toISOString()
        };

        const updated = await dataService.updatePayrollRecord(
          month,
          year,
          emp.id,
          updates,
          adminName
        );

        if (updated) {
          successCount++;
          setDbRecords(prev => ({
            ...prev,
            [String(emp.id)]: updated
          }));
        }
      }
      showNotification(`Successfully processed payroll for ${successCount} employees`, "success");
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      showNotification("An error occurred during bulk processing", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = (format) => {
    const targetEmps = employeesWithPayroll.filter(e => selectedIds.has(String(e.id)));
    if (targetEmps.length === 0) { showNotification("Select employees first", "warning"); return; }

    const rawData = targetEmps.map(emp => {
      const ctx = emp.payrollContext;
      return {
        "Code": emp.empCode, "Name": emp.name, "Net Pay": ctx ? ctx.netPay : (emp.dayRate * emp.daysPresent)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rawData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    XLSX.writeFile(workbook, `Payroll_${MONTH_NAMES[month]}_${year}.${format === 'csv' ? 'csv' : 'xlsx'}`);
  };

  if (loading) return <div className="page-container"><p>Loading Payroll Register...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Ledger</h1>
          <p className="page-subtitle">Selective processing for {MONTH_NAMES[month]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="form-input" style={{ width: '140px' }}>
            {MONTH_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="form-input" style={{ width: '100px' }}>
            {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => handleExport('xlsx')}>Export Ledger</button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: '#1e293b', color: 'white', padding: '1rem 2rem', borderRadius: '50px', display: 'flex', gap: '2rem', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <span style={{ fontWeight: '700' }}>{selectedIds.size} Selected</span>
          <button className="btn btn-success" style={{ backgroundColor: 'var(--color-success)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '20px' }} onClick={handleBulkFinalize}>
            {isProcessing ? 'Processing...' : 'Process & Finalize'}
          </button>
          <button className="btn" style={{ color: 'white' }} onClick={() => setSelectedIds(new Set())}>Cancel</button>
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <input type="text" className="form-input" placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '300px' }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>
                  <input type="checkbox" checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0} onChange={() => toggleSelectAll(filteredEmployees)} />
                </th>
                <th style={{ padding: '1rem' }}>Code</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Net Pay</th>
                <th style={{ padding: '1rem' }}>Payroll Generated</th>
                <th style={{ padding: '1rem' }}>Payslip Generated</th>
                <th style={{ padding: '1rem' }}>Payment Done</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const isSelected = selectedIds.has(String(emp.id));
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isSelected ? 'rgba(37,99,235,0.05)' : 'transparent' }}>
                    <td style={{ padding: '1rem' }}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(emp.id)} /></td>
                    <td style={{ padding: '1rem' }}>{emp.empCode}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{emp.name}</span>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '0.2rem', height: 'auto', display: 'inline-flex', alignItems: 'center' }} 
                          title="View status history log"
                          onClick={() => setHistoryModalRecord(emp)}
                        >
                          <History size={14} color="var(--color-text-muted)" />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{emp.payrollContext ? formatCurrency(emp.payrollContext.netPay) : 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {emp.payrollGenerated ? (
                          <>
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Check size={12} /> Yes</span>
                            {isAdmin && !emp.payslipGenerated && (
                              <button 
                                className="btn btn-ghost" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto', color: 'var(--color-danger)' }} 
                                onClick={() => handleUpdateStatus(emp.id, { payrollGenerated: false })}
                              >
                                Revert
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="badge badge-default">No</span>
                            {isAdmin && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} 
                                onClick={() => handleUpdateStatus(emp.id, { payrollGenerated: true })}
                              >
                                Generate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {emp.payslipGenerated ? (
                          <>
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Check size={12} /> Yes</span>
                            {isAdmin && !emp.paymentDone && (
                              <button 
                                className="btn btn-ghost" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto', color: 'var(--color-danger)' }} 
                                onClick={() => handleUpdateStatus(emp.id, { payslipGenerated: false })}
                              >
                                Revert
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="badge badge-default">No</span>
                            {isAdmin && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} 
                                disabled={!emp.payrollGenerated}
                                onClick={() => handleUpdateStatus(emp.id, { payslipGenerated: true })}
                              >
                                Mark Generated
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {emp.paymentDone ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Check size={12} /> Paid</span>
                              {isAdmin && (
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto', color: 'var(--color-danger)' }} 
                                  onClick={() => handleUpdateStatus(emp.id, { paymentDone: false })}
                                >
                                  Revert
                                </button>
                              )}
                            </div>
                            {emp.paymentMode && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                {emp.paymentMode} {emp.txnRef ? `(${emp.txnRef})` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="badge badge-default">Unpaid</span>
                            {isAdmin && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} 
                                disabled={!emp.payslipGenerated}
                                onClick={() => {
                                  setPaymentDate(new Date().toISOString().split('T')[0]);
                                  setPaymentMode('Bank transfer');
                                  setTxnRef('');
                                  setPaymentNotes('');
                                  setPaymentModalData(emp);
                                }}
                              >
                                Mark Paid
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-ghost" onClick={() => {
                        if (emp.payrollGenerated && !emp.payslipGenerated) {
                          handleUpdateStatus(emp.id, { payslipGenerated: true });
                        }
                        setSelectedEmployee(emp);
                      }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (selectedEmployee.category === 'Contractual Worker' ? 
        <ContractualPayslipModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} /> : 
        <PayslipModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}

      {/* Payment Details Entry Modal */}
      {paymentModalData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>💰 Payment Details — {paymentModalData.name}</h3>
              <button className="btn btn-ghost" onClick={() => setPaymentModalData(null)} style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Date *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode *</label>
                <select 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  value={paymentMode} 
                  onChange={e => setPaymentMode(e.target.value)}
                >
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  placeholder="e.g. TXN123456789" 
                  value={txnRef} 
                  onChange={e => setTxnRef(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%' }} 
                  placeholder="Additional payout details..." 
                  value={paymentNotes} 
                  onChange={e => setPaymentNotes(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <button className="btn btn-outline" onClick={() => setPaymentModalData(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePaymentDetails}>Save Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Status History Audit Timeline Modal */}
      {historyModalRecord && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>📜 Status History — {historyModalRecord.name}</h3>
              <button className="btn btn-ghost" onClick={() => setHistoryModalRecord(null)} style={{ padding: '0.25rem' }}><X size={20} /></button>
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
              {(!historyModalRecord.statusHistory || historyModalRecord.statusHistory.length === 0) ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem' }}>No status changes recorded yet.</p>
              ) : (
                historyModalRecord.statusHistory.map((h, i) => (
                  <div key={i} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '1rem', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <span>👤 {h.updatedBy}</span>
                      <span>📅 {new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0', fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{h.notes}</p>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setHistoryModalRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;

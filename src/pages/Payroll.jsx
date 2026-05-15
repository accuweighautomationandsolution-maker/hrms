import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { IndianRupee, Download, Search, Filter, Eye, AlertCircle, Info, FileText, FileSpreadsheet, Printer, Mail, X, Lock } from 'lucide-react';
import { calculateSalaryComponents, formatCurrency, getHolidayDates, numberToWords } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { useNotification } from '../context/NotificationContext';
import { generatePDF } from '../utils/exportUtils';

const Payroll = () => {
  const { showNotification } = useNotification();
  
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
            <button className="btn btn-primary" onClick={() => generatePDF('payslip-capture', `Payslip_${employee.empCode}_${MONTH_NAMES[month]}.pdf`)}>Download PDF</button>
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
        const [emps, hols] = await Promise.all([
          dataService.getEmployees().catch(() => []),
          dataService.getCustomHolidays().catch(() => [])
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

        if (isMounted) {
          setEmployees(emps);
          setHolidayList(hols);
          setAttendanceMap(attMap);
          setBalanceMap(balMap);
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
      return {
        ...emp,
        daysPresent,
        balanceLeaves: balanceMap[emp.id],
        payrollContext: emp.category !== 'Contractual Worker'
          ? calculateSalaryComponents(emp.grossSalary, true, emp.advanceLoanEMI || 0, emp.category, daysPresent, 30, { hasPF: !!emp.uanNumber, hasESIC: !!emp.esicNumber })
          : null
      };
    });
  }, [employees, attendanceMap, balanceMap, month, year]);

  const filteredEmployees = useMemo(() => {
    return employeesWithPayroll.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.empCode && e.empCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employeesWithPayroll, searchTerm]);

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
          <button className="btn btn-success" style={{ backgroundColor: 'var(--color-success)', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '20px' }} onClick={() => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); setSelectedIds(new Set()); showNotification("Processed successfully", "success"); }, 1500); }}>
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
                    <td style={{ padding: '1rem' }}>{emp.name}</td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{emp.payrollContext ? formatCurrency(emp.payrollContext.netPay) : 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-ghost" onClick={() => setSelectedEmployee(emp)}>View</button>
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
    </div>
  );
};

export default Payroll;

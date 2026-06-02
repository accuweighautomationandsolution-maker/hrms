import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { IndianRupee, Download, Search, Filter, Eye, AlertCircle, Info, FileText, FileSpreadsheet, Printer, Mail, X, Lock, History, Check } from 'lucide-react';
import { calculateSalaryComponents, formatCurrency, getHolidayDates, numberToWords, getOnRollWorkerPayableDays, calculateAttendanceStats } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { useNotification } from '../context/NotificationContext';
import { generatePDF } from '../utils/exportUtils';

const Payroll = () => {
  const { showNotification } = useNotification();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'management' || userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';

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
  const [advanceHistory, setAdvanceHistory] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [balanceMap, setBalanceMap] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [holidayWorked, setHolidayWorked] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState({});
  const [processModalEmp, setProcessModalEmp] = useState(null);
  const [procDaysPresent, setProcDaysPresent] = useState(0);
  const [procOTAmount, setProcOTAmount] = useState(0);
  const [procAdvanceDeduction, setProcAdvanceDeduction] = useState(0);
  const [formulaConfig, setFormulaConfig] = useState(null);

  const handleOpenProcessModal = (emp) => {
    setProcessModalEmp(emp);
    setProcDaysPresent(emp.daysPresent);
    setProcOTAmount(0);
    
    // Instead of using struct.advanceLoanEMI, use the precalculated deduction from payrollContext
    const defaultAdvance = emp.payrollContext?.deductions?.advance || 0;
    setProcAdvanceDeduction(defaultAdvance);
    setProcDaysPresent(emp.payableDays || emp.daysPresent || 0);
    setProcOTAmount(emp.calculatedOTAmount || 0);
  };

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

  const ProcessPayrollModal = ({ employee, onClose }) => {
    const struct = salaryStructures[String(employee.id)] || {};
    
    // Live calculation inside modal
    const liveContext = employee.category === 'Contractual Worker'
      ? {
          earnings: {
            gross: Math.round((Number(employee.dayRate) || 0) * (Number(procDaysPresent) || 0) + Number(procOTAmount)),
            totalEarnings: Math.round((Number(employee.dayRate) || 0) * (Number(procDaysPresent) || 0) + Number(procOTAmount)),
            basic: 0,
            da: 0,
            hra: 0,
            washingAllowance: 0,
            specialAllowance: 0,
            conveyance: 0,
            performance: 0,
            otherManual: 0,
            otAmount: Number(procOTAmount)
          },
          deductions: {
            pf: 0,
            esic: 0,
            pt: 0,
            tds: 0,
            advance: Number(procAdvanceDeduction),
            total: Number(procAdvanceDeduction)
          },
          netPay: Math.max(0, Math.round((Number(employee.dayRate) || 0) * (Number(procDaysPresent) || 0) + Number(procOTAmount) - Number(procAdvanceDeduction))),
          isBalanced: true,
          divisor: getOnRollWorkerPayableDays(year, month) // arbitrary
        }
      : calculateSalaryComponents(
          employee.grossSalary,
          struct.pfCapped !== false,
          Number(procAdvanceDeduction) || 0,
          employee.category,
          Number(procDaysPresent) || 0,
          30,
          {
            hasPF: struct.hasPF !== undefined ? struct.hasPF : !!employee.uanNumber,
            hasESIC: struct.hasESIC !== undefined ? struct.hasESIC : !!employee.esicNumber,
            year,
            month,
            hraPercent: struct.hraPercent !== undefined ? struct.hraPercent : 40,
            salConveyance: struct.salConveyance || 0,
            salPerformance: struct.salPerformance || 0,
            salOther: struct.salOther || 0,
            salSpecial: struct.salSpecial || 0,
            salWashing: struct.salWashing,
            otAmount: Number(procOTAmount) || 0,
            formulaConfig
          }
        );

    const handleConfirmProcess = async () => {
      const updates = {
        payrollGenerated: true,
        payrollContext: liveContext,
        daysPresent: Number(procDaysPresent),
        createdAt: new Date().toISOString()
      };
      try {
        const updatedRecord = await dataService.updatePayrollRecord(
          month,
          year,
          employee.id,
          updates,
          authService.getCurrentUser()?.name || 'Admin'
        );
        if (updatedRecord) {
          setDbRecords(prev => ({
            ...prev,
            [String(employee.id)]: updatedRecord
          }));
          
          // Only update advances if it's the first time generating this month
          if (!employee.payrollGenerated && Number(procAdvanceDeduction) > 0) {
             try {
                let remainingToDeduct = Number(procAdvanceDeduction);
                const allAdvances = await dataService.getAdvanceHistory();
                let updated = false;
                const activeAdv = allAdvances.filter(a => a.empId === employee.id && (a.status === 'Approved' || a.status === 'Foreclosed'));
                for (let a of activeAdv) {
                   if (remainingToDeduct <= 0) break;
                   const amountToTake = a.status === 'Foreclosed' ? (a.amount - (a.totalRepaid || 0)) : (a.emi || 0);
                   const deducted = Math.min(amountToTake, remainingToDeduct);
                   a.totalRepaid = (a.totalRepaid || 0) + deducted;
                   remainingToDeduct -= deducted;
                   if (a.totalRepaid >= a.amount) {
                      a.status = 'Closed';
                   }
                   updated = true;
                }
                if (updated) await dataService.saveAdvanceHistory(allAdvances);
             } catch (err) {
                console.error("Failed to update advance totalRepaid", err);
             }
          }

          showNotification("Payroll generated successfully", "success");
        } else {
          showNotification("Failed to generate payroll", "error");
        }
      } catch (e) {
        console.error(e);
        showNotification("Failed to generate payroll", "error");
      } finally {
        onClose();
      }
    };

    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>⚙️ Process Payroll — {employee.name}</h3>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem' }}><X size={20} /></button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Employee Code</p>
              <p style={{ margin: 0, fontWeight: '700' }}>{employee.empCode}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Category</p>
              <p style={{ margin: 0, fontWeight: '700' }}>{employee.category || 'Staff Employee'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Payable Days (Attendance count: {employee.daysPresent})</label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                max="31"
                className="form-input" 
                style={{ width: '100%' }} 
                value={procDaysPresent} 
                onChange={e => setProcDaysPresent(Number(e.target.value))} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Overtime (OT) Amount (₹)
                <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                  (OT: {Number(employee.otHours || 0).toFixed(1)}h {employee.holidayOtHours ? `, Hol: ${Number(employee.holidayOtHours).toFixed(1)}h` : ''})
                </span>
              </label>
              <input 
                type="number" 
                min="0"
                className="form-input" 
                style={{ width: '100%' }} 
                value={procOTAmount} 
                onChange={e => setProcOTAmount(Number(e.target.value))} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Advance / Loan Deduction (₹)</label>
              <input 
                type="number" 
                min="0"
                className="form-input" 
                style={{ width: '100%' }} 
                value={procAdvanceDeduction} 
                onChange={e => setProcAdvanceDeduction(Number(e.target.value))} 
              />
            </div>
          </div>

          {/* LIVE PREVIEW CONTAINER */}
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Payout Preview</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Basic Salary:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(liveContext.earnings.basic)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Earnings:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(liveContext.earnings.gross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Deductions:</span>
                <span style={{ fontWeight: '600', color: 'var(--color-danger)' }}>{formatCurrency(liveContext.deductions.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontWeight: '800', fontSize: '1.1rem' }}>
                <span>Net Take Home:</span>
                <span style={{ color: 'var(--color-success)' }}>{formatCurrency(liveContext.netPay)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmProcess}>Confirm & Process</button>
          </div>
        </div>
      </div>
    );
  };

  const PayslipModal = ({ employee, onClose }) => {
    const { payrollContext } = employee;
    const { earnings, deductions, netPay } = payrollContext;
    
    // Formatting helper
    const fmt = (val) => formatCurrency(val || 0);

    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '850px', padding: '2rem', maxHeight: '95vh', overflowY: 'auto' }}>
          <div id="payslip-capture" style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', color: '#1e293b' }}>
            
            {/* Header / Branding */}<br/><br/>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                <img src="/Accuweigh.svg" alt="Accuweigh" style={{ height: '100px', width: 'auto', objectFit: 'contain' }} />
                <p style={{ margin: 10, fontSize: '1.0rem', color: '#64748b', fontWeight: '600' }}>Accuweigh Automation & Solution Pvt. Ltd.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>PAYSLIP</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>For the month of {MONTH_NAMES[month]} {year}</p>
              </div>
            </div>

            {/* Employee Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Employee Name:</td><td style={{ padding: '0.3rem 0', fontWeight: '700', color: '#0f172a' }}>{employee.name}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Employee Code:</td><td style={{ padding: '0.3rem 0', fontWeight: '700', color: '#0f172a' }}>{employee.empCode || 'N/A'}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Designation:</td><td style={{ padding: '0.3rem 0', fontWeight: '600', color: '#334155' }}>{employee.role || 'N/A'}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Department:</td><td style={{ padding: '0.3rem 0', fontWeight: '600', color: '#334155' }}>{employee.department || 'N/A'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Category:</td><td style={{ padding: '0.3rem 0', fontWeight: '600', color: '#334155' }}>{employee.category || 'Staff Employee'}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>UAN Number:</td><td style={{ padding: '0.3rem 0', fontWeight: '600', color: '#334155' }}>{employee.uanNumber || 'N/A'}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>ESIC Number:</td><td style={{ padding: '0.3rem 0', fontWeight: '600', color: '#334155' }}>{employee.esicNumber || 'N/A'}</td></tr>
                    <tr><td style={{ padding: '0.3rem 0', color: '#64748b', fontWeight: '500' }}>Payable Days:</td><td style={{ padding: '0.3rem 0', fontWeight: '700', color: '#0f172a' }}>{payrollContext.divisor - payrollContext.absentDays} / {payrollContext.divisor || 30} days</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Earnings and Deductions Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              
              {/* Earnings Column */}
              <div style={{ borderRight: '1px solid #cbd5e1' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.6rem 1rem', borderBottom: '1px solid #cbd5e1', fontWeight: '700', color: '#1e293b' }}>EARNINGS COMPONENTS</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Basic Salary</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.basic)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Dearness Allowance (DA)</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.da)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>HRA</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.hra)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Washing Allowance</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.washingAllowance)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Conveyance & Fuel</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.conveyance)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Special Allowance</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.specialAllowance)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Performance Incentive</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.performance)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Other Allowance</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.otherManual)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ padding: '0.5rem 1rem', color: '#475569' }}>
                        Overtime (OT) Amount 
                        {(payrollContext.otHours > 0 || payrollContext.holidayOtHours > 0) && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: '#94a3b8' }}>
                            ({Number(payrollContext.otHours || 0).toFixed(1)}h{payrollContext.holidayOtHours ? ` + ${Number(payrollContext.holidayOtHours).toFixed(1)}h hol` : ''})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(earnings.otAmount)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: '700' }}><td style={{ padding: '0.6rem 1rem', color: '#0f172a' }}>Gross Earnings</td><td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#0f172a' }}>{fmt(earnings.gross)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions Column */}
              <div>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.6rem 1rem', borderBottom: '1px solid #cbd5e1', fontWeight: '700', color: '#1e293b' }}>DEDUCTIONS & STATUTORY</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>PF (Employee Share)</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(deductions.pf)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>ESIC (Employee Share)</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(deductions.esic)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Professional Tax (PT)</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(deductions.pt)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>TDS (Income Tax)</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(deductions.tds)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: '#475569' }}>Advance / Loan Deduction</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>{fmt(deductions.advance)}</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: 'transparent' }}>-</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'transparent' }}>0</td></tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '0.5rem 1rem', color: 'transparent' }}>-</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'transparent' }}>0</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ padding: '0.5rem 1rem', color: 'transparent' }}>-</td><td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'transparent' }}>0</td></tr>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: '700' }}><td style={{ padding: '0.6rem 1rem', color: '#0f172a' }}>Total Deductions</td><td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#0f172a' }}>{fmt(deductions.total)}</td></tr>
                  </tbody>
                </table>
              </div>

            </div>

            {/* Bottom Net Take Home */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: '1.25rem 1.5rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#2563eb', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NET TAKE HOME PAY</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: '600', fontStyle: 'italic' }}>({numberToWords(netPay)})</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#1e3a8a' }}>{fmt(netPay)}</h2>
              </div>
            </div>

            {/* Footer note */}
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>This is a computer-generated payslip and does not require a signature.</p>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
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
        const [emps, hols, dbRecs, structuresMap, monthlyAtt, leaves, advancesData, configData] = await Promise.all([
          dataService.getEmployees().catch(() => []),
          dataService.getCustomHolidays().catch(() => []),
          dataService.getPayrollRecordsByMonth(month, year).catch(() => []),
          dataService.getSalaryStructuresMap().catch(() => ({})),
          dataService.getMonthlyAttendance(month, year).catch(() => ({})),
          dataService.getLeaveRequests().catch(() => []),
          dataService.getAdvanceHistory().catch(() => []),
          dataService.getPayrollFormulaConfig().catch(() => [])
        ]);
        
        const attMap = {};
        const balMap = {};
        
        await Promise.all(emps.map(async (emp) => {
          const balance = await dataService.getEmployeeBalance(emp.id).catch(() => 0);
          attMap[emp.id] = calculateAttendanceStats(emp.id, year, month, monthlyAtt, hols, emp.category, leaves);
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
          setSalaryStructures(structuresMap);
          setAdvanceHistory(advancesData || []);
          
          if (configData && configData.length > 0) {
            const parsed = {};
            configData.forEach(c => {
              if (c.component_name === 'Basic') parsed.basic_pct = c.formula_value / 100;
              if (c.component_name === 'DA') parsed.da_pct = c.formula_value / 100;
              if (c.component_name === 'HRA') parsed.hra_pct = c.formula_value / 100;
              if (c.component_name === 'Washing Allowance') parsed.washing_fixed = c.formula_value;
            });
            setFormulaConfig(parsed);
          }
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
      const stats = attendanceMap[emp.id] || { payableDays: 0, presentDays: 0, holidayWorkedDays: 0, divisor: 30 };
      const daysPresent = stats.presentDays;
      const payableDays = stats.payableDays;
      const holidayWorkedDays = stats.holidayWorkedDays;
      const dbRec = dbRecords[String(emp.id)] || {};
      const struct = salaryStructures[String(emp.id)] || {};

      const pfCapped = struct.pfCapped !== false;
      const hraPercent = struct.hraPercent !== undefined ? struct.hraPercent : 40;
      const conveyance = struct.salConveyance || 0;
      const performance = struct.salPerformance || 0;
      const otherManual = struct.salOther || 0;
      const specialManual = struct.salSpecial || 0;
      
      const empAdvances = advanceHistory.filter(a => a.empId === emp.id && (a.status === 'Approved' || a.status === 'Foreclosed'));
      const advanceDeduction = empAdvances.reduce((sum, a) => sum + (a.status === 'Foreclosed' ? (a.amount - (a.totalRepaid || 0)) : (a.emi || 0)), 0);

      const isWorker = (emp.category || '').toLowerCase().includes('worker');
      let calculatedOT = 0;
      if (isWorker && stats.divisor > 0) {
        const otRatePerHour = (emp.grossSalary / 26) / 9.3;
        const normalOtPay = (stats.otHours || 0) * otRatePerHour;
        const holidayOtPay = (stats.holidayOtHours || 0) * (otRatePerHour * 2);
        calculatedOT = Math.round(normalOtPay + holidayOtPay);
      }

      const calculatedContext = emp.category !== 'Contractual Worker'
        ? calculateSalaryComponents(
            emp.grossSalary, 
            pfCapped, 
            advanceDeduction, 
            emp.category, 
            payableDays, 
            30, 
            { 
              hasPF: struct.hasPF !== undefined ? struct.hasPF : !!emp.uanNumber, 
              hasESIC: struct.hasESIC !== undefined ? struct.hasESIC : !!emp.esicNumber,
              year,
              month,
              hraPercent,
              salConveyance: conveyance,
              salPerformance: performance,
              salOther: otherManual,
              salSpecial: specialManual,
              salWashing: struct.salWashing,
              otAmount: calculatedOT,
              otHours: stats.otHours || 0,
              holidayOtHours: stats.holidayOtHours || 0,
              formulaConfig
            }
          )
        : null;

      return {
        ...emp,
        daysPresent,
        payableDays,
        holidayWorkedDays,
        otHours: stats.otHours || 0,
        holidayOtHours: stats.holidayOtHours || 0,
        calculatedOTAmount: calculatedOT,
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
  }, [employees, attendanceMap, balanceMap, dbRecords, salaryStructures, month, year]);

  const filteredEmployees = useMemo(() => {
    return employeesWithPayroll.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.empCode && e.empCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [employeesWithPayroll, searchTerm]);

  const handleUpdateStatus = async (empId, updates) => {
    const isAuthorized = userRole === 'management' || userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';
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
      // If reverting payroll, we should attempt to reverse the advance deduction. (Basic implementation)
      if (updates.payrollGenerated === false && emp.payrollGenerated) {
         const advDeduction = emp.payrollContext?.deductions?.advance || 0;
         if (advDeduction > 0) {
            try {
               let toReverse = advDeduction;
               const allAdvances = await dataService.getAdvanceHistory();
               let isAdvUpdated = false;
               const activeAdv = allAdvances.filter(a => a.empId === empId && (a.status === 'Approved' || a.status === 'Closed' || a.status === 'Foreclosed')).reverse();
               for (let a of activeAdv) {
                  if (toReverse <= 0) break;
                  const availableToReverse = a.totalRepaid || 0;
                  const reversed = Math.min(availableToReverse, toReverse);
                  a.totalRepaid -= reversed;
                  toReverse -= reversed;
                  if (a.status === 'Closed' && a.totalRepaid < a.amount && !a.waivedAmount) {
                     a.status = a.isForeclosed ? 'Foreclosed' : 'Approved';
                  }
                  isAdvUpdated = true;
               }
               if (isAdvUpdated) await dataService.saveAdvanceHistory(allAdvances);
            } catch (err) {
               console.error("Failed to reverse advance", err);
            }
         }
      }

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
    const isAuthorized = userRole === 'management' || userRole === 'admin' || userRole === 'hr' || userRole === 'hr_admin';
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
          
          const advDeduction = emp.payrollContext?.deductions?.advance || 0;
          if (advDeduction > 0) {
             try {
                let remainingToDeduct = advDeduction;
                const allAdvances = await dataService.getAdvanceHistory();
                let isAdvUpdated = false;
                const activeAdv = allAdvances.filter(a => a.empId === emp.id && (a.status === 'Approved' || a.status === 'Foreclosed'));
                for (let a of activeAdv) {
                   if (remainingToDeduct <= 0) break;
                   const amountToTake = a.status === 'Foreclosed' ? (a.amount - (a.totalRepaid || 0)) : (a.emi || 0);
                   const deducted = Math.min(amountToTake, remainingToDeduct);
                   a.totalRepaid = (a.totalRepaid || 0) + deducted;
                   remainingToDeduct -= deducted;
                   if (a.totalRepaid >= a.amount) {
                      a.status = 'Closed';
                   }
                   isAdvUpdated = true;
                }
                if (isAdvUpdated) await dataService.saveAdvanceHistory(allAdvances);
             } catch (err) {
                console.error("Failed to update advance totalRepaid", err);
             }
          }
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
                                onClick={() => handleOpenProcessModal(emp)}
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

      {processModalEmp && (
        <ProcessPayrollModal employee={processModalEmp} onClose={() => setProcessModalEmp(null)} />
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

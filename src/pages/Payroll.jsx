import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { IndianRupee, Download, Search, Filter, Eye, AlertCircle, Info, FileText, FileSpreadsheet, Printer, Mail, X, Lock } from 'lucide-react';
import { calculateSalaryComponents, formatCurrency, getHolidayDates, numberToWords } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { useNotification } from '../context/NotificationContext';
import { generatePDF } from '../utils/exportUtils';

// const EMPLOYEES_DATA = dataService.getEmployees(); // Removed to ensure reactivity within the component

const NOW = new Date();
const CUR_YR = NOW.getFullYear();
const CUR_MO = NOW.getMonth(); // 0-indexed

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Shared Holiday Calendar Panel ─────────────────────────────────────────
const HolidayPanel = ({ year, month, workedDays, holidayList, onToggle }) => {
  const holidays = useMemo(() => getHolidayDates(year, month, holidayList), [year, month, holidayList]);

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
      <h5 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        🗓️ Official Holidays — {MONTH_NAMES[month]} {year}
        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: '400' }}>
          (Weekly Offs + Declared Holidays)
        </span>
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {holidays.map((h) => {
          const worked = workedDays.includes(h.day);
          return (
            <button
              key={h.day}
              onClick={() => onToggle(h.day)}
              title={`${h.date} (${h.type}) — click to mark as worked`}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '20px',
                border: `2px solid ${worked ? 'var(--color-warning)' : 'var(--color-border)'}`,
                backgroundColor: worked ? 'rgba(245,158,11,0.12)' : 'var(--color-background)',
                color: worked ? 'var(--color-warning)' : 'var(--color-text-muted)',
                fontWeight: worked ? '700' : '400',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
              {h.date} <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>{h.type}</span>
              {worked && <span style={{ marginLeft: '0.4rem' }}>✓ OT</span>}
            </button>
          );
        })}
      </div>
      {workedDays.length > 0 && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: '600' }}>
          {workedDays.length} holiday day(s) marked as worked → Full OT per day (shift hrs − 30 min lunch).
        </p>
      )}
    </div>
  );
};

// ── Contractual Payout Modal ───────────────────────────────────────────────
const ContractualPayslipModal = ({ employee, onClose }) => {
  const [daysPresent, setDaysPresent] = useState(employee.daysPresent || 0);
  const [balanceLeaves, setBalanceLeaves] = useState(employee.balanceLeaves);
  const [otHours, setOtHours] = useState('0');
  const [shiftHours, setShiftHours] = useState('9.5');
  const [otHourlyRate, setOtHourlyRate] = useState(
    employee.dayRate ? Math.round((employee.dayRate / 9.5) * 100) / 100 : ''
  );
  const [holidayWorked, setHolidayWorked] = useState([]);

  if (!employee) return null;

  const handleShiftChange = (val) => {
    setShiftHours(val);
    if (employee.dayRate && Number(val) > 0) {
      setOtHourlyRate(Math.round((employee.dayRate / Number(val)) * 100) / 100);
    }
  };

  const shiftHrs = Number(shiftHours) || 9.5;
  const holidayOTHrs = holidayWorked.length * (shiftHrs - 0.5);
  const regularOTHrs = Number(otHours) || 0;
  const otRate = Number(otHourlyRate) || 0;

  const basePay = Math.round((Number(employee.dayRate) || 0) * (Number(daysPresent) || 0));
  const regularOTPay = Math.round(otRate * regularOTHrs);
  const holidayOTPay = Math.round(otRate * holidayOTHrs);
  const totalPay = basePay + regularOTPay + holidayOTPay;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', padding: '0', maxHeight: '95vh', overflowY: 'auto', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>

        {/* Printable/Professional Header Section */}
        <div id="contractual-payslip-capture" style={{ backgroundColor: '#fff' }}>
          <div style={{ padding: '2rem', borderBottom: '2px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Top Row: Logo & Close Actions */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ width: '80px' }}>
                 <img src="/C:/Users/Saurabh.b/.gemini/antigravity/brain/fb03ee8e-6266-4110-9d28-ee3c6086cfe6/company_logo_1775734407946.png" alt="Logo" style={{ width: '100%', height: 'auto' }} />
               </div>
               <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.5rem' }}><IndianRupee size={18} /></button>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
               </div>
            </div>

            {/* Branding Row */}
            <div style={{ textAlign: 'center', marginTop: '-1rem' }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.3rem', 
                fontWeight: '800', 
                letterSpacing: '0.5px', 
                color: 'var(--color-primary)',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase'
              }}>
                ACCUWEIGH PRIVATE LIMITED
              </h1>
              <p style={{ 
                margin: '0.4rem 0 0', 
                fontSize: '0.9rem', 
                fontWeight: '700', 
                color: 'var(--color-text-main)', 
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Salary Slip for {MONTH_NAMES[CUR_MO]} {CUR_YR}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Attendance/OT Controls (Admin Only - Hide when printing) */}
          <div className="hide-on-print" style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Configure Payout Details</h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ fontSize: '0.8rem' }}>Shift (Hrs): <input type="number" step="0.5" value={shiftHours} onChange={e => handleShiftChange(e.target.value)} style={{ width: '50px' }} /></label>
                <label style={{ fontSize: '0.8rem' }}>OT Rate: <input type="number" value={otHourlyRate} onChange={e => setOtHourlyRate(e.target.value)} style={{ width: '60px' }} /></label>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="number" className="form-input" placeholder="OT Hours" value={otHours} onChange={e => setOtHours(e.target.value)} />
              <HolidayPanel year={CUR_YR} month={CUR_MO} workedDays={holidayWorked} onToggle={day => setHolidayWorked(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem' }}>
            <div>
              <h4 style={{ borderBottom: '2px solid var(--color-success)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Earnings</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span>Basic Pay</span><span>₹{basePay.toLocaleString()}</span></div>
              {regularOTPay > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span>Regular OT</span><span>₹{regularOTPay.toLocaleString()}</span></div>}
              {holidayOTPay > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}><span>Holiday OT</span><span>₹{holidayOTPay.toLocaleString()}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '2px solid var(--color-border)', fontWeight: '700', paddingTop: '0.5rem' }}><span>Total Earnings</span><span>₹{(basePay + regularOTPay + holidayOTPay).toLocaleString()}</span></div>
            </div>
            <div>
              <h4 style={{ borderBottom: '2px solid var(--color-danger)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Deductions</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No statutory deductions for contractual staff.</p>
      </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
};

// ── Standard Payslip Modal (Staff / On-role) ───────────────────────────────
const PayslipModal = ({ employee, onClose }) => {
  const presentDaysCount = dataService.getPresentDaysCount(employee.id, CUR_MO, CUR_YR);
  const [holidayWorked, setHolidayWorked] = useState([]);
  const [shiftHours, setShiftHours] = useState('9.5');
  const daysPresent = presentDaysCount || 0;
  const balanceLeaves = dataService.getEmployeeBalance(employee.id);

  if (!employee) return null;
  const { payrollContext } = employee;
  const { earnings, deductions, netPay } = payrollContext;

  const isOnRole = employee.category === 'On role worker';
  const shiftHrs = Number(shiftHours) || 9.5;

  const toggleHoliday = (day) =>
    setHolidayWorked(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const otHourlyRate = isOnRole ? Math.round((employee.grossSalary / 26 / shiftHrs) * 100) / 100 : 0;
  const holidayOTHrs = holidayWorked.length * (shiftHrs - 0.5);
  const holidayOTPay = Math.round(otHourlyRate * holidayOTHrs);
  const finalNetPay = netPay + holidayOTPay;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '850px', padding: '0', maxHeight: '95vh', overflowY: 'auto', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div id="standard-payslip-capture" style={{ backgroundColor: '#fff' }}>
          <div style={{ padding: '2rem', borderBottom: '2px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '90px' }}>
                  <img src="/Accuweigh.svg" alt="Logo" style={{ width: '100%', height: 'auto' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                </div>
              </div>
            </div>

            {/* Branding Row */}
            <div style={{ textAlign: 'center', marginTop: '-1rem' }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.3rem', 
                fontWeight: '900', 
                letterSpacing: '0.5px', 
                color: 'var(--color-primary)',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase'
              }}>
                ACCUWEIGH AUTOMATION & SOLUTIONS PRIVATE LIMITED
              </h1>
              <p style={{ 
                margin: '0.4rem 0 0', 
                fontSize: '0.9rem', 
                fontWeight: '700', 
                color: 'var(--color-text-main)', 
                textTransform: 'uppercase', 
                letterSpacing: '2px' 
              }}>
                Salary Slip for {MONTH_NAMES[CUR_MO]} {CUR_YR}
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Employee Detail Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: '10px', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Employee Code</span><span style={{ fontWeight: '700', color: '#000' }}>: {employee.empCode}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Employee Name</span><span style={{ fontWeight: '700', color: '#000' }}>: {employee.name}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Designation</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.role}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Joining Date</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.joiningDate}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Grade</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.grade}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>UAN Number</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.uanNumber}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>ESIC Number</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.esicNumber}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Bank A/C Number</span><span style={{ fontWeight: '600', color: '#000' }}>: {employee.bankAccount}</span></div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Present Days</span>
                <span style={{ fontWeight: '700', color: '#000' }}>: {daysPresent}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '140px', color: 'var(--color-text-muted)' }}>Balance Leaves</span>
                <span style={{ fontWeight: '700', color: '#000' }}>: {balanceLeaves}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Earnings & Deductions Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '2.5rem' }}>
            <div>
              <h4 style={{ borderBottom: '2px solid var(--color-success)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '1px' }}>Earnings</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  ['Basic Salary (50%)', earnings.basic],
                  ['Dearness Allowance', earnings.da],
                  ['House Rent (HRA)', earnings.hra],
                  ['Washing Allowance', earnings.washingAllowance],
                  ['Other Allowances', earnings.specialAllowance],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{lbl}</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(val)}</span>
                  </div>
                ))}
                {holidayOTPay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-warning)', fontWeight: '700' }}>
                    <span>Holiday OT ({(shiftHrs - 0.5).toFixed(1)} hrs)</span>
                    <span>+ {formatCurrency(holidayOTPay)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--color-border)', fontWeight: '800', fontSize: '1rem' }}>
                  <span>Total Gross</span>
                  <span>{formatCurrency(earnings.gross + holidayOTPay)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ borderBottom: '2px solid var(--color-danger)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '1px' }}>Deductions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  ['Provident Fund (PF)', deductions.pf],
                  ['ESIC (0.75%)', deductions.esic],
                  ['Professional Tax', deductions.pt],
                  ['Income Tax (TDS)', deductions.tds],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{lbl}</span>
                    <span style={{ fontWeight: '600', color: val > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {formatCurrency(val)}
                    </span>
                  </div>
                ))}
                {deductions.advance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-danger)', fontWeight: '700' }}>
                    <span>Advance Recovery</span>
                    <span>{formatCurrency(deductions.advance)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--color-border)', fontWeight: '800', fontSize: '1rem' }}>
                  <span>Total Deductions</span>
                  <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(deductions.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(37, 99, 235, 0.06)', color: 'var(--color-primary-dark)', padding: '1.75rem 2rem', borderRadius: '14px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
            <div>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)', fontWeight: 600 }}>Net Take Home</p>
              <h2 style={{ margin: '0.25rem 0', fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary-dark)' }}>{formatCurrency(finalNetPay)}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Amount in Words: {numberToWords(finalNetPay)}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '1rem 2rem' }}
                onClick={() => generatePDF('standard-payslip-capture', `Payslip_${employee.empCode}_${MONTH_NAMES[CUR_MO]}.pdf`)}
              >
                <Download size={20} /> Generate PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Payroll = () => {
  const { showNotification } = useNotification();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [holidayList, setHolidayList] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [balanceMap, setBalanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [holidayWorked, setHolidayWorked] = useState([]); // List of day numbers

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [emps, hols] = await Promise.all([
          dataService.getEmployees(),
          dataService.getCustomHolidays()
        ]);
        
        const attMap = {};
        const balMap = {};
        await Promise.all(emps.map(async (emp) => {
          const [count, balance] = await Promise.all([
            dataService.getPresentDaysCount(emp.id, CUR_MO, CUR_YR),
            dataService.getEmployeeBalance(emp.id)
          ]);
          attMap[emp.id] = count;
          balMap[emp.id] = balance;
        }));

        setEmployees(emps);
        setHolidayList(hols);
        setAttendanceMap(attMap);
        setBalanceMap(balMap);
      } catch (err) {
        console.error("Failed to load payroll data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const employeesWithPayroll = useMemo(() => {
    return employees.map(emp => {
      const daysPresent = attendanceMap[emp.id] || 0;
      return {
        ...emp,
        daysPresent,
        balanceLeaves: balanceMap[emp.id],
        payrollContext: emp.category !== 'Contractual Worker'
          ? calculateSalaryComponents(emp.grossSalary, true, emp.advanceLoanEMI || 0, emp.category, daysPresent, 30)
          : null
      };
    });
  }, [employees, attendanceMap, balanceMap]);

  const isContractual = selectedEmployee?.category === 'Contractual Worker';

  const handleExport = (format) => {
    const rawData = [];
    employeesWithPayroll.forEach(emp => {
      const isC = emp.category === 'Contractual Worker';
      const ctx = emp.payrollContext;
      
      if (isC) {
        const presentDays = emp.daysPresent;
        const basePay = Math.round((Number(emp.dayRate) || 0) * presentDays);
        rawData.push({
          "Emp Code": emp.empCode, "Name": emp.name, "Category": emp.category, "UAN": emp.uanNumber || 'N/A', "Bank A/c": emp.bankAccount,
          "Gross Salary/Rate": emp.dayRate, "Basic": basePay, "DA": 0, "HRA": 0, "Washing": 0, "Special": 0, "Other OT": 0, "Total Earnings": basePay,
          "PF": 0, "ESIC": 0, "PT": 0, "TDS": 0, "Advances": 0, "Total Deductions": 0, "Net Pay": basePay
        });
      } else if (ctx) {
        rawData.push({
          "Emp Code": emp.empCode, "Name": emp.name, "Category": emp.category, "UAN": emp.uanNumber || 'N/A', "Bank A/c": emp.bankAccount,
          "Gross Salary/Rate": emp.grossSalary, "Basic": ctx.earnings.basic, "DA": ctx.earnings.da, "HRA": ctx.earnings.hra, "Washing": ctx.earnings.washingAllowance, 
          "Special": ctx.earnings.specialAllowance, "Other OT": 0, "Total Earnings": ctx.earnings.totalEarnings,
          "PF": ctx.deductions.pf, "ESIC": ctx.deductions.esic, "PT": ctx.deductions.pt, "TDS": ctx.deductions.tds, "Advances": ctx.deductions.advance, 
          "Total Deductions": ctx.deductions.total, "Net Pay": ctx.netPay
        });
      }
    });

    if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_Ledger_${MONTH_NAMES[CUR_MO]}_${CUR_YR}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll_Ledger");
        XLSX.writeFile(workbook, `Payroll_Ledger_${MONTH_NAMES[CUR_MO]}_${CUR_YR}.xlsx`);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>Loading payroll register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll & Compliance</h1>
          <p className="page-subtitle">Monthly salary register · Contractor payouts · PF/ESIC compliance · Holiday OT tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }} className="hide-on-print">
            <button 
              className="btn btn-outline" 
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                // Simulate processing delay
                setTimeout(() => {
                  employeesWithPayroll.forEach(emp => {
                    if (emp.payrollContext) {
                        dataService.savePayrollSnapshot({
                          empId: emp.id,
                          month: CUR_MO,
                          year: CUR_YR,
                          ...emp.payrollContext
                        });
                    }
                  });
                  setIsProcessing(false);
                  showNotification(`Payroll Cycle for ${MONTH_NAMES[CUR_MO]} finalized and locked successfully.`, 'success');
                }, 1500);
              }}
              style={{ gap: '0.5rem' }}
            >
              <Lock size={18} /> {isProcessing ? 'Finalizing...' : 'Finalize & Lock Cycle'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', gap: '0.75rem' }}
            >
              <IndianRupee size={20} /> Run Monthly Ledger & Export
            </button>
            {showExportMenu && (
                <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '250px' }}>
                     <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> Export as CSV Tracker</button>
                     <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Download Excel Workbook</button>
                     <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { window.print(); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Print / View PDF</button>
                     <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email to Finance Dept</button>
                </div>
            )}
        </div>
      </div>

        <HolidayPanel 
          year={CUR_YR} 
          month={CUR_MO} 
          workedDays={holidayWorked} 
          holidayList={holidayList}
          onToggle={(day) => setHolidayWorked(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} 
        />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2>Salary Register — {MONTH_NAMES[CUR_MO]} {CUR_YR}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="header-search" style={{ width: '250px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input type="text" placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn btn-outline"><Filter size={18} /> Filter</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Code</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Gross / Day Rate</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--color-danger)' }}>PF</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--color-danger)' }}>ESIC</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--color-danger)' }}>PT/Tax</th>
                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-success)' }}>Net Pay</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employeesWithPayroll.filter(e => 
                e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (e.empCode && e.empCode.toLowerCase().includes(searchTerm.toLowerCase()))
              ).map((emp) => {
                const isC = emp.category === 'Contractual Worker';
                const ctx = emp.payrollContext;
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-primary)' }}>
                      {emp.empCode || emp.biometricCode || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--color-text-main)' }}>
                      <div>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>{emp.role}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${isC ? 'badge-warning' : emp.category === 'On role worker' ? 'badge-primary' : 'badge-default'}`} style={{ fontSize: '0.75rem' }}>
                        {emp.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>
                      {isC
                        ? <span>₹ {Number(emp.dayRate).toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>/day</span></span>
                        : formatCurrency(emp.grossSalary)}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-danger)' }}>{isC ? '—' : formatCurrency(ctx.deductions.pf)}</td>
                    <td style={{ padding: '1rem' }}>
                      {isC ? '—'
                        : ctx.deductions.esic > 0
                          ? <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>{formatCurrency(ctx.deductions.esic)}</span>
                          : '—'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-danger)' }}>{isC ? '—' : formatCurrency(ctx.deductions.pt + ctx.deductions.tds)}</td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: isC ? 'var(--color-warning)' : 'var(--color-primary)', fontSize: '1.05rem' }}>
                      {isC
                        ? <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>Enter attendance →</span>
                        : formatCurrency(ctx.netPay)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button className="btn btn-outline" onClick={() => setSelectedEmployee(emp)} style={{ fontSize: '0.875rem', padding: '0.4rem 0.8rem' }}>
                        <Eye size={16} /> {isC ? 'Enter Payout' : 'Payslip'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && isContractual && (
        <ContractualPayslipModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
      {selectedEmployee && !isContractual && (
        <PayslipModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}

      {showEmailModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Dispatch Ledger</h2>
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
                      <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Please find attached the final Payroll Ledger for ${MONTH_NAMES[CUR_MO]} ${CUR_YR}.`}></textarea>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => { alert('Ledger successfully queued for email automation!'); setShowEmailModal(false); }}>
                      Dispatch Email
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Payroll;

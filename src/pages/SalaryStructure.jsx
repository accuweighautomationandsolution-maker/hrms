import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, Lock, CheckCircle, TrendingUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateSalaryComponents } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';

const SalaryStructure = ({ isEmbedded = false, passedState = null, empCategory = '', empId = null, onStateChange = null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAppraisal, setIsAppraisal] = useState(false);

  const [form, setForm] = useState(passedState || {
    candidateName: '', candidateMiddleName: '', candidateLastName: '',
    addressLine1: '', city: '', state: '', zipCode: '',
    roleApplied: '', datePrepared: new Date().toISOString().split('T')[0],
    targetSalary: '', hraPercent: 40,
    salConveyance: '', salSpecial: '', salOther: '', salPerformance: '',
    hasPF: true, pfCapped: true, hasESIC: false,
    dayRate: ''
  });

  const hasFetched = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const effectiveEmpId = empId || (location.state && location.state.empId);

    const safetyTimeout = setTimeout(() => {
      // We don't have a global loading state here, but we can log
      if (isMounted) console.warn("SalaryStructure: Fetch timeout reached.");
    }, 8000);

    const fetchExisting = async () => {
      if (effectiveEmpId && !isEmbedded && !hasFetched.current) {
        hasFetched.current = true;
        try {
          const [existing, emp] = await Promise.all([
            dataService.getSalaryStructure(effectiveEmpId).catch(() => null),
            dataService.getEmployees().then(list => list.find(e => e.id === effectiveEmpId)).catch(() => null)
          ]);
          
          if (isMounted) {
            if (existing) {
              setForm(prev => ({ 
                ...prev, 
                ...existing,
                empType: emp?.empType || prev.empType || 'Probation'
              }));
            } else if (emp) {
              setForm(prev => ({
                ...prev,
                candidateName: emp.name,
                roleApplied: emp.role,
                empType: emp.empType || 'Probation'
              }));
            }
          }
        } catch (err) {
          console.error("Error fetching salary/employee details:", err);
        } finally {
          clearTimeout(safetyTimeout);
        }
      }
    };

    if (!hasFetched.current) fetchExisting();

    if (!isEmbedded && location.state && location.state.isAppraisal) {
      setIsAppraisal(true);
      setForm(prev => ({
        ...prev,
        candidateName: location.state.employeeName,
        roleApplied: location.state.employeeRole,
        empId: location.state.empId,
        empType: location.state.empType || 'Permanent'
      }));
    } else if (passedState && Object.keys(passedState).length > 0) {
      // Synchronize from passed props but check for changes to avoid loops
      setForm(prev => {
        const isSame = JSON.stringify(prev) === JSON.stringify(passedState);
        return isSame ? prev : { ...prev, ...passedState };
      });
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [location, isEmbedded, empId, passedState]); // Keep passedState for prop updates, but the guard inside setForm handles it

  const handleInput = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      if (onStateChange) onStateChange(updated);
      return updated;
    });
  };

  // Shared Calculation Engine Integration
  const targetGross = Number(form.targetSalary) || 0;
  const payroll = calculateSalaryComponents(
    targetGross,
    form.pfCapped !== false, // pfCapped state from form
    0,
    empCategory || 'Staff Employee',
    30,
    30,
    {
      salConveyance: form.salConveyance,
      salPerformance: form.salPerformance,
      salOther: form.salOther,
      salSpecial: form.salSpecial,
      hraPercent: form.hraPercent,
      hasPF: form.hasPF,
      hasESIC: form.hasESIC
    }
  );

  const { earnings, deductions, netPay, remainingAmount, isBalanced } = payroll;

  /* ── Number to Words ─────────────────────────────────── */
  const numberToWords = (num) => {
    if (!num || isNaN(num)) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n) => {
      let s = '';
      if (n > 99) { s += a[Math.floor(n / 100)] + 'Hundred '; n %= 100; }
      if (n > 19) { s += b[Math.floor(n / 10)] + ' '; n %= 10; }
      if (n > 0) { s += a[n]; }
      return s;
    };
    let n = Math.floor(num), res = '';
    if (Math.floor(n / 10000000) > 0) { res += inWords(Math.floor(n / 10000000)) + 'Crore '; n %= 10000000; }
    if (Math.floor(n / 100000) > 0) { res += inWords(Math.floor(n / 100000)) + 'Lakh '; n %= 100000; }
    if (Math.floor(n / 1000) > 0) { res += inWords(Math.floor(n / 1000)) + 'Thousand '; n %= 1000; }
    if (n > 0) { res += inWords(n); }
    return 'Rupees ' + res.trim() + ' Only';
  };

  const canCommit = isBalanced && targetGross > 0;

  const handleDownloadPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper to add a horizontal line
    const addLine = (y) => {
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, pageWidth - 15, y);
    };

    // Date Formatter
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === 'N/A') return 'N/A';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    // Currency Formatter
    const formatValue = (val) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    };

    // 1. Logo & Branding
    // Using a professional text-based logo design since local image import is environment-dependent
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.setFont('times', 'bold');
    doc.text('ACCUWEIGH', 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('times', 'normal');
    doc.text('Automation & Solution Pvt. Ltd.', 15, 25);

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Employee Compensation Matrix', pageWidth - 15, 20, { align: 'right' });
    doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - 15, 25, { align: 'right' });

    addLine(30);

    // 2. Document Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.text('SALARY STRUCTURE', pageWidth / 2, 42, { align: 'center' });

    // 3. Employee Details Box
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(252, 252, 252);
    doc.rect(15, 50, pageWidth - 30, 42, 'FD');

    const startY = 58;
    const col1 = 20;
    const col2 = 62;
    const col3 = 110;
    const col4 = 155;

    const drawDetail = (label, value, x1, x2, y) => {
      doc.setFont('times', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label, x1, y);
      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(String(value), x2, y);
    };

    drawDetail('Employee Name:', `${form.candidateName} ${form.candidateMiddleName || ''} ${form.candidateLastName || ''}`.trim(), col1, col2, startY);
    drawDetail('Employee ID:', form.empCode || 'N/A', col3, col4, startY);

    drawDetail('Designation:', form.roleApplied || 'N/A', col1, col2, startY + 9);
    drawDetail('Department:', form.department || 'N/A', col3, col4, startY + 9);

    drawDetail('Grade:', form.grade || 'N/A', col1, col2, startY + 18);
    drawDetail('Date of Joining:', formatDate(form.joinDate || 'N/A'), col3, col4, startY + 18);

    drawDetail('Category:', empCategory || 'Staff Employee', col1, col2, startY + 27);

    // 4. Tables Header
    let tableY = 105;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');

    // Earnings Header
    doc.setFillColor(37, 99, 235);
    doc.rect(15, tableY, (pageWidth - 30) / 2, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('EARNINGS COMPONENTS', 15 + (pageWidth - 30) / 4, tableY + 6, { align: 'center' });

    // Deductions Header
    doc.setFillColor(239, 68, 68);
    doc.rect(15 + (pageWidth - 30) / 2, tableY, (pageWidth - 30) / 2, 9, 'F');
    doc.text('DEDUCTIONS & STATUTORY', 15 + 3 * (pageWidth - 30) / 4, tableY + 6, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    tableY += 16;

    const drawRow = (label, value, y, isRight = false) => {
      const xStart = isRight ? 15 + (pageWidth - 30) / 2 : 15;
      const width = (pageWidth - 30) / 2;
      
      const xLabel = xStart + 5;
      const xColon = xStart + 45; // Shifted slightly for better gap
      const xCurrency = xStart + 52; // Fixed vertical line for Rs.
      const xAmount = xStart + width - 5;

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(label, xLabel, y);
      
      doc.setFont('times', 'bold');
      doc.text(':', xColon, y);

      // Draw Rs. at fixed vertical position
      doc.text('Rs.', xCurrency, y);

      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(formatValue(value), xAmount, y, { align: 'right' });
    };

    // Earnings Data
    drawRow('Basic Salary', earnings.basic, tableY);
    drawRow('PF (Employee Share)', deductions.pf, tableY, true);

    tableY += 8;
    drawRow('DA (Dearness Allowance)', earnings.da, tableY);
    drawRow('ESIC (Employee Share)', deductions.esic, tableY, true);

    tableY += 8;
    drawRow('HRA', earnings.hra, tableY);
    drawRow('Professional Tax (PT)', deductions.pt, tableY, true);

    tableY += 8;
    drawRow('Washing Allowance', earnings.washingAllowance, tableY);
    drawRow('Employer PF Share', payroll.erTotalStatutory - payroll.esicReport.erShare, tableY, true);

    tableY += 8;
    drawRow('Conveyance & Fuel', Number(form.salConveyance) || 0, tableY);
    drawRow('Employer ESIC Share', payroll.esicReport.erShare, tableY, true);

    tableY += 8;
    drawRow('Special Allowance', Number(form.salSpecial) || 0, tableY);

    tableY += 8;
    drawRow('Performance Incentive', Number(form.salPerformance) || 0, tableY);

    tableY += 8;
    drawRow('Other Allowances', Number(form.salOther) || 0, tableY);

    addLine(tableY + 5);

    tableY += 12;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    drawRow('Monthly Gross Salary', earnings.totalEarnings, tableY);
    drawRow('Total Monthly Deductions', deductions.total, tableY, true);

    // 5. Final Summary (Clean Design)
    tableY += 18;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(15, tableY, pageWidth - 15, tableY);

    tableY += 10;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.setFont('times', 'bold');
    doc.text('NET TAKE-HOME SALARY :', 20, tableY);

    doc.setFont('times', 'bold');
    doc.text('Rs.', pageWidth - 70, tableY); // Fixed position for vertical line
    doc.setFontSize(13);
    doc.text(`${formatValue(netPay)} / Month`, pageWidth - 20, tableY, { align: 'right' });

    tableY += 7;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('times', 'italic');
    doc.text(`(${numberToWords(netPay)})`, 20, tableY);

    tableY += 12;
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL ANNUAL CTC :', 20, tableY);

    doc.setFont('times', 'bold');
    doc.text('Rs.', pageWidth - 70, tableY); // Fixed position for vertical line
    doc.setFontSize(12);
    doc.text(`${formatValue(annualCTC)} Per Annum`, pageWidth - 20, tableY, { align: 'right' });

    doc.setLineWidth(0.1);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, tableY + 6, pageWidth - 15, tableY + 6);

    // 6. Signatory Section
    const sigY = tableY + 55;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    doc.line(20, sigY, 80, sigY);
    doc.text('Authorized HR Signatory', 20, sigY + 6);
    doc.setFontSize(8);
    doc.text('Accuweigh Automation & Solution', 20, sigY + 11);

    doc.setFontSize(10);
    doc.line(pageWidth - 80, sigY, pageWidth - 20, sigY);
    doc.text('Employee Acceptance', pageWidth - 80, sigY + 6);
    doc.setFontSize(8);
    doc.text('(Signature & Date)', pageWidth - 80, sigY + 11);

    // 7. Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This is an electronically generated document and does not require a physical stamp.', pageWidth / 2, 285, { align: 'center' });

    doc.save(`Salary_Structure_${form.candidateName || 'Employee'}.pdf`);
  };

  const handlePrimaryAction = () => {
    if (!canCommit) {
      alert(`MISMATCH! You still need to allocate ₹${remainingAmount.toLocaleString()} to match the scale.`);
      return;
    }

    // Database Persistence logic
    const saveId = form.empId || (location.state && location.state.empId) || `TEMP_${Date.now()}`;
    dataService.saveSalaryStructure(saveId, {
      ...form,
      annualCTC: Math.round((earnings.totalEarnings + payroll.erTotalStatutory) * 12),
      netPay: netPay,
      isBalanced: true
    });

    if (isEmbedded) { alert('Salary saved to Database!'); return; }
    if (isAppraisal) {
      alert(`Appraisal committed for ${form.candidateName}!`);
      navigate('/directory');
    } else {
      navigate('/directory', {
        state: {
          onboardCandidate: true,
          candidateName: form.candidateName,
          candidateMiddleName: form.candidateMiddleName,
          candidateLastName: form.candidateLastName,
          addressLine1: form.addressLine1,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          roleApplied: form.roleApplied,
          empCategory: empCategory || 'Staff Employee',
          hasPF: form.hasPF,
          hasESIC: form.hasESIC,
          salaryData: form
        }
      });
    }
  };

  const isContractual = empCategory === 'Contractual Worker';
  const annualCTC = Math.round((earnings.totalEarnings + payroll.erTotalStatutory) * 12);

  return (
    <div className={isEmbedded ? '' : 'page-container print-friendly-container'} style={isEmbedded ? { padding: '1rem 0' } : {}}>

      {!isEmbedded && (
        <div className="page-header hide-on-print" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">{isAppraisal ? 'Execute Salary Appraisal' : 'Candidate Package Setup'}</h1>
            <p className="page-subtitle">{isAppraisal ? 'Restructure existing compensation.' : 'Define compensation prior to offer.'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handleDownloadPDF}>
              <Download size={18} style={{ marginRight: '0.5rem' }} /> Download PDF
            </button>
            <button className="btn btn-outline" onClick={() => window.print()}>
              <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePrimaryAction}
              disabled={!canCommit}
              style={{
                backgroundColor: !canCommit ? 'var(--color-text-muted)' : (isAppraisal ? 'var(--color-primary)' : 'var(--color-success)'),
                cursor: !canCommit ? 'not-allowed' : 'pointer',
                opacity: !canCommit ? 0.6 : 1
              }}
            >
              {isAppraisal
                ? <TrendingUp size={18} style={{ marginRight: '0.5rem' }} />
                : <CheckCircle size={18} style={{ marginRight: '0.5rem' }} />}
              {isAppraisal ? 'Commit Appraisal' : 'Accept & Shift to Onboarding'}
            </button>
          </div>
        </div>
      )}

      {isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem' }} className="hide-on-print">
          <button className="btn btn-outline" onClick={handleDownloadPDF} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Download size={16} style={{ marginRight: '0.5rem' }} /> Download PDF Structure
          </button>
          <button className="btn btn-outline" onClick={() => window.print()} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <Printer size={16} style={{ marginRight: '0.5rem' }} /> Print Structure
          </button>
        </div>
      )}

      <div className="card printable-area">

        {/* ── Title ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isContractual ? 'Contractual Rate Card' : (isAppraisal ? 'Appraisal Salary Structure' : 'Salary Structure')}
          </h2>
          {empCategory && (
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.875rem' }}>{empCategory}</span>
              {empCategory === 'Staff Employee' && <span className="badge badge-danger" style={{ fontSize: '0.875rem' }}>No Overtime Eligible</span>}
              {isContractual && <span className="badge badge-warning" style={{ fontSize: '0.875rem' }}>Per Day Basis · No Paid Leaves</span>}
            </div>
          )}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Confidential & Proprietary</p>
        </div>

        {/* ── Common employee details ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group hide-on-print-border">
            <label className="form-label">{isAppraisal ? 'First Name' : 'Candidate First Name'}</label>
            <input type="text" className="form-input"
              style={{ width: '100%', fontSize: '1rem' }}
              placeholder="e.g. Ramesh"
              value={form.candidateName}
              onChange={(e) => handleInput('candidateName', e.target.value)}
              disabled={isAppraisal || isEmbedded} />
          </div>
          <div className="form-group hide-on-print-border">
            <label className="form-label">Middle Name</label>
            <input type="text" className="form-input"
              style={{ width: '100%', fontSize: '1rem' }}
              placeholder="Optional"
              value={form.candidateMiddleName}
              onChange={(e) => handleInput('candidateMiddleName', e.target.value)}
              disabled={isAppraisal || isEmbedded} />
          </div>
          <div className="form-group hide-on-print-border">
            <label className="form-label">Last Name</label>
            <input type="text" className="form-input"
              style={{ width: '100%', fontSize: '1rem' }}
              placeholder="e.g. Kumar"
              value={form.candidateLastName}
              onChange={(e) => handleInput('candidateLastName', e.target.value)}
              disabled={isAppraisal || isEmbedded} />
          </div>

          <div className="form-group hide-on-print-border">
            <label className="form-label">{isAppraisal ? 'Current Role' : 'Role / Designation'}</label>
            <input type="text" className="form-input"
              style={{ width: '100%', fontSize: '1rem' }}
              placeholder="e.g. Helper / Engineer"
              value={form.roleApplied}
              onChange={(e) => handleInput('roleApplied', e.target.value)}
              disabled={isAppraisal || isEmbedded} />
          </div>
          <div className="form-group hide-on-print-border">
            <label className="form-label">Date Prepared</label>
            <input type="date" className="form-input"
              style={{ width: '100%', fontSize: '1rem' }}
              value={form.datePrepared}
              onChange={(e) => handleInput('datePrepared', e.target.value)} />
          </div>
        </div>

        {/* Address Capture Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Current Address Line 1</label>
            <input type="text" className="form-input" style={{ width: '100%' }} value={form.addressLine1} onChange={e => handleInput('addressLine1', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input type="text" className="form-input" style={{ width: '100%' }} value={form.city} onChange={e => handleInput('city', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input type="text" className="form-input" style={{ width: '100%' }} value={form.state} onChange={e => handleInput('state', e.target.value)} />
          </div>
          <div className="form-group hide-on-print-border">
            <label className="form-label">ZIP Code</label>
            <input type="text" className="form-input" style={{ width: '100%' }} value={form.zipCode} onChange={e => handleInput('zipCode', e.target.value)} />
          </div>
          <div className="form-group hide-on-print-border">
            <label className="form-label">Employment Status</label>
            <input type="text" className="form-input" style={{ width: '100%', fontWeight: '600', color: 'var(--color-primary)' }} value={form.empType || 'Probation'} disabled />
          </div>
        </div>

        {isContractual && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid var(--color-warning)', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontWeight: '600', color: 'var(--color-warning)' }}>Contractual / Off-Role — Rate Configuration Only</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Only the Per Day Rate is configured here. Days Present, Overtime hours, and monthly payout calculations are managed in the <strong>Payroll</strong> module each month.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-primary)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center' }}>
              <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.1rem', display: 'block', marginBottom: '1rem' }}>
                💰 Agreed Per Day Rate (₹)
              </label>
              <input
                type="number" min="0"
                className="form-input"
                value={form.dayRate}
                onChange={(e) => handleInput('dayRate', e.target.value)}
                style={{ width: '100%', maxWidth: '300px', fontSize: '2.5rem', fontWeight: '800', padding: '1rem', backgroundColor: 'var(--color-background)', textAlign: 'center', borderColor: 'var(--color-primary)' }}
                placeholder="e.g. 1200"
              />
              {Number(form.dayRate) > 0 && (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ backgroundColor: 'var(--color-background)', borderRadius: '8px', padding: '0.75rem 1.5rem', border: '1px solid var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Est. Monthly (26 days)</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: '700', fontSize: '1.25rem', color: 'var(--color-success)' }}>₹ {(Number(form.dayRate) * 26).toLocaleString()}</p>
                  </div>
                  <div style={{ backgroundColor: 'var(--color-background)', borderRadius: '8px', padding: '0.75rem 1.5rem', border: '1px solid var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Implied Hourly Rate (÷9.5 hrs shift)</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: '700', fontSize: '1.25rem', color: 'var(--color-primary)' }}>₹ {Math.round(Number(form.dayRate) / 9.5).toLocaleString()}</p>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                No paid leaves. Monthly payout = Days Present × Day Rate + OT (recorded in Payroll).
              </p>
            </div>

          </div>
        )}

        {!isContractual && (
          <div>

            {/* Master Gross Input + Allocation Tracker */}
            <div className="hide-on-print-border" style={{ backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-primary)', marginBottom: '2rem' }}>
              <label className="form-label" style={{ fontSize: '1.1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                Target Payable Gross Salary (₹) — Master Input
              </label>
              <input type="number" className="form-input" min="0"
                value={form.targetSalary}
                onChange={(e) => handleInput('targetSalary', e.target.value)}
                style={{ width: '100%', fontSize: '1.5rem', padding: '1rem', fontWeight: 'bold', backgroundColor: 'var(--color-background)', marginBottom: '1.5rem' }}
                placeholder="e.g. 50000" />

              {/* REAL-TIME ALLOCATION PANEL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Payable Salary</p>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>₹ {targetGross.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Component Total</p>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: isBalanced ? 'var(--color-success)' : 'var(--color-text-main)' }}>₹ {earnings.totalEarnings.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Remaining to Allocate</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: isBalanced ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      ₹ {remainingAmount.toLocaleString()}
                    </p>
                    {isBalanced && <CheckCircle size={18} color="var(--color-success)" />}
                  </div>
                </div>
              </div>

              {!isBalanced && remainingAmount > 0 && (
                <div style={{ marginTop: '1rem', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={14} /> You still need to allocate ₹{remainingAmount.toLocaleString()} to match the payable salary.
                </div>
              )}
              {!isBalanced && remainingAmount < 0 && (
                <div style={{ marginTop: '1rem', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={14} /> Total components exceed payable salary. Please reduce values by ₹{Math.abs(remainingAmount).toLocaleString()}.
                </div>
              )}
            </div>

            {/* Ledgers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* EARNINGS */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', padding: '1rem', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--color-success)', fontSize: '1.1rem' }}>Earnings (Monthly)</h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Basic (50%) <Lock size={12} style={{ display: 'inline' }} /></span>
                    <span style={{ fontWeight: '600' }}>₹ {earnings.basic.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>DA (5% of Basic) <Lock size={12} style={{ display: 'inline' }} /></span>
                    <span style={{ fontWeight: '600' }}>₹ {earnings.da.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      HRA %
                      <input type="number" className="form-input hide-on-print-border"
                        style={{ width: '60px', padding: '0.1rem 0.25rem', textAlign: 'center' }}
                        value={form.hraPercent}
                        onChange={(e) => handleInput('hraPercent', e.target.value)}
                      />
                    </span>
                    <span style={{ fontWeight: '600' }}>₹ {earnings.hra.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Washing Allowance <Lock size={12} style={{ display: 'inline' }} /></span>
                    <span style={{ fontWeight: '600' }}>₹ {earnings.washingAllowance.toLocaleString()}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Conveyance & Fuel</span>
                      <input type="number" className="form-input hide-on-print-border" min="0"
                        value={form.salConveyance}
                        onChange={(e) => handleInput('salConveyance', e.target.value)}
                        style={{ width: '120px', padding: '0.25rem' }} placeholder="₹ 0" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Performance Incentive</span>
                      <input type="number" className="form-input hide-on-print-border" min="0"
                        value={form.salPerformance}
                        onChange={(e) => handleInput('salPerformance', e.target.value)}
                        style={{ width: '120px', padding: '0.25rem' }} placeholder="₹ 0" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Special Allowance</span>
                      <input type="number" className="form-input hide-on-print-border" min="0"
                        value={form.salSpecial}
                        onChange={(e) => handleInput('salSpecial', e.target.value)}
                        style={{ width: '120px', padding: '0.25rem' }} placeholder="₹ 0" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Other Allowance</span>
                      <input type="number" className="form-input hide-on-print-border" min="0"
                        value={form.salOther}
                        onChange={(e) => handleInput('salOther', e.target.value)}
                        style={{ width: '120px', padding: '0.25rem' }} placeholder="₹ 0" />
                    </div>
                  </div>
                  <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Total Gross</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isBalanced ? 'var(--color-success)' : 'var(--color-text-main)' }}>
                      ₹ {earnings.totalEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* DEDUCTIONS + EMPLOYER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '1rem', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-danger)', fontSize: '1.1rem' }}>Deductions (Monthly)</h3>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                      <input type="checkbox" checked={form.hasPF} onChange={(e) => handleInput('hasPF', e.target.checked)} style={{ width: '16px', height: '16px' }} /> Enforce PF
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', opacity: form.hasPF ? 1 : 0.5 }}>
                      <input type="checkbox" checked={form.pfCapped !== false} onChange={(e) => handleInput('pfCapped', e.target.checked)} disabled={!form.hasPF} style={{ width: '16px', height: '16px' }} /> Cap PF (₹15k Limit)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                      <input type="checkbox" checked={form.hasESIC} onChange={(e) => handleInput('hasESIC', e.target.checked)} style={{ width: '16px', height: '16px' }} /> Enforce ESIC
                    </label>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: form.hasPF ? 1 : 0.4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>PF (12%) <Lock size={12} style={{ display: 'inline' }} /></span>
                      <span style={{ fontWeight: '600' }}>₹ {deductions.pf.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: form.hasESIC ? 1 : 0.4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>ESIC (0.75%) <Lock size={12} style={{ display: 'inline' }} /></span>
                      <span style={{ fontWeight: '600' }}>₹ {deductions.esic.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Professional Tax <Lock size={12} style={{ display: 'inline' }} /></span>
                      <span style={{ fontWeight: '600' }}>₹ {deductions.pt.toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Total Deductions</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>₹ {deductions.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'rgba(37,99,235,0.1)', padding: '1rem', borderBottom: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.1rem' }}>Employer Statutory Contributions</h3>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: form.hasPF ? 1 : 0.4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Employer PF (13%) <Lock size={12} style={{ display: 'inline' }} /></span>
                      <span style={{ fontWeight: '600' }}>₹ {(payroll.pfReport.erPension + payroll.pfReport.erEPF + payroll.pfReport.edli + payroll.pfReport.admin).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', opacity: form.hasESIC ? 1 : 0.4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Employer ESIC (3.25%) <Lock size={12} style={{ display: 'inline' }} /></span>
                      <span style={{ fontWeight: '600' }}>₹ {payroll.esicReport.erShare.toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Total ER Contribution</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>₹ {payroll.erTotalStatutory.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Net Take-Home footer */}
            <div style={{ marginTop: '2rem', backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                  ₹ {netPay.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>/ month</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final Net Take-Home Salary</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', fontStyle: 'italic', fontWeight: '600' }}>({numberToWords(netPay)})</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>
                  ₹ {annualCTC.toLocaleString()}
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Annual CTC</p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>(Includes Base + Employer statutory shares)</p>
              </div>
            </div>

            {/* Signature block */}
            <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', opacity: 0.5 }}>
              <div>
                <div style={{ width: '200px', borderBottom: '1px solid var(--color-text-main)', marginBottom: '0.5rem', height: '40px' }}></div>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>Authorized HR Signature</p>
              </div>
              <div>
                <div style={{ width: '200px', borderBottom: '1px solid var(--color-text-main)', marginBottom: '0.5rem', height: '40px' }}></div>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>Candidate Acceptance Signature</p>
              </div>
            </div>

          </div>
        )}


      </div>
    </div>
  );
};

export default SalaryStructure;

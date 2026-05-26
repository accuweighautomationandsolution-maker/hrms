/**
 * Utility functions for calculating Indian Payroll compliances (PF, ESIC, PT, TDS).
 * Assumptions made for this MVP:
 * - PF is calculated strictly on Basic Salary.
 * - PF computation is capped at INR 15,000 mapping by default (configurable).
 * - ESIC applies if Gross Salary <= 21,000 INR.
 * - PT uses standard Maharashtra slab (200/month, we'll ignore the 300 Feb bump for simplicity here).
 */

// Constants Based on Indian Law
const PF_PERCENTAGE = 0.12;
const PF_CAP_AMOUNT = 15000;
const ER_PENSION_PERCENTAGE = 0.0833;
const ER_EPF_DIFF_PERCENTAGE = 0.0367;
const EDLI_PERCENTAGE = 0.005;
const ADMIN_PERCENTAGE = 0.005; 
const ESIC_PERCENTAGE_EMPLOYEE = 0.0075;
const ESIC_PERCENTAGE_EMPLOYER = 0.0325;
const ESIC_GROSS_LIMIT = 21000;
const PT_AMOUNT_MH = 200;

export const getOnRollWorkerPayableDays = (year, month) => {
  let sunCount = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0) { // 0 = Sunday
      sunCount++;
    }
  }
  return daysInMonth - sunCount;
};

export const calculateAttendanceStats = (empId, year, month, recordsMap, holidayList, category, leaveRequests = []) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidays = getHolidayDates(year, month, holidayList);
  const holidaySet = new Set(holidays.map(h => h.day));
  
  const cat = (category || '').toLowerCase().trim();
  const isOnRollWorker = cat === 'on role worker' || cat === 'on-roll worker';
  const isContractualWorker = cat === 'contractual worker';

  let absentDays = 0;
  let presentDays = 0;
  let holidayWorkedDays = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find approved leaves for this month
  const approvedLeaves = new Set();
  (leaveRequests || []).forEach(lr => {
    if (String(lr.empId) === String(empId) && lr.status === 'Approved') {
      const isLWP = (lr.type || '').toLowerCase().includes('lwp') || (lr.type || '').toLowerCase().includes('unpaid');
      if (!isLWP && lr.startDate && lr.endDate) {
        let current = new Date(lr.startDate);
        const end = new Date(lr.endDate);
        while (current <= end) {
          if (current.getFullYear() === year && current.getMonth() === month) {
            approvedLeaves.add(current.getDate());
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dow = dateObj.getDay();
    const isFuture = dateObj > today;
    
    const key = `${empId}_${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rec = recordsMap[key];
    const punchedIn = !!(rec && rec.punchIn);

    if (punchedIn) presentDays++;

    let isHolidayForEmp = false;

    if (isOnRollWorker || isContractualWorker) {
      // Sundays are excluded, Odd Saturdays are holidays
      if (dow !== 0 && holidaySet.has(d)) {
        isHolidayForEmp = true;
      }
    } else {
      if (holidaySet.has(d)) {
        isHolidayForEmp = true;
      }
    }

    if (punchedIn && isHolidayForEmp) {
      holidayWorkedDays++;
    }

    if (!isFuture && !punchedIn) {
      if (isOnRollWorker || isContractualWorker) {
        if (!isHolidayForEmp && dow !== 0) {
          if (!approvedLeaves.has(d)) {
            absentDays++;
          }
        }
      } else {
        if (!isHolidayForEmp) {
          if (!approvedLeaves.has(d)) {
            absentDays++;
          }
        }
      }
    }
  }

  let divisor = daysInMonth;
  if (isOnRollWorker || isContractualWorker) {
    divisor = getOnRollWorkerPayableDays(year, month);
  }

  const payableDays = Math.max(0, divisor - absentDays);
  
  // Basic calculation for holiday OT Amount (Assume 8 hours standard or something similar, or just gross/divisor * holidayWorkedDays)
  // We don't compute the exact amount here since it depends on gross. But we can return the count.
  return {
    presentDays,
    absentDays,
    holidayWorkedDays,
    payableDays,
    divisor
  };
};

export const calculateSalaryComponents = (targetGrossInput, pfCapped = true, advanceDeduction = 0, category = 'Staff Employee', daysWorked = 30, daysInMonth = 30, options = {}) => {
  const baseGross = Number(targetGrossInput) || 0;

  // Resolve year and month
  const yr = options.year !== undefined ? Number(options.year) : new Date().getFullYear();
  const mth = options.month !== undefined ? Number(options.month) : new Date().getMonth();

  // Automatically detect actual calendar days in the selected month
  const actualDaysInMonth = new Date(yr, mth + 1, 0).getDate();

  const cat = (category || '').toLowerCase().trim();
  const isOnRollWorker = cat === 'on role worker' || cat === 'on-roll worker';
  const isContractualWorker = cat === 'contractual worker';

  // For on-roll workers, the payable days divisor differs from calendar days
  let divisor = actualDaysInMonth;
  if (isOnRollWorker) {
    divisor = getOnRollWorkerPayableDays(yr, mth);
  }

  // Flags from options
  const hasPF = options.hasPF !== undefined ? options.hasPF : true;
  const hasESIC = options.hasESIC !== undefined ? options.hasESIC : false;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Calculate ALL components on the FULL gross salary
  //         Basic = exactly 50% of gross, DA = 5% of Basic, etc.
  //         These are the FULL MONTH values (displayed on payslip header).
  // ─────────────────────────────────────────────────────────────────────────
  let basic, da, hra, washingAllowance, conveyance, performance, otherManual, specialManual;
  let fullMonthGross = baseGross;

  if (isContractualWorker) {
    // Contractual worker: baseGross is a daily rate; total = dayRate × daysWorked
    basic           = 0; // Contractual don't have component breakdown
    da              = 0;
    hra             = 0;
    washingAllowance= 0;
    conveyance      = 0;
    performance     = 0;
    otherManual     = 0;
    specialManual   = 0;
    fullMonthGross  = baseGross * daysWorked;
  } else {
    // Staff / On-Roll: all components based on FULL gross salary
    basic           = Math.round(baseGross * 0.50);
    da              = Math.round(basic * 0.05);
    const hraPercentVal = (options.hraPercent !== undefined) ? (Number(options.hraPercent) / 100) : 0.40;
    hra             = Math.round((basic + da) * hraPercentVal);
    washingAllowance= 1000; // Full month washing allowance
    conveyance      = Number(options.salConveyance) || 0;
    performance     = Number(options.salPerformance) || 0;
    otherManual     = Number(options.salOther) || 0;
    specialManual   = Number(options.salSpecial) || 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Calculate Loss of Pay (LOP) for absent days
  //         LOP = (grossSalary / totalDays) × absentDays
  //         This is shown as a deduction, keeping component values intact.
  // ─────────────────────────────────────────────────────────────────────────
  const absentDays = Math.max(0, divisor - (Number(daysWorked) || 0));
  const lopDeduction = isContractualWorker ? 0 : Math.round((baseGross / divisor) * absentDays);

  // 3. OT Pay
  const otAmount = Number(options.otAmount) || 0;

  // Total Earnings = sum of all components (full month) + OT
  const componentTotal = basic + da + hra + washingAllowance + conveyance + performance + otherManual + specialManual;
  const totalEarnings = componentTotal + otAmount;

  // Effective pay after LOP (for net pay calculation and PF/ESIC base)
  const effectivePay = Math.max(0, totalEarnings - lopDeduction);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Statutory Deductions — computed on FULL component values
  //         (PF, ESIC must be on full Basic+DA, not pro-rated amounts)
  // ─────────────────────────────────────────────────────────────────────────
  let pfEligibleAmount = basic + da;
  if (pfCapped && pfEligibleAmount > PF_CAP_AMOUNT) {
    pfEligibleAmount = PF_CAP_AMOUNT;
  }

  // PF Deduction (Zero if disabled)
  const pfDeduction = hasPF ? Math.max(0, Math.round(pfEligibleAmount * PF_PERCENTAGE)) : 0;

  // ESIC Calculation
  // Base: Basic + DA + HRA + Washing Allowance + Special Allowance + Performance Allowance + Other Allowance + OT
  // NOTE: Conveyance & Fuel is EXCLUDED from ESIC wages (not a part of ESIC gross).
  const esicWages = basic + da + hra + washingAllowance + specialManual + performance + otherManual + otAmount;

  let esicDeduction = 0;
  let esicEmployerContribution = 0;
  if (hasESIC) {
    esicDeduction = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYEE));
    esicEmployerContribution = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYER));
  }

  // PT: ₹300 for February (month = 1), ₹200 for normal months (if Gross > ₹10,000)
  let ptDeduction = 0;
  if (effectivePay > 10000) {
    ptDeduction = (mth === 1) ? 300 : 200;
  }

  let tdsDeduction = 0;
  const annualGross = effectivePay * 12;
  if (annualGross > 700000) {
    tdsDeduction = Math.max(0, Math.round(((annualGross - 700000) * 0.10) / 12));
  }

  const totalDeduction = pfDeduction + esicDeduction + ptDeduction + tdsDeduction + lopDeduction + advanceDeduction;
  const finalNetPay = Math.max(0, totalEarnings - totalDeduction);

  // 4. Employer Shares
  const totalPFStatutory = hasPF ? Math.max(0, Math.round(pfEligibleAmount * 0.13)) : 0;
  const erPension = hasPF ? Math.max(0, Math.round(pfEligibleAmount * ER_PENSION_PERCENTAGE)) : 0;
  const edli = hasPF ? Math.max(0, Math.round(pfEligibleAmount * EDLI_PERCENTAGE)) : 0;
  const admin = hasPF ? Math.max(0, Math.round(pfEligibleAmount * ADMIN_PERCENTAGE)) : 0;
  const erEPF = hasPF ? Math.max(0, totalPFStatutory - erPension - edli - admin) : 0;

  const totalErStatutory = totalPFStatutory + esicEmployerContribution;

  return {
    earnings: {
      basic,
      da,
      hra,
      washingAllowance,
      specialAllowance: specialManual,
      conveyance,
      performance,
      otherManual,
      otAmount,
      gross: totalEarnings,
      totalEarnings,
    },
    deductions: {
      pf: pfDeduction,
      esic: esicDeduction,
      pt: ptDeduction,
      tds: tdsDeduction,
      lop: lopDeduction,       // Loss of Pay for absent days
      advance: advanceDeduction,
      total: totalDeduction
    },
    pfReport: {
      epfWages: hasPF ? pfEligibleAmount : 0,
      epsWages: hasPF ? pfEligibleAmount : 0,
      edliWages: hasPF ? pfEligibleAmount : 0,
      eeShare: pfDeduction,
      erPension,
      erEPF,
      edli,
      admin
    },
    esicReport: {
      grossWages: Math.round(esicWages),
      eeShare: esicDeduction,
      erShare: esicEmployerContribution,
      total: esicDeduction + esicEmployerContribution
    },
    erTotalStatutory: totalErStatutory,
    netPay: finalNetPay,
    remainingAmount: 0,
    isBalanced: true,
    divisor,
    absentDays,
    lopDeduction
  };
};

export const formatCurrency = (amount) => {
  const safeAmount = amount || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(safeAmount);
};

/**
 * Returns all official holiday dates for a given month, including Weekly Offs and Custom Ranges.
 * @param {number} year  - e.g. 2026
 * @param {number} month - 0-indexed (0 = January)
 * @param {Array} customs - Optional array of custom holidays from dataService
 * @returns {Array<{ day: number, date: string, type: string, name?: string }>}
 */
export const getHolidayDates = (year, month, customs = []) => {
  const holidays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let satCount = 0;

  // 1. Calculate Weekly Offs
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay(); // 0=Sun, 6=Sat
    const dateStr = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;

    if (dow === 0) {
      holidays.push({ day: d, date: dateStr, type: 'Sunday', name: 'Weekly Off' });
    } else if (dow === 6) {
      satCount++;
      if (satCount % 2 !== 0) {
        const labels = ['1st', '2nd', '3rd', '4th', '5th'];
        holidays.push({ day: d, date: dateStr, type: `${labels[satCount-1]} Saturday`, name: 'Weekly Off' });
      }
    }
  }

  // 2. Add Custom Holidays (Flatten Ranges)
  (customs || []).forEach(c => {
    if (!c.fromDate || !c.toDate) return;
    
    // Robust local date parsing to avoid UTC timezone shifts
    const parseLocalDate = (dateStr) => {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length !== 3) return new Date(dateStr);
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    };

    const start = parseLocalDate(c.fromDate);
    let end = parseLocalDate(c.toDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
    // Fallback: If to_date is mistakenly before from_date, treat it as a single-day holiday
    if (end < start) {
      end = new Date(start);
    }
    
    // Check if the range overlaps with the requested month
    const currentDate = new Date(start);
    // Limit loop to prevent potential infinite runs if dates are extremely far apart
    let iterations = 0;
    while (currentDate <= end && iterations < 366) {
      iterations++;
      if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
        const day = currentDate.getDate();
        // Avoid duplicates if a custom holiday falls on a Sunday/Saturday
        if (!holidays.some(h => h.day === day)) {
          holidays.push({ 
            day, 
            date: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`, 
            type: c.type || 'Holiday', 
            name: c.name || 'Custom Holiday'
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return holidays;
};

/**
 * Converts a number into Indian English words.
 * @param {number} num 
 * @returns {string}
 */
export const numberToWords = (num) => {
  if (num === 0) return 'Zero Only';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if (n < 20) return a[n];
    const unit = n % 10;
    return b[Math.floor(n / 10)] + (unit !== 0 ? ' ' + a[unit] : '');
  };

  const convert = (n) => {
    if (n === 0) return '';
    let res = '';
    
    // Crores
    if (n >= 10000000) {
      res += convert(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    
    // Lakhs
    if (n >= 100000) {
      res += convert(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    
    // Thousands
    if (n >= 1000) {
      res += convert(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    
    // Hundreds
    if (n >= 100) {
      res += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    
    // Tens and Units
    if (n > 0) {
      if (res !== '') res += 'and ';
      res += inWords(n);
    }
    
    return res;
  };

  const result = convert(Math.floor(num));
  return (result.trim() + ' Only').replace(/\s+/g, ' ');
};

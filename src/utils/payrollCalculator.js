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
  // month is 0-indexed: 0 = Jan, 1 = Feb, etc.
  if (month === 1) { // February
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 25 : 24;
  }
  
  // Count Saturdays in the month
  let satCount = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 6) { // 6 = Saturday
      satCount++;
    }
  }
  
  return satCount === 5 ? 27 : 26;
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

  let divisor = actualDaysInMonth;
  let effectiveGross = baseGross;

  if (isContractualWorker) {
    // Contractual worker payout is calculated as dayRate * daysWorked, so baseGross is dayRate
    effectiveGross = baseGross * daysWorked;
  } else if (isOnRollWorker) {
    divisor = getOnRollWorkerPayableDays(yr, mth);
    effectiveGross = (baseGross / divisor) * daysWorked;
  } else {
    // Staff employee
    divisor = actualDaysInMonth;
    effectiveGross = (baseGross / divisor) * daysWorked;
  }

  // Flags from options
  const hasPF = options.hasPF !== undefined ? options.hasPF : true;
  const hasESIC = options.hasESIC !== undefined ? options.hasESIC : false;

  // 1. Calculate Statutory Fixed Components (Percentages of Gross)
  const basic = Math.max(0, Math.round(effectiveGross * 0.50));
  const da = Math.max(0, Math.round(basic * 0.05));
  const hraPercentVal = (options.hraPercent !== undefined) ? (Number(options.hraPercent) / 100) : 0.40;
  const hra = Math.max(0, Math.round((basic + da) * hraPercentVal)); 
  
  // 2. Sum up Manual Allowances
  const conveyance = Number(options.salConveyance) || 0;
  const performance = Number(options.salPerformance) || 0;
  const otherManual = Number(options.salOther) || 0;
  const specialManual = Number(options.salSpecial) || 0;
  
  // 3. Washing Allowance (1000 Max, Pro-rated by divisor and attendance)
  const washingAllowance = Math.round((1000 / divisor) * daysWorked);

  // 4. Calculate Component Total and Remaining Balance
  // componentTotal = sum of all earnings defined (excluding variable OT for structure balance)
  const componentTotal = basic + da + hra + washingAllowance + conveyance + performance + otherManual + specialManual;
  const remainingAmount = effectiveGross - componentTotal;
  
  // 5. Overtime (OT) Pay
  const otAmount = Number(options.otAmount) || 0;
  const totalEarnings = componentTotal + otAmount;

  // 6. Deductions
  let pfEligibleAmount = basic + da;
  if (pfCapped && pfEligibleAmount > PF_CAP_AMOUNT) {
    pfEligibleAmount = PF_CAP_AMOUNT;
  }
  
  // PF Deduction (Zero if disabled)
  const pfDeduction = hasPF ? Math.max(0, Math.round(pfEligibleAmount * PF_PERCENTAGE)) : 0;

  // ESIC Calculation
  // If ESIC is enabled, it should be calculated on the following total:
  // Basic + DA + HRA + Washing Allowance + Performance Allowance + Other Allowance + OT
  const esicWages = basic + da + hra + washingAllowance + performance + otherManual + otAmount;
  
  let esicDeduction = 0;
  let esicEmployerContribution = 0;
  if (hasESIC) {
    esicDeduction = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYEE));
    esicEmployerContribution = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYER));
  }

  // PT: ₹300 for February (month = 1), ₹200 for normal months (if Gross > ₹10,000)
  let ptDeduction = 0;
  if (totalEarnings > 10000) {
    ptDeduction = (mth === 1) ? 300 : 200;
  }

  let tdsDeduction = 0;
  const annualGross = totalEarnings * 12;
  if (annualGross > 700000) {
    tdsDeduction = Math.max(0, Math.round(((annualGross - 700000) * 0.10) / 12));
  }

  const totalDeduction = pfDeduction + esicDeduction + ptDeduction + tdsDeduction + advanceDeduction;
  const finalNetPay = Math.max(0, totalEarnings - totalDeduction);

  // 7. Employer Shares
  // Employer shares are also zero if PF is disabled.
  // EPF is the remaining difference of statutory 13% total to guarantee exact 13% sum.
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
    remainingAmount: Math.round(remainingAmount),
    isBalanced: Math.abs(remainingAmount) < 1,
    divisor
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

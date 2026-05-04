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

export const calculateSalaryComponents = (targetGrossInput, pfCapped = true, advanceDeduction = 0, category = 'Staff Employee', daysWorked = 30, daysInMonth = 30, manualAllowances = {}) => {
  const baseGross = Number(targetGrossInput) || 0;
  let effectiveGross = baseGross;

  // 0. Category-Based Gross Calculation proration
  if (category === 'Contractual Worker') {
    effectiveGross = baseGross * daysWorked;
  } else if (category === 'On role worker') {
    const workingDaysDivisor = daysInMonth > 28 ? (daysInMonth - 4) : 24;
    effectiveGross = (baseGross / workingDaysDivisor) * daysWorked;
  } else {
    effectiveGross = (baseGross / daysInMonth) * daysWorked;
  }

  // 1. Calculate Statutory Fixed Components (Percentages of Gross)
  const basic = Math.max(0, Math.round(effectiveGross * 0.50));
  const da = Math.max(0, Math.round(basic * 0.05));
  const hraPercentVal = (manualAllowances.hraPercent !== undefined) ? (Number(manualAllowances.hraPercent) / 100) : 0.40;
  const hra = Math.max(0, Math.round((basic + da) * hraPercentVal)); 
  
  // 2. Sum up Manual Allowances
  const conveyance = Number(manualAllowances.salConveyance) || 0;
  const performance = Number(manualAllowances.salPerformance) || 0;
  const otherManual = Number(manualAllowances.salOther) || 0;
  const specialManual = Number(manualAllowances.salSpecial) || 0;
  
  // 3. Washing Allowance (1000 Fixed if gross > 15000, simplified)
  const washingAllowance = effectiveGross > 15000 ? 1000 : 0;

  // 4. Calculate Component Total and Remaining Balance
  // componentTotal = sum of all earnings defined
  const componentTotal = basic + da + hra + washingAllowance + conveyance + performance + otherManual + specialManual;
  const remainingAmount = effectiveGross - componentTotal;
  
  // 5. Deductions
  let pfEligibleAmount = basic + da;
  if (pfCapped && pfEligibleAmount > PF_CAP_AMOUNT) {
    pfEligibleAmount = PF_CAP_AMOUNT;
  }
  const pfDeduction = Math.max(0, Math.round(pfEligibleAmount * PF_PERCENTAGE));

  let esicDeduction = 0;
  let esicEmployerContribution = 0;
  if (componentTotal <= ESIC_GROSS_LIMIT) {
    esicDeduction = Math.max(0, Math.ceil(componentTotal * ESIC_PERCENTAGE_EMPLOYEE));
    esicEmployerContribution = Math.max(0, Math.ceil(componentTotal * ESIC_PERCENTAGE_EMPLOYER));
  }

  const ptDeduction = componentTotal > 10000 ? PT_AMOUNT_MH : 0; 

  let tdsDeduction = 0;
  const annualGross = componentTotal * 12;
  if (annualGross > 700000) {
    tdsDeduction = Math.max(0, Math.round(((annualGross - 700000) * 0.10) / 12));
  }

  const totalDeduction = pfDeduction + esicDeduction + ptDeduction + tdsDeduction + advanceDeduction;
  const finalNetPay = Math.max(0, componentTotal - totalDeduction);

  // 6. Employer Shares
  const erPension = Math.max(0, Math.round(pfEligibleAmount * ER_PENSION_PERCENTAGE));
  // Ensure the sum of erEPF and erPension exactly equals 12% of pfEligibleAmount
  const erEPF = Math.max(0, Math.round(pfEligibleAmount * PF_PERCENTAGE) - erPension);
  const edli = Math.max(0, Math.round(pfEligibleAmount * EDLI_PERCENTAGE));
  const admin = Math.max(0, Math.round(pfEligibleAmount * ADMIN_PERCENTAGE));
  
  // Consistency check: Ensure total ER statutory for PF is exactly 13% (EPF + Pension + EDLI + Admin)
  // 12% (PF) + 0.5% (EDLI) + 0.5% (Admin) = 13%
  const totalPFStatutory = erPension + erEPF + edli + admin; 
  // For exactly 15000, 13% is 1950. 
  // We'll use floor for the individual components if needed to keep the sum correct, but usually 
  // simple round works if the percentages are precise.
  
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
      gross: componentTotal,
      totalEarnings: componentTotal,
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
      epfWages: pfEligibleAmount,
      epsWages: pfEligibleAmount, 
      edliWages: pfEligibleAmount,
      eeShare: pfDeduction,
      erPension,
      erEPF,
      edli,
      admin
    },
    esicReport: {
      grossWages: Math.round(componentTotal),
      eeShare: esicDeduction,
      erShare: esicEmployerContribution,
      total: esicDeduction + esicEmployerContribution
    },
    erTotalStatutory: totalErStatutory,
    netPay: finalNetPay,
    remainingAmount: Math.round(remainingAmount),
    isBalanced: Math.abs(remainingAmount) < 1
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
      if (satCount === 1) holidays.push({ day: d, date: dateStr, type: '1st Saturday', name: 'Weekly Off' });
      if (satCount === 3) holidays.push({ day: d, date: dateStr, type: '3rd Saturday', name: 'Weekly Off' });
    }
  }

  // 2. Add Custom Holidays (Flatten Ranges)
  (customs || []).forEach(c => {
    if (!c.fromDate || !c.toDate) return;
    const start = new Date(c.fromDate);
    const end = new Date(c.toDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
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

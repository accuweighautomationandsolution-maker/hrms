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

export const getOnRollWorkerPayableDays = (year, month, endDay) => {
  let satCount = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const limit = endDay || daysInMonth;
  for (let d = 1; d <= limit; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 6) { // 6 = Saturday
      satCount++;
    }
  }
  return limit - satCount;
};

export const calculateAttendanceStats = (empId, year, month, recordsMap, holidayList, category, leaveRequests = []) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const holidays = getHolidayDates(year, month, holidayList);
  const holidaySet = new Set(holidays.map(h => h.day));
  
  const cat = (category || '').toLowerCase().trim();
  const isOnRollWorker = cat === 'on role worker' || cat === 'on-roll worker';
  const isContractualWorker = cat === 'contractual worker';
  const isStaff = !isOnRollWorker && !isContractualWorker;

  let absentDays = 0;
  let presentDays = 0;
  let holidayWorkedDays = 0;
  let lateMarks = 0;
  let halfDays = 0;
  let compOffEarned = 0;
  let otHours = 0;
  let holidayOtHours = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Shift Timing Rules
  const toMins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const shiftStart = toMins('09:00');
  const shiftEnd = toMins('18:30');
  const lateGrace = 10;
  const lateLimit = shiftStart + lateGrace;
  const halfDayStartLimit = shiftStart + 120 + lateGrace;
  const halfDayEndLimit = shiftEnd - 120;

  // Find approved leaves
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
    const punchedIn = !!(rec && (rec.punchIn || rec.punchOut));
    
    let isHolidayForEmp = false;
    let isOddSaturday = false;

    if (isOnRollWorker || isContractualWorker) {
      if (dow === 6 || holidaySet.has(d)) {
        isHolidayForEmp = true;
      }
      const saturdayNumber = Math.ceil(d / 7);
      if (dow === 6 && (saturdayNumber === 1 || saturdayNumber === 3 || saturdayNumber === 5)) {
        isOddSaturday = true;
      }
    } else {
      if (holidaySet.has(d)) {
        isHolidayForEmp = true;
      }
    }

    if (punchedIn) {
      presentDays++;

      const inMins = toMins(rec.punchIn);
      const outMins = toMins(rec.punchOut);
      const duration = (outMins && inMins && outMins > inMins) ? (outMins - inMins) : null;
      let isHalfDayPunched = false;

      // Late mark & Half day evaluation for regular working days
      if (!isHolidayForEmp && inMins && outMins) {
        let isLateMark = false;

        // Check arriving late
        if (inMins > halfDayStartLimit) {
          isHalfDayPunched = true;
        } else if (inMins > lateLimit) {
          isLateMark = true;
        }

        // Check leaving early
        if (outMins < halfDayEndLimit) {
          isHalfDayPunched = true;
        } else if (outMins < shiftEnd) {
          isLateMark = true;
        }
        
        if (isHalfDayPunched) {
          halfDays++;
        } else if (isLateMark) {
          lateMarks++;
        }
      }

      // OT Calculation
      if (isHolidayForEmp && duration) {
        holidayWorkedDays++;
        
        if (isStaff) {
          compOffEarned++;
          holidayWorkedDays--; // Convert payout to comp off
        } else {
          // 30 mins deduction for holiday / odd saturday if worked > half day
          let payableMins = duration;
          if (duration >= 240) {
             payableMins = Math.max(0, duration - 30);
          }
          holidayOtHours += (payableMins / 60);
        }
      } else if (!isHolidayForEmp && duration && outMins > shiftEnd) {
        // Regular day OT
        let otDuration = outMins - shiftEnd;
        otHours += (otDuration / 60);
      }
    } else {
      // Not punched in
      if (!isFuture) {
        if (!isHolidayForEmp && !approvedLeaves.has(d)) {
          absentDays++;
        }
      }
    }
  }

  // 4th Late Mark -> Half Day logic
  const extraHalfDaysFromLates = Math.floor(lateMarks / 4);
  halfDays += extraHalfDaysFromLates;
  absentDays += (halfDays * 0.5);

  let divisor = daysInMonth;
  if (isOnRollWorker || isContractualWorker) {
    divisor = getOnRollWorkerPayableDays(year, month, daysInMonth);
  }

  const payableDays = Math.max(0, divisor - absentDays);
  
  return {
    presentDays,
    absentDays,
    holidayWorkedDays,
    payableDays,
    divisor,
    lateMarks,
    halfDays,
    compOffEarned,
    otHours,
    holidayOtHours
  };
};

export const calculateSalaryComponents = (targetGrossInput, pfCapped = true, advanceDeduction = 0, category = 'Staff Employee', daysWorked = 30, daysInMonth = 30, options = {}) => {
  const baseGross = Number(targetGrossInput) || 0;

  const yr = options.year !== undefined ? Number(options.year) : new Date().getFullYear();
  const mth = options.month !== undefined ? Number(options.month) : new Date().getMonth();
  const actualDaysInMonth = new Date(yr, mth + 1, 0).getDate();

  const cat = (category || '').toLowerCase().trim();
  const isOnRollWorker = cat === 'on role worker' || cat === 'on-roll worker';
  const isContractualWorker = cat === 'contractual worker';

  let divisor = actualDaysInMonth;
  if (isOnRollWorker) {
    divisor = getOnRollWorkerPayableDays(yr, mth, actualDaysInMonth);
  }

  const hasPF = options.hasPF !== undefined ? options.hasPF : true;
  const hasESIC = options.hasESIC !== undefined ? options.hasESIC : false;

  let basic, da, hra, washingAllowance, conveyance, performance, otherManual, specialManual;
  let fullMonthGross = baseGross;

  let prorationRatio = divisor > 0 ? (daysWorked / divisor) : 0;
  if (options.isPreview) prorationRatio = 1;

  if (isContractualWorker) {
    basic = 0; da = 0; hra = 0; washingAllowance = 0; conveyance = 0; performance = 0; otherManual = 0; specialManual = 0;
    if (options.rateType === 'hourly') {
      const hours = options.hoursWorked || (daysWorked * 9.3);
      fullMonthGross = baseGross * hours;
    } else {
      fullMonthGross = baseGross * daysWorked;
    }
  } else {
    const basicPct = options.formulaConfig?.basic_pct !== undefined ? options.formulaConfig.basic_pct : 0.50;
    const daPct = options.formulaConfig?.da_pct !== undefined ? options.formulaConfig.da_pct : 0.05;
    const hraPct = options.formulaConfig?.hra_pct !== undefined ? options.formulaConfig.hra_pct : ((options.hraPercent !== undefined) ? (Number(options.hraPercent) / 100) : 0.40);
    const washingFixed = options.formulaConfig?.washing_fixed !== undefined ? options.formulaConfig.washing_fixed : (options.salWashing !== undefined ? Number(options.salWashing) : 1000);

    const fullBasic           = baseGross * basicPct;
    const fullDA              = fullBasic * daPct;
    const fullHRA             = fullBasic * hraPct;
    const fullWashing         = washingFixed;
    const fullConveyance      = Number(options.salConveyance) || 0;
    const fullPerformance     = Number(options.salPerformance) || 0;
    const fullSpecial         = Number(options.salSpecial) || 0;

    const targetProGross = Math.round(baseGross * prorationRatio);

    basic           = Math.round(fullBasic * prorationRatio);
    da              = Math.round(fullDA * prorationRatio);
    hra             = Math.round(fullHRA * prorationRatio);
    washingAllowance= Math.round(fullWashing * prorationRatio);
    conveyance      = Math.round(fullConveyance * prorationRatio);
    performance     = Math.round(fullPerformance * prorationRatio);
    specialManual   = Math.round(fullSpecial * prorationRatio);
    
    // Balance remainder strictly in otherManual to achieve EXACT prorated gross
    const proSumWithoutOther = basic + da + hra + washingAllowance + conveyance + performance + specialManual;
    otherManual = targetProGross - proSumWithoutOther;
    if (otherManual < 0) {
      otherManual = 0;
    }
  }

  const absentDays = Math.max(0, divisor - (Number(daysWorked) || 0));
  const lopDeduction = 0;

  // Overtime and Holiday double pay logic
  // "OT should be calculated Gross / 26 / 9.3"
  // "If worked OT that also be doubled (on holiday)"
  let calculatedOtAmount = Number(options.otAmount) || 0; 
  if (options.otHours || options.holidayOtHours) {
    const otRatePerHour = (baseGross / 26) / 9.3;
    const normalOtPay = (options.otHours || 0) * otRatePerHour;
    const holidayOtPay = (options.holidayOtHours || 0) * (otRatePerHour * 2); // Doubled for holidays
    calculatedOtAmount += Math.round(normalOtPay + holidayOtPay);
  }
  
  // Double rate for Holiday Worked (if they worked full days on holidays, we add 1x extra, as 1x is in basic salary already)
  let holidayBonusPay = 0;
  if ((options.holidayWorkedDays || 0) > 0 && !isStaff) {
    const dailyRate = baseGross / divisor;
    holidayBonusPay = Math.round((options.holidayWorkedDays || 0) * dailyRate);
  }

  const componentTotal = basic + da + hra + washingAllowance + conveyance + performance + otherManual + specialManual;
  const totalEarnings = isContractualWorker ? (fullMonthGross + calculatedOtAmount + holidayBonusPay) : (componentTotal + calculatedOtAmount + holidayBonusPay);
  const effectivePay = totalEarnings;

  let pfEligibleAmount = basic + da;
  if (pfCapped && pfEligibleAmount > PF_CAP_AMOUNT) pfEligibleAmount = PF_CAP_AMOUNT;

  const pfDeduction = hasPF ? Math.max(0, Math.round(pfEligibleAmount * PF_PERCENTAGE)) : 0;
  const esicWages = basic + da + hra + washingAllowance + specialManual + performance + otherManual + calculatedOtAmount + holidayBonusPay;

  let esicDeduction = 0;
  let esicEmployerContribution = 0;
  if (hasESIC) {
    esicDeduction = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYEE));
    esicEmployerContribution = Math.max(0, Math.ceil(esicWages * ESIC_PERCENTAGE_EMPLOYER));
  }

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

  const totalPFStatutory = hasPF ? Math.max(0, Math.round(pfEligibleAmount * 0.13)) : 0;
  const erPension = hasPF ? Math.max(0, Math.round(pfEligibleAmount * ER_PENSION_PERCENTAGE)) : 0;
  const edli = hasPF ? Math.max(0, Math.round(pfEligibleAmount * EDLI_PERCENTAGE)) : 0;
  const admin = hasPF ? Math.max(0, Math.round(pfEligibleAmount * ADMIN_PERCENTAGE)) : 0;
  const erEPF = hasPF ? Math.max(0, totalPFStatutory - erPension - edli - admin) : 0;
  const totalErStatutory = totalPFStatutory + esicEmployerContribution;

  return {
    earnings: {
      basic, da, hra, washingAllowance, specialAllowance: specialManual,
      conveyance, performance, otherManual,
      otAmount: calculatedOtAmount,
      holidayBonusPay,
      gross: totalEarnings,
      totalEarnings,
    },
    deductions: {
      pf: pfDeduction, esic: esicDeduction, pt: ptDeduction, tds: tdsDeduction,
      advance: advanceDeduction, total: totalDeduction
    },
    pfReport: {
      epfWages: hasPF ? pfEligibleAmount : 0, epsWages: hasPF ? pfEligibleAmount : 0,
      edliWages: hasPF ? pfEligibleAmount : 0, eeShare: pfDeduction, erPension, erEPF, edli, admin
    },
    esicReport: {
      grossWages: Math.round(esicWages), eeShare: esicDeduction, erShare: esicEmployerContribution,
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

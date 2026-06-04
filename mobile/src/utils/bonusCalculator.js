/**
 * Statutory Bonus Calculator (Payment of Bonus Act, 1965)
 */

export const calculateMonthlyBonus = (emp, config) => {
    const { 
        salaryThreshold = 21000, 
        calculationCeiling = 7000, 
        minWageOverride = 8500, 
        bonusPercentage = 8.33 
    } = config;

    // 1. Threshold Check (Eligible only if Gross <= salaryThreshold)
    const gross = emp.grossSalary || 0;
    if (gross > salaryThreshold) {
        return { eligible: false, amount: 0, reason: `Salary threshold exceeded (${gross} > ${salaryThreshold})` };
    }

    // 2. Basis: Min (Actual Basic+DA, Statutory Ceiling or Min Wage)
    const basic = Math.round(gross * 0.50);
    const da = Math.round(basic * 0.05);
    const actualBasicDa = basic + da;
    
    // Legal rule: Ceiling is ₹7000 or Min Wage, whichever is HIGHER
    const legalCeiling = Math.max(calculationCeiling, minWageOverride);
    const basis = Math.min(actualBasicDa, legalCeiling);

    // 3. Calculation
    const amount = Math.round(basis * (bonusPercentage / 100));

    return {
        eligible: true,
        basis,
        amount,
        actualBasicDa,
        appliedCeiling: legalCeiling,
        percentage: bonusPercentage
    };
};

/**
 * Calculates prorated bonus for FnF
 * Usually from Start of FY (April 1st) to LWD
 */
export const calculateProratedBonus = (emp, startDate, endDate, config) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check eligibility: Worked >= 30 days in the target year?
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < config.eligibilityDays) {
        return { eligible: false, totalAmount: 0, daysWorked: diffDays, reason: `< ${config.eligibilityDays} days worked.` };
    }

    // Calculate monthly average
    const monthlyData = calculateMonthlyBonus(emp, config);
    if (!monthlyData.eligible) return monthlyData;

    // Calculate months inclusive
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const totalAmount = monthlyData.amount * months;

    return {
        ...monthlyData,
        totalAmount,
        monthsCalculated: months,
        daysWorked: diffDays,
        period: `${startDate} to ${endDate}`
    };
};

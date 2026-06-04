/**
 * Gratuity Calculation Engine
 * Formula: (Last Drawn Salary * 15 * Years of Service) / 26
 * Indian Law Rules:
 * - Eligible if tenure >= 5 or 4.8 years (configurable)
 * - Rounding: Service > 6 months = +1 year (standard rounding)
 */

export const parseDOJ = (dateStr) => {
    // Expected format: "10-Jan-2022"
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
    return new Date(parts[2], months[parts[1]] || 0, parts[0]);
};

export const calculateServiceTenure = (dojStr, lwdStr) => {
    const start = parseDOJ(dojStr);
    const end = new Date(lwdStr);
    
    let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) totalMonths--;

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    // Remaining days
    let days = end.getDate() - start.getDate();
    if (days < 0) {
        const lastDayOfPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        days += lastDayOfPrevMonth;
    }

    return { years, months, days, totalMonths };
};

export const checkGratuityEligibility = (emp, tenure, config) => {
    const { years, months, days } = tenure;
    
    // 1. Exception Case: Death/Disability (Manual override or status based usually - here we check if policy applies)
    if (config.applyToDeathDisability && (emp.exitType === 'Death' || emp.exitType === 'Disability')) {
        return { eligible: true, reason: "Exemption: Gratuity applicable due to Death/Disability (no tenure limit)." };
    }

    // 2. Contractual Case
    if (emp.empType === 'Contract' || emp.empType === 'Temporary') {
        if (!config.contractualEnabled) return { eligible: false, reason: "Contractual workers are not eligible by policy." };
        if (years >= config.contractualMinYears) return { eligible: true, reason: `Policy Match: Contractual eligibility met (> ${config.contractualMinYears} yr).` };
        return { eligible: false, reason: `Policy Gap: Contractual requires ${config.contractualMinYears} year service.` };
    }

    // 3. Permanent / Standard Case
    const totalDaysInFinalYear = (months * 30) + days;
    
    // 4.8 Year Rule (4 years + 240 days)
    if (config.enable48Rule) {
        if (years >= 5) return { eligible: true, reason: "Legal Compliance: Standard 5-year tenure completed." };
        if (years === 4 && totalDaysInFinalYear >= 240) return { eligible: true, reason: "Legal Exception: 4 years + 240 days tenure completed (Judicial Rule)." };
        return { eligible: false, reason: "Ineligible: Requires 4 years + 240 days service." };
    }

    // Strict 5 Year Rule
    if (years >= config.minYearsStandard) {
        return { eligible: true, reason: `Legal Compliance: ${config.minYearsStandard}-year tenure completed.` };
    }

    return { eligible: false, reason: `Ineligible: Requires minimum ${config.minYearsStandard} years service.` };
};

export const calculateGratuityAmount = (salary, tenure, config) => {
    // Indian Law Rounding: > 6 months = +1 Year
    let roundedYears = tenure.years;
    if (tenure.months >= 6) {
        roundedYears += 1;
    }

    // Formula: (Salary * 15 * Years) / 26
    const amount = Math.round((salary * 15 * roundedYears) / 26);
    
    return {
        amount,
        basisSalary: salary,
        yearsApplied: roundedYears,
        tenureRaw: `${tenure.years}y ${tenure.months}m ${tenure.days}d`
    };
};

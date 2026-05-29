import { calculateSalaryComponents } from './src/utils/payrollCalculator.js';

console.log("=== PREVIEW TEST FOR ON ROLE ===");
const targetGross = 27000;
const previewDaysInMonth = 26; // This is what SalaryStructure.jsx passes
const empCategory = 'On role worker';

// Simulating exact call from SalaryStructure.jsx
const payroll = calculateSalaryComponents(
  targetGross,
  true,
  0,
  empCategory,
  previewDaysInMonth, 
  previewDaysInMonth,
  {
    isPreview: true,
    year: 2026,
    month: 4 // May (31 days)
  }
);

console.log("Basic:", payroll.earnings.basic);
console.log("Total Gross:", payroll.earnings.totalEarnings);
console.log("Proration ratio used internally must be:", payroll.earnings.basic / (27000 * 0.5));

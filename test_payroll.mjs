import { calculateSalaryComponents, getOnRollWorkerPayableDays } from './src/utils/payrollCalculator.js';

console.log("=== STAFF: EXACT MONTH TEST ===");
const staffTest = calculateSalaryComponents(28000, true, 0, 'Staff Employee', 31, 31, {
  year: 2026, month: 0 // January (31 days)
});
console.log("Expected Net: Exact 28000? (Minus PF)");
console.log("Staff Earnings Total:", staffTest.earnings.totalEarnings);
console.log("Staff Net Pay:", staffTest.netPay);

console.log("\n=== ON-ROLE: 4 SATURDAYS TEST (JAN 2026) ===");
// Jan 2026 has 5 Saturdays! Wait, Jan 1 is Thursday. Saturdays: 3, 10, 17, 24, 31. So 5 Saturdays.
// Days = 31 - 5 = 26 divisor.
const onRoleTest = calculateSalaryComponents(20000, true, 0, 'on role worker', 26, 31, {
  year: 2026, month: 0 
});
console.log("Divisor:", onRoleTest.divisor); // Should be 26
console.log("Expected Earnings: 20000");
console.log("Actual Earnings:", onRoleTest.earnings.totalEarnings);

console.log("\n=== OT TEST (10 HOURS) ===");
const otTest = calculateSalaryComponents(20000, true, 0, 'on role worker', 26, 31, {
  year: 2026, month: 0, otHours: 10 
});
console.log("OT Amount (10 hrs):", otTest.earnings.otAmount);
const hourlyRate = (20000 / 26) / 9.3;
console.log("Expected OT:", Math.round(10 * hourlyRate));

console.log("\n=== HOLIDAY OT TEST (10 HOURS) ===");
const holOtTest = calculateSalaryComponents(20000, true, 0, 'on role worker', 26, 31, {
  year: 2026, month: 0, holidayOtHours: 10 
});
console.log("Holiday OT Amount (10 hrs):", holOtTest.earnings.otAmount);
console.log("Expected Holiday OT:", Math.round(10 * (hourlyRate * 2)));

console.log("\n=== CONTRACTUAL WORKER (HOURLY) ===");
const contractTest = calculateSalaryComponents(200, false, 0, 'contractual worker', 26, 31, {
  year: 2026, month: 0, rateType: 'hourly', hoursWorked: 100
});
console.log("Contractual Earnings Total:", contractTest.earnings.totalEarnings); // Should be 200 * 100 = 20000


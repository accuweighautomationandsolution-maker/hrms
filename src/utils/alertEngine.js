import { dataService } from './dataService';

export const alertEngine = {
  /**
   * Generates a list of smart alerts for the current user based on calendar and personal data
   */
  getDashboardAlerts: (user) => {
    if (!user) return [];
    const alerts = [];
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // 1. Advance/Loan Deduction Alert (7 days before salary on 25th)
    // Salary Date is typically 25th
    const salaryDay = 25;
    const daysUntilSalary = salaryDay - currentDay;
    
    // Check if user has active advances
    const advances = dataService.getPersonalAdvances(user.id);
    const hasUnpaidAdvance = advances.some(a => a.status === 'Approved' || a.status === 'Partially Paid');

    if (hasUnpaidAdvance && daysUntilSalary <= 7 && daysUntilSalary >= 0) {
      alerts.push({
        id: 'ALERT_SALARY_DEDUCTION',
        priority: 'High',
        title: 'Upcoming Salary Deduction',
        message: `Reminder: Your outstanding advance/loan will be deducted from your salary on the ${salaryDay}th.`,
        type: 'finance',
        daysLeft: daysUntilSalary
      });
    }

    // 2. Expense Submission Reminder (Day 6 onwards)
    // Threshold is configurable, using Day 6 as default
    const expenseTriggerDay = 6;
    if (currentDay >= expenseTriggerDay) {
        // Only show if user hasn't submitted expenses for this month yet
        const expenses = dataService.getPersonalExpenses(user.id);
        const thisMonthSubmitted = expenses.some(e => {
            const expDate = new Date(e.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

        if (!thisMonthSubmitted) {
            alerts.push({
                id: 'ALERT_EXPENSE_SUBMIT',
                priority: 'Medium',
                title: 'Pending Expense Submission',
                message: `Please submit your expenses for ${today.toLocaleString('default', { month: 'long' })}. Cycle trigger reached on Day ${expenseTriggerDay}.`,
                type: 'compliance'
            });
        }
    }

    // 3. Notice/Memo Unread Alert
    const notices = dataService.getPersonalNotices(user.id);
    const unreadNotices = notices.filter(n => {
        const acks = dataService.getAcknowledgments(); // Reusing policy acks for notices or specific ones
        const isAcked = acks.some(a => a.type === 'NOTICE' && a.itemId === n.id && a.empId === user.id);
        return n.priority === 'Critical' && !isAcked;
    });

    unreadNotices.forEach(n => {
        alerts.push({
            id: `ALERT_NOTICE_${n.id}`,
            priority: 'Critical',
            title: `Confidential Notice: ${n.title}`,
            message: 'A critical memo has been issued for you. Please review and acknowledge immediately.',
            type: 'memo',
            itemId: n.id
        });
    });

    return alerts.sort((a, b) => {
        const pMap = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return pMap[a.priority] - pMap[b.priority];
    });
  }
};

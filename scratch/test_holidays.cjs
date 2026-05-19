const getHolidayDates = (year, month, customs = []) => {
  const holidays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let satCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay(); 
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

  (customs || []).forEach(c => {
    if (!c.fromDate || !c.toDate) return;
    const start = new Date(c.fromDate);
    const end = new Date(c.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const currentDate = new Date(start);
    let iterations = 0;
    while (currentDate <= end && iterations < 366) {
      iterations++;
      if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
        const day = currentDate.getDate();
        if (!holidays.some(h => h.day === day)) {
          holidays.push({ day, date: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`, type: c.type || 'Holiday', name: c.name || 'Custom Holiday' });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });
  return holidays;
};

const customs = [
  { fromDate: '2026-05-01', toDate: '2026-05-01', type: 'State', name: 'Maharashtra Day' }
];

const holidays = getHolidayDates(2026, 4, customs);
console.log("Holidays for May 2026:");
holidays.forEach(h => console.log(h));

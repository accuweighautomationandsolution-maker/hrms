async function checkEmployeeLogs() {
  try {
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    const logs = data.logs;
    
    console.log('--- ALL Logs for Pooja (empId = "12") for May 18-19, 2026 ---');
    const poojaLogs = logs.filter(l => l.empId === '12' && l.month === 5 && (l.day === 18 || l.day === 19));
    console.log(poojaLogs);

    console.log('--- ALL Logs for Milind (empId = "6") for May 18-19, 2026 ---');
    const milindLogs = logs.filter(l => l.empId === '6' && l.month === 5 && (l.day === 18 || l.day === 19));
    console.log(milindLogs);
    
    // Let's also fetch the raw ZK logs if we can, or just inspect how they are grouped
    // Wait, the bridge fetches raw logs from zk.getAttendances() and prints the length. Let's see what the bridge logs show.
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkEmployeeLogs();

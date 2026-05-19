async function checkPoojaAllLogs() {
  try {
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    const logs = data.logs;
    
    console.log(`Total logs in bridge: ${logs.length}`);
    const poojaLogs = logs.filter(l => l.empId === '12');
    console.log(`Pooja's logs in bridge count: ${poojaLogs.length}`);
    console.log(`Pooja's logs in bridge (first 20):`, poojaLogs.slice(0, 20));
    
    // Check if there are any logs for Pooja in May (any year)
    const poojaMayLogs = poojaLogs.filter(l => l.month === 5);
    console.log(`Pooja's May logs:`, poojaMayLogs);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkPoojaAllLogs();

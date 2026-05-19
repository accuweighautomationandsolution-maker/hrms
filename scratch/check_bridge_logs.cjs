async function checkBridgeLogs() {
  try {
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    console.log(`Bridge returned total logs: ${data.logs.length}`);
    const milindLogs = data.logs.filter(l => l.empId === '6');
    console.log(`Milind's logs in bridge:`, milindLogs);
  } catch (err) {
    console.error('Error fetching logs from bridge:', err.message);
  }
}

checkBridgeLogs();

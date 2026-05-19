async function dumpPoojaLogs() {
  try {
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    const logs = data.logs;
    
    const poojaLogs = logs.filter(l => l.empId === '12');
    console.log(`Dumped Pooja's logs: ${poojaLogs.length}`);
    require('fs').writeFileSync('scratch/pooja_logs.json', JSON.stringify(poojaLogs, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

dumpPoojaLogs();

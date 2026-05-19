async function testBridge() {
  try {
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    console.log(`Bridge returned ${data.logs ? data.logs.length : 0} logs.`);
    
    if (data.logs) {
      // Find Milind's (6) and Pooja's (16) logs for May 18-19, 2026
      const recent = data.logs.filter(l => 
        (l.empId === '6' || l.empId === '16') && 
        l.year === 2026 && 
        l.month === 5 && 
        (l.day === 18 || l.day === 19)
      );
      console.log('Recent logs for Pooja/Milind in 2026:', recent);
    }
  } catch(e) {
    console.error('Failed to connect to bridge:', e.message);
  }
}
testBridge();

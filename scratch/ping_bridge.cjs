async function checkBridge() {
  try {
    const res = await fetch('http://localhost:9000/health');
    console.log('Bridge Health Status:', res.status, await res.json());
  } catch (err) {
    console.error('Bridge Health Error:', err.message);
  }
}

checkBridge();

const http = require('http');

function testBridge() {
  console.log("Fetching logs from bridge...");
  http.get("http://localhost:9000/api/pull?ip=192.168.1.202&port=4370", (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.logs) {
          console.log("Total logs in bridge:", json.logs.length);
          const logs2026 = json.logs.filter(l => l.year === 2026);
          console.log("Total logs in 2026:", logs2026.length);
          if (logs2026.length > 0) {
            console.log("Sample 2026 logs:", logs2026.slice(0, 5));
          } else {
            console.log("NO LOGS IN 2026 AT ALL!");
          }
        } else {
          console.log("No logs, error:", json.error);
        }
      } catch (err) {
        console.error("Parse Error:", err.message);
      }
    });
  }).on('error', (err) => {
    console.error("Error connecting to bridge:", err.message);
  });
}

testBridge();

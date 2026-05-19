const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\Saurabh.b\\.gemini\\antigravity\\brain\\cbe8f90e-8b02-49ea-9103-3e1b2ead3c7c\\.system_generated\\steps\\660\\content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Find the line that has the JSON
const lines = content.split('\n');
const jsonLine = lines.find(l => l.trim().startsWith('{"logs":'));

if (!jsonLine) {
  console.error('Could not find JSON line');
  process.exit(1);
}

const data = JSON.parse(jsonLine);
console.log(`Total logs in JSON: ${data.logs.length}`);

// Filter logs for May 2026
const may2026Logs = data.logs.filter(log => log.year === 2026 && log.month === 5);
console.log(`Logs in May 2026: ${may2026Logs.length}`);

// Print a few sample logs for May 2026
console.log('Sample May 2026 logs:');
console.table(may2026Logs.slice(0, 20));

// Count logs per employee in May 2026
const counts = {};
may2026Logs.forEach(l => {
  counts[l.empId] = (counts[l.empId] || 0) + 1;
});
console.log('Log count per employee in May 2026:', counts);

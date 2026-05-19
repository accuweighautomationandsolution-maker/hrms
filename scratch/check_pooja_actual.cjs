const fs = require('fs');

function checkPoojaActualPunches() {
  const raw = JSON.parse(fs.readFileSync('biometric-bridge/raw_attendances.json'));
  
  // Find all records from May 18th or 19th in 2022 for deviceUserId = "16"
  const poojaActual = raw.filter(r => {
    const d = new Date(r.recordTime);
    return String(r.deviceUserId) === '16' && d.getFullYear() === 2022 && d.getMonth() === 4 && (d.getDate() === 18 || d.getDate() === 19);
  });
  
  console.log(`Found ${poojaActual.length} actual punches for Pooja (ID 16) on May 18-19, 2022:`);
  poojaActual.forEach(r => {
    const localTime = new Date(r.recordTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    console.log(`  Punch Time: ${r.recordTime} (IST: ${localTime}), Sn: ${r.userSn}`);
  });
}

checkPoojaActualPunches();

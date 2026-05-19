const fs = require('fs');

function checkWhoPunchedToday() {
  const raw = JSON.parse(fs.readFileSync('biometric-bridge/raw_attendances.json'));
  
  // Find all records from May 19th in the year 2022
  const recent = raw.filter(r => {
    const d = new Date(r.recordTime);
    return d.getFullYear() === 2022 && d.getMonth() === 4 && d.getDate() === 19;
  });
  
  console.log(`Found ${recent.length} punches on May 19, 2022:`);
  recent.forEach(r => {
    console.log(`  UserID: ${r.deviceUserId}, Time: ${r.recordTime}, Sn: ${r.userSn}`);
  });
}

checkWhoPunchedToday();

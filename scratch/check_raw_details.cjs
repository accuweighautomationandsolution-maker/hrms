const fs = require('fs');

function checkDampedRaw() {
  const raw = JSON.parse(fs.readFileSync('biometric-bridge/raw_attendances.json'));
  
  console.log(`Total raw records loaded: ${raw.length}`);
  
  console.log('\n--- POOJA (deviceUserId = "12") raw records ---');
  const pooja = raw.filter(r => String(r.deviceUserId) === '12');
  console.log(`Count: ${pooja.length}`);
  pooja.forEach(p => console.log(`  Time: ${p.recordTime}, Status: ${p.userStatus}`));

  console.log('\n--- MILIND (deviceUserId = "6") raw records ---');
  const milind = raw.filter(r => String(r.deviceUserId) === '6');
  console.log(`Count: ${milind.length}`);
  milind.forEach(m => console.log(`  Time: ${m.recordTime}, Status: ${m.userStatus}`));
}

checkDampedRaw();

const fs = require('fs');

function checkDampedRawBrief() {
  const raw = JSON.parse(fs.readFileSync('biometric-bridge/raw_attendances.json'));
  
  console.log(`Total raw records loaded: ${raw.length}`);
  
  const pooja = raw.filter(r => String(r.deviceUserId) === '12');
  console.log(`Pooja (deviceUserId = "12") count: ${pooja.length}`);
  if (pooja.length > 0) {
    console.log('First 5 Pooja logs:', pooja.slice(0, 5));
    console.log('Last 5 Pooja logs:', pooja.slice(-5));
  }

  const milind = raw.filter(r => String(r.deviceUserId) === '6');
  console.log(`Milind (deviceUserId = "6") count: ${milind.length}`);
  if (milind.length > 0) {
    console.log('First 5 Milind logs:', milind.slice(0, 5));
    console.log('Last 5 Milind logs:', milind.slice(-5));
  }
}

checkDampedRawBrief();

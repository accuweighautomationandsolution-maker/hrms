const ZKLib = require('node-zklib');

async function dumpRawZkLogs() {
  const ip = '192.168.1.202';
  const port = 4370;
  
  console.log(`Connecting to ZK device at ${ip}:${port}...`);
  const zk = new ZKLib(ip, port, 10000, 4000);
  
  try {
    await zk.createSocket();
    
    console.log('Fetching users...');
    const { data: users } = await zk.getUsers();
    console.log(`Total users on device: ${users ? users.length : 0}`);
    console.log('Users list:', users);
    
    console.log('Fetching all raw attendances...');
    const { data: attendances } = await zk.getAttendances();
    console.log(`Total raw attendances on device: ${attendances ? attendances.length : 0}`);
    
    // Sort attendances by recordTime descending to see the newest ones first
    const sorted = (attendances || []).sort((a, b) => new Date(b.recordTime) - new Date(a.recordTime));
    
    console.log('Newest 30 raw attendances:');
    sorted.slice(0, 30).forEach((att, idx) => {
      console.log(`[${idx}] UserID: ${att.deviceUserId}, Time: ${att.recordTime}, Type: ${att.userStatus}`);
    });
    
    // Write all attendances to a JSON file
    require('fs').writeFileSync('scratch/raw_attendances.json', JSON.stringify(sorted, null, 2));
    
    await zk.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Error fetching raw logs:', err);
  }
}

dumpRawZkLogs();

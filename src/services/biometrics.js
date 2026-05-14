// A service demonstrating how the frontend interacts with an Identix X2008 biometric device.
// Identix X2008 supports both Pull (TCP/IP) and Push (Real-time HTTP/Socket) protocols.

export const BiometricService = {
  /**
   * Simulates connecting to the hardware at a specific IP and pulling new logs.
   * Typically uses ZK protocol over TCP port 4370.
   */
  fetchLogs: async (ip, port) => {
    console.log(`Connecting to Identix X2008 Terminal at ${ip}:${port}...`);
    
    return new Promise((resolve) => {
      // Simulate network latency for a punch-clock pull
      setTimeout(() => {
        const now = new Date();
        const logs = [];
        
        // Fetch ALL missing logs simulation (last 30 days instead of 7)
        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
          const logDate = new Date();
          logDate.setDate(now.getDate() - dayOffset);
          
          // Skip Sundays
          if (logDate.getDay() === 0) continue;
          
          // Generate punches for your ACTUAL employees (501, 881, 12)
          const realIds = [501, 881, 12];
          realIds.forEach(empId => {
            logs.push({
              empId,
              day: logDate.getDate(),
              month: logDate.getMonth(),
              year: logDate.getFullYear(),
              punchIn: '09:' + String(Math.floor(Math.random() * 30)).padStart(2, '0'),
              punchOut: '18:' + String(Math.floor(Math.random() * 30)).padStart(2, '0'),
              remark: 'Hardware Sync',
              timestamp: logDate.toISOString()
            });
          });
        }
        resolve(logs);
      }, 2000);
    });
  },

  /**
   * Simulates a "Push" listener. In a real environment, this would be a WebSocket 
   * or an HTTP endpoint that the hardware 'pushes' data to upon every punch.
   */
  subscribeToPushEvents: (onPunch) => {
    console.log("Subscribing to Real-time Push Events from Identix X2008...");
    
    // Simulate a random punch event every 15-30 seconds for demonstration
    const interval = setInterval(() => {
      const now = new Date();
      // Pick from your actual biometric IDs
      const realIds = [501, 881, 12];
      const empId = realIds[Math.floor(Math.random() * realIds.length)];
      const mockPunch = {
        empId,
        time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
        type: Math.random() > 0.5 ? 'Punch In' : 'Punch Out',
        timestamp: now.toISOString(),
        day: now.getDate(),
        month: now.getMonth(),
        year: now.getFullYear()
      };
      onPunch(mockPunch);
    }, 20000);

    return () => clearInterval(interval);
  },

  /**
   * Simulates checking the connection status and health of the Identix X2008.
   */
  getDeviceStatus: async (ip, port) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isOnline = ip.startsWith('192'); 
        resolve([
          { 
            deviceId: 'IDX-X2008-01', 
            model: 'Identix X2008',
            location: 'Main Entry/Exit', 
            status: isOnline ? 'Online' : 'Offline', 
            method: 'Push/Pull (Hybrid)',
            lastPing: new Date().toLocaleTimeString(), 
            ip: `${ip}:${port}` 
          },
        ]);
      }, 800);
    });
  }
};

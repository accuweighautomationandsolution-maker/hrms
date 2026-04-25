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
        resolve([
          { empId: 1, day: 10, punchIn: '08:45', punchOut: '17:30', remark: 'Auto-Sync' },
          { empId: 2, day: 10, punchIn: '09:15', punchOut: '18:05', remark: 'Auto-Sync' },
          { empId: 3, day: 10, punchIn: '08:55', punchOut: '17:45', remark: 'Auto-Sync' },
          { empId: 4, day: 10, punchIn: '08:30', punchOut: '17:20', remark: 'Auto-Sync' },
          { empId: 5, day: 10, punchIn: '09:05', punchOut: '18:15', remark: 'Auto-Sync' },
          { empId: 1, day: 11, punchIn: '08:50', punchOut: '17:40', remark: 'Auto-Sync' },
          { empId: 2, day: 11, punchIn: '09:10', punchOut: '18:00', remark: 'Auto-Sync' },
        ]);
      }, 2000);
    });
  },

  /**
   * Simulates a "Push" listener. In a real environment, this would be a WebSocket 
   * or an HTTP endpoint that the hardware 'pushes' data to upon every punch.
   */
  subscribeToPushEvents: (onPunch) => {
    console.log("Subscribing to Real-time Push Events from Identix X2008...");
    
    // Simulate a random punch event every 30-60 seconds for demonstration
    const interval = setInterval(() => {
      const now = new Date();
      const mockPunch = {
        empId: Math.floor(Math.random() * 5) + 1,
        time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
        type: Math.random() > 0.5 ? 'Punch In' : 'Punch Out',
        timestamp: now.toISOString()
      };
      onPunch(mockPunch);
    }, 45000);

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

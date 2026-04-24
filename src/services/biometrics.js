// A service demonstrating how the frontend interacts with an Identix/ZKTeco biometric device.
// IP-based pulling typically involves a local bridge or direct TCP/UDP socket commands.

export const BiometricService = {
  /**
   * Simulates connecting to the hardware at a specific IP and pulling new logs.
   */
  fetchLogs: async (ip, port) => {
    console.log(`Connecting to Identix Terminal at ${ip}:${port}...`);
    
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
   * Simulates checking the connection status of registered biometric terminals.
   */
  getDeviceStatus: async (ip, port) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isOnline = ip.startsWith('192'); // Simulation logic
        resolve([
          { deviceId: 'Identix-99', location: 'Main Hub', status: isOnline ? 'Online' : 'Conflict', lastPing: 'Now', ip: `${ip}:${port}` },
        ]);
      }, 800);
    });
  }
};

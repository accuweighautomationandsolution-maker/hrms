/**
 * Accuweigh HRMS — Biometric Bridge Server
 * Connects to Identix X2008 (ZKTeco protocol) over LAN and exposes attendance logs via REST API.
 * 
 * Usage:
 *   node server.js
 * 
 * API:
 *   GET /health                           — Check if bridge is running
 *   GET /api/status?ip=X&port=Y          — Check device connectivity
 *   GET /api/pull?ip=X&port=Y            — Pull all attendance logs from device
 */

const express = require('express');
const cors = require('cors');
const ZKLib = require('node-zklib');

const app = express();
const PORT = 9000;

// Allow requests from the HRMS web app (any origin on local network)
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Accuweigh Biometric Bridge is running', timestamp: new Date().toISOString() });
});

// ── Device Status ─────────────────────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  const { ip = '192.168.1.202', port = '4370' } = req.query;
  
  const zk = new ZKLib(ip, parseInt(port), 10000, 4000);
  
  try {
    await zk.createSocket();
    const info = await zk.getInfo();
    await zk.disconnect();
    
    res.json({
      status: 'Online',
      ip: `${ip}:${port}`,
      deviceName: info?.deviceName || 'Identix X2008',
      serialNumber: info?.serialNumber || 'Unknown',
      userCount: info?.userCounts || 0,
      logCount: info?.logCounts || 0,
    });
  } catch (err) {
    res.status(503).json({
      status: 'Offline',
      ip: `${ip}:${port}`,
      error: err.message,
    });
  }
});

// ── Pull Attendance Logs ──────────────────────────────────────────────────────
app.get('/api/pull', async (req, res) => {
  const { ip = '192.168.1.202', port = '4370' } = req.query;
  
  console.log(`[${new Date().toLocaleString()}] Pull request from HRMS → Device: ${ip}:${port}`);
  
  const zk = new ZKLib(ip, parseInt(port), 10000, 4000);
  
  try {
    await zk.createSocket();
    
    // Read raw attendance logs from device
    const { data: rawLogs } = await zk.getAttendances();
    
    await zk.disconnect();
    
    if (!rawLogs || rawLogs.length === 0) {
      console.log('No logs found on device.');
      return res.json({ logs: [], message: 'No attendance records found on device.' });
    }
    
    console.log(`Retrieved ${rawLogs.length} raw punch records.`);
    
    // ── Group logs by employee + date to get In/Out pairs ──────────────────
    const dayMap = {}; // key: empId_YYYY-MM-DD
    
    rawLogs.forEach(log => {
      const dt = new Date(log.recordTime);
      if (isNaN(dt.getTime())) return;
      
      const empId = String(log.deviceUserId);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      const dateStr = `${year}-${month}-${day}`;
      const key = `${empId}_${dateStr}`;
      
      if (!dayMap[key]) {
        dayMap[key] = {
          empId,
          year,
          month: parseInt(month),
          day: parseInt(day),
          dateStr,
          punches: []
        };
      }
      
      dayMap[key].punches.push(timeStr);
    });
    
    // ── Build final log entries with punchIn (min) and punchOut (max) ───────
    const logs = Object.values(dayMap).map(entry => {
      const sorted = entry.punches.sort();
      const punchIn = sorted[0]; // First punch of the day = In
      const punchOut = sorted.length > 1 ? sorted[sorted.length - 1] : null; // Last punch = Out
      
      return {
        empId: entry.empId,
        year: entry.year,
        month: entry.month,
        day: entry.day,
        dateStr: entry.dateStr,
        punchIn,
        punchOut,
        remark: 'Identix Hardware Pull',
        source: 'Biometric Terminal'
      };
    });
    
    console.log(`Processed ${logs.length} attendance records for ${Object.keys(dayMap).length} employee-days.`);
    res.json({ logs, total: logs.length });
    
  } catch (err) {
    console.error('Pull Error:', err.message);
    
    let userMessage = err.message;
    if (err.message.includes('ECONNREFUSED')) {
      userMessage = `Cannot connect to device at ${ip}:${port}. Ensure the machine is powered on and reachable on the network.`;
    } else if (err.message.includes('ETIMEDOUT')) {
      userMessage = `Connection to ${ip}:${port} timed out. Check that the IP address is correct and the device is online.`;
    }
    
    res.status(500).json({ error: userMessage, logs: [] });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Accuweigh HRMS — Biometric Bridge Server       ║');
  console.log('║     Running on http://localhost:9000               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Device Target : 192.168.1.202:4370 (Identix X2008)');
  console.log('  Status Check  : http://localhost:9000/health');
  console.log('');
  console.log('  Waiting for pull requests from HRMS...');
  console.log('');
});

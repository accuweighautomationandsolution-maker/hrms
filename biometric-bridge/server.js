/**
 * Accuweigh HRMS — Biometric Bridge & Auto-Sync Server
 * Connects to Identix X2008 (ZKTeco protocol) over LAN and exposes attendance logs via REST API,
 * while automatically synchronizing records to Supabase in the background.
 * 
 * Usage:
 *   node server.js
 * 
 * API:
 *   GET /health                           — Check if bridge is running
 *   GET /api/bridge-status                — Check detailed bridge & machine status, sync stats, session states
 *   GET /api/status?ip=X&port=Y          — Check device connectivity (returns instantly from cached status)
 *   GET /api/pull?ip=X&port=Y            — Manually pull all attendance logs from device
 *   GET /api/users?ip=X&port=Y           — Get list of users registered on device
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ZKLib = require('node-zklib');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9001;

// Allow requests from the HRMS web app (any origin on local network)
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Environment Configuration ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BIOMETRIC_IP = process.env.BIOMETRIC_IP || '192.168.1.202';
const BIOMETRIC_PORT = parseInt(process.env.BIOMETRIC_PORT || '4370', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);

const STATE_FILE = path.join(__dirname, 'sync_state.json');

// Initialize Supabase Client
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log(`[Supabase] Initialized with endpoint: ${SUPABASE_URL}`);
  } catch (e) {
    console.error('[Supabase] Failed to initialize client:', e.message);
  }
} else {
  console.warn('[Supabase] Missing credentials. Automatic background synchronization will be disabled.');
}

// ── In-Memory Bridge State ─────────────────────────────────────────────────────
let state = {
  bridgeStatus: 'Online',
  deviceStatus: 'Checking', // 'Checking' | 'Online' | 'Offline'
  lastSyncTime: null,
  lastSyncStatus: 'idle', // 'idle' | 'success' | 'failed'
  totalRecordsSynced: 0,
  activeSessionState: 'idle', // 'idle' | 'connecting' | 'syncing'
  reconnectAttempts: 0,
  lastError: null,
  lastSuccessfulConnection: null,
  deviceName: 'Identix X2008',
  serialNumber: 'Unknown',
  userCount: 0,
  logCount: 0
};

// Lock to prevent concurrent ZK socket connections
let isZkBusy = false;

// ── State Persistence Helpers ─────────────────────────────────────────────────
function loadPersistentState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (data.lastSyncTime) {
        state.lastSyncTime = data.lastSyncTime;
      }
      if (data.totalRecordsSynced) {
        state.totalRecordsSynced = data.totalRecordsSynced;
      }
      console.log(`[State] Loaded state from file. Last sync: ${state.lastSyncTime}, Total synced: ${state.totalRecordsSynced}`);
    }
  } catch (e) {
    console.error('[State] Error reading state file:', e.message);
  }

  if (!state.lastSyncTime) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    state.lastSyncTime = yesterday.toISOString();
  }
}

function savePersistentState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      lastSyncTime: state.lastSyncTime,
      totalRecordsSynced: state.totalRecordsSynced
    }, null, 2));
  } catch (e) {
    console.error('[State] Error saving state file:', e.message);
  }
}

// Load state file on boot
loadPersistentState();

async function syncStatusToSupabase() {
  if (!supabase) return;
  try {
    const statusPayload = {
      ...state,
      lastPingTime: new Date().toISOString()
    };
    const stringValue = JSON.stringify(statusPayload);
    
    // Strategy 1: Try app_config
    const { error: e1 } = await supabase
      .from('app_config')
      .upsert({ key: 'biometric_bridge_status', value: stringValue }, { onConflict: 'key' });
      
    if (!e1) return;
    
    // Strategy 2: Fallback to letter_templates
    const { error: e2 } = await supabase
      .from('letter_templates')
      .upsert({ 
        id: 'sys_config_biometric_bridge_status', 
        data: { key: 'biometric_bridge_status', value: stringValue } 
      }, { onConflict: 'id' });
      
    if (e2) {
      console.warn('[Supabase] Failed to sync bridge status (both strategies):', e1.message, e2.message);
    }
  } catch (err) {
    console.warn('[Supabase] Exception syncing bridge status:', err.message);
  }
}

// Fetch employee mappings from Supabase
async function getEmployeeMapping() {
  if (!supabase) return {};
  const { data: employees, error } = await supabase.from('employees').select('id, biometric_code');
  if (error) {
    throw new Error('Failed to fetch employees from Supabase: ' + error.message);
  }
  
  const mapping = {};
  (employees || []).forEach(emp => {
    if (emp.biometric_code) {
      mapping[String(emp.biometric_code).trim()] = String(emp.id);
    }
  });
  return mapping;
}

// ── Background Sync / Heartbeat loop ──────────────────────────────────────────
let currentInterval = POLL_INTERVAL_MS;
const MIN_RETRY_INTERVAL = 5000;  // 5 seconds
const MAX_RETRY_INTERVAL = 60000; // 60 seconds

async function runSyncCycle() {
  if (isZkBusy) {
    console.log('[Sync] Device is currently busy with another operation. Skipping cycle.');
    setTimeout(runSyncCycle, currentInterval);
    return;
  }

  isZkBusy = true;
  state.activeSessionState = 'connecting';
  console.log(`\n[${new Date().toLocaleString()}] [Sync] Connecting to biometric device at ${BIOMETRIC_IP}:${BIOMETRIC_PORT}...`);

  let zk = null;
  try {
    zk = new ZKLib(BIOMETRIC_IP, BIOMETRIC_PORT, 10000, 4000);
    await zk.createSocket();
    
    // Connection successful
    state.deviceStatus = 'Online';
    state.lastSuccessfulConnection = new Date().toISOString();
    state.reconnectAttempts = 0;
    state.lastError = null;

    // Retrieve machine info to update status
    try {
      const info = await zk.getInfo();
      state.deviceName = info?.deviceName || 'Identix X2008';
      state.serialNumber = info?.serialNumber || 'Unknown';
      state.userCount = info?.userCounts || 0;
      state.logCount = info?.logCounts || 0;
    } catch (infoErr) {
      console.warn('[Sync] Could not read machine info:', infoErr.message);
    }

    if (!supabase) {
      console.log('[Sync] Supabase client not initialized. Connection check only. Disconnecting.');
      await zk.disconnect();
      isZkBusy = false;
      state.activeSessionState = 'idle';
      state.lastSyncStatus = 'idle';
      scheduleNext(true);
      return;
    }

    state.activeSessionState = 'syncing';
    console.log('[Sync] Fetching employee mappings from DB...');
    const bioIdMap = await getEmployeeMapping();
    
    const lastSyncParsed = new Date(state.lastSyncTime);
    let maxPunchTime = lastSyncParsed;
    console.log(`[Sync] Last processed punch checkpoint: ${lastSyncParsed.toISOString()}`);
    
    console.log('[Sync] Fetching raw logs from device...');
    const { data: rawLogs } = await zk.getAttendances();
    
    // Disconnect immediately after reading data to release device resources
    await zk.disconnect();
    zk = null;
    isZkBusy = false;
    state.activeSessionState = 'idle';

    if (!rawLogs || rawLogs.length === 0) {
      console.log('[Sync] No logs found on device.');
      state.lastSyncStatus = 'success';
      scheduleNext(true);
      return;
    }

    // Filter out old logs based on state.lastSyncTime
    const newLogs = rawLogs.filter(log => {
      const logTime = new Date(log.recordTime);
      return !isNaN(logTime.getTime()) && logTime > lastSyncParsed;
    });

    if (newLogs.length === 0) {
      console.log('[Sync] No new punches since last sync.');
      state.lastSyncStatus = 'success';
      scheduleNext(true);
      return;
    }

    // Sort ascending by time so we process chronologically
    newLogs.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));
    console.log(`[Sync] Found ${newLogs.length} new punches to process.`);

    // Group punches by Employee + Date
    const groupedPunches = {};
    for (const log of newLogs) {
      const logTime = new Date(log.recordTime);
      if (logTime > maxPunchTime) {
        maxPunchTime = logTime;
      }
      
      const deviceUserId = String(log.deviceUserId);
      const internalId = bioIdMap[deviceUserId];
      
      if (!internalId) {
        // Log skipped unknown user code but don't stop sync
        continue;
      }
      
      const year = logTime.getFullYear();
      const month = String(logTime.getMonth() + 1).padStart(2, '0');
      const day = String(logTime.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timeStr = `${String(logTime.getHours()).padStart(2, '0')}:${String(logTime.getMinutes()).padStart(2, '0')}`;
      const key = `${internalId}_${dateStr}`;
      
      if (!groupedPunches[key]) {
        groupedPunches[key] = {
          emp_id: internalId,
          date: dateStr,
          punches: []
        };
      }
      groupedPunches[key].punches.push({ timeStr, isoTime: logTime.toISOString() });
    }

    const keys = Object.keys(groupedPunches);
    if (keys.length === 0) {
      console.log('[Sync] No mapped punches to update. Saving state checkpoint.');
      state.lastSyncTime = maxPunchTime.toISOString();
      state.lastSyncStatus = 'success';
      savePersistentState();
      scheduleNext(true);
      return;
    }

    // Process grouped punches against the database
    let updatedCount = 0;
    for (const key of keys) {
      const group = groupedPunches[key];
      const sortedPunches = group.punches.sort((a, b) => new Date(a.isoTime) - new Date(b.isoTime));
      
      // Fetch existing record for this employee and date
      const { data: existingRecords, error: fetchErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('emp_id', group.emp_id)
        .eq('date', group.date);
        
      if (fetchErr) {
        console.error(`[DB Error] Failed to fetch existing record for ${key}:`, fetchErr.message);
        continue;
      }

      let existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
      
      // Do not overwrite manual records automatically
      if (existing && existing.data && existing.data.source === 'Manual') {
        continue;
      }

      let punchIn = existing && existing.data && existing.data.punchIn ? existing.data.punchIn : null;
      let punchOut = existing && existing.data && existing.data.punchOut ? existing.data.punchOut : null;
      
      // Apply punches
      for (const p of sortedPunches) {
        if (!punchIn) {
          punchIn = p.timeStr;
        } else {
          punchOut = p.timeStr;
        }
      }

      let punchInTs = punchIn ? `${group.date}T${punchIn}:00.000Z` : null;
      let punchOutTs = punchOut ? `${group.date}T${punchOut}:00.000Z` : null;
      let attendanceStatus = punchOut ? 'Present' : (punchIn ? 'Incomplete' : 'Absent');

      const rowData = {
        remark: 'Auto Background Sync',
        source: 'Biometric Terminal',
        punchIn,
        punchOut
      };

      if (existing) {
        const { error: updateErr } = await supabase
          .from('attendance')
          .update({
            punch_in: punchInTs,
            punch_out: punchOutTs,
            status: attendanceStatus,
            data: rowData
          })
          .eq('id', existing.id);
          
        if (updateErr) console.error(`[DB Error] Update failed for ${key}:`, updateErr.message);
        else updatedCount++;
      } else {
        const { error: insertErr } = await supabase
          .from('attendance')
          .insert({
            emp_id: String(group.emp_id),
            date: group.date,
            punch_in: punchInTs,
            punch_out: punchOutTs,
            status: attendanceStatus,
            data: rowData
          });
          
        if (insertErr) console.error(`[DB Error] Insert failed for ${key}:`, insertErr.message);
        else updatedCount++;
      }
    }

    console.log(`[Sync] Successfully processed ${updatedCount} punches.`);
    state.totalRecordsSynced += updatedCount;
    state.lastSyncTime = maxPunchTime.toISOString();
    state.lastSyncStatus = 'success';
    savePersistentState();

    scheduleNext(true);

  } catch (err) {
    console.error('[Sync] Error during execution cycle:', err.message);
    state.lastError = err.message;
    state.lastSyncStatus = 'failed';
    state.deviceStatus = 'Offline';
    state.activeSessionState = 'idle';

    if (zk) {
      try { await zk.disconnect(); } catch (e) {}
    }
    isZkBusy = false;

    scheduleNext(false);
  }
}

function scheduleNext(isSuccess) {
  if (isSuccess) {
    currentInterval = POLL_INTERVAL_MS;
  } else {
    // Exponential retry: double retry interval on failure, start at 5s, limit to 60s
    state.reconnectAttempts++;
    currentInterval = Math.min(MIN_RETRY_INTERVAL * Math.pow(2, state.reconnectAttempts - 1), MAX_RETRY_INTERVAL);
  }
  console.log(`[Sync] Next execution scheduled in ${currentInterval / 1000}s`);
  
  // Sync latest state heartbeat to Supabase
  syncStatusToSupabase();
  
  setTimeout(runSyncCycle, currentInterval);
}

// Start background loop on startup
setTimeout(runSyncCycle, 1000);


// ── API Endpoints ─────────────────────────────────────────────────────────────

// 1. App Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Accuweigh Biometric Bridge is running',
    timestamp: new Date().toISOString()
  });
});

// 2. Full In-Memory Bridge Status (Detailed)
app.get('/api/bridge-status', (req, res) => {
  res.json(state);
});

// 3. Instant Device Status Check (Satisfies existing/legacy frontend calls without locking thread)
app.get('/api/status', (req, res) => {
  // Return cached values immediately to prevent network request freezes in UI
  res.json({
    status: state.deviceStatus,
    ip: `${BIOMETRIC_IP}:${BIOMETRIC_PORT}`,
    deviceName: state.deviceName,
    serialNumber: state.serialNumber,
    userCount: state.userCount,
    logCount: state.logCount,
    lastSuccessfulConnection: state.lastSuccessfulConnection,
    lastError: state.lastError
  });
});

// 4. Get Registered Users from Device (Safe, lock-protected)
app.get('/api/users', async (req, res) => {
  const { ip = BIOMETRIC_IP, port = BIOMETRIC_PORT } = req.query;

  if (isZkBusy) {
    return res.status(503).json({ error: 'Device is busy. Please try again shortly.', users: [] });
  }

  isZkBusy = true;
  const zk = new ZKLib(ip, parseInt(port), 10000, 4000);
  
  try {
    await zk.createSocket();
    const { data: users } = await zk.getUsers();
    await zk.disconnect();
    isZkBusy = false;
    
    const userList = (users || []).map(u => ({
      deviceId: String(u.userId),
      name: u.name || '',
      cardNo: u.cardNo || '',
      role: u.role || 0
    }));
    
    res.json({ users: userList, total: userList.length });
  } catch (err) {
    if (zk) {
      try { await zk.disconnect(); } catch (e) {}
    }
    isZkBusy = false;
    res.status(500).json({ error: err.message, users: [] });
  }
});

// 5. Manual Pull Endpoint (Safe, lock-protected)
app.get('/api/pull', async (req, res) => {
  const { ip = BIOMETRIC_IP, port = BIOMETRIC_PORT } = req.query;

  if (isZkBusy) {
    return res.status(503).json({ error: 'Device is currently busy. Please wait for the current operation to complete.', logs: [] });
  }

  isZkBusy = true;
  console.log(`[Manual Pull] Connecting to Device: ${ip}:${port}`);
  
  const zk = new ZKLib(ip, parseInt(port), 10000, 4000);
  try {
    await zk.createSocket();
    
    // Get user registry for name mapping
    let userRegistry = {};
    try {
      const { data: users } = await zk.getUsers();
      (users || []).forEach(u => {
        userRegistry[String(u.userId)] = u.name || '';
      });
    } catch (e) {
      console.warn('[Manual Pull] Could not load user registry:', e.message);
    }
    
    // Read raw logs
    const { data: rawLogs } = await zk.getAttendances();
    await zk.disconnect();
    isZkBusy = false;
    
    if (!rawLogs || rawLogs.length === 0) {
      return res.json({ logs: [], message: 'No attendance records found on device.' });
    }
    
    // Group and format logs
    const dayMap = {};
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
    
    const logs = Object.values(dayMap).map(entry => {
      const sorted = entry.punches.sort();
      const punchIn = sorted[0];
      const punchOut = sorted.length > 1 ? sorted[sorted.length - 1] : null;
      
      return {
        empId: entry.empId,
        empName: userRegistry[entry.empId] || '',
        year: entry.year,
        month: entry.month,
        day: entry.day,
        dateStr: entry.dateStr,
        punchIn,
        punchOut,
        remark: 'Manual Pull Check',
        source: 'Biometric Terminal'
      };
    });
    
    res.json({ logs, total: logs.length });
    
  } catch (err) {
    if (zk) {
      try { await zk.disconnect(); } catch (e) {}
    }
    isZkBusy = false;
    console.error('[Manual Pull] Error:', err.message);
    res.status(500).json({ error: err.message, logs: [] });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     Accuweigh HRMS — Unified Biometric Server      ║');
  console.log('║     Running on http://localhost:9000               ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Device Target : ${BIOMETRIC_IP}:${BIOMETRIC_PORT} (Identix X2008)`);
  console.log(`  Auto-Sync     : Every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  Health API    : http://localhost:9000/health`);
  console.log(`  Status API    : http://localhost:9000/api/bridge-status`);
  console.log('');
});

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ZKLib = require('node-zklib');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BIOMETRIC_IP = process.env.BIOMETRIC_IP || '192.168.1.202';
const BIOMETRIC_PORT = parseInt(process.env.BIOMETRIC_PORT || '4370', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STATE_FILE = path.join(__dirname, 'sync_state.json');

// Helper to read state
function getLastSyncTime() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (data.lastSyncTime) return new Date(data.lastSyncTime);
    }
  } catch (e) {
    console.error('[State] Error reading state file:', e.message);
  }
  // Default to yesterday if no state exists
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

// Helper to save state
function saveLastSyncTime(dateObj) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastSyncTime: dateObj.toISOString() }));
  } catch (e) {
    console.error('[State] Error saving state file:', e.message);
  }
}

// Fetch employee mappings from Supabase
async function getEmployeeMapping() {
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

async function syncPunches() {
  console.log(`\n[${new Date().toISOString()}] Starting sync cycle...`);
  let zk = null;
  
  try {
    const bioIdMap = await getEmployeeMapping();
    const lastSync = getLastSyncTime();
    let maxPunchTime = lastSync;
    
    console.log(`[Sync] Last processed punch time: ${lastSync.toISOString()}`);
    
    zk = new ZKLib(BIOMETRIC_IP, BIOMETRIC_PORT, 10000, 4000);
    await zk.createSocket();
    
    const { data: rawLogs } = await zk.getAttendances();
    await zk.disconnect();
    zk = null;
    
    if (!rawLogs || rawLogs.length === 0) {
      console.log('[Sync] No logs found on device.');
      return;
    }

    // Filter out old logs
    const newLogs = rawLogs.filter(log => {
      const logTime = new Date(log.recordTime);
      return !isNaN(logTime.getTime()) && logTime > lastSync;
    });

    if (newLogs.length === 0) {
      console.log('[Sync] No new punches since last sync.');
      return;
    }

    // Sort ascending by time so we process chronologically
    newLogs.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));
    console.log(`[Sync] Found ${newLogs.length} new punches to process.`);

    // Group new punches by Employee + Date
    const groupedPunches = {}; // key: internalId_YYYY-MM-DD
    
    for (const log of newLogs) {
      const logTime = new Date(log.recordTime);
      if (logTime > maxPunchTime) {
        maxPunchTime = logTime;
      }
      
      const deviceUserId = String(log.deviceUserId);
      const internalId = bioIdMap[deviceUserId];
      
      if (!internalId) {
        console.log(`[Sync] Skipped unknown device user ID: ${deviceUserId}`);
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
      console.log('[Sync] No mapped punches to update. Saving state.');
      saveLastSyncTime(maxPunchTime);
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
        continue; // Skip and try again next loop
      }

      let existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
      
      // We do not overwrite manual records automatically
      if (existing && existing.data && existing.data.source === 'Manual') {
        console.log(`[Sync] Skipping ${key} as it has a Manual override.`);
        continue;
      }

      let punchIn = existing && existing.data && existing.data.punchIn ? existing.data.punchIn : null;
      let punchOut = existing && existing.data && existing.data.punchOut ? existing.data.punchOut : null;
      
      // Apply new punches
      for (const p of sortedPunches) {
        if (!punchIn) {
          punchIn = p.timeStr;
        } else {
          // If we already have a punchIn, subsequent punches on the same day update punchOut
          punchOut = p.timeStr;
        }
      }

      let punchInTs = punchIn ? `${group.date}T${punchIn}:00.000Z` : null;
      let punchOutTs = punchOut ? `${group.date}T${punchOut}:00.000Z` : null;
      let status = punchOut ? 'Present' : (punchIn ? 'Incomplete' : 'Absent');

      const rowData = {
        remark: 'Auto Background Sync',
        source: 'Biometric Terminal',
        punchIn,
        punchOut
      };

      if (existing) {
        // Update
        const { error: updateErr } = await supabase
          .from('attendance')
          .update({
            punch_in: punchInTs,
            punch_out: punchOutTs,
            status: status,
            data: rowData
          })
          .eq('id', existing.id);
          
        if (updateErr) console.error(`[DB Error] Update failed for ${key}:`, updateErr.message);
        else updatedCount++;
      } else {
        // Insert
        const { error: insertErr } = await supabase
          .from('attendance')
          .insert({
            emp_id: String(group.emp_id),
            date: group.date,
            punch_in: punchInTs,
            punch_out: punchOutTs,
            status: status,
            data: rowData
          });
          
        if (insertErr) console.error(`[DB Error] Insert failed for ${key}:`, insertErr.message);
        else updatedCount++;
      }
    }

    console.log(`[Sync] Successfully processed ${updatedCount} employee-days.`);
    
    // Update checkpoint only if we didn't crash
    saveLastSyncTime(maxPunchTime);
    
  } catch (err) {
    console.error('[Sync] General Error:', err.message);
    if (zk) {
      try { await zk.disconnect(); } catch (e) {}
    }
  }
}

// ── Start Loop ─────────────────────────────────────────────────────────────
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     Accuweigh HRMS — Auto Biometric Service        ║');
console.log('║     Running in Background via PM2                  ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log(`Polling every ${POLL_INTERVAL_MS / 1000} seconds...`);

// Run immediately once on startup, then setInterval
syncPunches();
setInterval(syncPunches, POLL_INTERVAL_MS);

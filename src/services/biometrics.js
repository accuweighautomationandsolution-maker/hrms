import * as XLSX from 'xlsx';
import { dataService } from '../utils/dataService';

export const BiometricService = {
  /**
   * Fetches logs from the biometric terminal via local bridge server.
   * Falls back to simulation if bridge is not running.
   */
  fetchLogs: async (ip, port) => {
    console.log(`Connecting to Biometric Bridge → Device: ${ip}:${port}...`);
    
    const BRIDGE_URL = `http://localhost:9000/api/pull?ip=${ip}&port=${port}`;
    
    try {
      // Removed the 5-second timeout. Hardware with many logs can take 20-30 seconds to respond.
      const response = await fetch(BRIDGE_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch logs from bridge.`);
      }
      
      const data = await response.json();
      if (data.logs) {
        console.log(`Bridge returned ${data.logs.length} records.`);
        return data.logs;
      }
      return [];
    } catch (err) {
      console.error("Biometric fetch Error:", err);
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error("Cannot connect to the Biometric Bridge server. Ensure 'node server.js' is running in the biometric-bridge folder on port 9000.");
      }
      throw err;
    }
  },

  /**
   * Parses the "Monthly Punches Report" Excel/CSV format exported by 
   * ZKTeco / eSSL / BioTime software for Identix X2008.
   * 
   * Format detected from user's sample:
   * - Row 8: Headers — EmpCode, Employee name, 1, 2, 3 ... 31 (date columns)
   * - Rows 9+: Data — "G PP 09:07 18:33", "WH WH", "G AA", etc.
   * 
   * Returns the same log structure as fetchLogs().
   */
  parseMonthlyPunchesReport: async (file, reportYear, reportMonth) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // ── Find the header row ────────────────────────────────────────────
          // Header row has "EmpCode" or "Emp Code" in column A
          let headerRowIdx = -1;
          let dateColumns = []; // { colIdx, dayNumber }
          let empCodeColIdx = 0;
          let empNameColIdx = 1;

          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            const first = String(row[0] || '').toLowerCase().replace(/\s/g, '');
            if (first.includes('empcode') || first.includes('employeecode')) {
              headerRowIdx = i;
              // Map date columns
              row.forEach((cell, colIdx) => {
                const val = parseInt(cell);
                if (!isNaN(val) && val >= 1 && val <= 31) {
                  dateColumns.push({ colIdx, day: val });
                }
                if (String(cell).toLowerCase().replace(/\s/g, '') === 'employeename') {
                  empNameColIdx = colIdx;
                }
              });
              break;
            }
          }

          if (headerRowIdx === -1) {
            return reject(new Error('Could not find header row. Make sure the file is the "Monthly Punches Report" format.'));
          }

          // ── Auto-detect month/year from the report if not provided ─────────
          let year = reportYear || new Date().getFullYear();
          let month = reportMonth || new Date().getMonth() + 1;

          // Look for date range line (e.g. "01/04/2026 To 31/05/2026")
          for (let i = 0; i < headerRowIdx; i++) {
            const rowText = rows[i].join(' ');
            const match = rowText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              month = parseInt(match[2]);
              year = parseInt(match[3]);
              break;
            }
          }

          // ── Parse data rows ────────────────────────────────────────────────
          const logs = [];
          
          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            const empCode = String(row[empCodeColIdx] || '').trim();
            
            if (!empCode || empCode === '' || empCode.toLowerCase().includes('all')) continue;

            dateColumns.forEach(({ colIdx, day }) => {
              const cell = String(row[colIdx] || '').trim();
              
              if (!cell || cell === '' || cell.toUpperCase() === 'WH WH' || cell.toUpperCase() === 'WH') return; // Holiday
              if (cell.toUpperCase().includes('AA')) return; // Absent
              if (cell.toUpperCase().startsWith('NA')) return; // Not applicable

              // Parse times from cell like "G PP 09:07 18:33" or "G 09:00 18:30"
              const timePattern = /(\d{2}:\d{2})/g;
              const times = cell.match(timePattern);
              
              if (!times || times.length === 0) return; // No punch data
              
              const punchIn = times[0] || null;
              const punchOut = times.length > 1 ? times[times.length - 1] : null;
              
              logs.push({
                empId: empCode,
                day,
                month,
                year,
                punchIn,
                punchOut,
                remark: `Excel Import (${file.name})`,
                source: 'Excel Import',
                timestamp: new Date(year, month - 1, day).toISOString()
              });
            });
          }

          console.log(`parseMonthlyPunchesReport: Extracted ${logs.length} punch records from ${file.name}`);
          resolve(logs);
        } catch (err) {
          reject(new Error(`Failed to parse file: ${err.message}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Health check for the device.
   */
  getDeviceStatus: async (ip, port) => {
    try {
      const data = await dataService.getConfig('biometric_bridge_status', null);
      
      if (data) {
        // Staleness check: if lastPingTime is older than 2 minutes, consider it offline.
        const lastPing = data.lastPingTime ? new Date(data.lastPingTime).getTime() : 0;
        const now = Date.now();
        const isStale = (now - lastPing) > 120000; // 2 minutes

        const bridgeStatus = isStale ? 'Offline' : (data.bridgeStatus || 'Online');
        const deviceStatus = isStale ? 'Offline' : (data.deviceStatus || 'Offline');

        return [{ 
          deviceId: 'IDX-X2008-PRO',
          model: 'Identix X2008',
          location: 'Office Gateway',
          status: deviceStatus,
          bridgeStatus: bridgeStatus,
          activeSessionState: data.activeSessionState || 'idle',
          lastSyncTime: data.lastSyncTime || null,
          totalRecordsSynced: data.totalRecordsSynced || 0,
          reconnectAttempts: data.reconnectAttempts || 0,
          lastError: data.lastError || (isStale ? 'Bridge heartbeat timeout (stale data)' : null),
          lastSuccessfulConnection: data.lastSuccessfulConnection || null,
          userCount: data.userCount || 0,
          logCount: data.logCount || 0,
          method: 'TCP/IP via Bridge (Cloud Synced)',
          lastPing: data.lastPingTime ? new Date(data.lastPingTime).toLocaleTimeString() : new Date().toLocaleTimeString(),
          ip: `${ip}:${port}`
        }];
      }
    } catch (e) {
      console.warn("Failed to fetch biometric bridge status from Supabase:", e.message);
    }
    
    return [{
      deviceId: 'IDX-X2008-PRO', 
      model: 'Identix X2008',
      location: 'Office Gateway',
      status: 'Offline',
      bridgeStatus: 'Offline',
      activeSessionState: 'idle',
      lastSyncTime: null,
      totalRecordsSynced: 0,
      reconnectAttempts: 0,
      lastError: 'Bridge service status not found in database',
      method: 'TCP/IP (ADMS Enabled)',
      lastPing: new Date().toLocaleTimeString(),
      ip: `${ip}:${port}`
    }];
  },

  subscribeToPushEvents: (onPunch) => {
    console.log("Real-time Push Listener Active...");
    return () => {};
  }
};

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Clock, Activity, CheckCircle, XCircle, Edit3, Save, X, CalendarDays, Settings, Trash2, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BiometricService } from '../services/biometrics';
import { getHolidayDates } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (n) => String(n).padStart(2, '0');
const hhmm = (h, m) => `${pad2(h)}:${pad2(m)}`;
const toMins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const diffHHMM = (inT, outT) => {
  const a = toMins(inT), b = toMins(outT);
  if (a == null || b == null || b <= a) return null;
  const d = b - a;
  return {
    mins: d,
    text: `${Math.floor(d / 60)}h ${d % 60}m`
  };
};

const calcNetOT = (inT, outT) => {
  const res = diffHHMM(inT, outT);
  if (!res) return null;
  const netMins = Math.max(0, res.mins - 30); // Deduct 30 mins
  return `${Math.floor(netMins / 60)}h ${netMins % 60}m`;
};

// Generate all calendar days for a month
const buildCalendar = (year, month) => {
  const days = [];
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dow = new Date(year, month, d).getDay();
    days.push({ day: d, dow });
  }
  return days;
};

// const EMPLOYEES_LIST = dataService.getEmployees(); // Moved into component for better reactivity

const BADGE_COLOR = {
  'Staff Employee': 'badge-primary',
  'On role worker': 'badge-success',
  'Contractual Worker': 'badge-warning',
};

// ── Punch-edit modal ────────────────────────────────────────────────────────
const PunchModal = ({ entry, onSave, onClose }) => {
  const [punchIn, setPunchIn] = useState(entry.punchIn || '');
  const [punchOut, setPunchOut] = useState(entry.punchOut || '');
  const [remark, setRemark] = useState(entry.remark || '');

  const res = diffHHMM(punchIn, punchOut);
  const duration = res?.text;
  const netOT = entry.isHoliday ? calcNetOT(punchIn, punchOut) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Manual Punch Entry</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {entry.name} — {pad2(entry.day)}/{pad2(entry.month + 1)}/{entry.year}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label" style={{ color: 'var(--color-success)', fontWeight: '600' }}>🟢 Punch In</label>
            <input type="time" className="form-input"
              value={punchIn}
              onChange={(e) => setPunchIn(e.target.value)}
              style={{ width: '100%', fontSize: '1.25rem', fontWeight: '700', padding: '0.75rem', marginTop: '0.25rem' }} />
          </div>
          <div>
            <label className="form-label" style={{ color: 'var(--color-danger)', fontWeight: '600' }}>🔴 Punch Out</label>
            <input type="time" className="form-input"
              value={punchOut}
              onChange={(e) => setPunchOut(e.target.value)}
              style={{ width: '100%', fontSize: '1.25rem', fontWeight: '700', padding: '0.75rem', marginTop: '0.25rem' }} />
          </div>
        </div>

        {duration && (
          <div style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid var(--color-success)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Gross Duration</span>
              <span style={{ fontWeight: '600' }}>{duration}</span>
            </div>
            {netOT && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-warning)' }}>Net OT (30m lunch deducted)</span>
                <span style={{ fontWeight: '800', color: 'var(--color-warning)', fontSize: '1.1rem' }}>{netOT}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Remark / Reason *</label>
          <input type="text" className="form-input"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            style={{ width: '100%', marginTop: '0.25rem', borderColor: !remark.trim() ? 'var(--color-danger)' : 'var(--color-border)', opacity: !remark.trim() ? 0.7 : 1 }}
            placeholder="Mandatory for audit trail: e.g. Forget punch..." />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => {
            if (window.confirm('Are you sure you want to completely delete this attendance record?')) {
              onSave({ punchIn: null, punchOut: null, remark: 'Record Cleared by Admin', source: 'Manual' });
            }
          }}>Clear Record</button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
            disabled={!punchIn || !remark.trim()}
            onClick={() => onSave({ punchIn, punchOut: punchOut || null, remark, source: 'Manual' })}>
            <Save size={16} /> Save Entry
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Attendance Component ───────────────────────────────────────────────
const Attendance = () => {
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isEmployee = userRole === 'employee';
  
  const [isManager, setIsManager] = useState(false);
  const [myEmployeeProfile, setMyEmployeeProfile] = useState(null);
  const isEmployeeOnly = isEmployee && !isManager;
  const isAdmin = userRole === 'management' || userRole === 'admin';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [punchModal, setPunchModal] = useState(null); // { day, ... }
  const [devices, setDevices] = useState([]);
  const [records, setRecords] = useState({});
  const [syncLoading, setSyncLoading] = useState(false);
  const [showBioConfig, setShowBioConfig] = useState(false);
  const [bioConfig, setBioConfig] = useState({ ip: '192.168.1.202', port: '4370', isEnabled: true });
  const [lastSync, setLastSync] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // { logs, filename }
  const [importLoading, setImportLoading] = useState(false);
  const [holidayList, setHolidayList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Sync Control States ---
  const [syncSelection, setSyncSelection] = useState(new Set());
  const [syncDateRange, setSyncDateRange] = useState({ from: '', to: '' });

  // --- ID Mapping for Biometrics ---
  // STRICT MAPPING: Only use biometricCode field (explicit mapping)
  // Employee Code and Fuzzy Name matching have been removed as per requirements
  const bioIdMap = useMemo(() => {
    const map = {};
    employeesList.forEach(e => {
      const bCode = e.biometricCode || e.biometric_code; 
      if (bCode) map[String(bCode).trim()] = e.id;
    });
    return map;
  }, [employeesList]);

  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 10000);

    const fetchData = async () => {
      setLoading(true);
      try {
        const myProfile = isEmployee
          ? await dataService.getMyEmployeeProfile(currentUser).catch(() => null)
          : null;
        setMyEmployeeProfile(myProfile);

        const emps = await dataService.getEmployees().catch(() => []);
        
        const hasReportees = myProfile ? emps.some(e => e.managerIds && e.managerIds.map(String).includes(String(myProfile.id))) : false;
        setIsManager(hasReportees);

        const isEmpOnly = isEmployee && !hasReportees;

        const attFetch = (isEmpOnly && myProfile)
          ? dataService.getAttendanceForEmployee(myProfile.id).catch(() => ({}))
          : dataService.getAttendance().catch(() => ({}));

        const [att, hol, bConf, lSync, lReqs] = await Promise.all([
          attFetch,
          dataService.getCustomHolidays().catch(() => []),
          dataService.getBiometricConfig().catch(() => null),
          dataService.getConfig('biometric_last_sync', null).catch(() => null),
          dataService.getLeaveRequests().catch(() => [])
        ]);

        if (isMounted) {
          console.log('Attendance: Data Load Success', {
            emps: emps.length,
            att: Object.keys(att || {}).length,
            userRole,
            myProfile: myProfile?.name,
            myProfileId: myProfile?.id,
            isManager: hasReportees
          });
          setEmployeesList(emps);
          setRecords(att);
          setHolidayList(hol);
          setLeaveRequests(lReqs);
          if (bConf) setBioConfig(bConf);
          if (lSync) setLastSync(lSync);

          if (isEmpOnly) {
            if (myProfile) {
              const empInList = emps.find(e => String(e.id) === String(myProfile.id));
              setSelectedEmp(empInList || myProfile);
              console.log(`Attendance: Employee resolved → ${myProfile.name} (ID: ${myProfile.id})`);
            } else {
              setSelectedEmp(null);
              console.warn('Attendance: Could not resolve employee record for current user.');
            }
          } else {
            // Admin or Manager
            const myReportees = hasReportees 
              ? emps.filter(e => e.managerIds && e.managerIds.map(String).includes(String(myProfile.id)))
              : emps;
            
            if (myReportees.length > 0) {
              setSelectedEmp(myReportees[0]);
            }
          }
          
          // Check overdue movement requests on page load
          dataService.checkOverdueMovements().catch(console.error);
        }
      } catch (err) {
        console.error('Attendance: Critical Load Error:', err);
      } finally {
        clearTimeout(safetyTimeout);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [currentUser?.id, isEmployee]);

  useEffect(() => {
    if (!bioConfig.isEnabled) {
      setDevices([]);
      return;
    }

    const checkStatus = () => {
      BiometricService.getDeviceStatus(bioConfig.ip, bioConfig.port).then(d => {
        setDevices(d);
        if (d && d[0] && d[0].lastSyncTime) {
          setLastSync(new Date(d[0].lastSyncTime).toLocaleString());
        }
      });
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 10000); // Poll status every 10s

    // Subscribe to Push events for real-time reflection
    const unsubscribe = BiometricService.subscribeToPushEvents(async (punch) => {
      const internalId = bioIdMap[String(punch.empId)];
      if (!internalId) return;

      const dStr = `${punch.year}-${String(punch.month).padStart(2, '0')}-${String(punch.day).padStart(2, '0')}`;
      const punchKey = `${internalId}_${dStr}`;
      
      let updatedRecord = null;
      setRecords(prev => {
        const existing = prev[punchKey] || {};
        updatedRecord = {
          ...existing,
          punchIn: punch.type === 'Punch In' ? punch.time : (existing.punchIn || null),
          punchOut: punch.type === 'Punch Out' ? punch.time : (existing.punchOut || null),
          remark: existing.remark || 'Real-time Push Sync',
          source: 'Biometric (Push)'
        };
        return { ...prev, [punchKey]: updatedRecord };
      });

      if (updatedRecord) {
        dataService.saveAttendance({ [punchKey]: updatedRecord }).catch(console.error);
        
        // Trigger movement exceptions & auto-closures
        if (punch.type === 'Punch Out' && punch.time) {
          dataService.checkMovementException(internalId, dStr, punch.time).catch(console.error);
        } else if (punch.type === 'Punch In' && punch.time) {
          dataService.autoCloseMovementRequest(internalId, dStr, punch.time).catch(console.error);
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [bioConfig, bioIdMap]);

  const holidays = useMemo(() => getHolidayDates(year, month, holidayList || []), [year, month, holidayList]);
  const holidaySet = useMemo(() => new Set((holidays || []).map(h => h.day)), [holidays]);
  const holTypeMap = useMemo(() => Object.fromEntries((holidays || []).map(h => [h.day, h.type])), [holidays]);

  const calDays = useMemo(() => buildCalendar(year, month), [year, month]);

  const key = (empId, day) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return `${empId}_${dStr}`;
  };

  const handleBioSync = async () => {
    if (isEmployee) {
      alert("Unauthorized: Employees cannot sync biometric data.");
      return;
    }
    setSyncLoading(true);
    const startTime = Date.now();
    try {
      const logs = await BiometricService.fetchLogs(bioConfig.ip, bioConfig.port);
      const recordsToSave = {};
      let addedCount = 0;
      let skippedMappingCount = 0;
      let futureRejectedCount = 0;

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (logs.length === 0) {
        alert("📊 Biometric Pull Complete: 0 records found on device.");
        return;
      }

      if (syncSelection.size === 0 && !window.confirm("No specific employees selected. Proceed to pull attendance for ALL employees?")) {
        setSyncLoading(false);
        return;
      }

      // Base minimum date (May 1st, 2026) per business requirements
      const HARD_MIN_DATE = new Date("2026-05-01T00:00:00");
      
      const customFrom = syncDateRange.from ? new Date(`${syncDateRange.from}T00:00:00`) : null;
      const customTo = syncDateRange.to ? new Date(`${syncDateRange.to}T23:59:59`) : null;

      let legacyRejectedCount = 0;
      let rangeRejectedCount = 0;

      console.log("Sync DEBUG: Raw logs received:", logs);
      if (logs.length > 0) console.table(logs.slice(0, 10).map(l => ({ empId: l.empId, punchIn: l.punchIn, punchOut: l.punchOut })));

      const nextRecords = { ...records };
      logs.forEach(log => {
        const logDate = new Date(log.year, log.month - 1, log.day);
        
        if (logDate > today) {
          futureRejectedCount++;
          return;
        }

        // 1. HARD CUTOFF: Ignore logs prior to May 1st 2026
        if (logDate < HARD_MIN_DATE) {
          legacyRejectedCount++;
          return;
        }

        // 2. CUSTOM DATE RANGE
        if (customFrom && logDate < customFrom) {
          rangeRejectedCount++;
          return;
        }
        if (customTo && logDate > customTo) {
          rangeRejectedCount++;
          return;
        }

        // STRICT MAPPING: Only use Biometrics ID (biometricCode)
        const internalId = bioIdMap[String(log.empId)];
        if (!internalId) {
          skippedMappingCount++;
          return;
        }

        // 3. EMPLOYEE SELECTION FILTER
        if (syncSelection.size > 0 && !syncSelection.has(internalId)) {
          // Exclude if specific employees are checked, but this employee isn't one of them
          return;
        }

        const dStr = `${log.year}-${String(log.month).padStart(2, '0')}-${String(log.day).padStart(2, '0')}`;
        const logKey = `${internalId}_${dStr}`;
        // FORCE OVERWRITE: If the existing record is from DB or previous sync, allow update
        const existing = nextRecords[logKey];
        const canOverwrite = !existing || existing.source !== 'Manual';

        if (canOverwrite) {
          let finalOut = log.punchOut;
          if (finalOut === log.punchIn) {
            finalOut = null; // Prevent single punch from duplicating into both IN and OUT
          }
          
          const entry = {
            punchIn: log.punchIn,
            punchOut: finalOut,
            remark: log.remark || 'Identix Hardware Pull',
            source: 'Biometric Terminal'
          };
          nextRecords[logKey] = entry;
          recordsToSave[logKey] = entry;
          addedCount++;

          // Check movement exceptions & auto-closures for synced biometric logs
          if (log.punchOut) {
            dataService.checkMovementException(internalId, dStr, log.punchOut).catch(console.error);
          }
          if (log.punchIn) {
            dataService.autoCloseMovementRequest(internalId, dStr, log.punchIn).catch(console.error);
          }
        }
      });

      setRecords(nextRecords);

      if (Object.keys(recordsToSave).length > 0) {
        console.log("Sync DEBUG: Committing to database...", recordsToSave);
        await dataService.saveAttendance(recordsToSave);
      }

      // FORCE REFRESH: Re-fetch existing from DB to ensure state is perfectly synced
      const freshAtt = await dataService.getAttendance().catch(() => ({}));
      setRecords(freshAtt);

      const timestamp = new Date().toLocaleString();
      setLastSync(timestamp);
      await dataService.saveConfig('biometric_last_sync', timestamp);

      console.log(`Sync completed. Added ${addedCount}, Skipped Mapping ${skippedMappingCount}, Future Rejected ${futureRejectedCount}, Legacy Rejected ${legacyRejectedCount}, Outside Range ${rangeRejectedCount}`);
      alert(`✅ Biometric Sync Successful\n\n- Records Synced: ${addedCount}\n- Legacy Ignored (< May 2026): ${legacyRejectedCount}\n- Skipped (No ID match): ${skippedMappingCount}\n\nData is permanently stored in the database.`);
    } catch (err) {
      console.error("Sync Error Detailed:", err);
      // Surface the actual error message to the user for better debugging
      const errorMsg = err.message || 'Unknown Error';
      
      if (errorMsg.includes("Permission Denied") || errorMsg.includes("Database Error")) {
        alert("📊 " + errorMsg + "\n\nThis usually means the biometric terminal is reached, but the HRMS cannot save the logs to the database. Please check your internet connection or database permissions.");
      } else {
        alert("🔌 Connectivity Issue\n\nTechnical Error: " + errorMsg + "\n\nFailed to reach the terminal at " + bioConfig.ip + ". Even if Ethernet is connected, ensure your local firewall allows traffic on port " + bioConfig.port + ".");
      }
    } finally {
      setSyncLoading(false);
    }
  };

  // ── Handle Excel/CSV Import ────────────────────────────────────────────────
  const handleFileSelect = async (file) => {
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    try {
      const logs = await BiometricService.parseMonthlyPunchesReport(file);
      setImportPreview({ logs, filename: file.name });
    } catch (err) {
      alert(`❌ Failed to parse file: ${err.message}`);
      setImportFile(null);
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (isEmployee) {
      alert("Unauthorized: Employees cannot import attendance data.");
      return;
    }
    if (!importPreview?.logs?.length) return;
    setImportLoading(true);
    try {
      // Map empId (EmpCode from file) → internal ID via employees list
      const empCodeMap = {};
      employeesList.forEach(e => {
        if (e.empCode) empCodeMap[String(e.empCode).trim()] = e.id;
        if (e.biometricCode) empCodeMap[String(e.biometricCode).trim()] = e.id;
      });

      const recordsToSave = {};
      let matched = 0, skipped = 0;

      importPreview.logs.forEach(log => {
        const internalId = empCodeMap[String(log.empId).trim()];
        if (!internalId) { skipped++; return; }
        const dStr = `${log.year}-${String(log.month).padStart(2, '0')}-${String(log.day).padStart(2, '0')}`;
        const key = `${internalId}_${dStr}`;
        recordsToSave[key] = {
          punchIn: log.punchIn,
          punchOut: log.punchOut,
          remark: log.remark,
          source: 'Excel Import'
        };
        matched++;
      });

      if (Object.keys(recordsToSave).length > 0) {
        await dataService.saveAttendance(recordsToSave);
        const fresh = await dataService.getAttendance().catch(() => ({}));
        setRecords(fresh);
      }

      const timestamp = new Date().toLocaleString();
      setLastSync(`Import: ${timestamp}`);
      alert(`✅ Import Successful!\n\n• Records Imported: ${matched}\n• Skipped (no EmpCode match): ${skipped}\n\nData saved to database.`);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (err) {
      alert(`❌ Import Failed: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const getRecord = (empId, day) => {
    if (!records) return null;
    return records[key(empId, day)] || null;
  };

  const saveRecord = async ({ punchIn, punchOut, remark, source }) => {
    if (isEmployee) {
      alert("Unauthorized: Employees cannot edit or save attendance records.");
      return;
    }
    const { empId, day } = punchModal;
    const keyStr = key(empId, day);
    const existingRecord = records[keyStr] || {};

    const newRecords = {
      ...records,
      [keyStr]: { punchIn, punchOut, remark, source }
    };
    setRecords(newRecords);
    await dataService.saveAttendance(newRecords);

    // Maintain audit log for modifications
    const logPayload = {
      attendanceId: keyStr,
      previousTiming: {
        punchIn: existingRecord.punchIn || null,
        punchOut: existingRecord.punchOut || null,
        remark: existingRecord.remark || null,
        source: existingRecord.source || null
      },
      updatedTiming: {
        punchIn,
        punchOut,
        remark,
        source
      },
      adminName: currentUser?.name || 'System Admin',
      reason: remark || 'No reason specified'
    };
    await dataService.saveAttendanceAuditLog(logPayload);

    setPunchModal(null);
  };

  const dayStatus = (empId, day, dow) => {
    // Check movement requests first so they show on the calendar
    if (leaveRequests && leaveRequests.length > 0) {
      const activeMovement = leaveRequests.find(l => {
        if (l.status !== 'Approved') return false;
        if (l.type !== 'Out Duty Request' && l.type !== 'Out Pass Request') return false;
        if (String(l.empId || l.emp_id) !== String(empId)) return false;
        
        const reqDateStr = l.start_date || l.data?.date || l.data?.startDate || l.data?.requestDate;
        if (!reqDateStr) return false;
        
        const [y, m, dNum] = reqDateStr.split('-');
        return parseInt(y) === year && parseInt(m) - 1 === month && parseInt(dNum) === day;
      });

      if (activeMovement) {
        if (activeMovement.type === 'Out Duty Request') return 'out-duty';
        if (activeMovement.type === 'Out Pass Request') return 'out-pass';
      }
    }

    const rec = getRecord(empId, day);
    
    // ODD SATURDAY LOGIC: 1st, 3rd, 5th
    const saturdayNumber = Math.ceil(day / 7);
    const isOddSaturday = dow === 6 && (saturdayNumber === 1 || saturdayNumber === 3 || saturdayNumber === 5);
    
    if (holidaySet.has(day) || isOddSaturday || dow === 0) {
      // Only count as worked if they actually punched in. 
      // An empty 'Absent' record should just show as a regular holiday.
      return (rec && rec.punchIn) ? 'holiday-worked' : 'holiday';
    }
    
    if (rec) return rec.punchOut ? 'present' : 'punch-in-only';

    if (!year || !month || !day) return 'future';

    // Normalize comparison to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(year, month, day);
    if (dayDate > today) return 'future';
    return 'absent';
  };

  const STATUS_STYLE = {
    'present': { bg: 'rgba(34,197,94,0.10)', border: 'var(--color-success)', color: 'var(--color-success)' },
    'punch-in-only': { bg: 'rgba(245,158,11,0.10)', border: 'var(--color-warning)', color: 'var(--color-warning)' },
    'holiday': { bg: 'rgba(239,68,68,0.07)', border: 'transparent', color: 'var(--color-danger)' },
    'holiday-worked': { bg: 'rgba(245,158,11,0.15)', border: 'var(--color-warning)', color: '#b45309' },
    'absent': { bg: 'rgba(239,68,68,0.07)', border: 'var(--color-danger)', color: 'var(--color-danger)' },
    'out-duty': { bg: 'rgba(59,130,246,0.1)', border: 'var(--color-primary)', color: 'var(--color-primary)' }, // Blue for Out Duty
    'out-pass': { bg: 'rgba(168,85,247,0.1)', border: '#a855f7', color: '#a855f7' }, // Purple for Out Pass
    'future': { bg: 'transparent', border: 'var(--color-border)', color: 'var(--color-text-muted)' },
  };

  const filteredEmps = useMemo(() => {
    let list = employeesList || [];
    if (isManager && !isAdmin) {
      list = list.filter(e => e.managerIds && e.managerIds.map(String).includes(String(myEmployeeProfile?.id)));
    }
    return list.filter(e =>
      (e.name || '').toLowerCase().includes((searchQ || '').toLowerCase())
    );
  }, [employeesList, isManager, isAdmin, myEmployeeProfile, searchQ]);

  // Summary stats for selected employee
  const presentDays = selectedEmp ? calDays.filter(({ day }) => ['present', 'punch-in-only', 'holiday-worked'].includes(dayStatus(selectedEmp.id, day, new Date(year, month, day).getDay()))).length : 0;
  const absentDays = selectedEmp ? calDays.filter(({ day, dow }) => dayStatus(selectedEmp.id, day, dow) === 'absent').length : 0;
  const holidayDays = selectedEmp ? calDays.filter(({ day }) => dayStatus(selectedEmp.id, day) === 'holiday').length : 0;
  const holidayWorked = selectedEmp ? calDays.filter(({ day }) => dayStatus(selectedEmp.id, day) === 'holiday-worked').length : 0;

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>Loading attendance matrix...</p>
        </div>
      </div>
    );
  }

  // Show a helpful error when the employee account cannot be linked to an employee record
  if (isEmployee && !selectedEmp) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🔗</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem' }}>Account Not Yet Linked</h2>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Your login account (<strong>{currentUser?.email}</strong>) could not be matched to an employee record in the system.
            Please contact your HR Administrator to link your account.
          </p>
          <div style={{ backgroundColor: 'rgba(37,99,235,0.05)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(37,99,235,0.1)', textAlign: 'left' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>What HR needs to verify:</p>
            <ul style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Your employee record email matches your login email: <strong>{currentUser?.email}</strong></li>
              <li>Or your employee name matches your account name: <strong>{currentUser?.name}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance & Timesheets</h1>
          <p className="page-subtitle">Monthly working calendar with manual punch-in/out for every day.</p>
        </div>
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }}
            onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
          <span style={{ fontWeight: '700', fontSize: '1rem', minWidth: '140px', textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }}
            onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
        </div>

        {/* Biometric Controls */}
        {!isEmployee && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Sync Range:</span>
              <input type="date" value={syncDateRange.from} onChange={e => setSyncDateRange(p => ({ ...p, from: e.target.value }))} style={{ fontSize: '0.75rem', padding: '0.2rem', border: 'none', background: 'transparent' }} title="From Date" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>to</span>
              <input type="date" value={syncDateRange.to} onChange={e => setSyncDateRange(p => ({ ...p, to: e.target.value }))} style={{ fontSize: '0.75rem', padding: '0.2rem', border: 'none', background: 'transparent' }} title="To Date" />
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setShowBioConfig(true)}
              title="Biometric Setup"
            >
              <Settings size={18} />
            </button>
            <button
              className={`btn ${syncLoading ? 'btn-ghost' : 'btn-primary'}`}
              onClick={handleBioSync}
              disabled={syncLoading || !bioConfig.isEnabled}
              title={syncSelection.size > 0 ? `Pull data for ${syncSelection.size} selected employees` : "Pull data for ALL employees"}
            >
              <Activity size={18} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? 'Connecting...' : (syncSelection.size > 0 ? `Sync (${syncSelection.size})` : 'Sync All')}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowImportModal(true)}
              title="Import Monthly Punches Report (Excel/CSV)"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Upload size={18} />
              Import Excel
            </button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '0.75rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              title="Purge Future Attendance (May 16+)"
              onClick={async () => {
                if (window.confirm("⚠️ CRITICAL ACTION: This will PERMANENTLY delete all attendance records dated AFTER today (May 15). Proceed?")) {
                  try {
                    const count = await dataService.deleteFutureAttendance();
                    alert(`Success: Purged ${count} invalid future records.`);
                    window.location.reload();
                  } catch (e) {
                    alert("Purge failed: " + e.message);
                  }
                }
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Biometric Integration Dashboard */}
      {bioConfig.isEnabled && devices[0] && !isEmployee && (
        <div className="card" style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(37,99,235,0.03) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)'
        }}>
          {/* Bridge Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: devices[0].bridgeStatus === 'Online' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: devices[0].bridgeStatus === 'Online' ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              <Activity size={20} className={devices[0].activeSessionState !== 'idle' ? 'animate-pulse' : ''} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bridge Service</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  {devices[0].bridgeStatus || 'Offline'}
                </span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: devices[0].bridgeStatus === 'Online' ? 'var(--color-success)' : 'var(--color-danger)',
                  boxShadow: devices[0].bridgeStatus === 'Online' ? '0 0 8px var(--color-success)' : 'none'
                }}></span>
              </div>
            </div>
          </div>

          {/* Machine Connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: devices[0].status === 'Online' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: devices[0].status === 'Online' ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biometric Terminal</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  {devices[0].status || 'Offline'}
                </span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: devices[0].status === 'Online' ? 'var(--color-success)' : 'var(--color-danger)',
                  boxShadow: devices[0].status === 'Online' ? '0 0 8px var(--color-success)' : 'none'
                }}></span>
              </div>
            </div>
          </div>

          {/* Last Sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37,99,235,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Auto-Sync Check</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-main)', marginTop: '0.15rem' }}>
                {devices[0].lastSyncTime ? new Date(devices[0].lastSyncTime).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          {/* Records & Active State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(79,70,229,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cumulative Synced Logs</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  {devices[0].totalRecordsSynced || 0}
                </span>
                {devices[0].activeSessionState !== 'idle' && (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem', animation: 'pulse 1.5s infinite' }}>
                    {devices[0].activeSessionState === 'connecting' ? 'Connecting...' : 'Syncing...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info details */}
          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span><strong>Device:</strong> {devices[0].deviceName} ({devices[0].model})</span>
            <span>•</span>
            <span><strong>Serial:</strong> {devices[0].serialNumber}</span>
            <span>•</span>
            <span><strong>Terminal IP:</strong> {devices[0].ip}</span>
            <span>•</span>
            <span><strong>Terminal Stats:</strong> {devices[0].userCount} Users | {devices[0].logCount} Logs</span>
            {devices[0].lastError && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} /> {devices[0].lastError}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isEmployeeOnly ? '1fr' : '220px 1fr', gap: '1.5rem' }}>

        {/* Employee sidebar */}
        {!isEmployeeOnly && (
          <div className="card" style={{ padding: '1rem', alignSelf: 'start' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div className="header-search" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <Search size={16} color="var(--color-text-muted)" />
                <input type="text" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ fontSize: '0.875rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>{syncSelection.size} selected for sync</span>
                <button 
                  onClick={() => {
                    if (syncSelection.size === filteredEmps.length) setSyncSelection(new Set());
                    else setSyncSelection(new Set(filteredEmps.map(e => e.id)));
                  }}
                  style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {syncSelection.size === filteredEmps.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredEmps.map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={syncSelection.has(emp.id)}
                    onChange={(e) => {
                      const next = new Set(syncSelection);
                      if (e.target.checked) next.add(emp.id);
                      else next.delete(emp.id);
                      setSyncSelection(next);
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    title="Select for Biometric Sync"
                  />
                  <button onClick={() => setSelectedEmp(emp)}
                    style={{
                      flex: 1, textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                      borderColor: selectedEmp?.id === emp.id ? 'var(--color-primary)' : 'transparent',
                      backgroundColor: selectedEmp?.id === emp.id ? 'rgba(37,99,235,0.08)' : 'var(--color-surface)',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-main)' }}>{emp.name}</p>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-primary)', backgroundColor: 'rgba(37,99,235,0.06)', padding: '2px 4px', borderRadius: '4px' }}>
                        {emp.biometricCode || `No Bio ID`}
                      </span>
                    </div>
                    <span className={`badge ${BADGE_COLOR[emp.category]}`} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{emp.category}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Days Present', val: presentDays, color: 'var(--color-success)' },
              { label: 'Days Absent', val: absentDays, color: 'var(--color-danger)' },
              { label: 'Holidays', val: holidayDays, color: 'var(--color-text-muted)' },
              { label: 'Holiday OT Days', val: holidayWorked, color: 'var(--color-warning)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color, margin: 0 }}>{val}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Calendar header */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CalendarDays size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                  {selectedEmp?.name || 'No employee selected'} — {MONTH_NAMES[month]} {year}
                </h3>
                {selectedEmp && <span className={`badge ${BADGE_COLOR[selectedEmp.category]}`} style={{ fontSize: '0.75rem' }}>{selectedEmp.category}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                {[
                  ['🟢 Present', '#16a34a'],
                  ['🟡 Incomplete', '#b45309'],
                  ['🔴 Absent', 'var(--color-danger)'],
                  ['⚫ Holiday', 'var(--color-text-muted)'],
                  ['🟠 Holiday OT', '#b45309'],
                ].map(([l, c]) => (
                  <span key={l} style={{ color: c, fontWeight: '500' }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Day-of-week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {DAY_ABBR.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', padding: '0.4rem 0', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            {(() => {
              const firstDow = (year && month !== undefined) ? new Date(year, month, 1).getDay() : 0;
              const cells = [
                ...Array(firstDow).fill(null),
                ...calDays
              ];
              // pad to complete rows
              while (cells.length % 7 !== 0) cells.push(null);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {cells.map((cell, idx) => {
                    if (!cell) return <div key={`blank-${idx}`} />;
                    const { day, dow } = cell;
                    const st = (selectedEmp && selectedEmp.id) ? dayStatus(selectedEmp.id, day, dow) : 'future';
                    const sty = (STATUS_STYLE[st] || STATUS_STYLE['future']);
                    const rec = selectedEmp ? getRecord(selectedEmp.id, day) : null;
                    const isHol = holidaySet.has(day);
                    const holType = holTypeMap[day];
                    const clickable = st !== 'future';

                    return (
                      <div key={day}
                        onClick={() => !isEmployee && clickable && selectedEmp && setPunchModal({ day, year, month, empId: selectedEmp.id, name: selectedEmp.name, punchIn: rec?.punchIn, punchOut: rec?.punchOut, remark: rec?.remark, isHoliday: isHol })}
                        style={{
                          minHeight: '76px',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: `1px solid ${sty.border}`,
                          backgroundColor: sty.bg,
                          cursor: (clickable && !isEmployee) ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                        {/* Day number */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.875rem', color: sty.color }}>{day}</span>
                          {rec && !isEmployee && <Edit3 size={10} color="var(--color-text-muted)" />}
                        </div>

                        {/* Holiday label */}
                        {isHol && (
                          <span style={{ fontSize: '0.6rem', color: st === 'holiday-worked' ? '#b45309' : 'var(--color-text-muted)', fontWeight: '600', lineHeight: 1.2 }}>
                            {holType}{st === 'holiday-worked' ? ' OT' : ''}
                          </span>
                        )}

                        {/* Punch times */}
                        {rec?.punchIn && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: '600' }}>▶ {rec.punchIn}</span>
                        )}
                        {rec?.punchOut && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)', fontWeight: '600' }}>◼ {rec.punchOut}</span>
                        )}
                        {rec?.punchIn && rec?.punchOut && (
                          <span style={{ fontSize: '0.6rem', color: st === 'holiday-worked' ? 'var(--color-warning)' : 'var(--color-text-muted)', fontWeight: st === 'holiday-worked' ? '700' : '400' }}>
                            {st === 'holiday-worked' ? `OT: ${calcNetOT(rec.punchIn, rec.punchOut)}` : diffHHMM(rec.punchIn, rec.punchOut)?.text || '—'}
                          </span>
                        )}
                        {st === 'absent' && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)', fontWeight: '600' }}>Absent</span>
                        )}
                        {st === 'punch-in-only' && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-warning)' }}>No punch-out</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Log table for this employee this month */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📋 Attendance Log — {MONTH_NAMES[month]} {year}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Day</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Punch In</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Punch Out</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Duration</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Source</th>
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'left' }}>Remark</th>
                    {!isEmployee && <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {calDays.map(({ day, dow }) => {
                    const rec = selectedEmp ? getRecord(selectedEmp.id, day) : null;
                    const st = selectedEmp ? dayStatus(selectedEmp.id, day, dow) : 'future';
                    const isHol = holidaySet.has(day);
                    const res = rec ? diffHHMM(rec.punchIn, rec.punchOut) : null;
                    const dur = isHol && res ? calcNetOT(rec.punchIn, rec.punchOut) : res?.text;
                    const STATUS_BADGE = {
                      'present': { label: 'Present', cls: 'badge-success' },
                      'punch-in-only': { label: 'Incomplete', cls: 'badge-warning' },
                      'holiday': { label: isHol ? holTypeMap[day] : 'Sunday', cls: 'badge-default' },
                      'holiday-worked': { label: 'Holiday OT', cls: 'badge-warning' },
                      'absent': { label: 'Absent', cls: 'badge-danger' },
                      'future': { label: '—', cls: '' },
                    };
                    const badge = STATUS_BADGE[st] || STATUS_BADGE['future'];
                    return (
                      <tr key={day} style={{ borderBottom: '1px solid var(--color-border)', opacity: st === 'future' ? 0.45 : 1 }}>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{pad2(day)}/{pad2(month + 1)}/{year}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>{DAY_ABBR[dow]}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-success)', fontWeight: '600' }}>{rec?.punchIn || '—'}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-danger)', fontWeight: '600' }}>{rec?.punchOut || '—'}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{dur || '—'}</td>
                        <td style={{ padding: '0.75rem' }}><span className={`badge ${badge.cls}`} style={{ fontSize: '0.75rem' }}>{badge.label}</span></td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{rec?.source || (isHol ? 'Holiday' : '—')}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec?.remark || '—'}</td>
                        {!isEmployee && (
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {st !== 'future' && (
                              <button className="btn btn-outline"
                                onClick={() => selectedEmp && setPunchModal({ day, year, month, empId: selectedEmp.id, name: selectedEmp.name, punchIn: rec?.punchIn, punchOut: rec?.punchOut, remark: rec?.remark, isHoliday: isHol })}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                                <Edit3 size={13} /> {rec ? 'Edit' : 'Punch'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Biometric Sync Overlay */}
      {syncLoading && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '1rem' }}></div>
          <p style={{ fontWeight: '600', color: 'var(--color-primary)' }}>Synchronizing with Identix Terminal...</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Pulling logs from {bioConfig.ip}:{bioConfig.port}</p>
        </div>
      )}

      {/* Biometric Integration Settings Modal */}
      {showBioConfig && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Biometric Integration</h3>
              <button onClick={() => setShowBioConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ backgroundColor: 'rgba(37,99,235,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '3px solid var(--color-primary)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                <strong>Identix X2008 Setup:</strong> This model supports push-mode. Ensure the device is connected to the same Ethernet segment and the "Push Protocol" is enabled in hardware settings.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>Master Biometric Integration</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Toggle entire hardware sync on/off</p>
                </div>
                <div
                  onClick={() => setBioConfig({ ...bioConfig, isEnabled: !bioConfig.isEnabled })}
                  style={{
                    width: '48px', height: '26px', borderRadius: '13px', padding: '2px', cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: bioConfig.isEnabled ? 'var(--color-success)' : '#cbd5e1',
                    display: 'flex', justifyContent: bioConfig.isEnabled ? 'flex-end' : 'flex-start'
                  }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              <div style={{ opacity: bioConfig.isEnabled ? 1 : 0.5, pointerEvents: bioConfig.isEnabled ? 'auto' : 'none', transition: 'all 0.3s' }}>
                <div className="form-group">
                  <label className="form-label">Terminal IP Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bioConfig.ip}
                    placeholder="e.g. 192.168.1.201"
                    onChange={(e) => setBioConfig({ ...bioConfig, ip: e.target.value })}
                    style={{ width: '100%', marginTop: '0.4rem', borderColor: !bioConfig.ip ? 'var(--color-danger)' : 'var(--color-border)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Communication Port *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bioConfig.port}
                    placeholder="e.g. 4370"
                    onChange={(e) => setBioConfig({ ...bioConfig, port: e.target.value })}
                    style={{ width: '100%', marginTop: '0.4rem', borderColor: !bioConfig.port ? 'var(--color-danger)' : 'var(--color-border)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-ghost" onClick={() => setShowBioConfig(false)}>Cancel</button>
              <button className="btn btn-primary"
                disabled={!bioConfig.ip || !bioConfig.port}
                onClick={async () => {
                  await dataService.saveBiometricConfig(bioConfig);
                  setShowBioConfig(false);
                  alert("Biometric configuration saved permanently.");
                }}>Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '720px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={22} color="var(--color-success)" /> Import Monthly Punches Report
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Upload the Excel/CSV exported from ZKTeco / eSSL / BioTime software
                </p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} /></button>
            </div>

            {/* File Drop Zone */}
            {!importPreview && (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '3rem',
                cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--color-surface)',
                marginBottom: '1.5rem'
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-border)'; handleFileSelect(e.dataTransfer.files[0]); }}
              >
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
                {importLoading ? (
                  <p style={{ color: 'var(--color-primary)', fontWeight: '600' }}>⏳ Parsing file...</p>
                ) : (
                  <>
                    <Upload size={40} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontWeight: '700', margin: 0 }}>Drop file here or click to browse</p>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Accepts: .xlsx, .xls, .csv — Monthly Punches Report format
                    </p>
                  </>
                )}
              </label>
            )}

            {/* Preview Table */}
            {importPreview && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid var(--color-success)', borderRadius: '8px' }}>
                  <CheckCircle2 size={18} color="var(--color-success)" />
                  <span style={{ fontWeight: '600', color: 'var(--color-success)' }}>
                    {importPreview.logs.length} records parsed from {importPreview.filename}
                  </span>
                </div>

                <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Preview (first 10 records):</p>
                <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th style={{ padding: '0.6rem', textAlign: 'left' }}>EmpCode</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left', color: 'var(--color-success)' }}>Punch In</th>
                        <th style={{ padding: '0.6rem', textAlign: 'left', color: 'var(--color-danger)' }}>Punch Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.logs.slice(0, 10).map((log, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.6rem', fontWeight: '600' }}>{log.empId}</td>
                          <td style={{ padding: '0.6rem' }}>{String(log.day).padStart(2,'0')}/{String(log.month).padStart(2,'0')}/{log.year}</td>
                          <td style={{ padding: '0.6rem', color: 'var(--color-success)', fontWeight: '600' }}>{log.punchIn || '—'}</td>
                          <td style={{ padding: '0.6rem', color: 'var(--color-danger)', fontWeight: '600' }}>{log.punchOut || 'Not punched'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importPreview.logs.length > 10 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                    ... and {importPreview.logs.length - 10} more records
                  </p>
                )}

                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid var(--color-warning)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-warning)' }}>
                    <strong>EmpCode Matching:</strong> Records will be matched to employees using the EmpCode column. Ensure your employee records have matching EmpCodes configured in their profiles.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => { setImportFile(null); setImportPreview(null); }}>
                    Choose Different File
                  </button>
                  <button className="btn btn-primary" onClick={handleConfirmImport} disabled={importLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {importLoading ? '⏳ Saving...' : <><CheckCircle2 size={16} /> Confirm Import ({importPreview.logs.length} records)</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Punch modal */}
      {punchModal && (
        <PunchModal entry={punchModal} onSave={saveRecord} onClose={() => setPunchModal(null)} />
      )}
    </div>
  );
};

export default Attendance;

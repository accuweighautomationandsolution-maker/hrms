import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Clock, Activity, CheckCircle, XCircle, Edit3, Save, X, CalendarDays, Settings } from 'lucide-react';
import { BiometricService } from '../services/biometrics';
import { getHolidayDates } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const pad2     = (n) => String(n).padStart(2, '0');
const hhmm     = (h, m) => `${pad2(h)}:${pad2(m)}`;
const toMins   = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
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
  'Staff Employee':    'badge-primary',
  'On role worker':    'badge-success',
  'Contractual Worker':'badge-warning',
};

// ── Punch-edit modal ────────────────────────────────────────────────────────
const PunchModal = ({ entry, onSave, onClose }) => {
  const [punchIn,  setPunchIn]  = useState(entry.punchIn  || '09:00');
  const [punchOut, setPunchOut] = useState(entry.punchOut || '');
  const [remark,   setRemark]   = useState(entry.remark   || '');

  const res      = diffHHMM(punchIn, punchOut);
  const duration = res?.text;
  const netOT    = entry.isHoliday ? calcNetOT(punchIn, punchOut) : null;

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
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}><X size={20}/></button>
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
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" 
            disabled={!punchIn || !punchOut || !remark.trim()}
            onClick={() => onSave({ punchIn, punchOut, remark, source: 'Manual' })}>
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
  const userRole    = authService.getUserRole();
  const isEmployee  = userRole === 'employee';

  const now      = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQ,     setSearchQ]     = useState('');
  const [punchModal,  setPunchModal]  = useState(null); // { day, ... }
  const [devices,     setDevices]     = useState([]);
  const [records,     setRecords]     = useState({});
  const [syncLoading,   setSyncLoading]   = useState(false);
  const [showBioConfig, setShowBioConfig] = useState(false);
  const [bioConfig,     setBioConfig]     = useState({ ip: '192.168.1.201', port: '4370', isEnabled: true });
  const [holidayList,   setHolidayList]   = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [emps, att, hol, bConf] = await Promise.all([
          dataService.getEmployees(),
          dataService.getAttendance(),
          dataService.getCustomHolidays(),
          dataService.getBiometricConfig()
        ]);
        setEmployeesList(emps);
        setRecords(att);
        setHolidayList(hol);
        if (bConf) setBioConfig(bConf);

        if (isEmployee) {
          const emp = emps.find(e => String(e.id) === String(currentUser?.id));
          setSelectedEmp(emp);
        } else if (emps.length > 0) {
          setSelectedEmp(emps[0]);
        }
      } catch (err) {
        console.error("Failed to load attendance data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id, isEmployee]);

  useEffect(() => {
    if (!bioConfig.isEnabled) {
      setDevices([]);
      return;
    }

    BiometricService.getDeviceStatus(bioConfig.ip, bioConfig.port).then(d => setDevices(d));
    
    // Subscribe to Push events for real-time reflection
    const unsubscribe = BiometricService.subscribeToPushEvents((punch) => {
      const now = new Date();
      const day = now.getDate();
      const m = now.getMonth();
      const y = now.getFullYear();
      
      // Only process if it's for the current displayed month/year (or always in background)
      const punchKey = `${punch.empId}_${y}_${m}_${day}`;
      
      setRecords(prev => {
        const existing = prev[punchKey] || {};
        return {
          ...prev,
          [punchKey]: {
            ...existing,
            punchIn: punch.type === 'Punch In' ? punch.time : (existing.punchIn || '09:00'),
            punchOut: punch.type === 'Punch Out' ? punch.time : (existing.punchOut || ''),
            remark: existing.remark || 'Real-time Push Sync',
            source: 'Biometric (Push)'
          }
        };
      });
    });

    return () => unsubscribe();
  }, [bioConfig]);

  // Persist records when they change (Side Effect)
  useEffect(() => {
    dataService.saveAttendance(records);
  }, [records]);

  const holidays   = useMemo(() => getHolidayDates(year, month, holidayList), [year, month, holidayList]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.day)), [holidays]);
  const holTypeMap = useMemo(() => Object.fromEntries(holidays.map(h => [h.day, h.type])), [holidays]);

  const calDays = useMemo(() => buildCalendar(year, month), [year, month]);

  const key = (empId, day) => `${empId}_${year}_${month}_${day}`;

  const handleBioSync = async () => {
    setSyncLoading(true);
    try {
      const logs = await BiometricService.fetchLogs(bioConfig.ip, bioConfig.port);
      const newRecords = { ...records };
      logs.forEach(log => {
        newRecords[key(log.empId, log.day)] = {
          punchIn: log.punchIn,
          punchOut: log.punchOut,
          remark: log.remark,
          source: 'Biometric'
        };
      });
      setRecords(newRecords);
      dataService.saveAttendance(newRecords);
      alert(`${logs.length} logs successfully synchronized from Identix Device.`);
    } catch (err) {
      alert('Failed to connect to Biometric Device. Please check IP/Port settings.');
    } finally {
      setSyncLoading(false);
    }
  };

  const getRecord = (empId, day) => records[key(empId, day)] || null;

  const saveRecord = ({ punchIn, punchOut, remark, source }) => {
    const { empId, day } = punchModal;
    const newRecords = {
      ...records,
      [key(empId, day)]: { punchIn, punchOut, remark, source }
    };
    setRecords(newRecords);
    dataService.saveAttendance(newRecords);
    setPunchModal(null);
  };

  const dayStatus = (empId, day, dow) => {
    const rec = getRecord(empId, day);
    if (holidaySet.has(day)) return rec ? 'holiday-worked' : 'holiday';
    if (dow === 0) return rec ? 'holiday-worked' : 'holiday'; // extra Sunday guard
    if (rec) return rec.punchOut ? 'present' : 'punch-in-only';

    // Normalize comparison to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(year, month, day);
    if (dayDate > today) return 'future';
    return 'absent';
  };

  const STATUS_STYLE = {
    'present':       { bg: 'rgba(34,197,94,0.10)',  border: 'var(--color-success)', color: 'var(--color-success)' },
    'punch-in-only': { bg: 'rgba(245,158,11,0.10)', border: 'var(--color-warning)', color: 'var(--color-warning)' },
    'holiday':       { bg: 'rgba(239,68,68,0.07)',  border: 'transparent',          color: 'var(--color-danger)' },
    'holiday-worked':{ bg: 'rgba(245,158,11,0.15)', border: 'var(--color-warning)', color: '#b45309' },
    'absent':        { bg: 'rgba(239,68,68,0.07)',  border: 'var(--color-danger)',   color: 'var(--color-danger)' },
    'future':        { bg: 'transparent',            border: 'var(--color-border)',  color: 'var(--color-text-muted)' },
  };

  const filteredEmps = employeesList.filter(e =>
    e.name.toLowerCase().includes(searchQ.toLowerCase())
  );

  // Summary stats for selected employee
  const presentDays   = selectedEmp ? calDays.filter(({ day }) => ['present','punch-in-only','holiday-worked'].includes(dayStatus(selectedEmp.id, day, new Date(year, month, day).getDay()))).length : 0;
  const absentDays    = selectedEmp ? calDays.filter(({ day, dow }) => dayStatus(selectedEmp.id, day, dow) === 'absent').length : 0;
  const holidayDays   = selectedEmp ? calDays.filter(({ day }) => dayStatus(selectedEmp.id, day) === 'holiday').length : 0;
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
            onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }}>‹</button>
          <span style={{ fontWeight: '700', fontSize: '1rem', minWidth: '140px', textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button className="btn btn-outline" style={{ padding: '0.5rem 0.75rem' }}
            onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }}>›</button>
        </div>
        
        {/* Biometric Controls */}
        {!isEmployee && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {bioConfig.isEnabled && devices[0] && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', padding: '0.4rem 0.6rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: devices[0].status === 'Online' ? 'var(--color-success)' : 'var(--color-danger)' }}></div>
                  <span style={{ fontWeight: '600' }}>X2008: {devices[0].status}</span>
               </div>
            )}
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
            >
              <Activity size={18} className={syncLoading ? 'animate-spin' : ''} />
              {syncLoading ? 'Connecting...' : 'Pull Hardware Data'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isEmployee ? '1fr' : '220px 1fr', gap: '1.5rem' }}>

        {/* Employee sidebar */}
        {!isEmployee && (
          <div className="card" style={{ padding: '1rem', alignSelf: 'start' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div className="header-search" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <Search size={16} color="var(--color-text-muted)" />
                <input type="text" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ fontSize: '0.875rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredEmps.map(emp => (
                <button key={emp.id} onClick={() => setSelectedEmp(emp)}
                  style={{ textAlign: 'left', padding: '0.75rem', borderRadius: '8px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                    borderColor:       selectedEmp?.id === emp.id ? 'var(--color-primary)' : 'transparent',
                    backgroundColor:   selectedEmp?.id === emp.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: 'var(--color-text-main)' }}>{emp.name}</p>
                    <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-primary)', backgroundColor: 'rgba(37,99,235,0.06)', padding: '2px 4px', borderRadius: '4px' }}>
                      {emp.empCode || emp.biometricCode || `B:${emp.biometricId}`}
                    </span>
                  </div>
                  <span className={`badge ${BADGE_COLOR[emp.category]}`} style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{emp.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Days Present',      val: presentDays,   color: 'var(--color-success)' },
              { label: 'Days Absent',        val: absentDays,    color: 'var(--color-danger)' },
              { label: 'Holidays',           val: holidayDays,   color: 'var(--color-text-muted)' },
              { label: 'Holiday OT Days',    val: holidayWorked, color: 'var(--color-warning)' },
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
                  ['🟢 Present',     '#16a34a'],
                  ['🟡 Incomplete',  '#b45309'],
                  ['🔴 Absent',      'var(--color-danger)'],
                  ['⚫ Holiday',     'var(--color-text-muted)'],
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
              const firstDow = new Date(year, month, 1).getDay();
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
                    const st    = selectedEmp ? dayStatus(selectedEmp.id, day, dow) : 'future';
                    const sty   = STATUS_STYLE[st] || STATUS_STYLE['future'];
                    const rec   = selectedEmp ? getRecord(selectedEmp.id, day) : null;
                    const isHol = holidaySet.has(day);
                    const holType = holTypeMap[day];
                    const clickable = st !== 'future';

                    return (
                      <div key={day}
                        onClick={() => clickable && selectedEmp && setPunchModal({ day, year, month, empId: selectedEmp.id, name: selectedEmp.name, punchIn: rec?.punchIn, punchOut: rec?.punchOut, remark: rec?.remark, isHoliday: isHol })}
                        style={{
                          minHeight: '76px',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: `1px solid ${sty.border}`,
                          backgroundColor: sty.bg,
                          cursor: clickable ? 'pointer' : 'default',
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
                          {rec && <Edit3 size={10} color="var(--color-text-muted)" />}
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
                    <th style={{ padding: '0.75rem', fontWeight: '500', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {calDays.map(({ day, dow }) => {
                    const rec = selectedEmp ? getRecord(selectedEmp.id, day) : null;
                    const st  = selectedEmp ? dayStatus(selectedEmp.id, day, dow) : 'future';
                    const isHol = holidaySet.has(day);
                    const res = rec ? diffHHMM(rec.punchIn, rec.punchOut) : null;
                    const dur = isHol && res ? calcNetOT(rec.punchIn, rec.punchOut) : res?.text;
                    const STATUS_BADGE = {
                      'present':       { label: 'Present',       cls: 'badge-success' },
                      'punch-in-only': { label: 'Incomplete',    cls: 'badge-warning' },
                      'holiday':       { label: isHol ? holTypeMap[day] : 'Sunday', cls: 'badge-default' },
                      'holiday-worked':{ label: 'Holiday OT',    cls: 'badge-warning' },
                      'absent':        { label: 'Absent',        cls: 'badge-danger' },
                      'future':        { label: '—',             cls: '' },
                    };
                    const badge = STATUS_BADGE[st] || STATUS_BADGE['future'];
                    return (
                      <tr key={day} style={{ borderBottom: '1px solid var(--color-border)', opacity: st === 'future' ? 0.45 : 1 }}>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{pad2(day)}/{pad2(month+1)}/{year}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>{DAY_ABBR[dow]}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-success)', fontWeight: '600' }}>{rec?.punchIn  || '—'}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-danger)',  fontWeight: '600' }}>{rec?.punchOut || '—'}</td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{dur || '—'}</td>
                        <td style={{ padding: '0.75rem' }}><span className={`badge ${badge.cls}`} style={{ fontSize: '0.75rem' }}>{badge.label}</span></td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{rec?.source || (isHol ? 'Holiday' : '—')}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec?.remark || '—'}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {st !== 'future' && (
                            <button className="btn btn-outline"
                              onClick={() => selectedEmp && setPunchModal({ day, year, month, empId: selectedEmp.id, name: selectedEmp.name, punchIn: rec?.punchIn, punchOut: rec?.punchOut, remark: rec?.remark, isHoliday: isHol })}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                              <Edit3 size={13} /> {rec ? 'Edit' : 'Punch'}
                            </button>
                          )}
                        </td>
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
              <button onClick={() => setShowBioConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
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
                    onChange={(e) => setBioConfig({...bioConfig, ip: e.target.value})}
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
                    onChange={(e) => setBioConfig({...bioConfig, port: e.target.value})}
                    style={{ width: '100%', marginTop: '0.4rem', borderColor: !bioConfig.port ? 'var(--color-danger)' : 'var(--color-border)' }} 
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-ghost" onClick={() => setShowBioConfig(false)}>Cancel</button>
              <button className="btn btn-primary" 
                disabled={!bioConfig.ip || !bioConfig.port}
                onClick={() => {
                dataService.saveBiometricConfig(bioConfig);
                setShowBioConfig(false);
              }}>Save Configuration</button>
            </div>
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

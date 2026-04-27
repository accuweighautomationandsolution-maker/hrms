import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { CalendarDays, Plus, Trash2, Edit3, Save, X, CheckCircle, Download, FileText, FileSpreadsheet, Printer, Mail } from 'lucide-react';
import { getHolidayDates } from '../utils/payrollCalculator';
import { dataService } from '../utils/dataService';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad2 = (n) => String(n).padStart(2, '0');

// Weekly Off Types kept for reference
const TYPE_COLORS = {
  'National': { bg: 'rgba(37,99,235,0.08)',   border: 'var(--color-primary)', badge: 'badge-primary' },
  'State':    { bg: 'rgba(139,92,246,0.08)',  border: '#8b5cf6',              badge: 'badge-default'  },
  'Festival': { bg: 'rgba(245,158,11,0.08)',  border: 'var(--color-warning)', badge: 'badge-warning'  },
  'Company':  { bg: 'rgba(34,197,94,0.08)',   border: 'var(--color-success)', badge: 'badge-success'  },
  'Weekly':   { bg: 'rgba(100,116,139,0.08)', border: 'var(--color-border)', badge:  'badge-default'  },
};

// ── Add / Edit Holiday Modal ─────────────────────────────────────────────
const HolidayModal = ({ initial, onSave, onClose }) => {
  const [name,       setName]       = useState(initial?.name       || '');
  const [fromDate,   setFromDate]   = useState(initial?.fromDate   || '');
  const [toDate,     setFromTill]   = useState(initial?.toDate     || '');
  const [type,       setType]       = useState(initial?.type       || 'Company');
  const [compulsory, setCompulsory] = useState(initial?.compulsory ?? true);
  const [desc,       setDesc]       = useState(initial?.desc       || '');

  const isEdit = !!initial?.id;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Holiday' : 'Add Holiday'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label">Holiday Name *</label>
            <input type="text" className="form-input" style={{ width: '100%', marginTop: '0.25rem', borderColor: !name.trim() ? 'var(--color-danger)' : 'var(--color-border)' }}
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali, Company Anniversary" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Holiday From *</label>
              <input type="date" className="form-input" style={{ width: '100%', marginTop: '0.25rem', borderColor: !fromDate ? 'var(--color-danger)' : 'var(--color-border)' }}
                value={fromDate} onChange={e => {
                  setFromDate(e.target.value);
                  if (!toDate) setFromTill(e.target.value);
                }} />
            </div>
            <div>
              <label className="form-label">Holiday Till *</label>
              <input type="date" className="form-input" style={{ width: '100%', marginTop: '0.25rem', borderColor: !toDate ? 'var(--color-danger)' : 'var(--color-border)' }}
                value={toDate} onChange={e => setFromTill(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" style={{ width: '100%', marginTop: '0.25rem' }}
                value={type} onChange={e => setType(e.target.value)}>
                <option value="National">National</option>
                <option value="State">State</option>
                <option value="Festival">Festival</option>
                <option value="Company">Company</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Description / Note</label>
            <input type="text" className="form-input" style={{ width: '100%', marginTop: '0.25rem' }}
              value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional reason or note" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={compulsory} onChange={e => setCompulsory(e.target.checked)}
              style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Compulsory Holiday (applies to all employees)</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
            disabled={!name.trim() || !fromDate || !toDate}
            onClick={() => onSave({ name: name.trim(), fromDate, toDate, type, compulsory, desc: desc.trim() })}>
            <Save size={16} /> {isEdit ? 'Update' : 'Add Holiday'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Holiday List Page ───────────────────────────────────────────────
const HolidayList = ({ userRole }) => {
  const isManagement = userRole === 'management';
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [customs, setCustoms] = useState([]);
  const [modal,   setModal]   = useState(null); // null | { mode:'add' } | { mode:'edit', id }
  const [filterType, setFilterType] = useState('All');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const data = await dataService.getCustomHolidays();
        setCustoms(data);
      } catch (err) {
        console.error("Failed to load holidays:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  // All weekly holidays for the full year (all 12 months)
  const weeklyHolidays = useMemo(() => {
    const all = [];
    for (let m = 0; m < 12; m++) {
      getHolidayDates(year, m).forEach(h => {
        all.push({
          fromDate: `${year}-${pad2(m + 1)}-${pad2(h.day)}`,
          toDate: `${year}-${pad2(m + 1)}-${pad2(h.day)}`,
          name: h.type,
          type: 'Weekly',
          compulsory: true,
          month: m,
          day: h.day,
        });
      });
    }
    return all;
  }, [year]);

  // Custom holidays filtered to selected year
  const yearCustoms = useMemo(() =>
    customs.filter(h => h.fromDate.startsWith(String(year))),
    [customs, year]
  );

  const allHolidays = useMemo(() => {
    // Only include weekly holidays in the list if explicitly filtered
    const combined = [
      ...yearCustoms.map(h => ({ ...h, _src: 'custom' })),
      ...(filterType === 'Weekly' ? weeklyHolidays.map(h => ({ ...h, id: `w_${h.fromDate}`, _src: 'weekly' })) : []),
    ];
    combined.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    return filterType === 'All' ? combined : combined.filter(h => h.type === filterType);
  }, [yearCustoms, weeklyHolidays, filterType]);

  // Group by month
  const byMonth = useMemo(() => {
    const map = {};
    allHolidays.forEach(h => {
      const mo = parseInt(h.fromDate.split('-')[1]) - 1;
      if (!map[mo]) map[mo] = [];
      map[mo].push(h);
    });
    return map;
  }, [allHolidays]);

  const handleAdd = async (data) => {
    const newList = [...customs, { ...data, id: Date.now() }];
    setCustoms(newList);
    await dataService.saveCustomHolidays(newList);
    setModal(null);
  };

  const handleEdit = async (data) => {
    const newList = customs.map(h => h.id === modal.id ? { ...h, ...data } : h);
    setCustoms(newList);
    await dataService.saveCustomHolidays(newList);
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this holiday from the list?')) {
      const newList = customs.filter(h => h.id !== id);
      setCustoms(newList);
      await dataService.saveCustomHolidays(newList);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const totalCustom = yearCustoms.length;
  const totalWeekly = weeklyHolidays.length;
  const totalCompulsory = allHolidays.filter(h => h.compulsory).length;

  const handleExport = (format) => {
    const rawData = allHolidays.map(h => ({
        "From Date": h.fromDate,
        "To Date": h.toDate,
        "Holiday Name": h.name,
        "Type": h.type,
        "Compulsory": h.compulsory ? "Yes" : "Optional"
    }));

    if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const csvString = "\uFEFF" + XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Holiday_List_${year}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Holiday_List");
        XLSX.writeFile(workbook, `Holiday_List_${year}.xlsx`);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holiday Calendar</h1>
          <p className="page-subtitle">
            Company-wide official holidays — special gazetted, national, state & festival holidays for {year}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Year switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem' }}
              onClick={() => setYear(y => y - 1)}>‹</button>
            <span style={{ fontWeight: '700', fontSize: '1rem', minWidth: '50px', textAlign: 'center' }}>{year}</span>
            <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem' }}
              onClick={() => setYear(y => y + 1)}>›</button>
          </div>
          <div style={{ position: 'relative' }} className="hide-on-print">
               <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                    <Download size={16} style={{ marginRight: '0.5rem' }} /> Export & Share
               </button>
               {showExportMenu && (
                   <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '0.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '200px' }}>
                        <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}><FileText size={16} style={{ marginRight: '0.5rem' }} /> CSV Data</button>
                        <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}><FileSpreadsheet size={16} style={{ marginRight: '0.5rem' }} /> Excel Workbook</button>
                        <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { window.print(); setShowExportMenu(false) }}><Printer size={16} style={{ marginRight: '0.5rem' }} /> Print / PDF</button>
                        <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem' }} onClick={() => { setShowEmailModal(true); setShowExportMenu(false) }}><Mail size={16} style={{ marginRight: '0.5rem' }} /> Email Report</button>
                   </div>
               )}
          </div>
          {isManagement && (
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })} className="hide-on-print">
              <Plus size={18} /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Special Holidays',    val: yearCustoms.length,   color: 'var(--color-primary)',  icon: '📅' },
          { label: 'Compulsory',          val: yearCustoms.filter(h => h.compulsory).length, color: 'var(--color-danger)', icon: '✅' },
          { label: 'Festival/National',   val: yearCustoms.filter(h => ['National', 'Festival'].includes(h.type)).length, color: 'var(--color-warning)', icon: '🏛️' },
          { label: 'Weekly Offs (yr)',    val: totalWeekly,          color: 'var(--color-success)',  icon: '📆' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
            <h3 style={{ fontSize: '2rem', fontWeight: '800', color, margin: 0 }}>{val}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Policy banner */}
      <div style={{ backgroundColor: 'rgba(37,99,235,0.06)', border: '1px solid var(--color-primary)', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>📌</span>
        <div>
          <p style={{ margin: 0, fontWeight: '600', color: 'var(--color-primary)' }}>Weekly Off Policy</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            All <strong>Sundays</strong> and the <strong>1st & 3rd Saturday</strong> of every month are official offs for all employees.
            On-role and Contractual workers who attend on these days are entitled to <strong>Full Shift OT</strong> (shift hours − 30 min lunch).
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'National', 'State', 'Festival', 'Company', 'Weekly'].map(f => (
          <button key={f} onClick={() => setFilterType(f)}
            className={filterType === f ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Month-grouped holiday list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {Object.entries(byMonth).map(([mo, holidays]) => (
          <div key={mo} className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📅 {MONTH_NAMES[Number(mo)]} {year}
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>({holidays.length} holiday{holidays.length > 1 ? 's' : ''})</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {holidays.map((h) => {
                const tc = TYPE_COLORS[h.type] || TYPE_COLORS['Company'];
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: tc.bg, border: `1px solid ${tc.border}` }}>
                    {/* Date box */}
                    <div style={{ minWidth: '80px', textAlign: 'center', backgroundColor: 'var(--color-background)', borderRadius: '8px', padding: '0.4rem', flexShrink: 0 }}>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: tc.border, lineHeight: 1 }}>
                        {h.fromDate === h.toDate ? h.fromDate.split('-')[2] : `${h.fromDate.split('-')[2]}-${h.toDate.split('-')[2]}`}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                        {h.fromDate === h.toDate ? new Date(h.fromDate).toLocaleDateString('en-IN', { weekday: 'short' }) : 'Range'}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{h.name}</span>
                        <span className={`badge ${tc.badge}`} style={{ fontSize: '0.7rem' }}>{h.type}</span>
                        {h.compulsory && <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Compulsory</span>}
                        {!h.compulsory && <span className="badge badge-default" style={{ fontSize: '0.7rem' }}>Optional</span>}
                      </div>
                      {h.desc && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{h.desc}</p>}
                    </div>

                    {/* Actions — custom only and only for management */}
                    {h._src === 'custom' && isManagement && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button className="btn btn-outline"
                          onClick={() => setModal({ mode: 'edit', id: h.id, ...h })}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleDelete(h.id)}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'none', border: '1px solid var(--color-danger)', borderRadius: '6px', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                    {h._src === 'weekly' && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Auto-generated</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit modal */}
      {modal?.mode === 'add' && (
        <HolidayModal initial={null} onSave={handleAdd} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <HolidayModal initial={modal} onSave={handleEdit} onClose={() => setModal(null)} />
      )}

      {showEmailModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Mail size={20} color="var(--color-primary)" /> Email Holiday List</h2>
                      <button onClick={() => setShowEmailModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
                  </div>
                  <div className="form-group">
                      <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Recipient Addresses (comma separated)</label>
                      <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem' }} placeholder="employees@company.com" />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Attached Formats</label>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> PDF Summary</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} /> Excel (.xlsx)</label>
                      </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label" style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Brief Message Text</label>
                      <textarea className="form-input" style={{ width: '100%', resize: 'vertical', padding: '0.75rem' }} rows="4" defaultValue={`Attached is the Holiday Calendar for ${year}. Please refer to the document for a breakdown of Compulsory vs Optional leaves.`}></textarea>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => { alert('Report successfully queued for email automation!'); setShowEmailModal(false); }}>
                      Dispatch Email
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default HolidayList;

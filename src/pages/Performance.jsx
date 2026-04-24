import React, { useState } from 'react';
import { Search, Filter, TrendingUp, Award, Target, Star, AlertCircle, CheckCircle, FileText, Plus, Trash2, MessageSquareShare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import FeedbackPortal from '../components/FeedbackPortal';

const PERFORMANCE_DATA = [
  { id: 501, name: 'Alice Smith', role: 'Software Engineer', dept: 'Engineering', lastMonthly: 4.2, lastHalfYearly: 4.5, lastAnnual: null, status: 'Pending Review' },
  { id: 502, name: 'Bob Johnson', role: 'DevOps Lead', dept: 'Operations', lastMonthly: null, lastHalfYearly: 3.8, lastAnnual: 4.1, status: 'Completed' },
  { id: 503, name: 'Charlie Davis', role: 'Product Manager', dept: 'Product', lastMonthly: 4.8, lastHalfYearly: 4.6, lastAnnual: null, status: 'Overdue' },
  { id: 504, name: 'Diana King', role: 'UI/UX Designer', dept: 'Design', lastMonthly: 4.0, lastHalfYearly: 4.2, lastAnnual: null, status: 'Pending Review' },
  { id: 505, name: 'Evan Wright', role: 'Junior Analyst', dept: 'Sales', lastMonthly: 3.5, lastHalfYearly: 3.9, lastAnnual: null, status: 'Pending Review' }
];

const CHART_DATA = [
  { department: 'Engineering', score: 4.4, color: '#2563eb' },
  { department: 'Operations', score: 3.9, color: '#f59e0b' },
  { department: 'Product', score: 4.6, color: '#10b981' },
  { department: 'Design', score: 4.1, color: '#6366f1' },
  { department: 'Sales', score: 4.3, color: '#8b5cf6' },
];

const SummaryCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: `4px solid ${colorClass}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>{title}</h4>
      <Icon size={20} style={{ color: colorClass }} />
    </div>
    <div>
      <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>{value}</span>
    </div>
    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</span>
  </div>
);

const getStatusBadgeClass = (status) => {
  if (status === 'Completed') return 'badge-success';
  if (status === 'Overdue') return 'badge-danger';
  return 'badge-warning';
};

const getScoreColor = (score) => {
  if (!score) return 'var(--color-text-muted)';
  if (score >= 4.5) return 'var(--color-success)';
  if (score >= 3.5) return 'var(--color-primary)';
  if (score >= 2.5) return 'var(--color-warning)';
  return 'var(--color-danger)';
};

const Performance = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [viewingRecord, setViewingRecord] = useState(null);
  const [feedbackConfig, setFeedbackConfig] = useState({ isOpen: false, empId: null, type: 'Appraisal Review' });

  const filteredData = useMemo(() => {
    return PERFORMANCE_DATA.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === 'All' || emp.dept === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [searchTerm, deptFilter]);

  const handleExport = () => {
    alert("Generating encrypted PDF Performance Report for all departments... \nSuccess! 'HRMS_Performance_Audit_2026.pdf' has been dispatched to your email.");
  };

  const openRecord = (empId) => {
    const history = dataService.getFeedbackHistory(empId);
    const emp = PERFORMANCE_DATA.find(e => e.id === empId);
    setViewingRecord({ emp, history });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>{label} Department</p>
          <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.25rem' }}>
            {payload[0].value} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>/ 5.0 Avg</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Performance Appraisals</h1>
          <p className="page-subtitle">Track, evaluate, and develop your team through structured 2026 KPIs.</p>
        </div>
        <button className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={handleExport}>
          <Target size={18} />
          Export All Records
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <SummaryCard title="FY 2026 Completion" value="20%" subtitle="1 of 5 appraisals completed" icon={CheckCircle} colorClass="var(--color-success)" />
        <SummaryCard title="Company Average Rating" value="4.26" subtitle="Across all active departments" icon={TrendingUp} colorClass="var(--color-primary)" />
        <SummaryCard title="Top Performer" value="Charlie D." subtitle="4.6 Overall Target (FY 2025)" icon={Award} colorClass="var(--color-warning)" />
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="var(--color-primary)" /> 
          Performance Distribution by Department
        </h2>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
              <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={48}>
                {CHART_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .rating-slider { width: 100%; cursor: pointer; accent-color: var(--color-primary); }
        .kpi-row { padding: 1rem 0; border-bottom: 1px solid var(--color-border); }
        .kpi-row:last-child { border-bottom: none; }
      `}</style>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2>Current Evaluation Cycle (FY 2026)</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="header-search" style={{ width: '250px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="form-input" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              {CHART_DATA.map(d => <option key={d.department} value={d.department}>{d.department}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Department</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>Latest Monthly</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>H1/H2 (Half-Yearly)</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>Annual Target</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Current Status</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-main)' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.role}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{emp.dept}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: getScoreColor(emp.lastMonthly) }}>
                    {emp.lastMonthly ? emp.lastMonthly.toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: getScoreColor(emp.lastHalfYearly) }}>
                    {emp.lastHalfYearly ? emp.lastHalfYearly.toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: getScoreColor(emp.lastAnnual) }}>
                    {emp.lastAnnual ? emp.lastAnnual.toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${getStatusBadgeClass(emp.status)}`}>{emp.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-ghost" 
                        title="View Historical Records"
                        onClick={() => openRecord(emp.id)}
                        style={{ padding: '0.4rem' }}
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} 
                        onClick={() => setFeedbackConfig({ isOpen: true, empId: emp.id, type: 'Appraisal Review' })}
                      >
                        <MessageSquareShare size={14} /> {emp.status === 'Completed' ? 'Review Again' : 'Begin Review'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                   <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>No matching records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appraisal Record Modal */}
      {viewingRecord && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Award size={24} color="var(--color-primary)" />
                <h2 style={{ margin: 0 }}>Performance History: {viewingRecord.emp.name}</h2>
              </div>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost">✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              {viewingRecord.history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                   <p>No historical feedback records found.</p>
                   <button className="btn btn-primary btn-sm" onClick={() => { setViewingRecord(null); setFeedbackConfig({ isOpen: true, empId: viewingRecord.emp.id, type: 'Appraisal Review' }); }}>Generate First Review</button>
                </div>
              ) : (
                viewingRecord.history.map(h => (
                  <div key={h.id} style={{ padding: '1.25rem', backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span className="badge badge-primary">{h.reviewType}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(h.reviewDate).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Overall Score: <span style={{ color: 'var(--color-primary)' }}>{h.overallScore || 'N/A'}/5</span></h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.comments}</p>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: '0.7rem' }}>Evaluated by: System Admin</span>
                       <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Full Details</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }} onClick={() => setViewingRecord(null)}>Close Viewer</button>
          </div>
        </div>
      )}

      {/* Persistence Layer Feedback Portal */}
      <FeedbackPortal 
        isOpen={feedbackConfig.isOpen}
        empId={feedbackConfig.empId}
        reviewType={feedbackConfig.type}
        onClose={() => setFeedbackConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};

export default Performance;

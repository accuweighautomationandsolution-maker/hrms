import React, { useState, useEffect } from 'react';
import { Users, UserCheck, CalendarOff, AlertCircle, Clock, BellRing, Settings } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { dataService } from '../utils/dataService';
import { Plus, Edit, Trash2, MessageSquareShare, ShieldCheck, Zap, ChevronRight, ExternalLink, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import FeedbackPortal from '../components/FeedbackPortal';
import RichTextEditor from '../components/RichTextEditor';
import { alertEngine } from '../utils/alertEngine';
import { authService } from '../utils/authService';
import { generateBoardReport } from '../utils/exportUtils';

const ATTENDANCE_DATA = [];

const FINANCE_DATA = [];

const KPI_DATA = [
  { subject: 'Technical Proficiency', A: 0, fullMark: 5 },
  { subject: 'Quality & Accuracy', A: 0, fullMark: 5 },
  { subject: 'Reliability (Attendance)', A: 0, fullMark: 5 },
  { subject: 'Communication', A: 0, fullMark: 5 },
  { subject: 'Leadership', A: 0, fullMark: 5 },
];

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
    <div className={`avatar ${colorClass}`} style={{ width: '60px', height: '60px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
      <Icon size={28} />
    </div>
    <div>
      <h3 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontWeight: '700' }}>{value}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>{title}</p>
    </div>
  </div>
);

const Dashboard = ({ userRole }) => {
  const currentUser = authService.getCurrentUser();
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [personalAttendance, setPersonalAttendance] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [personalTrajectory, setPersonalTrajectory] = useState([]);
  const [notices, setNotices] = useState([]);
  const [probations, setProbations] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ totalEmployees: 0, presentToday: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);

  const isEmployee = userRole === 'employee';

  // Handle Notice/Memo Acknowledgment
  const acknowledgeNoticeAlert = async (alertId, itemId) => {
    dataService.saveAcknowledgment({
      type: 'NOTICE',
      itemId: itemId,
      empId: currentUser.id,
      empName: currentUser.name
    });
    const alerts = await alertEngine.getDashboardAlerts(currentUser);
    setSmartAlerts(alerts);
  };

  const getInitialBulletin = () => {
    const saved = localStorage.getItem('hrms_bulletin_config');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    return {
      text: "🚨 <span style='color: var(--color-danger); font-weight: bold;'>URGENT:</span> Q1 Performance Appraisals & Self-Evaluations must be completed by Friday. &nbsp;&nbsp;&nbsp;&nbsp; ✦ &nbsp;&nbsp;&nbsp;&nbsp; ✅ <span style='color: var(--color-success); font-weight: bold;'>HOLIDAY DECLARED:</span> April 14th will be a company-wide holiday for Ambedkar Jayanti.",
      speed: 25,
      activation: new Date().toISOString().slice(0, 16),
      expiry: defaultExpiry.toISOString().slice(0, 16)
    };
  };

  const [bulletin, setBulletinState] = useState(getInitialBulletin);
  const setBulletin = (newConfig) => {
    localStorage.setItem('hrms_bulletin_config', JSON.stringify(newConfig));
    setBulletinState(newConfig);
  };

  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState(bulletin);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const stats = await dataService.getDashboardStats();
        setDashboardStats(stats);

        if (isEmployee) {
          const attendance = await dataService.getPersonalAttendanceSummary(currentUser.id, new Date().getMonth(), new Date().getFullYear());
          setPersonalAttendance(attendance);
          const status = await dataService.getTodayAttendanceStatus(currentUser.id);
          setTodayStatus(status);
          const trajectory = await dataService.getPersonalAttendanceTrajectory(currentUser.id);
          setPersonalTrajectory(trajectory);
        }

        const [noticesList, probationList, holidayList] = await Promise.all([
          dataService.getNotices(),
          dataService.getUpcomingProbations(),
          dataService.getCustomHolidays()
        ]);

        // Transform upcoming holidays into notice-like items for the timeline
        const now = new Date();
        const upcomingHolidays = holidayList
          .filter(h => new Date(h.fromDate) >= now)
          .map(h => ({
            id: `holiday-${h.id}`,
            title: `Holiday: ${h.name}`,
            content: `Company-wide holiday observed for ${h.name}.`,
            date: h.fromDate,
            type: 'Holiday',
            isSystem: true
          }));

        setNotices([...upcomingHolidays, ...noticesList].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setProbations(probationList);
        const alerts = await alertEngine.getDashboardAlerts(currentUser);
        setSmartAlerts(alerts);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser.id, isEmployee]);

  const [noticeModal, setNoticeModal] = useState(null); // { title, content } for editing
  const [viewingNotice, setViewingNotice] = useState(null);
  const [tickerSpeed, setTickerSpeed] = useState(25); // seconds per loop

  // Feedback Portal State
  const [feedbackConfig, setFeedbackConfig] = useState({ isOpen: false, empId: null, type: 'Probation Completion' });


  const saveNotice = async (item) => {
    const existingNotices = await dataService.getNotices();
    const newNotices = item.id 
      ? existingNotices.map(n => n.id === item.id ? item : n)
      : [...existingNotices, { ...item, id: Date.now(), date: new Date().toISOString().slice(0, 10), author: 'HR Admin' }];
    
    await dataService.saveNotices(newNotices);
    
    // Refresh local display (including holidays)
    const holidays = await dataService.getCustomHolidays();
    const now = new Date();
    const upcomingHolidays = holidays
      .filter(h => new Date(h.fromDate) >= now)
      .map(h => ({
        id: `holiday-${h.id}`,
        title: `Holiday: ${h.name}`,
        content: `Company-wide holiday observed for ${h.name}.`,
        date: h.fromDate,
        type: 'Holiday',
        isSystem: true
      }));
    
    setNotices([...upcomingHolidays, ...newNotices].sort((a, b) => new Date(b.date) - new Date(a.date)));
    setNoticeModal(null);
  };

  const deleteNotice = async (id) => {
    const existing = await dataService.getNotices();
    const filtered = existing.filter(n => n.id !== id);
    await dataService.saveNotices(filtered);
    
    // Refresh local display
    const holidays = await dataService.getCustomHolidays();
    const now = new Date();
    const upcomingHolidays = holidays
      .filter(h => new Date(h.fromDate) >= now)
      .map(h => ({
        id: `holiday-${h.id}`,
        title: `Holiday: ${h.name}`,
        content: `Company-wide holiday observed for ${h.name}.`,
        date: h.fromDate,
        type: 'Holiday',
        isSystem: true
      }));
    
    setNotices([...upcomingHolidays, ...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const now = new Date();
  const isExpired = now < new Date(bulletin.activation) || now > new Date(bulletin.expiry);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Mission control overview. Data updated in real-time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => generateBoardReport({
          totalEmployees: dashboardStats.totalEmployees,
          attendanceRate: `${((dashboardStats.presentToday / Math.max(1, dashboardStats.totalEmployees)) * 100).toFixed(1)}%`,
          onTimeRate: '100%',
          totalAdvances: '0',
          totalExpenses: '0',
          trainingProgress: '0%'
        })}>
          Export Board Report
        </button>
      </div>

      {/* Smart Alerts Banner (Role Based & Personal) */}
      {smartAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {smartAlerts.map(alert => (
            <div key={alert.id} className="flash-alert animation-slide-up" style={{ 
              borderLeft: `6px solid ${alert.priority === 'Critical' ? 'var(--color-danger)' : alert.priority === 'High' ? 'var(--color-warning)' : 'var(--color-primary)'}`,
              backgroundColor: alert.priority === 'Critical' ? 'rgba(239, 68, 68, 0.05)' : '#fff'
            }}>
              <AlertCircle size={24} color={alert.priority === 'Critical' ? 'var(--color-danger)' : alert.priority === 'High' ? 'var(--color-warning)' : 'var(--color-primary)'} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', color: alert.priority === 'Critical' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  {alert.priority} Notification
                </span>
                <h4 style={{ margin: '0.25rem 0', fontSize: '1rem' }}>{alert.title}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{alert.message}</p>
              </div>
              {alert.type === 'memo' && (
                <button 
                  className="btn btn-primary" 
                  style={{ gap: '0.5rem' }}
                  onClick={() => acknowledgeNoticeAlert(alert.id, alert.itemId)}
                >
                  <ShieldCheck size={16}/> Acknowledge
                </button>
              )}
              {alert.type === 'finance' && (
                <Link to="/advances" className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Check Repayment</Link>
              )}
              {alert.type === 'compliance' && (
                <Link to="/expenses" className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Submit Now</Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Probation Flash Alerts (Admin sees all <= 7 days, Employee sees only theirs) */}
      {probations.filter(p => userRole === 'management' || p.empId === currentUser.empCode).map(p => (
        <div key={p.id} className="flash-alert">
          <Clock size={24} color="var(--color-danger)" />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, color: 'var(--color-danger)' }}>ACTION REQUIRED:</span>
            <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>Probation Ending Soon: {p.name} ({p.empId})</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>The 6-month probation period expires on <strong>{p.expiryDate}</strong> ({p.daysRemaining} days remaining). Please prepare feedback forms.</p>
          </div>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', gap: '0.4rem' }}
            onClick={() => setFeedbackConfig({ isOpen: true, empId: p.id, type: 'Probation Completion' })}
          >
            <MessageSquareShare size={16}/> Submit Feedback
          </button>
        </div>
      ))}
      
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        {isEmployee ? (
          <>
            <StatCard title="Today's Log" value={todayStatus.punchIn || 'Not Marked'} icon={Clock} colorClass="bg-blue-500" />
            <StatCard title="Days Present" value={personalAttendance.present} icon={UserCheck} colorClass="bg-emerald-500" />
            <StatCard title="My Leave Balance" value={dataService.getEmployeeBalance(currentUser.id, 'total')} icon={CalendarOff} colorClass="bg-amber-500" />
          </>
        ) : (
          <>
            <StatCard title="Total Employees" value={dashboardStats.totalEmployees} icon={Users} colorClass="bg-blue-500" />
            <StatCard title="Present Today" value={dashboardStats.presentToday} icon={UserCheck} colorClass="bg-emerald-500" />
            <StatCard title="On Leave" value={dashboardStats.onLeave} icon={CalendarOff} colorClass="bg-amber-500" />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', margin: 0 }}>Company Notice Board</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Official internal announcements</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {userRole === 'management' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', padding: '0.25rem 0.75rem', backgroundColor: 'var(--color-background)', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>SPEED</span>
                    <input 
                      type="range" min="10" max="60" step="5" 
                      value={65 - tickerSpeed} 
                      onChange={(e) => setTickerSpeed(65 - Number(e.target.value))} 
                      style={{ width: '80px', height: '4px', accentColor: 'var(--color-primary)' }} 
                    />
                  </div>
                )}
                {userRole === 'management' && (
                  <button className="btn btn-primary" onClick={() => setNoticeModal({ title: '', content: '' })}>
                    <Plus size={16} /> Post Notice
                  </button>
                )}
              </div>
            </div>

            <div className="notice-board-container">
              <div className="notice-ticker" style={{ animationDuration: `${tickerSpeed}s` }}>
                {/* Double the list for seamless infinite loop */}
                {[...notices, ...notices].map((n, idx) => (
                  <div key={`${n.id}-${idx}`} className="notice-item" onClick={() => setViewingNotice(n)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>{n.title}</h4>
                        {n.type === 'Holiday' && (
                          <span style={{ 
                            backgroundColor: 'var(--color-success)', 
                            color: 'white', 
                            fontSize: '0.65rem', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '10px', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>Holiday</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{n.date}</span>
                        {userRole === 'management' && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={() => setNoticeModal(n)} style={{ color: 'var(--color-text-muted)' }}><Edit size={14} /></button>
                            <button onClick={() => deleteNotice(n.id)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem' }} dangerouslySetInnerHTML={{ __html: n.content }} />
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', opacity: 0.6 }}>Posted by: {n.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>{isEmployee ? 'My Attendance Trend' : 'Attendance Trajectory (Past 5 Days)'}</h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={isEmployee ? personalTrajectory : ATTENDANCE_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  {!isEmployee && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                  <Line type="monotone" name={isEmployee ? "Present" : "Clocked In"} dataKey="present" stroke="var(--color-success)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  {!isEmployee && <Line type="monotone" name="Absent/Leave" dataKey="absent" stroke="var(--color-warning)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Sidebar Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <Link to="/mobile-preview" className="card" style={{ 
            background: 'linear-gradient(135deg, var(--color-primary), #1e40af)', 
            color: 'white', 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            border: 'none',
            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                <Smartphone size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '800' }}>Mobile App Preview</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Try the employee experience</p>
              </div>
            </div>
            <ChevronRight size={20} style={{ opacity: 0.7 }} />
          </Link>
          
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>{isEmployee ? 'My Performance Pulse' : 'Avg Company Performance Pulse'}</h2>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={KPI_DATA}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'var(--color-text-main)', fontSize: 10 }} />
                  <Radar name={isEmployee ? "My Rating" : "Company Average"} dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.4} />
                  <Tooltip wrapperStyle={{ zIndex: 100 }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statutory Compliance Pulse */}
          <div className="card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, pointerEvents: 'none' }}>
              <ShieldCheck size={100} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="var(--color-primary)" /> Statutory Pulse
              </h2>
              <Link to="/compliance" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>View Hub</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dataService.getStatutoryUpdates().slice(0, 3).map(u => (
                <div key={u.id} style={{ display: 'flex', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-background)' }}>
                  <div style={{ width: '4px', height: 'auto', backgroundColor: u.priority === 'Critical' ? 'var(--color-danger)' : u.priority === 'Important' ? 'var(--color-warning)' : 'var(--color-success)', borderRadius: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{u.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>{u.summary}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{u.category} • {u.date}</span>
                      <Link to="/compliance" style={{ fontSize: '0.7rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>
                        Details <ChevronRight size={12}/>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem', gap: '0.5rem' }} onClick={() => window.open('https://epfo.gov.in', '_blank')}>
               <ExternalLink size={14}/> EPFO Official Portal
            </button>
          </div>

          {!isEmployee && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.125rem' }}>Exception Alerts</h2>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>View All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                  <ShieldCheck size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.875rem' }}>No critical exceptions detected.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {noticeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{noticeModal.id ? 'Edit Notice' : 'Post New Announcement'}</h2>
              <button onClick={() => setNoticeModal(null)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Title *</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ borderColor: !noticeModal.title.trim() ? 'var(--color-danger)' : 'var(--color-border)' }}
                value={noticeModal.title} 
                onChange={(e) => setNoticeModal({ ...noticeModal, title: e.target.value })} 
                placeholder="e.g. Health Insurance Update"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notice Content *</label>
              <RichTextEditor 
                value={noticeModal.content} 
                onChange={(content) => setNoticeModal({ ...noticeModal, content })}
                height="200px"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-ghost" onClick={() => setNoticeModal(null)}>Cancel</button>
              <button className="btn btn-primary" 
                disabled={!noticeModal.title.trim() || !noticeModal.content || noticeModal.content === '<br>'}
                onClick={() => saveNotice(noticeModal)}>
                {noticeModal.id ? 'Update Notice' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Notice Viewing Modal (Enlarged) */}
      {viewingNotice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
            <button 
              onClick={() => setViewingNotice(null)} 
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Announcement</span>
              <h1 style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '2rem', color: 'var(--color-text-main)' }}>{viewingNotice.title}</h1>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                <span>Posted by {viewingNotice.author}</span>
                <span>•</span>
                <span>{viewingNotice.date}</span>
              </div>
            </div>
            <div 
              style={{ fontSize: '1.1rem', linePadding: '1.6', color: '#334155' }} 
              dangerouslySetInnerHTML={{ __html: viewingNotice.content }} 
            />
            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setViewingNotice(null)}>Close Reader</button>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Layer Portal */}
      <FeedbackPortal 
        isOpen={feedbackConfig.isOpen}
        empId={feedbackConfig.empId}
        reviewType={feedbackConfig.type}
        onClose={() => setFeedbackConfig(p => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};

export default Dashboard;

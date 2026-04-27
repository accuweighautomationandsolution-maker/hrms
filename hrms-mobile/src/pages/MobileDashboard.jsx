import React, { useMemo } from 'react';
import { Clock, Calendar, Wallet, Award, ChevronRight, Bell, Menu as MenuIcon } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';
import { authService } from '../../../src/utils/authService';

const MobileDashboard = ({ onNavigate, onMenuToggle }) => {
  const user = authService.getCurrentUser();
  const emp = dataService.getEmployeeById(user?.id);
  
  const dashboardStats = dataService.getDashboardStats();
  const balances = dataService.getLeaveBalances()[user?.id] || { Sick: 5, Casual: 10, Paid: 15 };
  const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);
  const nextHoliday = dataService.getCustomHolidays().find(h => new Date(h.fromDate) >= new Date());
  
  const stats = useMemo(() => {
    return {
      attendance: '98%',
      leaves: `${totalBalance} Left`,
      upcomingHoliday: nextHoliday ? `${new Date(nextHoliday.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${nextHoliday.name})` : 'None'
    };
  }, [totalBalance, nextHoliday]);

  return (
    <div className="animate-slide-up" style={{ position: 'relative', overflow: 'hidden', paddingBottom: '100px' }}>
      {/* Background blobs for depth */}
      <div className="bg-blob" style={{ top: '-100px', left: '-100px' }}></div>
      <div className="bg-blob" style={{ bottom: '100px', right: '-100px', background: 'var(--m-accent)' }}></div>

      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onMenuToggle}
            style={{ 
              width: '45px', 
              height: '45px', 
              borderRadius: '15px', 
              background: 'white', 
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--m-card-shadow)',
              cursor: 'pointer'
            }}
          >
            <MenuIcon size={20} color="var(--m-text)" />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hello,</p>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--m-text)' }}>{emp?.name?.split(' ')[0] || 'Employee'}</h2>
          </div>
        </div>
        <button style={{ 
          width: '45px', 
          height: '45px', 
          borderRadius: '15px', 
          background: 'white', 
          border: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--m-card-shadow)'
        }}>
          <Bell size={20} color="var(--m-text)" />
        </button>
      </div>

      <div className="mobile-container">
        {/* Main Action Card */}
        <div className="m-card" style={{ 
          background: 'linear-gradient(135deg, #0f172a, #1e293b)', 
          color: 'white', 
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          border: 'none'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7, fontWeight: '600' }}>Shift Status</p>
            <h3 style={{ margin: '0.5rem 0', fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-0.02em' }}>Not Punched In</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--m-danger)' }}></div>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', opacity: 0.9 }}>Out of Office</span>
            </div>

            <button 
              className="m-btn" 
              style={{ background: 'white', color: '#0f172a', marginTop: '2rem', fontSize: '0.9rem' }}
              onClick={() => onNavigate('punch')}
            >
              <Clock size={18} /> Open Punch Terminal
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="m-card glass-card" style={{ margin: 0, padding: '1.5rem' }}>
            <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--m-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Calendar size={18} />
            </div>
            <p className="m-card-title" style={{ marginBottom: '0.25rem' }}>Leaves</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: 'var(--m-text)' }}>{stats.leaves}</p>
          </div>
          <div className="m-card glass-card" style={{ margin: 0, padding: '1.5rem' }}>
            <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--m-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Wallet size={18} />
            </div>
            <p className="m-card-title" style={{ marginBottom: '0.25rem' }}>Next Pay</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', margin: 0, color: 'var(--m-text)' }}>May 5</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="m-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="m-card-title" style={{ margin: 0 }}>Timeline</h3>
            <ChevronRight size={18} color="var(--m-text-muted)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { type: 'Attendance', title: 'Punch Out', desc: 'Yesterday at 18:05', icon: Clock, color: 'var(--m-primary)' },
              { type: 'Leave', title: 'Annual Leave Approved', desc: '2 days (April 28-29)', icon: Calendar, color: 'var(--m-success)' },
              { type: 'Performance', title: 'Monthly Review Ready', desc: 'Check your feedback', icon: Award, color: 'var(--m-warning)' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ 
                  padding: '0.8rem', 
                  background: `${item.color}15`, 
                  borderRadius: '15px', 
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <item.icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--m-text)' }}>{item.title}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--m-text-muted)', fontWeight: '500' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holiday */}
        <div className="m-card" style={{ 
          background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', 
          border: '1px solid rgba(244, 63, 94, 0.1)',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="var(--m-accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: 'var(--m-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Holiday</p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#9f1239' }}>{stats.upcomingHoliday}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;

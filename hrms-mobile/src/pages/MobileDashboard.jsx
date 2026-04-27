import React, { useMemo } from 'react';
import { Clock, Calendar, Wallet, Award, ChevronRight, Bell } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';
import { authService } from '../../../src/utils/authService';

const MobileDashboard = ({ onNavigate }) => {
  const user = authService.getCurrentUser();
  const emp = dataService.getEmployeeById(user?.id);
  
  const stats = useMemo(() => {
    // Mock some mobile-specific context
    return {
      attendance: '94%',
      leaves: '12 Left',
      upcomingHoliday: 'May 1st (Labor Day)'
    };
  }, []);

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--m-text-muted)' }}>Welcome back,</p>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{emp?.name || 'Employee'}</h2>
        </div>
        <div style={{ position: 'relative' }}>
          <Bell size={24} color="var(--m-text-muted)" />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--m-danger)', borderRadius: '50%', border: '2px solid white' }}></div>
        </div>
      </div>

      <div className="mobile-container">
        {/* Quick Actions */}
        <div className="m-card" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>Today's Status</p>
              <h3 style={{ margin: '0.25rem 0', fontSize: '1.5rem', fontWeight: '700' }}>Not Punched In</h3>
            </div>
            <Clock size={40} style={{ opacity: 0.3 }} />
          </div>
          <button 
            className="m-btn" 
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '1rem', backdropFilter: 'blur(10px)' }}
            onClick={() => onNavigate('punch')}
          >
            Go to Punch Terminal
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="m-card" style={{ margin: 0 }}>
            <div style={{ color: 'var(--m-primary)', marginBottom: '0.5rem' }}><Calendar size={20} /></div>
            <p className="m-card-title" style={{ marginBottom: '0.25rem' }}>Leaves</p>
            <p style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>{stats.leaves}</p>
          </div>
          <div className="m-card" style={{ margin: 0 }}>
            <div style={{ color: 'var(--m-success)', marginBottom: '0.5rem' }}><Wallet size={20} /></div>
            <p className="m-card-title" style={{ marginBottom: '0.25rem' }}>Next Pay</p>
            <p style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>May 5</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="m-card">
          <h3 className="m-card-title">Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { type: 'Attendance', title: 'Punch Out', desc: 'Yesterday at 18:05', icon: Clock, color: 'var(--m-primary)' },
              { type: 'Leave', title: 'Annual Leave Approved', desc: '2 days (April 28-29)', icon: Calendar, color: 'var(--m-success)' },
              { type: 'Performance', title: 'Monthly Review Ready', desc: 'Check your feedback', icon: Award, color: 'var(--m-warning)' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: `${item.color}10`, borderRadius: '12px', color: item.color }}>
                  <item.icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{item.desc}</p>
                </div>
                <ChevronRight size={16} color="#cbd5e1" />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holiday */}
        <div className="m-card" style={{ background: '#fef2f2', border: '1px dashed #fecaca' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Calendar size={18} color="var(--m-danger)" />
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: '#991b1b' }}>
              Upcoming: {stats.upcomingHoliday}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;

import React, { useState, useEffect } from 'react';
import { Fingerprint, MapPin, CheckCircle, Clock } from 'lucide-react';
import { dataService } from '@/utils/dataService';
import { authService } from '@/utils/authService';

const AttendancePunch = () => {
  const [status, setStatus] = useState('ready'); // ready, punching, success
  const [location, setLocation] = useState('Determining...');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Simulate geo-fencing
    setTimeout(() => setLocation('Accuweigh Main HQ (Within Office Range)'), 1500);
    return () => clearInterval(timer);
  }, []);

  const handlePunch = async () => {
    setStatus('punching');
    
    try {
      // Simulate network and hardware delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const user = authService.getCurrentUser();
      const now = new Date();
      const day = now.getDate();
      const m = now.getMonth();
      const y = now.getFullYear();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      
      const punchKey = `${user?.id}_${y}_${m}_${day}`;
      const records = await dataService.getAttendance();
      const existing = records[punchKey] || {};
      
      const isPunchIn = !existing.punchIn;
      
      const updated = {
        ...records,
        [punchKey]: {
          ...existing,
          punchIn: isPunchIn ? timeStr : existing.punchIn,
          punchOut: isPunchIn ? '' : timeStr,
          source: 'Mobile App',
          remark: `Punch ${isPunchIn ? 'In' : 'Out'} via HRMS Mobile`
        }
      };
      
      await dataService.saveAttendance(updated);
      setStatus('success');
    } catch (err) {
      console.error("Failed to punch:", err);
      alert("Punch failed. Please check your connection.");
      setStatus('ready');
    }
  };

  return (
    <div className="animate-slide-up" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div className="mobile-header">
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Mobile Punch</h2>
      </div>

      <div className="mobile-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0, color: 'var(--m-text)' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </h1>
          <p style={{ color: 'var(--m-text-muted)', fontWeight: '600' }}>
            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', padding: '0.5rem 1rem', borderRadius: '100px', marginBottom: '3rem', border: '1px solid #dcfce7' }}>
          <MapPin size={16} color="var(--m-success)" />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#166534' }}>{location}</span>
        </div>

        {status === 'ready' && (
          <button 
            className="punch-button"
            onClick={handlePunch}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'white',
              border: '8px solid var(--m-primary)',
              boxShadow: '0 20px 25px -5px rgb(37 99 235 / 0.1), 0 8px 10px -6px rgb(37 99 235 / 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Fingerprint size={60} color="var(--m-primary)" />
            <span style={{ fontWeight: '700', color: 'var(--m-primary)' }}>Hold to Punch</span>
          </button>
        )}

        {status === 'punching' && (
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: '100px', height: '100px', border: '10px solid #e2e8f0', borderTopColor: 'var(--m-primary)', borderRadius: '50%', margin: '0 auto 2rem' }}></div>
            <p style={{ fontWeight: '700', color: 'var(--m-primary)' }}>Authenticating...</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ width: '100px', height: '100px', background: 'var(--m-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'white' }}>
              <CheckCircle size={50} />
            </div>
            <h2 style={{ fontWeight: '800', marginBottom: '0.5rem' }}>Successfully Punched!</h2>
            <p style={{ color: 'var(--m-text-muted)' }}>Your attendance has been recorded.</p>
            <button className="m-btn m-btn-primary" style={{ marginTop: '2rem', width: 'auto', padding: '0.75rem 2rem' }} onClick={() => setStatus('ready')}>
              Back to Home
            </button>
          </div>
        )}

      </div>

      <style>{`
        .punch-button:active {
          transform: scale(0.95);
          background: #eff6ff;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AttendancePunch;

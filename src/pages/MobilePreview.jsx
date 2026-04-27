import React from 'react';
import MobileApp from '../../hrms-mobile/src/App';

const MobilePreview = () => {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title">Employee Mobile App Preview</h1>
        <p className="page-subtitle">Experience the mobile-first HRMS interface designed for employees.</p>
      </div>

      <div style={{
        width: '375px',
        height: '812px',
        background: '#000',
        borderRadius: '40px',
        padding: '12px',
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.25), 0 30px 60px -30px rgba(0,0,0,0.3)',
        position: 'relative',
        border: '4px solid #333'
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '25px',
          background: '#000',
          borderBottomLeftRadius: '15px',
          borderBottomRightRadius: '15px',
          zIndex: 1001
        }}></div>

        {/* Screen Content */}
        <div style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          borderRadius: '28px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <MobileApp />
        </div>
      </div>
      
      <div style={{ marginTop: '2rem', textAlign: 'center', maxWidth: '500px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          This preview uses the same live data as the admin portal. Any punches made here will reflect immediately in the main Attendance system.
        </p>
      </div>
    </div>
  );
};

export default MobilePreview;

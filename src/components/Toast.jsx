import React from 'react';
import { useNotification } from '../context/NotificationContext';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const Toast = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {notifications.map((n) => (
        <div 
          key={n.id}
          style={{
            minWidth: '300px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderLeft: `5px solid ${n.type === 'success' ? 'var(--color-success)' : n.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ color: n.type === 'success' ? 'var(--color-success)' : n.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
            {n.type === 'success' && <CheckCircle size={20} />}
            {n.type === 'error' && <AlertCircle size={20} />}
            {n.type === 'info' && <Info size={20} />}
          </div>
          <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-main)' }}>
            {n.message}
          </div>
          <button 
            onClick={() => removeNotification(n.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Toast;

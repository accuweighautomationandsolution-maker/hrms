import React from 'react';
import { Map, ChevronLeft, Calendar } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';

const HolidayList = ({ onNavigate }) => {
  const holidays = dataService.getCustomHolidays();

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Holiday List</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {holidays.map(hol => (
            <div key={hol.id} className="m-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '12px', 
                background: hol.compulsory ? '#fef2f2' : '#f0fdf4',
                color: hol.compulsory ? 'var(--m-danger)' : 'var(--m-success)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  {new Date(hol.fromDate).toLocaleString('default', { month: 'short' })}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                  {new Date(hol.fromDate).getDate()}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{hol.name}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{hol.type} Holiday</p>
              </div>
              {hol.compulsory && (
                <div style={{ 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '6px', 
                  background: '#fee2e2', 
                  color: '#991b1b',
                  fontSize: '0.65rem',
                  fontWeight: '700'
                }}>
                  FIXED
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HolidayList;

import React from 'react';
import { Banknote, ChevronLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';

const AdvanceLoans = ({ onNavigate }) => {
  const history = dataService.getAdvanceHistory().filter(h => h.empId === 1);

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Loans & Advances</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div className="m-card" style={{ background: 'var(--m-primary)', color: 'white' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Outstanding Balance</p>
          <h3 style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: '800' }}>₹0.00</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="m-btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', flex: 1, fontSize: '0.8rem' }}>
              Request New
            </button>
            <button className="m-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', flex: 1, fontSize: '0.8rem' }}>
              History
            </button>
          </div>
        </div>

        <h3 className="m-card-title">Transaction History</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.length === 0 ? (
            <div className="m-card" style={{ textAlign: 'center', padding: '2rem' }}>
               <Banknote size={32} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
               <p style={{ fontSize: '0.875rem', color: 'var(--m-text-muted)' }}>No recent transactions.</p>
            </div>
          ) : (
            history.map(item => (
              <div key={item.id} className="m-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: item.type === 'Advance' ? '#f0fdf4' : '#eff6ff', borderRadius: '12px' }}>
                  {item.type === 'Advance' ? <ArrowUpRight color="#16a34a" /> : <ArrowDownLeft color="#2563eb" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.type}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{item.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: '800', color: item.type === 'Advance' ? 'var(--m-text)' : 'var(--m-danger)' }}>₹{item.amount}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--m-text-muted)' }}>{item.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvanceLoans;

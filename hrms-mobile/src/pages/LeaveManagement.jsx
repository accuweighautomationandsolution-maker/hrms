import React from 'react';
import { Calendar, ChevronLeft, Plus, Clock } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';

const LeaveManagement = ({ onNavigate }) => {
  const user = authService.getCurrentUser();
  const [balances, setBalances] = React.useState({ Sick: 0, Casual: 0, Paid: 0 });
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allBalances, allRequests] = await Promise.all([
          dataService.getLeaveBalances(),
          dataService.getLeaveRequests()
        ]);
        if (allBalances && allBalances[user?.id]) {
          setBalances(allBalances[user?.id]);
        }
        if (allRequests) {
          setRequests(allRequests.filter(r => r.empId === Number(user?.id)));
        }
      } catch (err) {
        console.error("Failed to load leave data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--m-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Leaves</h2>
        </div>
        <button 
          className="m-btn-primary" 
          style={{ width: '40px', height: '40px', borderRadius: '12px', padding: 0 }}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="mobile-container">
        {/* Balances */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Object.entries(balances).map(([type, val]) => (
            <div key={type} className="m-card" style={{ margin: 0, textAlign: 'center', padding: '1rem 0.5rem' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--m-primary)' }}>{val}</p>
              <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--m-text-muted)', margin: '0.25rem 0 0' }}>{type}</p>
            </div>
          ))}
        </div>

        <h3 className="m-card-title">My Requests</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.length === 0 ? (
            <div className="m-card" style={{ textAlign: 'center', padding: '2rem' }}>
               <Calendar size={32} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
               <p style={{ fontSize: '0.875rem', color: 'var(--m-text-muted)' }}>No leave history found.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="m-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={`badge-m ${req.status === 'Approved' ? 'badge-m-success' : 'badge-m-warning'}`}>
                    {req.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{req.days} Days</span>
                </div>
                <h4 style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}>{req.type}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--m-text-muted)', fontSize: '0.8rem' }}>
                  <Clock size={14} />
                  <span>{req.startDate} to {req.endDate}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;

import React from 'react';
import { Receipt, ChevronLeft, Camera, Plus } from 'lucide-react';
import { dataService } from '@/utils/dataService';
import { authService } from '@/utils/authService';

const SubmitExpenses = ({ onNavigate }) => {
  const user = authService.getCurrentUser();
  const [expenses, setExpenses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allExpenses = await dataService.getExpenses();
        if (allExpenses) {
          setExpenses(allExpenses.filter(e => e.empId === Number(user?.id)));
        }
      } catch (err) {
        console.error("Failed to load expenses:", err);
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Expenses</h2>
        </div>
        <button className="m-btn-primary" style={{ width: '40px', height: '40px', borderRadius: '12px', padding: 0 }}>
          <Plus size={20} />
        </button>
      </div>

      <div className="mobile-container">
        <div className="m-card" style={{ textAlign: 'center', border: '2px dashed #e2e8f0', background: 'none' }}>
           <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Camera size={32} color="var(--m-text-muted)" />
           </div>
           <h4 style={{ margin: 0 }}>Snap a Receipt</h4>
           <p style={{ fontSize: '0.8rem', color: 'var(--m-text-muted)', margin: '0.5rem 0 1.5rem' }}>Take a photo of your receipt to auto-fill details.</p>
           <button className="m-btn" style={{ background: 'var(--m-primary)', color: 'white' }}>Scan Receipt</button>
        </div>

        <h3 className="m-card-title">Recent Submissions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {expenses.length === 0 ? (
            <div className="m-card" style={{ textAlign: 'center', padding: '2rem' }}>
               <Receipt size={32} style={{ opacity: 0.1, margin: '0 auto 1rem' }} />
               <p style={{ fontSize: '0.875rem', color: 'var(--m-text-muted)' }}>No expenses submitted this month.</p>
            </div>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="m-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge-m badge-m-warning">{exp.status || 'Pending'}</span>
                  <span style={{ fontWeight: '800' }}>₹{exp.amount}</span>
                </div>
                <h4 style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}>{exp.category}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{exp.date} • {exp.projectName || 'General'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitExpenses;

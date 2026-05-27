import React, { useState, useEffect, useMemo } from 'react';
import { Banknote, ChevronLeft, ArrowUpRight, ArrowDownLeft, Plus, X } from 'lucide-react';
import { dataService } from '@/utils/dataService';
import { authService } from '@/utils/authService';

const AdvanceLoans = ({ onNavigate }) => {
  const user = authService.getCurrentUser();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [advanceType, setAdvanceType] = useState('Personal Advance');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Resolve actual employee ID first if user is an employee
        const profile = await dataService.getMyEmployeeProfile(user).catch(() => null);
        const resolvedId = profile ? profile.id : user?.id;

        const allHistory = await dataService.getAdvanceHistory();
        if (allHistory) {
          setHistory(allHistory.filter(h => String(h.empId) === String(resolvedId)));
        }
      } catch (err) {
        console.error("Failed to load advance history:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const outstandingBalance = useMemo(() => {
    return history.reduce((sum, h) => {
      if (h.status === 'Approved' || h.status === 'Foreclosed' || h.status === 'Active') {
        return sum + ((h.amount || 0) - (h.totalRepaid || 0));
      }
      return sum;
    }, 0);
  }, [history]);

  const handleApply = async () => {
    try {
      setLoading(true);
      const profile = await dataService.getMyEmployeeProfile(user).catch(() => null);
      if (!profile) throw new Error("Could not load your employee profile.");

      const allHistory = await dataService.getAdvanceHistory();
      
      const newAdvance = {
        id: `ADV-${Date.now()}`,
        empId: profile.id,
        empName: profile.name,
        type: advanceType,
        amount: Number(amount),
        installments: Number(installments),
        emi: Math.round(Number(amount) / (Number(installments) || 1)),
        totalRepaid: 0,
        isForeclosed: false,
        date: new Date().toISOString().split('T')[0],
        issueDate: new Date().toLocaleDateString('en-GB'),
        status: 'Pending Admin Approval',
        approvals: { admin: false, director: false, finance: false }
      };

      const finalHistory = [...allHistory, newAdvance];
      await dataService.saveAdvanceHistory(finalHistory);
      
      setHistory(finalHistory.filter(h => String(h.empId) === String(profile.id)));
      setShowModal(false);
      setAmount('');
      setInstallments('1');
      alert("Advance request submitted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && history.length === 0) {
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Loans & Advances</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div className="m-card" style={{ background: 'var(--m-primary)', color: 'white' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Outstanding Balance</p>
          <h3 style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: '800' }}>₹{outstandingBalance.toLocaleString()}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="m-btn" onClick={() => setShowModal(true)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', flex: 1, fontSize: '0.8rem' }}>
              Request New
            </button>
            <button className="m-btn" onClick={() => alert('Feature coming soon')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', flex: 1, fontSize: '0.8rem' }}>
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
                <div style={{ padding: '0.75rem', background: item.type === 'Personal Advance' ? '#f0fdf4' : '#eff6ff', borderRadius: '12px' }}>
                  {item.type === 'Personal Advance' ? <ArrowUpRight color="#16a34a" /> : <ArrowDownLeft color="#2563eb" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.type}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{item.date}</p>
                  {item.status === 'Approved' && (
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>Repaid: ₹{item.totalRepaid || 0} / ₹{item.amount}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: '800', color: item.type === 'Personal Advance' ? 'var(--m-text)' : 'var(--m-danger)' }}>₹{item.amount}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--m-text-muted)' }}>{item.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="animate-slide-up" style={{ background: 'var(--m-surface)', width: '100%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '1.5rem', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Request Advance</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none' }}><X size={24} color="var(--m-text-muted)" /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Type</label>
                <select className="m-input" value={advanceType} onChange={e => setAdvanceType(e.target.value)} style={{ width: '100%' }}>
                  <option value="Personal Advance">Personal Advance</option>
                  <option value="Official Site Advance">Official Site Advance</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Amount (₹)</label>
                <input type="number" className="m-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g., 5000" style={{ width: '100%' }} />
              </div>

              {advanceType === 'Personal Advance' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Tenure (Months)</label>
                  <input type="number" className="m-input" value={installments} onChange={e => setInstallments(e.target.value)} min="1" style={{ width: '100%' }} />
                </div>
              )}

              <button className="m-btn m-btn-primary" onClick={handleApply} disabled={!amount || amount <= 0} style={{ width: '100%', marginTop: '1rem' }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceLoans;

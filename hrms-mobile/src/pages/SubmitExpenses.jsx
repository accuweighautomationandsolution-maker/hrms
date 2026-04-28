import React from 'react';
import { Receipt, ChevronLeft, Camera, Plus } from 'lucide-react';
import { dataService } from '@/utils/dataService';
import { authService } from '@/utils/authService';

const SubmitExpenses = ({ onNavigate }) => {
  const user = authService.getCurrentUser();
  const [expenses, setExpenses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [targetSite, setTargetSite] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [reconciliation, setReconciliation] = React.useState('none');
  const [submitting, setSubmitting] = React.useState(false);
  const [projects, setProjects] = React.useState([]);
  const [isAddingNewProject, setIsAddingNewProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allExpenses, prjs] = await Promise.all([
          dataService.getExpenses(),
          dataService.getProjects()
        ]);
        if (allExpenses) {
          setExpenses(allExpenses.filter(e => e.empId === Number(user?.id)));
        }
        setProjects(prjs);
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
        <button 
          onClick={() => setShowAddForm(true)}
          className="m-btn-primary" 
          style={{ width: '40px', height: '40px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="mobile-container">
        {showAddForm ? (
          <div className="animate-slide-up" style={{ marginBottom: '2rem' }}>
            <div className="m-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>New Expense</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--m-text-muted)' }}>Cancel</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Target Site / Project</label>
                  {isAddingNewProject ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="m-input" 
                        placeholder="Enter name" 
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                        autoFocus
                      />
                      <button 
                        onClick={async () => {
                          if (!newProjectName.trim()) return;
                          const newPrj = await dataService.addProject(newProjectName);
                          setProjects([...projects, newPrj]);
                          setTargetSite(newPrj.name);
                          setIsAddingNewProject(false);
                          setNewProjectName('');
                        }}
                        style={{ padding: '0 1rem', borderRadius: '12px', background: 'var(--m-primary)', color: 'white', border: 'none' }}
                      >Add</button>
                      <button onClick={() => setIsAddingNewProject(false)} style={{ padding: '0 0.5rem', color: 'var(--m-text-muted)', background: 'none', border: 'none' }}>✕</button>
                    </div>
                  ) : (
                    <select 
                      className="m-input" 
                      value={targetSite}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setIsAddingNewProject(true);
                        } else {
                          setTargetSite(e.target.value);
                        }
                      }}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
                    >
                      <option value="">Select Site/Project</option>
                      {projects.filter(p => p.status === 'Active').map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                      <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--m-primary)' }}>+ Add New Site/Project</option>
                      <optgroup label="Closed Sites">
                        {projects.filter(p => p.status === 'Closed').map(p => (
                          <option key={p.id} value={p.name}>{p.name} (Closed)</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
                  >
                    <option value="">Select Category</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Local Conveyance">Local Conveyance</option>
                    <option value="Lodging & Boarding">Lodging & Boarding</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Amount (₹)</label>
                  <input 
                    type="number" 
                    className="m-input" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--m-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Reconciliation</label>
                  <select 
                    value={reconciliation}
                    onChange={(e) => setReconciliation(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }}
                  >
                    <option value="none">None - Out of Pocket</option>
                    <option value="company_direct">Company Direct Payment</option>
                    <option value="advance">Advance Link</option>
                  </select>
                </div>

                <button 
                  disabled={submitting || !amount || !category || !targetSite}
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      const newExpense = {
                        id: Date.now(),
                        date: new Date().toISOString().split('T')[0],
                        empId: Number(user?.id),
                        name: user?.name,
                        amount: Number(amount),
                        category: category,
                        site: targetSite,
                        projectName: targetSite,
                        status: 'Pending',
                        linkedAdvance: reconciliation === 'none' ? 'None' : (reconciliation === 'company_direct' ? 'Company Direct' : 'Advance Linked'),
                        attachments: 0
                      };
                      const existing = await dataService.getExpenses();
                      await dataService.saveExpenses([newExpense, ...existing]);
                      setExpenses([newExpense, ...expenses]);
                      setShowAddForm(false);
                      setAmount('');
                      setCategory('');
                      setTargetSite('');
                    } catch (err) {
                      alert("Failed to save expense");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="m-btn-primary" 
                  style={{ marginTop: '0.5rem' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-card" style={{ textAlign: 'center', border: '2px dashed #e2e8f0', background: 'none' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Camera size={32} color="var(--m-text-muted)" />
            </div>
            <h4 style={{ margin: 0 }}>Snap a Receipt</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--m-text-muted)', margin: '0.5rem 0 1.5rem' }}>Take a photo of your receipt to auto-fill details.</p>
            <button onClick={() => setShowAddForm(true)} className="m-btn" style={{ background: 'var(--m-primary)', color: 'white' }}>Scan Receipt</button>
          </div>
        )}

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

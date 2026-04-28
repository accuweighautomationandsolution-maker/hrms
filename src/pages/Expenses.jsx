import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, FileText, UploadCloud, Link as LinkIcon, DollarSign, Receipt, CheckCircle, XCircle, MoreVertical, Trash2 } from 'lucide-react';
import { dataService } from '../utils/dataService';

const CATEGORIES = [
  'Ticket Charges',
  'Lodging & Boarding Charges',
  'Local Conveyance',
  'Telephone/Internet Charges',
  'Material Purchase',
  'Guest Expenses',
  'Food & Beverage',
  'Others'
];

const SITES = [
  'Mumbai Hub',
  'Delhi Installation',
  'Chennai R&D',
  'HQ Corporate',
  'Bangalore Site'
];

const ACTIVE_ADVANCES = [
  { id: 'ADV-004', type: 'Official Site Advance', name: 'Site Visit: Mumbai Hub', balance: 15500 },
  { id: 'ADV-007', type: 'Official Site Advance', name: 'Installation Job: Delhi', balance: 8000 }
];

const SummaryCard = ({ title, value, colorClass }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>{title}</h4>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
      <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>{value}</span>
    </div>
    <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
      <div className={colorClass} style={{ height: '100%', width: '60%' }}></div>
    </div>
  </div>
);

const Expenses = () => {
  const [showModal, setShowModal] = useState(false);
  const [linkedAdvance, setLinkedAdvance] = useState('none');
  const [targetSite, setTargetSite] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reloads, setReloads] = useState(0);

  const [expenseItems, setExpenseItems] = useState([
    { id: Date.now(), date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '', attachment: null }
  ]);

  const [expenseRecords, setExpenseRecords] = useState([]);
  const [activeAdvances, setActiveAdvances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [records, advances] = await Promise.all([
          dataService.getExpenses(),
          dataService.getAdvanceHistory()
        ]);
        setExpenseRecords(records);
        setActiveAdvances(advances.filter(a => a.type === 'Official Site Advance' && a.status === 'Active'));
      } catch (err) {
        console.error("Failed to load expenses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloads]);

  const filteredExpenses = useMemo(() => {
    return expenseRecords.filter(r => 
        r.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenseRecords, searchTerm]);

  const handleAddItem = () => {
    setExpenseItems([...expenseItems, { id: Date.now(), date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '', attachment: null }]);
  };

  const handleRemoveItem = (id) => {
    if (expenseItems.length === 1) return;
    setExpenseItems(expenseItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setExpenseItems(expenseItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
        await dataService.deleteExpense(id);
        setReloads(r => r + 1);
    }
  };

  const handleSubmit = async () => {
    if(!targetSite) {
        alert("Please select a Target Site/Project for this expense report.");
        return;
    }

    const currentUser = authService.getCurrentUser();
    const currentUserName = currentUser ? currentUser.name : 'Employee User';

    const newEntries = expenseItems.map(item => ({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: item.date,
        name: currentUserName,
        empId: currentUser ? currentUser.id : 1, 
        department: currentUser ? currentUser.department : 'Engineering',
        site: targetSite,
        category: item.category || 'Others',
        amount: Number(item.amount) || 0,
        status: 'Pending',
        linkedAdvance: linkedAdvance === 'none' ? 'None' : linkedAdvance,
        attachments: item.attachment ? 1 : 0
    }));

    const existing = await dataService.getExpenses();
    await dataService.saveExpenses([...newEntries, ...existing]);

    setShowModal(false);
    setReloads(r => r+1);
    setExpenseItems([{ id: Date.now(), date: new Date().toISOString().split('T')[0], category: '', amount: '', description: '', attachment: null }]);
    setTargetSite('');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const pendingCount = expenseRecords.filter(r => r.status === 'Pending').length;
  const totalReimbursed = expenseRecords.filter(r => r.status === 'Approved' && r.linkedAdvance === 'None').reduce((sum, r) => sum + r.amount, 0);
  const totalReconciled = expenseRecords.filter(r => r.status === 'Approved' && r.linkedAdvance !== 'None').reduce((sum, r) => sum + r.amount, 0);

  const totalExpenseAmount = expenseItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const selectedAdvance = ACTIVE_ADVANCES.find(a => a.id === linkedAdvance);
  const remainingAfterExpense = selectedAdvance ? Math.max(0, selectedAdvance.balance - totalExpenseAmount) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Reporter</h1>
          <p className="page-subtitle">Log employee expenses, attach invoice receipts, and link to designated Sites.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', gap: '0.75rem' }}
        >
          <Plus size={20} />
          Submit Expense
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <SummaryCard title="Pending Items" value={pendingCount} colorClass="bg-amber-500" />
        <SummaryCard title="Reimbursed (YTD)" value={`₹${totalReimbursed.toLocaleString('en-IN')}`} colorClass="bg-blue-500" />
        <SummaryCard title="Reconciled to Advances" value={`₹${totalReconciled.toLocaleString('en-IN')}`} colorClass="bg-emerald-500" />
      </div>

      <style>{`
        .bg-blue-500 { background-color: var(--color-primary); }
        .bg-emerald-500 { background-color: var(--color-success); }
        .bg-amber-500 { background-color: var(--color-warning); }
        .upload-zone { border: 2px dashed var(--color-border); border-radius: 8px; padding: 2rem; text-align: center; color: var(--color-text-muted); cursor: pointer; transition: all var(--transition-fast); background-color: var(--color-surface); }
        .upload-zone:hover { border-color: var(--color-primary); background-color: rgba(37, 99, 235, 0.05); color: var(--color-primary); }
      `}</style>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2>My Expense Ledger</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="header-search" style={{ width: '250px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Search expenses..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Date</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Site / Location</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Advance Link</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>Receipts</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{rec.date}</td>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>
                     {rec.site}
                     <div style={{fontSize: '0.75rem', fontWeight:'normal', color: 'var(--color-text-muted)'}}>{rec.name}</div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{rec.category}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${rec.status === 'Approved' ? 'badge-success' : rec.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '600', textAlign: 'right' }}>₹{rec.amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {rec.linkedAdvance !== 'None' ? (
                      <span className="badge badge-blue">
                        <LinkIcon size={12} style={{marginRight: 4}}/> {rec.linkedAdvance}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>Out of Pocket</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        <FileText size={16} /> {rec.attachments}
                      </span>
                      <button onClick={() => handleDeleteExpense(rec.id)} className="btn btn-ghost" style={{ color: 'var(--color-danger)', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                   <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>No expense records found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: '2rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Receipt size={24} color="var(--color-primary)" /> Submit Grouped Expenses
              </h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Target Site / Project</label>
                    <select className="form-input" value={targetSite} onChange={(e) => setTargetSite(e.target.value)}>
                        <option value="">Select a specific Site...</option>
                        {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: '600' }}>Advance Reconciliation (Optional)</label>
                    <select className="form-input" value={linkedAdvance} onChange={(e) => setLinkedAdvance(e.target.value)}>
                      <option value="none">None - Out of Pocket</option>
                      {activeAdvances.map(a => (
                        <option key={a.id} value={a.id}>{a.id} ({a.empName} - Bal: ₹{(a.amount || 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
              </div>

              {expenseItems.map((item, index) => (
                <div key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Expense Line #{index + 1}</h4>
                    {expenseItems.length > 1 && (
                      <button onClick={() => handleRemoveItem(item.id)} style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
                      <input type="date" className="form-input" value={item.date} onChange={(e) => handleItemChange(item.id, 'date', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                      <select className="form-input" value={item.category} onChange={(e) => handleItemChange(item.id, 'category', e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                        <option value="" disabled>Select...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>₹</span>
                        <input type="number" className="form-input" placeholder="0.00" value={item.amount} onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)} style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.5rem' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', alignItems: 'center' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Description</label>
                      <input type="text" className="form-input" placeholder="Brief details about this expense" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Attachment</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label className="btn btn-outline" style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center', cursor: 'pointer', backgroundColor: item.attachment ? 'var(--color-success)' : 'transparent', color: item.attachment ? 'white' : 'inherit' }}>
                          <UploadCloud size={14} /> {item.attachment ? 'File Attached' : 'Upload Bill'}
                          <input type="file" style={{ display: 'none' }} onChange={(e) => handleItemChange(item.id, 'attachment', e.target.files[0])} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn btn-ghost" onClick={handleAddItem} style={{ width: '100%', padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-primary)' }}>
                <Plus size={16} /> Add Another Expense Line
              </button>
            </div>

            <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              {selectedAdvance && totalExpenseAmount > 0 && (
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--color-primary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Advance Reconciliation Effect</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Selected Advance: <strong style={{ color: 'var(--color-primary)' }}>{selectedAdvance.id}</strong></span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-warning)' }}>- ₹{totalExpenseAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Submission Amount</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)' }}>₹{totalExpenseAmount.toLocaleString('en-IN')}</span>
                </div>
                <button className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={handleSubmit}>
                  Submit Grouped Expense
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

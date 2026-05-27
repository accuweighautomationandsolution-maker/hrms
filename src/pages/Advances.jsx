import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, HandCoins, Plus, IndianRupee, User, Calendar, Trash2 } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

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

const CATEGORIES = [
  { key: 'ticket', label: 'Ticket Charges' },
  { key: 'lodging', label: 'Lodging & Boarding Charges' },
  { key: 'conveyance', label: 'Local Conveyance' },
  { key: 'telephone', label: 'Telephone/Internet Charges' },
  { key: 'material', label: 'Material Purchase' },
  { key: 'guest', label: 'Guest Expenses' },
  { key: 'others', label: 'Others' }
];

const Advances = () => {
  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();
  const isEmployee = userRole === 'employee';

  const [showModal, setShowModal] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // resolvedMyEmpId holds the ACTUAL employees table ID for the current user
  const [resolvedMyEmpId, setResolvedMyEmpId] = useState(null);
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [advanceType, setAdvanceType] = useState('Personal Advance');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [siteExpenses, setSiteExpenses] = useState(
    Object.fromEntries(CATEGORIES.map(c => [c.key, { enabled: false, amount: '' }]))
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // SECURITY: Resolve actual employee record by email for employee-role users.
        // currentUser.id is a user_profiles UUID, NOT an employees table ID.
        const myEmpProfile = isEmployee
          ? await dataService.getMyEmployeeProfile(currentUser).catch(() => null)
          : null;

        const resolvedId = myEmpProfile ? myEmpProfile.id : null;
        if (isEmployee) {
          setResolvedMyEmpId(resolvedId);
          setSelectedEmpId(resolvedId ? String(resolvedId) : '');
        }

        const [advData, empsData] = await Promise.all([
          dataService.getAdvanceHistory(),
          dataService.getEmployees()
        ]);
        setAdvances(advData);
        setEmployeesList(empsData);
      } catch (err) {
        console.error("Failed to load advances data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id, isEmployee]);

  const activeEmployees = useMemo(() => {
    return employeesList.filter(e => 
      e.status === 'Active' && 
      // SECURITY: use resolvedMyEmpId (the actual employees table ID), not currentUser.id
      (isEmployee ? (resolvedMyEmpId !== null ? String(e.id) === String(resolvedMyEmpId) : false) : true)
    );
  }, [employeesList, isEmployee, resolvedMyEmpId]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.empCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeEmployees, searchTerm]);

  // EMI Calculation logic
  const emi = useMemo(() => {
    if (advanceType === 'Official Site Advance') return 0;
    const total = advanceType === 'Personal Advance' ? (Number(amount) || 0) : calculateSiteTotal();
    const inst = Number(installments) || 1;
    return Math.round(total / inst);
  }, [amount, installments, advanceType, siteExpenses]);

  function calculateSiteTotal() {
    let total = 0;
    CATEGORIES.forEach(c => {
      const exp = siteExpenses[c.key];
      if (exp.enabled && exp.amount) {
        total += Number(exp.amount) || 0;
      }
    });
    return total;
  }

  const handleCheckbox = (key) => {
    setSiteExpenses(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled }
    }));
  };

  const handleSiteAmount = (key, val) => {
    setSiteExpenses(prev => ({
      ...prev,
      [key]: { ...prev[key], amount: val }
    }));
  };

  const handleNote = (val) => {
    setSiteExpenses(prev => ({
      ...prev,
      others: { ...prev.others, note: val }
    }));
  };

  const handleSave = async () => {
    if (!selectedEmpId) {
      alert("Please select an employee first.");
      return;
    }
    
    try {
      // Find employee
      const list = await dataService.getEmployees();
      const emp = list.find(e => e.id === Number(selectedEmpId)) || employeesList.find(e => e.id === Number(selectedEmpId));
      if (!emp) {
        alert("Employee not found.");
        return;
      }

      // Create Historical Record
      const history = await dataService.getAdvanceHistory();
      
      const totalAmount = advanceType === 'Personal Advance' ? Number(amount) : calculateSiteTotal();

      const newAdvance = {
        id: `ADV-${Date.now()}`,
        empId: emp.id,
        empName: emp.name,
        type: advanceType,
        amount: totalAmount,
        installments: Number(installments),
        emi: emi,
        totalRepaid: 0,
        isForeclosed: false,
        date: new Date().toISOString().split('T')[0],
        issueDate: new Date().toLocaleDateString('en-GB'),
        status: 'Pending Admin Approval',
        approvals: { admin: false, director: false, finance: false }
      };

      if (advanceType === 'Official Site Advance') {
        newAdvance.siteDetails = siteExpenses;
      }

      const finalHistory = [...history, newAdvance];
      await dataService.saveAdvanceHistory(finalHistory);
      setAdvances(finalHistory);
      
      const msg = advanceType === 'Official Site Advance' 
          ? `Official Site Advance of ₹${totalAmount} submitted for approval.`
          : `Advance of ₹${totalAmount} submitted for approval. Workflow initiated.`;
      alert(msg);
      
      setShowModal(false);
      // Reset state
      setAmount('');
      setInstallments('1');
      setSelectedEmpId(isEmployee ? String(resolvedMyEmpId) : '');
    } catch (err) {
      console.error("Error saving advance:", err);
      alert("Failed to save advance. Please try again.");
    }
  };

  const handleApprove = async (id, role) => {
    try {
      const history = await dataService.getAdvanceHistory();
      const advanceIndex = history.findIndex(h => h.id === id);
      if (advanceIndex === -1) return;
      
      const advance = history[advanceIndex];
      if (!advance.approvals) advance.approvals = { admin: false, director: false, finance: false };
      
      advance.approvals[role] = true;
      
      if (role === 'admin') advance.status = 'Pending Director Approval';
      if (role === 'director') advance.status = 'Pending Finance Approval';
      
      // Check if all approved
      if (advance.approvals.admin && advance.approvals.director && advance.approvals.finance) {
        advance.status = 'Approved';
      }
      
      history[advanceIndex] = advance;
      await dataService.saveAdvanceHistory(history);
      setAdvances(history);
    } catch (err) {
      console.error("Error approving advance:", err);
      alert("Failed to approve. Please try again.");
    }
  };

  const handleReject = async (id) => {
    try {
      const history = await dataService.getAdvanceHistory();
      const advanceIndex = history.findIndex(h => h.id === id);
      if (advanceIndex === -1) return;
      
      history[advanceIndex].status = 'Rejected';
      
      await dataService.saveAdvanceHistory(history);
      setAdvances(history);
    } catch (err) {
      console.error("Error rejecting advance:", err);
      alert("Failed to reject. Please try again.");
    }
  };

  const handleDeleteAdvance = async (id) => {
    if (!window.confirm("Are you sure you want to delete this advance record? This will also remove the associated EMI from the employee's active deductions.")) return;
    
    try {
      const history = await dataService.getAdvanceHistory();
      const recordToDelete = history.find(h => h.id === id);
      if (!recordToDelete) return;

      // 1. Remove from history
      const updatedHistory = history.filter(h => h.id !== id);
      await dataService.saveAdvanceHistory(updatedHistory);
      setAdvances(updatedHistory);
    } catch (err) {
      console.error("Error deleting advance:", err);
      alert("Failed to delete advance. Please try again.");
    }
  };

  const handleForeclose = async (id) => {
    if (!window.confirm("Are you sure you want to Foreclose this advance? The entire remaining balance will be deducted in the next payroll.")) return;
    try {
      const history = await dataService.getAdvanceHistory();
      const idx = history.findIndex(h => h.id === id);
      if (idx === -1) return;
      history[idx].isForeclosed = true;
      history[idx].foreclosureDate = new Date().toISOString();
      history[idx].status = 'Foreclosed';
      await dataService.saveAdvanceHistory(history);
      setAdvances(history);
    } catch (err) {
      alert("Failed to foreclose.");
    }
  };

  const handleWaive = async (id) => {
    const history = await dataService.getAdvanceHistory();
    const idx = history.findIndex(h => h.id === id);
    if (idx === -1) return;
    const balance = (history[idx].amount || 0) - (history[idx].totalRepaid || 0);
    if (!window.confirm(`Are you sure you want to Waive the remaining balance of ₹${balance.toLocaleString()}? This will close the advance.`)) return;
    
    try {
      history[idx].waivedAmount = balance;
      history[idx].status = 'Closed';
      await dataService.saveAdvanceHistory(history);
      setAdvances(history);
    } catch (err) {
      alert("Failed to waive.");
    }
  };

  const handleStopEMI = async (id) => {
    if (!window.confirm("Are you sure you want to Stop EMI recovery? This will cancel further deductions.")) return;
    try {
      const history = await dataService.getAdvanceHistory();
      const idx = history.findIndex(h => h.id === id);
      if (idx === -1) return;
      history[idx].status = 'Cancelled';
      await dataService.saveAdvanceHistory(history);
      setAdvances(history);
    } catch (err) {
      alert("Failed to cancel.");
    }
  };

  const stats = useMemo(() => {
    const activeAdvances = advances.filter(a => a.status === 'Approved' || a.status === 'Active' || a.status === 'Foreclosed');
    const totalEMI = activeAdvances.reduce((sum, a) => sum + (a.status === 'Foreclosed' ? ((a.amount||0) - (a.totalRepaid||0)) : (a.emi || 0)), 0);
    // SECURITY: Filter using resolvedMyEmpId (actual employees table ID)
    const myHistory = advances.filter(h => isEmployee
      ? (resolvedMyEmpId !== null && String(h.empId) === String(resolvedMyEmpId))
      : true
    );
    const totalPrincipal = myHistory.reduce((sum, h) => sum + (h.amount || 0), 0);
    return { totalEMI, totalPrincipal, historyCount: myHistory.length };
  }, [activeEmployees, advances, isEmployee, resolvedMyEmpId]);

  const displayHistory = useMemo(() => {
    return advances.filter(h => isEmployee
      ? (resolvedMyEmpId !== null && String(h.empId) === String(resolvedMyEmpId))
      : true
    );
  }, [advances, isEmployee, resolvedMyEmpId]);

  const pendingAdvances = useMemo(() => {
    return advances.filter(h => String(h.status).startsWith('Pending'));
  }, [advances]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Advances & Loans</h1>
          <p className="page-subtitle">Track personal advances, term loans, and official site advances.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', gap: '0.75rem' }}
        >
          <Plus size={20} />
          {isEmployee ? 'Apply for Advance' : 'Register New Advance'}
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <SummaryCard title={isEmployee ? "My EMI Deduction" : "Monthly Scheduled Recs"} value={`₹${stats.totalEMI.toLocaleString()}`} colorClass="bg-emerald-500" />
        <SummaryCard title={isEmployee ? "My Total Loan Principal" : "Active Principals (Historical)"} value={`₹${stats.totalPrincipal.toLocaleString()}`} colorClass="bg-blue-500" />
        <SummaryCard title={isEmployee ? "My Loan Records" : "Active Files"} value={stats.historyCount} colorClass="bg-amber-500" />
      </div>

      <style>{`
        .bg-blue-500 { background-color: var(--color-primary); }
        .bg-emerald-500 { background-color: var(--color-success); }
        .bg-amber-500 { background-color: var(--color-warning); }
        .expense-row { display: grid; grid-template-columns: 40px 1fr 120px; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); }
        .expense-row:last-child { border-bottom: none; }
        .checkbox-custom { width: 1.25rem; height: 1.25rem; cursor: pointer; accent-color: var(--color-primary); }
      `}</style>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2>{isEmployee ? "My Active Loan Details" : "Current EMI Deductions (Live Register)"}</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="header-search" style={{ width: '250px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Search size={18} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Search active deductions..." 
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
                <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Active EMI</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Gross Salary</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>EMI % of Gross</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {advances.filter(a => a.status === 'Approved' || a.status === 'Foreclosed').length === 0 ? (
                <tr>
                   <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No active deductions found.</td>
                </tr>
              ) : (
                advances.filter(a => a.status === 'Approved' || a.status === 'Foreclosed').map((adv) => {
                  const emp = activeEmployees.find(e => e.id === adv.empId) || { name: adv.empName, empCode: '', grossSalary: 1 };
                  const deduction = adv.status === 'Foreclosed' ? (adv.amount - (adv.totalRepaid || 0)) : adv.emi;
                  return (
                  <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>
                       <div>{emp.name}</div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '400' }}>{adv.id}</div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-danger)', fontWeight: '700' }}>₹{deduction.toLocaleString()} / mo</td>
                    <td style={{ padding: '1rem' }}>₹{(emp.grossSalary || 0).toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', position: 'relative' }}>
                          <div style={{ width: `${Math.min((deduction / (emp.grossSalary || 1)) * 100 * 2, 100)}%`, height: '100%', backgroundColor: 'var(--color-warning)', borderRadius: '3px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{((deduction / (emp.grossSalary || 1)) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-primary">{adv.status === 'Foreclosed' ? 'Foreclosure Recovery' : 'Deducting'}</span>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Approvals */}
      {!isEmployee && pendingAdvances.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-warning)' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-warning)' }}>Pending Approvals</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Amount</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Approvals</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingAdvances.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>{h.issueDate}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{h.empName || `ID: ${h.empId}`}</td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>₹{h.amount?.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: h.approvals?.admin ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: h.approvals?.admin ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Admin {h.approvals?.admin ? '✓' : ''}</span>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: h.approvals?.director ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: h.approvals?.director ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Director {h.approvals?.director ? '✓' : ''}</span>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: h.approvals?.finance ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: h.approvals?.finance ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Finance {h.approvals?.finance ? '✓' : ''}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {(userRole === 'admin' || userRole === 'management') && h.status === 'Pending Admin Approval' && (
                          <button onClick={() => handleApprove(h.id, 'admin')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Approve (Admin)</button>
                        )}
                        {(userRole === 'director' || userRole === 'management') && h.status === 'Pending Director Approval' && (
                          <button onClick={() => handleApprove(h.id, 'director')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Approve (Director)</button>
                        )}
                        {(userRole === 'finance' || userRole === 'management') && h.status === 'Pending Finance Approval' && (
                          <button onClick={() => handleApprove(h.id, 'finance')} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Approve (Finance)</button>
                        )}
                        <button onClick={() => handleReject(h.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
         <h2 style={{ marginBottom: '1.5rem' }}>Advance Transaction History</h2>
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Employee</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Type</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Principal</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>EMI / Tenure</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>{h.issueDate}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{h.empName || `ID: ${h.empId}`}</td>
                    <td style={{ padding: '1rem' }}>
                       <div><span className={`badge ${h.type === 'Personal Advance' ? 'badge-primary' : 'badge-warning'}`}>{h.type}</span></div>
                       <div style={{ marginTop: '0.5rem' }}>
                         <span className={`badge`} style={{ backgroundColor: h.status === 'Pending' ? 'var(--color-warning)' : h.status === 'Rejected' ? 'var(--color-danger)' : 'var(--color-success)', color: '#fff' }}>
                           {h.status || 'Active'}
                         </span>
                       </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>₹{h.amount?.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                       {h.emi > 0 ? (
                         <div>
                           <div>₹{(h.emi || 0).toLocaleString()} / mo</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Repaid: ₹{(h.totalRepaid || 0).toLocaleString()} / ₹{(h.amount || 0).toLocaleString()}</div>
                         </div>
                       ) : 'Lump-sum Settlement'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                       {!isEmployee && h.status === 'Approved' && (
                         <>
                           <button onClick={() => handleForeclose(h.id)} title="Foreclose Advance" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>Foreclose</button>
                           <button onClick={() => handleWaive(h.id)} title="Waive Balance" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>Waive</button>
                           <button onClick={() => handleStopEMI(h.id)} title="Stop EMI" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--color-danger)' }}>Stop</button>
                         </>
                       )}
                       {!isEmployee && (
                         <button onClick={() => handleDeleteAdvance(h.id)} className="btn btn-ghost" style={{ color: 'var(--color-danger)', padding: '0.25rem' }}>
                           <Trash2 size={16} />
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)' }}>
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <HandCoins className="text-primary" /> {isEmployee ? 'Apply for New Advance' : 'Register New Advance'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            
              {!isEmployee && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <User size={16} /> Select Employee
                  </label>
                  <select 
                    className="form-input" 
                    value={selectedEmpId} 
                    onChange={e => setSelectedEmpId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem' }}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.filter(e => e.status === 'Active').map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Advance Type</label>
                <select 
                  className="form-input" 
                  value={advanceType}
                  onChange={(e) => setAdvanceType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <option value="Personal Advance">Personal Advance / Salary Loan</option>
                  <option value="Official Site Advance">Site Visit Advance (Itemized)</option>
                </select>
              </div>

              {advanceType === 'Personal Advance' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 10000" 
                      style={{ width: '100%', padding: '0.75rem' }} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tenure (Months)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="1"
                      value={installments}
                      onChange={e => setInstallments(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem' }} 
                    />
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  {CATEGORIES.map(c => (
                    <div key={c.key} className="expense-row">
                      <input type="checkbox" className="checkbox-custom" checked={siteExpenses[c.key].enabled} onChange={() => handleCheckbox(c.key)} />
                      <span style={{ fontSize: '0.85rem' }}>{c.label}</span>
                      <input type="number" className="form-input" disabled={!siteExpenses[c.key].enabled} value={siteExpenses[c.key].amount} onChange={(e) => handleSiteAmount(c.key, e.target.value)} style={{ width: '80px', padding: '0.25rem' }} />
                    </div>
                  ))}
                  {/* Tenure not applicable for official site advances */}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>Total Principal</span>
                  <span style={{ fontWeight: '600' }}>₹{(advanceType === 'Personal Advance' ? (amount || 0) : calculateSiteTotal()).toLocaleString()}</span>
                </div>
                {advanceType === 'Personal Advance' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)', fontWeight: '700' }}>
                      <span>Monthly EMI Deduction</span>
                      <span style={{ fontSize: '1.1rem' }}>₹{emi.toLocaleString()} / mo</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      * This amount will be automatically deducted from {selectedEmpId ? employeesList.find(e => e.id === Number(selectedEmpId))?.name : 'the employee'}&apos;s salary for {installments} month(s).
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: '500' }}>
                    * Official site advance. No monthly EMI will be deducted. Expenses must be settled via the Expense Reporter upon completion.
                  </p>
                )}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.85rem', marginTop: '1.5rem', fontSize: '1rem', fontWeight: '600' }} 
                onClick={handleSave}
              >
                {isEmployee ? 'Submit Application' : 'Approve & Schedule Deduction'}
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Advances;

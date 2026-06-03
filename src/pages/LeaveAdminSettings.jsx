import React, { useState, useEffect } from 'react';
import { Settings, Users, Calendar, Plus, Edit2, Trash2, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { dataService } from '../utils/dataService';

const LeaveAdminSettings = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [loading, setLoading] = useState(true);

  // Leave Types State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editingType, setEditingType] = useState(null);

  // Allocation State
  const [employees, setEmployees] = useState([]);
  const [balances, setBalances] = useState({});
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [allocateType, setAllocateType] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const types = await dataService.getLeaveTypes();
      const emps = await dataService.getEmployees();
      const bals = await dataService.getLeaveBalances();

      setLeaveTypes(types);
      setEmployees(emps);
      setBalances(bals);
    } catch (err) {
      console.error('Failed to load leave settings data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    const updatedTypes = editingType.isNew
      ? [...leaveTypes, { ...editingType, id: editingType.name, isNew: undefined }]
      : leaveTypes.map(t => t.id === editingType.id ? editingType : t);

    await dataService.saveLeaveTypes(updatedTypes);
    setLeaveTypes(updatedTypes);
    setEditingType(null);
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?")) return;
    const updatedTypes = leaveTypes.filter(t => t.id !== id);
    await dataService.saveLeaveTypes(updatedTypes);
    setLeaveTypes(updatedTypes);
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !allocateType || !allocateAmount) return;

    try {
      const empBals = await dataService.getDetailedEmployeeBalances(selectedEmpId);
      const newAmount = parseInt(allocateAmount, 10);
      
      const typeBal = empBals[allocateType] || { allocated: 0, carried_forward: 0, used: 0, reserved: 0, available: 0 };
      
      typeBal.allocated = newAmount;
      typeBal.available = typeBal.allocated + (typeBal.carried_forward || 0) - (typeBal.used || 0) - (typeBal.reserved || 0);

      empBals[allocateType] = typeBal;

      await dataService.updateLeaveBalance(selectedEmpId, empBals);
      
      // Update local state
      setBalances(prev => ({...prev, [selectedEmpId]: empBals}));
      
      alert('Leave allocated successfully!');
      setAllocateAmount('');
    } catch (err) {
      console.error(err);
      alert('Failed to allocate leaves.');
    }
  };

  const handleProcessCarryForward = async () => {
    if (!window.confirm("Are you sure you want to process the Year-End Carry Forward? This will lapse excess leaves and recalculate balances for all employees based on policy.")) return;
    
    setLoading(true);
    try {
      await dataService.processYearEndCarryForward();
      await fetchData(); // reload new balances
      alert("Carry forward processed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to process carry forward.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Admin Settings</h1>
          <p className="page-subtitle">Manage leave types, policies, and employee allocations.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <button 
            className="btn btn-ghost" 
            style={{ borderRadius: 0, borderBottom: activeTab === 'types' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'types' ? 'var(--color-primary)' : 'inherit', padding: '1rem 1.5rem', fontWeight: '600' }}
            onClick={() => setActiveTab('types')}
          >
            <Settings size={18} style={{ marginRight: '0.5rem' }} /> Leave Types Config
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ borderRadius: 0, borderBottom: activeTab === 'allocation' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'allocation' ? 'var(--color-primary)' : 'inherit', padding: '1rem 1.5rem', fontWeight: '600' }}
            onClick={() => setActiveTab('allocation')}
          >
            <Users size={18} style={{ marginRight: '0.5rem' }} /> Leave Allocation
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ borderRadius: 0, borderBottom: activeTab === 'carryforward' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'carryforward' ? 'var(--color-primary)' : 'inherit', padding: '1rem 1.5rem', fontWeight: '600' }}
            onClick={() => setActiveTab('carryforward')}
          >
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> Year-End Carry Forward
          </button>
        </div>
      </div>

      {activeTab === 'types' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Leave Types</h2>
            <button className="btn btn-primary" onClick={() => setEditingType({ isNew: true, name: '', isPaid: true, allowCarryForward: false, defaultAllocation: 0 })}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Leave Type
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Leave Name</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Carry Forward</th>
                  <th style={{ padding: '1rem' }}>Default Allocation</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map(type => (
                  <tr key={type.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{type.name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${type.isPaid ? 'badge-success' : 'badge-warning'}`}>
                        {type.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {type.allowCarryForward ? <Check size={16} color="var(--color-success)"/> : <X size={16} color="var(--color-danger)"/>}
                    </td>
                    <td style={{ padding: '1rem' }}>{type.defaultAllocation} days</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.25rem', marginRight: '0.5rem' }} onClick={() => setEditingType(type)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--color-danger)' }} onClick={() => handleDeleteType(type.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'allocation' && (
        <div className="grid-2">
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Individual Allocation</h2>
            <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Employee</label>
                <select className="form-input" style={{ width: '100%' }} value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} required>
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.empCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select className="form-input" style={{ width: '100%' }} value={allocateType} onChange={e => setAllocateType(e.target.value)} required>
                  <option value="">-- Select Leave Type --</option>
                  {leaveTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Total Allocated Days (Annual)</label>
                <input type="number" className="form-input" style={{ width: '100%' }} value={allocateAmount} onChange={e => setAllocateAmount(e.target.value)} required min="0" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Allocate Balance</button>
            </form>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Current Balances (Selected)</h2>
            {selectedEmpId ? (
              <div>
                <p style={{ fontWeight: '600', marginBottom: '1rem' }}>Employee: {employees.find(e => e.id === selectedEmpId)?.name}</p>
                {leaveTypes.map(type => {
                  const empBals = balances[selectedEmpId] || {};
                  const typeBal = empBals[type.name] || { allocated: 0, carried_forward: 0, used: 0, reserved: 0, available: 0 };
                  
                  return (
                    <div key={type.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                      <span>{type.name}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600' }}>Available: {typeof typeBal === 'object' ? typeBal.available : (typeBal || 0)}</div>
                        {typeof typeBal === 'object' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Alloc: {typeBal.allocated} | CF: {typeBal.carried_forward} | Used: {typeBal.used} | Resrv: {typeBal.reserved}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                Select an employee to view their balances.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'carryforward' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>Year-End Carry Forward Processing</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Execute this process on December 31st. It evaluates all employee balances, carries forward eligible leaves (max 8 days), and lapses the rest based on your Leave Types policy.</p>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertTriangle color="var(--color-danger)" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ color: '#991b1b', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Warning</h4>
              <p style={{ color: '#991b1b', margin: 0, fontSize: '0.875rem' }}>This action is irreversible and recalculates balances for all employees in the system immediately. Only run this once at the end of the year.</p>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleProcessCarryForward} style={{ alignSelf: 'flex-start' }}>
            <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Execute Carry Forward Process
          </button>
        </div>
      )}

      {/* Editing Leave Type Modal */}
      {editingType && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingType.isNew ? 'New Leave Type' : 'Edit Leave Type'}</h2>
              <button className="btn btn-ghost" onClick={() => setEditingType(null)} style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleSaveType} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Leave Name</label>
                <input type="text" className="form-input" style={{ width: '100%' }} value={editingType.name} onChange={e => setEditingType({...editingType, name: e.target.value})} required disabled={!editingType.isNew} />
                {!editingType.isNew && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Name cannot be changed for existing types.</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={editingType.isPaid} onChange={e => setEditingType({...editingType, isPaid: e.target.checked})} />
                  Is Paid Leave
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={editingType.allowCarryForward} onChange={e => setEditingType({...editingType, allowCarryForward: e.target.checked})} />
                  Allow Year-End Carry Forward (Max 8 Days)
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Default Annual Allocation</label>
                <input type="number" className="form-input" style={{ width: '100%' }} value={editingType.defaultAllocation} onChange={e => setEditingType({...editingType, defaultAllocation: parseInt(e.target.value, 10)})} required min="0" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Type</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveAdminSettings;

import React, { useState, useEffect } from 'react';
import { Lock, Save, History, AlertCircle } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../supabaseClient';

const PayrollFormulaSettings = () => {
  const { showNotification } = useNotification();
  const [formulas, setFormulas] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Check role
    const role = authService.getUserRole();
    if (role === 'management' || role === 'admin') {
      setIsSuperAdmin(true);
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = await dataService.getPayrollFormulaConfig();
      if (config) {
        setFormulas(config);
      }
      
      // Fetch Audit logs directly for now
      if (supabase) {
        const { data: logs } = await supabase
          .from('payroll_formula_audit_log')
          .select('*')
          .order('changed_at', { ascending: false })
          .limit(20);
        if (logs) setAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to load formula settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (name, val) => {
    setFormulas(prev => prev.map(f => f.component_name === name ? { ...f, formula_value: Number(val) } : f));
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      showNotification('Access Denied. Only Management/Admin can change formulas.', 'error');
      return;
    }
    setSaving(true);
    try {
      const userName = authService.getCurrentUser()?.name || 'Admin';
      await dataService.savePayrollFormulaConfig(formulas, userName);
      showNotification('Payroll formulas updated successfully!', 'success');
      fetchData(); // Refresh to get new audit logs
    } catch (err) {
      console.error(err);
      showNotification('Error saving formulas', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="page-container">
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--color-surface)', borderRadius: '12px' }}>
          <Lock size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: 'var(--color-danger)' }}>Access Restricted</h2>
          <p>You do not have permission to view or modify Core Payroll Formulas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Payroll Engine Configuration</h1>
          <p className="page-subtitle">Manage system-wide formulas and constants</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          <Save size={18} style={{ marginRight: '0.5rem' }} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Formulas */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <Lock size={20} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Core Formulas (Global)</h2>
          </div>
          
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-danger)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--color-danger)" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-danger)', fontWeight: '500' }}>
              Warning: Changes here instantly affect all future salary structure calculations across the organization. Existing locked payroll records will not be altered.
            </p>
          </div>

          {loading ? <p>Loading formulas...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {formulas.map(f => (
                <div key={f.component_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 'bold', fontSize: '1rem' }}>{f.component_name}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Type: {f.formula_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="number"
                      className="form-input"
                      style={{ width: '120px', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'right' }}
                      value={f.formula_value}
                      onChange={(e) => handleValueChange(f.component_name, e.target.value)}
                    />
                    <span style={{ fontWeight: 'bold', color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                      {f.formula_type.includes('percentage') ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Audit Log */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
            <History size={20} color="var(--color-text-main)" />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Change Audit Log</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '2rem 0' }}>No historical changes found.</p>
            ) : auditLogs.map(log => (
              <div key={log.id} style={{ padding: '0.75rem', borderLeft: '3px solid var(--color-primary)', backgroundColor: 'var(--color-background)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{log.component_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(log.changed_at).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{log.old_value}</span>
                  <span>→</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>{log.new_value}</span>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>By: {log.changed_by}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollFormulaSettings;

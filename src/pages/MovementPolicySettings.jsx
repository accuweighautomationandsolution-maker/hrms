import React, { useState, useEffect } from 'react';
import { Shield, Clock, UserCheck, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { useNotification } from '../context/NotificationContext';

const MovementPolicySettings = () => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Policy State
  const [policy, setPolicy] = useState({
    option: 'B', // 'A' | 'B' | 'C'
    maxHoursPerMonth: 8,
    approvalHierarchy: 'Direct Manager'
  });

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      try {
        const activePolicy = await dataService.getMovementPolicies();
        setPolicy(activePolicy || {
          option: 'B',
          maxHoursPerMonth: 8,
          approvalHierarchy: 'Direct Manager'
        });
      } catch (err) {
        console.error("Failed to load movement policies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const success = await dataService.saveMovementPolicies(policy);
      if (success) {
        showNotification('Movement policy settings saved successfully.', 'success');
      } else {
        showNotification('Failed to save policy settings to database.', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error saving policy settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={32} color="var(--color-primary)" />
            Movement Policy Settings
          </h1>
          <p className="page-subtitle">Configure company rules, time deductions, and approval pathways for Out Duty & Out Pass requests.</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSave} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '700' }}>Out Pass Policies (Personal Movement)</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Determine how short-duration personal leave requests during working hours impact attendance and payroll.
            </p>
          </div>

          {/* Option Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {/* Option A */}
            <label 
              style={{
                display: 'flex',
                gap: '1.25rem',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                backgroundColor: policy.option === 'A' ? 'rgba(37, 99, 235, 0.03)' : 'var(--color-surface)',
                borderColor: policy.option === 'A' ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="radio" 
                name="policy-option" 
                value="A" 
                checked={policy.option === 'A'} 
                onChange={(e) => setPolicy({ ...policy, option: e.target.value })}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '700', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>Option A: Deduct spent time from active hours</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Subtracts the total duration of approved Out Passes from the employee's active biometric attendance hours. 
                  May trigger short-hour deductions if minimum hours are breached.
                </span>
              </div>
            </label>

            {/* Option B */}
            <label 
              style={{
                display: 'flex',
                gap: '1.25rem',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                backgroundColor: policy.option === 'B' ? 'rgba(37, 99, 235, 0.03)' : 'var(--color-surface)',
                borderColor: policy.option === 'B' ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="radio" 
                name="policy-option" 
                value="B" 
                checked={policy.option === 'B'} 
                onChange={(e) => setPolicy({ ...policy, option: e.target.value })}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '700', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>Option B: Enforce monthly hour limit (Allowance)</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Grants employees a fixed monthly allowance for personal movements. 
                  Any request exceeding the limit is automatically blocked.
                </span>
              </div>
            </label>

            {/* Option C */}
            <label 
              style={{
                display: 'flex',
                gap: '1.25rem',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                backgroundColor: policy.option === 'C' ? 'rgba(37, 99, 235, 0.03)' : 'var(--color-surface)',
                borderColor: policy.option === 'C' ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="radio" 
                name="policy-option" 
                value="C" 
                checked={policy.option === 'C'} 
                onChange={(e) => setPolicy({ ...policy, option: e.target.value })}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <span style={{ fontWeight: '700', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>Option C: Mark Paid / Unpaid</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  A flexible toggle where Out Passes can be designated as Paid or Unpaid. 
                  Unpaid hours directly deduct from the employee's payroll calculation.
                </span>
              </div>
            </label>
          </div>

          {/* Conditional Allowance Input */}
          {policy.option === 'B' && (
            <div 
              style={{ 
                padding: '1.5rem', 
                backgroundColor: 'var(--color-background)', 
                borderRadius: '8px', 
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--color-primary)" />
                Monthly Hours Quota Configuration
              </h3>
              <div className="form-group" style={{ marginBottom: 0, maxWidth: '250px' }}>
                <label className="form-label">Allowance Limit (Hours/Month)</label>
                <input 
                  type="number" 
                  min="0.5" 
                  step="0.5" 
                  required 
                  className="form-input" 
                  style={{ width: '100%' }}
                  value={policy.maxHoursPerMonth} 
                  onChange={(e) => setPolicy({ ...policy, maxHoursPerMonth: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                * Standard default is 8 hours per month. Balance updates dynamically on employee Out Pass cards.
              </span>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

          {/* Approval Hierarchy */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={22} color="var(--color-primary)" />
              Approval Pathways
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Define which roles must authorize Out Duty and Out Pass requests.
            </p>
            <div className="form-group" style={{ maxWidth: '350px', marginBottom: 0 }}>
              <label className="form-label">Approval Authority</label>
              <select 
                className="form-input" 
                style={{ width: '100%' }}
                value={policy.approvalHierarchy}
                onChange={(e) => setPolicy({ ...policy, approvalHierarchy: e.target.value })}
              >
                <option value="Direct Manager">Direct Reporting Manager</option>
                <option value="Admin Only">Admin/Management Only</option>
                <option value="Auto-Approve">Auto-Approve (Skip Manager Review)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ minWidth: '150px' }}
            >
              {saving ? (
                <>Saving Configuration...</>
              ) : (
                <>
                  <Save size={18} style={{ marginRight: '0.5rem' }} /> Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovementPolicySettings;

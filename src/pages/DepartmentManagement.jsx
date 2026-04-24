import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, ShieldCheck, Search } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { useNotification } from '../context/NotificationContext';

const DepartmentManagement = () => {
  const { showNotification } = useNotification();
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setDepartments(dataService.getDepartments());
  }, []);

  const handleAdd = () => {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    if (departments.includes(trimmed)) {
      showNotification('Department already exists!', 'error');
      return;
    }
    const updated = dataService.addDepartment(trimmed);
    setDepartments(updated);
    setNewDept('');
    showNotification(`Department "${trimmed}" added successfully.`, 'success');
  };

  const handleDelete = (name) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" department?`)) {
      const updated = dataService.deleteDepartment(name);
      setDepartments(updated);
      showNotification(`Department "${name}" removed.`, 'success');
    }
  };

  const filtered = departments.filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Master</h1>
          <p className="page-subtitle">Configure organizational business units for recruitment and reporting.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        
        {/* Add Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} color="var(--color-primary)" /> Register New Unit
            </h3>
            <div className="form-group">
              <label className="form-label">Department Name</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%' }}
                placeholder="e.g. Quality Assurance"
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={handleAdd}
              disabled={!newDept.trim()}
            >
              Add Department
            </button>
            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Note: Departments added here will immediately appear in the onboarding and profile dropdowns.
            </p>
          </div>

          <div className="card" style={{ backgroundColor: 'rgba(37,99,235,0.05)', border: '1px dashed var(--color-primary)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
               <ShieldCheck size={16}/> Data Integrity
            </h4>
            <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
              Deleting a department here will remove it from future selections. Existing employee records with this department will retain the name for historical accuracy.
            </p>
          </div>
        </div>

        {/* List Section */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Active Departments ({departments.length})</h3>
            <div className="header-search" style={{ margin: 0, padding: '0.25rem 0.75rem', border: '1px solid var(--color-border)' }}>
              <Search size={16} color="var(--color-text-muted)" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.length > 0 ? filtered.map(dept => (
              <div key={dept} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="var(--color-primary)" />
                  </div>
                  <span style={{ fontWeight: 600 }}>{dept}</span>
                </div>
                <button 
                  className="btn btn-ghost" 
                  style={{ color: 'var(--color-danger)', padding: '0.5rem' }}
                  onClick={() => handleDelete(dept)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <Search size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>No departments found matching your search.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DepartmentManagement;

import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Plus, Trash2, Edit3, Save, Search, GraduationCap, Clock, User, Calendar } from 'lucide-react';
import { dataService } from '../utils/dataService';
import { authService } from '../utils/authService';

const TrainingInduction = ({ userRole }) => {
  const isManagement = userRole === 'management';
  const isEmployee = userRole === 'employee';
  const [activeTab, setActiveTab] = useState('training');
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    type: '',
    time: '',
    trainer: '',
    date: new Date().toISOString().split('T')[0],
    selectedAttendeeIds: []
  });

  const [loading, setLoading] = useState(true);
  const [inductionTasksMap, setInductionTasksMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [trainingData, employeeData] = await Promise.all([
          dataService.getTrainingRecords(),
          dataService.getEmployees()
        ]);
        setRecords(trainingData);
        setEmployees(employeeData);

        const taskMap = {};
        await Promise.all(employeeData.map(async (emp) => {
          taskMap[emp.id] = await dataService.getInductionTasks(emp.id);
        }));
        setInductionTasksMap(taskMap);
      } catch (err) {
        console.error("Failed to load growth data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = () => {
    if (!form.type || !form.trainer || !form.date) {
      alert('Please fill all mandatory fields!');
      return;
    }

    const attendeeNames = employees
      .filter(e => form.selectedAttendeeIds.includes(e.id))
      .map(e => e.name.split(' ')[0])
      .join(', ');

    let newList;
    if (editingId) {
      newList = records.map(r => r.id === editingId ? { ...form, id: editingId, attendeeNames } : r);
    } else {
      newList = [...records, { ...form, id: Date.now(), attendeeNames }];
    }

    setRecords(newList);
    dataService.saveTrainingRecords(newList);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this training record?')) {
      const newList = records.filter(r => r.id !== id);
      setRecords(newList);
      dataService.saveTrainingRecords(newList);
    }
  };

  const resetForm = () => {
    setForm({
      type: '',
      time: '',
      trainer: '',
      date: new Date().toISOString().split('T')[0],
      selectedAttendeeIds: []
    });
    setEditingId(null);
  };

  const startEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      type: rec.type,
      time: rec.time,
      trainer: rec.trainer,
      date: rec.date,
      selectedAttendeeIds: rec.selectedAttendeeIds || []
    });
    setShowModal(true);
  };

  const toggleAttendee = (id) => {
    setForm(prev => ({
      ...prev,
      selectedAttendeeIds: prev.selectedAttendeeIds.includes(id)
        ? prev.selectedAttendeeIds.filter(aid => aid !== id)
        : [...prev.selectedAttendeeIds, id]
    }));
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>Loading growth tracker...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="page-title">Growth & Induction</h1>
          <p className="page-subtitle">Manage employee training logs and onboarding induction progress.</p>
        </div>
        {isManagement && activeTab === 'training' && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Log Training Session
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, marginBottom: '2rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button 
            onClick={() => setActiveTab('training')}
            style={{ 
              padding: '1rem 2rem', 
              cursor: 'pointer', 
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'training' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'training' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BookOpen size={18} /> Training Modules
          </button>
          <button 
             onClick={() => setActiveTab('induction')}
             style={{ 
               padding: '1rem 2rem', 
               cursor: 'pointer', 
               backgroundColor: 'transparent',
               border: 'none',
               borderBottom: activeTab === 'induction' ? '3px solid var(--color-primary)' : '3px solid transparent',
               color: activeTab === 'induction' ? 'var(--color-primary)' : 'var(--color-text-muted)',
               fontWeight: '600',
               display: 'flex',
               alignItems: 'center',
               gap: '0.5rem'
             }}
          >
            <UserCheck size={18} /> Induction Status
          </button>
        </div>

        <div style={{ padding: '2rem' }}>
          {activeTab === 'training' && (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      <th style={{ padding: '1rem' }}>Training Type</th>
                      <th style={{ padding: '1rem' }}>Speaker / Trainer</th>
                      <th style={{ padding: '1rem' }}>Duration</th>
                      <th style={{ padding: '1rem' }}>Date</th>
                      <th style={{ padding: '1rem' }}>Attendees</th>
                      {isManagement && <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{rec.type}</td>
                        <td style={{ padding: '1rem' }}>{rec.trainer}</td>
                        <td style={{ padding: '1rem' }}><span className="badge badge-default">{rec.time}</span></td>
                        <td style={{ padding: '1rem' }}>{rec.date}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{rec.attendeeNames}</div>
                        </td>
                        {isManagement && (
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => startEdit(rec)}>
                                <Edit3 size={16} color="var(--color-primary)" />
                              </button>
                              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => handleDelete(rec.id)}>
                                <Trash2 size={16} color="var(--color-danger)" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'induction' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {employees
                .filter(emp => isEmployee ? emp.id === authService.getCurrentUser()?.id : true)
                .slice(0, 6)
                .map(emp => {
                const tasks = inductionTasksMap[emp.id] || [];
                const completed = tasks.filter(t => t.status === 'Completed').length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

                return (
                  <div key={emp.id} className="card" style={{ border: '1px solid var(--color-border)', margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="avatar" style={{ width: '40px', height: '40px' }}>{emp.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: '700' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{emp.role}</div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        <span>Induction Progress</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{progress}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--color-background)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tasks.slice(0, 3).map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                          <span style={{ color: t.status === 'Completed' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                            {t.status === 'Completed' ? '●' : '○'}
                          </span>
                          <span style={{ textDecoration: t.status === 'Completed' ? 'line-through' : 'none', color: t.status === 'Completed' ? 'var(--color-text-muted)' : 'inherit' }}>
                            {t.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Update Training Session' : 'New Training Log'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Training Type *</label>
                <input type="text" className="form-input" style={{ width: '100%' }} value={form.type} onChange={e => handleInput('type', e.target.value)} placeholder="e.g. Safety Training" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <input type="text" className="form-input" style={{ width: '100%' }} value={form.time} onChange={e => handleInput('time', e.target.value)} placeholder="e.g. 2 Hours" />
              </div>
              <div className="form-group">
                <label className="form-label">Speaker / Trainer *</label>
                <input type="text" className="form-input" style={{ width: '100%' }} value={form.trainer} onChange={e => handleInput('trainer', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={form.date} onChange={e => handleInput('date', e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Select Attendees (Employees)</label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.5rem' }}>
                {employees.map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={form.selectedAttendeeIds.includes(emp.id)} onChange={() => toggleAttendee(emp.id)} />
                    {emp.name} ({emp.department})
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={18} style={{ marginRight: '0.5rem' }} /> {editingId ? 'Update Log' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleInput(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }
};

export default TrainingInduction;

import React, { useState } from 'react';
import { Search, ChevronLeft, Phone, Mail, MessageSquare } from 'lucide-react';
import { dataService } from '../../../src/utils/dataService';

const EmployeeDirectory = ({ onNavigate }) => {
  const [searchQ, setSearchQ] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await dataService.getEmployees();
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to load employees:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = employees.filter(e => 
    e.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    e.department.toLowerCase().includes(searchQ.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--m-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mobile-header" style={{ background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => onNavigate('menu')} 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'white', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}
          >
            <ChevronLeft size={20} color="var(--m-text)" />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900' }}>Directory</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--m-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search colleagues..." 
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1.1rem 1rem 1.1rem 3.25rem', 
              borderRadius: '20px', 
              border: 'none',
              fontSize: '0.95rem',
              outline: 'none',
              background: 'white',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(emp => (
            <div key={emp.id} className="m-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '12px', 
                  background: 'var(--m-primary)', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: '700'
                }}>
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{emp.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{emp.role} • {emp.department}</p>
                </div>
              </div>
              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-around'
              }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--m-primary)' }}><Phone size={20}/></button>
                <button style={{ background: 'none', border: 'none', color: 'var(--m-primary)' }}><Mail size={20}/></button>
                <button style={{ background: 'none', border: 'none', color: 'var(--m-primary)' }}><MessageSquare size={20}/></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--m-text-muted)' }}>No colleagues found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDirectory;

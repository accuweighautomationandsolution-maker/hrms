import React from 'react';
import { FileText, ChevronLeft, Download, Eye } from 'lucide-react';

const HRPolicies = ({ onNavigate }) => {
  const policies = [
    { id: 1, title: 'Employee Handbook', size: '2.4 MB', type: 'PDF' },
    { id: 2, title: 'Leave & Attendance Policy', size: '1.1 MB', type: 'PDF' },
    { id: 3, title: 'Code of Ethics', size: '850 KB', type: 'PDF' },
    { id: 4, title: 'Remote Work Guidelines', size: '1.5 MB', type: 'PDF' },
  ];

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>HR Policies</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {policies.map(policy => (
            <div key={policy.id} className="m-card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ padding: '0.75rem', background: '#f1f5f9', borderRadius: '12px', color: '#64748b' }}>
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{policy.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m-text-muted)' }}>{policy.type} • {policy.size}</p>
                </div>
              </div>
              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '1rem', 
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '1rem'
              }}>
                <button className="m-btn" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.8rem', flex: 1 }}>
                  <Eye size={16} /> View
                </button>
                <button className="m-btn" style={{ background: 'var(--m-primary)', color: 'white', fontSize: '0.8rem', flex: 1 }}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HRPolicies;

import React from 'react';
import { FolderOpen, ChevronLeft, FileText, Download, Clock } from 'lucide-react';

const MyDocuments = ({ onNavigate }) => {
  const documents = [
    { id: 1, title: 'Offer Letter', date: 'Jan 01, 2024', category: 'Onboarding' },
    { id: 2, title: 'Appointment Letter', date: 'Jan 05, 2024', category: 'Onboarding' },
    { id: 3, title: 'Salary Slips - March 2026', date: 'Apr 01, 2026', category: 'Payroll' },
    { id: 4, title: 'Salary Slips - Feb 2026', date: 'Mar 01, 2026', category: 'Payroll' },
  ];

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => onNavigate('menu')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>My Documents</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {documents.map(doc => (
            <div key={doc.id} className="m-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: '#eff6ff', borderRadius: '12px', color: 'var(--m-primary)' }}>
                <FileText size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{doc.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--m-text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                   <Clock size={12} />
                   <span>{doc.date} • {doc.category}</span>
                </div>
              </div>
              <button style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                background: '#f1f5f9', 
                border: 'none',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Download size={20} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="m-card" style={{ marginTop: '2rem', border: '2px dashed #e2e8f0', background: 'none', textAlign: 'center' }}>
           <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--m-text-muted)' }}>
             Need specific document? <br/>
             <span style={{ color: 'var(--m-primary)', fontWeight: '700' }}>Request from HR</span>
           </p>
        </div>
      </div>
    </div>
  );
};

export default MyDocuments;

import React from 'react';
import { 
  Users, Calendar, Clock, Banknote, Receipt, 
  Map, GraduationCap, ShieldCheck, FileText, 
  FolderOpen, ChevronLeft, LayoutDashboard
} from 'lucide-react';

const MobileMenu = ({ onNavigate }) => {
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
    { id: 'directory', label: 'Directory', icon: Users, color: '#2563eb' },
    { id: 'leaves', label: 'Leaves', icon: Calendar, color: '#10b981' },
    { id: 'attendance', label: 'Attendance', icon: Clock, color: '#f59e0b' },
    { id: 'loans', label: 'Loans & Advances', icon: Banknote, color: '#8b5cf6' },
    { id: 'expenses', label: 'Expenses', icon: Receipt, color: '#ec4899' },
    { id: 'holidays', label: 'Holiday List', icon: Map, color: '#f43f5e' },
    { id: 'training', label: 'Growth & Training', icon: GraduationCap, color: '#06b6d4' },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck, color: '#14b8a6' },
    { id: 'policies', label: 'HR Policies', icon: FileText, color: '#475569' },
    { id: 'documents', label: 'My Documents', icon: FolderOpen, color: '#0f172a' },
  ];

  return (
    <div className="animate-slide-up">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => onNavigate('home')} 
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--m-text-muted)' }}
          >
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Menu</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem',
          marginTop: '0.5rem'
        }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1.25rem 0.5rem',
                background: 'white',
                borderRadius: '20px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: `${item.color}15`, 
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <item.icon size={24} />
              </div>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: '700', 
                color: '#334155',
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="m-card" style={{ marginTop: '2rem', background: 'linear-gradient(135deg, #0f172a, #334155)', border: 'none' }}>
           <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Help & Support</h4>
           <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0 }}>Need assistance? Reach out to HR or check the FAQ.</p>
           <button className="m-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
             Contact Support
           </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

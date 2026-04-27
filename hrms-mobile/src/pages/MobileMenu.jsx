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
    <div className="animate-slide-up" style={{ position: 'relative', overflow: 'hidden', paddingBottom: '100px' }}>
      <div className="bg-blob" style={{ top: '-50px', right: '-50px' }}></div>
      
      <div className="mobile-header" style={{ background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => onNavigate('home')} 
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--m-text)' }}>Explore</h2>
        </div>
      </div>

      <div className="mobile-container">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1.25rem',
          marginTop: '0.5rem'
        }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1.5rem',
                background: 'white',
                borderRadius: '24px',
                border: '1px solid rgba(0,0,0,0.02)',
                boxShadow: 'var(--m-card-shadow)',
                cursor: 'pointer',
                textAlign: 'left',
                height: '140px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: `${item.color}15`, 
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <item.icon size={22} />
              </div>
              <span style={{ 
                fontSize: '0.85rem', 
                fontWeight: '800', 
                color: '#1e293b',
                lineHeight: 1.2
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="m-card" style={{ 
          marginTop: '2.5rem', 
          background: 'linear-gradient(135deg, var(--m-primary), var(--m-primary-dark))', 
          border: 'none',
          padding: '2rem'
        }}>
           <h4 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800' }}>Expert Support</h4>
           <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>Connect with HR for personalized guidance and support.</p>
           <button className="m-btn" style={{ background: 'white', color: 'var(--m-primary)', marginTop: '1.5rem', fontWeight: '800' }}>
             Talk to HR
           </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

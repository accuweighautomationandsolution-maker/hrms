import React, { useState, useEffect } from 'react';
import './styles/mobile.css';
import { 
  Home, Clock, Calendar, User, LayoutDashboard, 
  Menu, X, LogOut, Settings, Bell, 
  Users, Banknote, Receipt, Map, GraduationCap, 
  ShieldCheck, FileText, FolderOpen 
} from 'lucide-react';
import MobileDashboard from './pages/MobileDashboard';
import AttendancePunch from './pages/AttendancePunch';
import MobileMenu from './pages/MobileMenu';
import EmployeeDirectory from './pages/EmployeeDirectory';
import LeaveManagement from './pages/LeaveManagement';
import AdvanceLoans from './pages/AdvanceLoans';
import SubmitExpenses from './pages/SubmitExpenses';
import HolidayList from './pages/HolidayList';
import GrowthTraining from './pages/GrowthTraining';
import ComplianceHub from './pages/ComplianceHub';
import HRPolicies from './pages/HRPolicies';
import MyDocuments from './pages/MyDocuments';
import { authService } from '../../src/utils/authService';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'management';

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home, roles: ['management', 'employee'] },
    { id: 'punch', label: 'Attendance Punch', icon: Clock, roles: ['employee'] },
    { id: 'directory', label: 'Employee Directory', icon: Users, roles: ['management', 'employee'] },
    { id: 'leaves', label: 'Leave Management', icon: Calendar, roles: ['management', 'employee'] },
    { id: 'loans', label: 'Advance & Loans', icon: Banknote, roles: ['employee'] },
    { id: 'expenses', label: 'Submit Expenses', icon: Receipt, roles: ['employee'] },
    { id: 'holidays', label: 'Holiday List', icon: Map, roles: ['management', 'employee'] },
    { id: 'training', label: 'Growth & Training', icon: GraduationCap, roles: ['employee'] },
    { id: 'compliance', label: 'Compliance Hub', icon: ShieldCheck, roles: ['management', 'employee'] },
    { id: 'policies', label: 'HR Policies', icon: FileText, roles: ['management', 'employee'] },
    { id: 'documents', label: 'My Documents', icon: FolderOpen, roles: ['employee'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || 'employee'));

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':       return <MobileDashboard onNavigate={handleNavigate} onMenuToggle={() => setSidebarOpen(true)} />;
      case 'punch':      return <AttendancePunch onNavigate={handleNavigate} />;
      case 'menu':       return <MobileMenu onNavigate={handleNavigate} userRole={user?.role} />;
      case 'directory':  return <EmployeeDirectory onNavigate={handleNavigate} />;
      case 'leaves':     return <LeaveManagement onNavigate={handleNavigate} />;
      case 'loans':      return <AdvanceLoans onNavigate={handleNavigate} />;
      case 'expenses':   return <SubmitExpenses onNavigate={handleNavigate} />;
      case 'holidays':   return <HolidayList onNavigate={handleNavigate} />;
      case 'training':   return <GrowthTraining onNavigate={handleNavigate} />;
      case 'compliance': return <ComplianceHub onNavigate={handleNavigate} />;
      case 'policies':   return <HRPolicies onNavigate={handleNavigate} />;
      case 'documents':  return <MyDocuments onNavigate={handleNavigate} />;
      case 'profile':    return (
        <div className="animate-slide-up mobile-container">
          <div className="mobile-header" style={{ paddingLeft: 0, paddingRight: 0, background: 'transparent', border: 'none' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>My Profile</h2>
          </div>
          <div className="m-card" style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--m-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: '800' }}>
                {user?.name?.split(' ').map(n => n[0]).join('') || 'SB'}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{user?.name || 'User'}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--m-text-muted)' }}>{isAdmin ? 'System Administrator' : 'Employee'} • {user?.email}</p>
              </div>
            </div>
            <button className="m-btn" style={{ background: 'var(--m-bg)', color: 'var(--m-text)', fontSize: '0.875rem' }}>
              Edit Personal Info
            </button>
          </div>
          <button className="m-btn" style={{ background: '#fee2e2', color: 'var(--m-danger)', marginTop: '2rem', fontWeight: '800' }} onClick={() => authService.logout()}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      );
      default: return <MobileDashboard onNavigate={handleNavigate} onMenuToggle={() => setSidebarOpen(true)} />;
    }
  };

  return (
    <div id="mobile-shell">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, backdropFilter: 'blur(4px)' }} 
        />
      )}

      {/* Sidebar Drawer */}
      <aside style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '280px', 
        height: '100%', 
        background: 'white', 
        zIndex: 2001, 
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '10px 0 30px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--m-primary)' }}>HRMS <span style={{ color: 'var(--m-text)' }}>Mobile</span></h2>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--m-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{user?.role || 'Guest'}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ color: 'var(--m-text-muted)' }}><X size={24} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredMenu.map(item => (
              <button 
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  background: activeTab === item.id ? 'var(--m-bg)' : 'transparent',
                  color: activeTab === item.id ? 'var(--m-primary)' : 'var(--m-text)',
                  fontWeight: activeTab === item.id ? '800' : '600',
                  fontSize: '0.95rem'
                }}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', width: '100%', color: 'var(--m-danger)', fontWeight: '700' }} onClick={() => authService.logout()}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {renderContent()}

      {/* Modern Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={22} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'punch' ? 'active' : ''}`} onClick={() => setActiveTab('punch')}>
          <Clock size={22} />
          <span>Punch</span>
        </button>
        <button className={`nav-item ${isSidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
          <span>Menu</span>
        </button>
        <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>

      <style>{`
        #mobile-shell {
          max-width: 500px;
          margin: 0 auto;
          background: var(--m-bg);
          min-height: 100vh;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }
        .nav-item {
          background: none;
          border: none;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }
      `}</style>
    </div>
  );
};

export default App;

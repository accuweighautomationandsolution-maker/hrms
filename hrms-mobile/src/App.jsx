import React, { useState } from 'react';
import { Home, Clock, Calendar, User, LayoutDashboard } from 'lucide-react';
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

const App = () => {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':       return <MobileDashboard onNavigate={setActiveTab} />;
      case 'punch':      return <AttendancePunch onNavigate={setActiveTab} />;
      case 'menu':       return <MobileMenu onNavigate={setActiveTab} />;
      case 'directory':  return <EmployeeDirectory onNavigate={setActiveTab} />;
      case 'leaves':     return <LeaveManagement onNavigate={setActiveTab} />;
      case 'loans':      return <AdvanceLoans onNavigate={setActiveTab} />;
      case 'expenses':   return <SubmitExpenses onNavigate={setActiveTab} />;
      case 'holidays':   return <HolidayList onNavigate={setActiveTab} />;
      case 'training':   return <GrowthTraining onNavigate={setActiveTab} />;
      case 'compliance': return <ComplianceHub onNavigate={setActiveTab} />;
      case 'policies':   return <HRPolicies onNavigate={setActiveTab} />;
      case 'documents':  return <MyDocuments onNavigate={setActiveTab} />;
      case 'profile':    return (
        <div className="animate-slide-up mobile-container">
          <h2 style={{ fontWeight: '800' }}>My Profile</h2>
          <div className="m-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--m-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700' }}>
                SB
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Saurabh Bhagwat</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--m-text-muted)' }}>System Administrator • Management</p>
              </div>
            </div>
            <button className="m-btn" style={{ background: '#f1f5f9', color: 'var(--m-text)', fontSize: '0.875rem' }}>
              Edit Personal Info
            </button>
          </div>
          <button className="m-btn" style={{ background: '#fee2e2', color: 'var(--m-danger)', marginTop: '2rem' }}>
            Sign Out
          </button>
        </div>
      );
      default: return <MobileDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div id="mobile-shell">
      {renderContent()}

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={24} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'punch' ? 'active' : ''}`} onClick={() => setActiveTab('punch')}>
          <Clock size={24} />
          <span>Punch</span>
        </button>
        <button className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
          <LayoutDashboard size={24} />
          <span>Menu</span>
        </button>
        <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={24} />
          <span>Profile</span>
        </button>
      </nav>

      <style>{`
        #mobile-shell {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          min-height: 100vh;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }
        .nav-item {
          background: none;
          border: none;
          cursor: pointer;
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { NotificationProvider } from './context/NotificationContext';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import LeaveManagement from './pages/LeaveManagement';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Advances from './pages/Advances';
import Approvals from './pages/Approvals';
import Expenses from './pages/Expenses';
import Performance from './pages/Performance';
import SalaryStructure from './pages/SalaryStructure';
import HolidayList from './pages/HolidayList';
import Login from './pages/Login';
import PFReport from './pages/PFReport';
import ESICReport from './pages/ESICReport';
import AttendanceReport from './pages/AttendanceReport';
import LeaveReport from './pages/LeaveReport';
import AdvanceReport from './pages/AdvanceReport';
import PayrollReport from './pages/PayrollReport';
import SiteExpenseReport from './pages/SiteExpenseReport';
import BudgetControl from './pages/BudgetControl';
import HiringRequests from './pages/HiringRequests';
import ExitManagement from './pages/ExitManagement';
import BonusManagement from './pages/BonusManagement';
import PolicyManagement from './pages/PolicyManagement';
import TrainingInduction from './pages/TrainingInduction';
import ComplianceHub from './pages/ComplianceHub';
import UserManagement from './pages/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import Recruitment from './pages/Recruitment';
import LetterTemplates from './pages/LetterTemplates';
import DocumentHub from './pages/DocumentHub';
import MyDocuments from './pages/MyDocuments';
import MobilePreview from './pages/MobilePreview';
import OutDuty from './pages/OutDuty';
import OutPass from './pages/OutPass';
import MovementReports from './pages/MovementReports';
import MovementPolicySettings from './pages/MovementPolicySettings';
import ErrorBoundary from './components/ErrorBoundary';
import { authService } from './utils/authService';
import './App.css'; 

const APP_VERSION = 'v3.4.3-EMP-ISOLATION-FIX';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Checking connectivity...');
  const [isManager, setIsManager] = useState(false);
  const [myEmployeeProfile, setMyEmployeeProfile] = useState(null);

  useEffect(() => {
    const checkManagerStatus = async () => {
      if (!currentUser) {
        setIsManager(false);
        setMyEmployeeProfile(null);
        return;
      }
      try {
        const myProfile = await dataService.getMyEmployeeProfile(currentUser).catch(() => null);
        setMyEmployeeProfile(myProfile);
        if (myProfile) {
          const emps = await dataService.getEmployees().catch(() => []);
          const hasReportees = emps.some(e => e.managerIds && e.managerIds.map(String).includes(String(myProfile.id)));
          setIsManager(hasReportees);
        } else {
          setIsManager(false);
        }
      } catch (err) {
        console.error("Error checking manager status in App.jsx:", err);
        setIsManager(false);
      }
    };
    checkManagerStatus();
  }, [currentUser]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    console.log("App: Initiating logout...");
    try {
      // Set a timeout for the logout call to prevent hanging the UI
      const logoutPromise = authService.logout();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500));
      await Promise.race([logoutPromise, timeoutPromise]);
    } catch (err) {
      console.error("App: Logout error:", err);
    } finally {
      console.log('App: Clearing session and redirecting...');
      setCurrentUser(null);
      // Preserve vault_* keys so documents survive logout
      const vaultBackup = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('vault_')) vaultBackup[k] = localStorage.getItem(k);
      }
      localStorage.clear();
      sessionStorage.clear();
      Object.entries(vaultBackup).forEach(([k, v]) => localStorage.setItem(k, v));
      // Force hard redirect to login page
      window.location.href = '/login?logout=success';
    }
  }, []);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      console.log("App: Starting Auth Initialization...");
      
      // Version check for cache busting
      const cachedVersion = localStorage.getItem('APP_VERSION');
      if (cachedVersion !== APP_VERSION) {
        console.log('App: Version changed, clearing cache.', cachedVersion, '->', APP_VERSION);
        // Preserve vault_* keys so documents survive version updates
        const vaultBackup = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('vault_')) vaultBackup[k] = localStorage.getItem(k);
        }
        localStorage.clear();
        sessionStorage.clear();
        Object.entries(vaultBackup).forEach(([k, v]) => localStorage.setItem(k, v));
        localStorage.setItem('APP_VERSION', APP_VERSION);
        window.location.reload(true);
        return;
      }

      // Fallback timeout to prevent permanent hang
      const timeout = setTimeout(() => {
        if (isInitializing) {
          console.warn("App: Initialization timeout reached. Proceeding...");
          setIsInitializing(false);
        }
      }, 5000);

      try {
        setInitStatus('Authenticating session...');
        await authService.init();
        
        // Listen to session changes globally
        authService.onSessionChange((user) => {
           if (!user && currentUser) {
             console.log("App: Session expired or logged out externally.");
             setCurrentUser(null);
             window.location.href = '/login?logout=expired';
           } else if (user) {
             setCurrentUser(user);
           }
        });

        const user = authService.getCurrentUser();
        setInitStatus(user ? `Welcome, ${user.name}` : 'Ready for login');
        console.log("App: Auth Init Complete. User:", user?.email || 'Guest');
        setCurrentUser(user);
      } catch (err) {
        console.error("App: Auth Init Crash:", err);
        setInitStatus('Error: Backend unreachable');
      } finally {
        clearTimeout(timeout);
        setIsInitializing(false);
      }
    };
    initAuth();
  }, []);

  // Inactivity Timer
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("You have been logged out due to inactivity.");
        handleLogout();
      }, INACTIVITY_TIMEOUT);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [currentUser, handleLogout]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse uppercase tracking-widest text-sm">Securing Environment...</p>
        <p className="text-slate-400 text-xs mt-2">{initStatus}</p>
        <button 
          onClick={() => setIsInitializing(false)}
          className="mt-8 text-indigo-600 hover:text-indigo-700 text-xs font-semibold underline cursor-pointer"
        >
          Skip & Proceed to Login
        </button>
      </div>
    );
  }

  const userRole = currentUser?.role;
  const isAdmin = userRole === 'management' || userRole === 'admin';

  // Unauthenticated Wrapper
  if (!currentUser) {
    return (
      <NotificationProvider>
        <Router>
          <Toast />
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={setCurrentUser} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    );
  }

  // Authenticated Layout Wrapper
  return (
    <NotificationProvider>
      <Router>
        <Toast />
        <div className="app-layout">
          <Sidebar userRole={userRole} isManager={isManager} />
          <div className="main-content">
            <Header onLogout={handleLogout} userRole={userRole} userName={currentUser.name} />
            <main className="page-content">
              <ErrorBoundary>
                <Routes>
                  {/* Universal Authorized Routes */}
                <Route path="/" element={<Dashboard userRole={userRole} />} />
                <Route path="/directory" element={<EmployeeDirectory userRole={userRole} />} />
                <Route path="/leaves" element={<LeaveManagement />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/attendance-report" element={<AttendanceReport />} />
                <Route path="/holidays"   element={<HolidayList userRole={userRole} />} />
                <Route path="/advances"   element={<Advances />} />
                 <Route path="/expenses"   element={<Expenses />} />
                <Route path="/my-documents" element={<MyDocuments />} />
                <Route path="/out-duty" element={<OutDuty />} />
                <Route path="/out-pass" element={<OutPass />} />

                {/* Manager / Admin Shared Routes */}
                {(isAdmin || isManager) && (
                  <>
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/movement-reports" element={<MovementReports />} />
                  </>
                )}
                
                {/* Management-Strict Routes */}
                {isAdmin && (
                  <>
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/pf-report" element={<PFReport />} />
                    <Route path="/esic-report" element={<ESICReport />} />
                    <Route path="/leave-report" element={<LeaveReport />} />
                    <Route path="/advance-report" element={<AdvanceReport />} />
                    <Route path="/payroll-report" element={<PayrollReport />} />
                    <Route path="/site-expenses" element={<SiteExpenseReport />} />
                    <Route path="/recruitment" element={<Recruitment />} />
                    <Route path="/document-hub" element={<DocumentHub />} />
                    <Route path="/letter-templates" element={<LetterTemplates />} />
                    <Route path="/budget-control" element={<BudgetControl />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/compensation" element={<SalaryStructure />} />
                    <Route path="/exit-management" element={<ExitManagement />} />
                    <Route path="/bonus-management" element={<BonusManagement />} />
                    <Route path="/user-management" element={<UserManagement />} />
                    <Route path="/departments" element={<DepartmentManagement />} />
                    <Route path="/movement-policies" element={<MovementPolicySettings />} />
                  </>
                )}
                
                <Route path="/hiring-requests" element={<HiringRequests />} />
                <Route path="/training" element={<TrainingInduction userRole={userRole} />} />
                <Route path="/compliance" element={<ComplianceHub userRole={userRole} />} />
                <Route path="/policies" element={<PolicyManagement userRole={userRole} />} />
                <Route path="/mobile-preview" element={<MobilePreview />} />
                
                {/* Catch-All Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;

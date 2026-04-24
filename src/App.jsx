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
import { authService } from './utils/authService';
import './App.css'; 

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Logout handler
  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    // Force redirect to login with feedback
    window.location.href = '/login?logout=success';
  }, []);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      await authService.init();
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      setIsInitializing(false);
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
      </div>
    );
  }

  const userRole = currentUser?.role;

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
          <Sidebar userRole={userRole} />
          <div className="main-content">
            <Header onLogout={handleLogout} userRole={userRole} userName={currentUser.name} />
            <main className="page-content">
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
                
                {/* Management-Strict Routes */}
                {userRole === 'management' && (
                  <>
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/pf-report" element={<PFReport />} />
                    <Route path="/esic-report" element={<ESICReport />} />
                    <Route path="/leave-report" element={<LeaveReport />} />
                    <Route path="/advance-report" element={<AdvanceReport />} />
                    <Route path="/payroll-report" element={<PayrollReport />} />
                    <Route path="/site-expenses" element={<SiteExpenseReport />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/recruitment" element={<Recruitment />} />
                    <Route path="/document-hub" element={<DocumentHub />} />
                    <Route path="/letter-templates" element={<LetterTemplates />} />
                    <Route path="/budget-control" element={<BudgetControl />} />
                    <Route path="/budget-control" element={<BudgetControl />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/compensation" element={<SalaryStructure />} />
                    <Route path="/exit-management" element={<ExitManagement />} />
                    <Route path="/bonus-management" element={<BonusManagement />} />
                    <Route path="/user-management" element={<UserManagement />} />
                    <Route path="/departments" element={<DepartmentManagement />} />
                  </>
                )}
                
                <Route path="/hiring-requests" element={<HiringRequests />} />
                <Route path="/training" element={<TrainingInduction userRole={userRole} />} />
                <Route path="/compliance" element={<ComplianceHub userRole={userRole} />} />
                <Route path="/policies" element={<PolicyManagement userRole={userRole} />} />
                
                {/* Catch-All Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;

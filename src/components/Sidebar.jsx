import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Clock, Calculator, IndianRupee, Receipt, CheckSquare, LineChart, FileSignature, FileSpreadsheet, ShieldCheck, ChevronDown, ChevronUp, BarChart, Building2, UserPlus, MapPin, Coins, GraduationCap, Briefcase, FileText, FileCheck, Zap, Smartphone } from 'lucide-react';

const Sidebar = ({ userRole }) => {
  const location = useLocation();
  const isAdmin = userRole === 'management' || userRole === 'admin';
  const [reportsOpen, setReportsOpen] = useState(isAdmin || location.pathname.includes('report'));

  return (
    <aside className="sidebar hide-on-print">
      <div className="sidebar-logo">
        <h2 style={{ letterSpacing: '2px', fontWeight: '800' }}>Accuweigh<span style={{ color: 'var(--color-primary)' }}>HRMS</span></h2>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/mobile-preview" className={`nav-item ${location.pathname === '/mobile-preview' ? 'active' : ''}`} style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', borderRadius: '8px', marginBottom: '1rem' }}>
          <Smartphone size={20} color="var(--color-primary)" />
          <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Mobile App Preview</span>
        </Link>
        <Link to="/directory" className={`nav-item ${location.pathname === '/directory' ? 'active' : ''}`}>
          <Users size={20} />
          <span>Employee Directory</span>
        </Link>
        <Link to="/leaves" className={`nav-item ${location.pathname === '/leaves' ? 'active' : ''}`}>
          <CalendarDays size={20} />
          <span>Leave Management</span>
        </Link>
        <Link to="/attendance" className={`nav-item ${location.pathname === '/attendance' ? 'active' : ''}`}>
          <Clock size={20} />
          <span>Attendance (Biometric)</span>
        </Link>
        <Link to="/advances" className={`nav-item ${location.pathname === '/advances' ? 'active' : ''}`}>
          <IndianRupee size={20} />
          <span>Advances & Loans</span>
        </Link>
        <Link to="/expenses" className={`nav-item ${location.pathname === '/expenses' ? 'active' : ''}`}>
          <Receipt size={20} />
          <span>Submit Expenses</span>
        </Link>
        <Link to="/holidays" className={`nav-item ${location.pathname === '/holidays' ? 'active' : ''}`}>
          <CalendarDays size={20} />
          <span>Holiday List</span>
        </Link>
        <Link to="/training" className={`nav-item ${location.pathname === '/training' ? 'active' : ''}`}>
          <GraduationCap size={20} />
          <span>Growth & Training</span>
        </Link>
        <Link to="/compliance" className={`nav-item ${location.pathname === '/compliance' ? 'active' : ''}`}>
          <ShieldCheck size={20} color="var(--color-primary)" />
          <span>Compliance Hub</span>
        </Link>
        <Link to="/policies" className={`nav-item ${location.pathname === '/policies' ? 'active' : ''}`}>
          <FileSignature size={20} />
          <span>HR Policies</span>
        </Link>
        <Link to="/my-documents" className={`nav-item ${location.pathname === '/my-documents' ? 'active' : ''}`}>
          <FileText size={20} />
          <span>My Documents</span>
        </Link>

        {isAdmin && (
          <>
            <div style={{ marginTop: '2rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '1rem' }}>Management Suite</div>
            
            <Link to="/payroll" className={`nav-item ${location.pathname === '/payroll' ? 'active' : ''}`}>
              <Calculator size={20} />
              <span>Payroll Ledger</span>
            </Link>

            {/* Collapsible Reports Group */}
            <div style={{ marginBottom: '0.25rem' }}>
              <div 
                onClick={() => setReportsOpen(!reportsOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem', 
                  fontSize: '0.875rem', 
                  color: reportsOpen ? 'var(--color-primary)' : 'var(--color-text-muted)', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  backgroundColor: reportsOpen ? 'rgba(37, 99, 235, 0.04)' : 'transparent'
                }}
                className="nav-item-group-header"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <LineChart size={20} />
                  <span>Reports</span>
                </div>
                {reportsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              
              {reportsOpen && (
                <div style={{ paddingLeft: '0.5rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                  <Link to="/attendance-report" className={`nav-item ${location.pathname === '/attendance-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <BarChart size={18} />
                    <span>Attendance Report</span>
                  </Link>
                  <Link to="/leave-report" className={`nav-item ${location.pathname === '/leave-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <BarChart size={18} />
                    <span>Leave Report</span>
                  </Link>
                  <Link to="/advance-report" className={`nav-item ${location.pathname === '/advance-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <IndianRupee size={18} />
                    <span>Advance Report</span>
                  </Link>
                  <Link to="/payroll-report" className={`nav-item ${location.pathname === '/payroll-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <Calculator size={18} />
                    <span>Payroll Report</span>
                  </Link>
                  <Link to="/pf-report" className={`nav-item ${location.pathname === '/pf-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <FileSpreadsheet size={18} />
                    <span>PF Report</span>
                  </Link>
                  <Link to="/site-expenses" className={`nav-item ${location.pathname === '/site-expenses' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <MapPin size={18} />
                    <span>Site Expense Analytics</span>
                  </Link>
                  <Link to="/esic-report" className={`nav-item ${location.pathname === '/esic-report' ? 'active' : ''}`} style={{ paddingLeft: '2.5rem' }}>
                    <ShieldCheck size={18} />
                    <span>ESIC Report</span>
                  </Link>
                </div>
              )}
            </div>

            <Link to="/approvals" className={`nav-item ${location.pathname === '/approvals' ? 'active' : ''}`}>
              <CheckSquare size={20} />
              <span>Manager Approvals</span>
            </Link>
            <Link to="/budget-control" className={`nav-item ${location.pathname === '/budget-control' ? 'active' : ''}`}>
              <Building2 size={20} />
              <span>Budget Control</span>
            </Link>
            <Link to="/hiring-requests" className={`nav-item ${location.pathname === '/hiring-requests' ? 'active' : ''}`}>
              <UserPlus size={20} />
              <span>Hiring Requests</span>
            </Link>
            <Link to="/recruitment" className={`nav-item ${location.pathname === '/recruitment' ? 'active' : ''}`}>
              <Briefcase size={20} />
              <span>Recruitment</span>
            </Link>
            <Link to="/document-hub" className={`nav-item ${location.pathname === '/document-hub' ? 'active' : ''}`}>
              <FileCheck size={20} />
              <span>Document Hub</span>
            </Link>
            <Link to="/letter-templates" className={`nav-item ${location.pathname === '/letter-templates' ? 'active' : ''}`}>
              <FileText size={20} />
              <span>Letter Templates</span>
            </Link>
            <Link to="/compensation" className={`nav-item ${location.pathname === '/compensation' ? 'active' : ''}`}>
              <FileSignature size={20} />
              <span>Compensation & Offers</span>
            </Link>
            <Link to="/performance" className={`nav-item ${location.pathname === '/performance' ? 'active' : ''}`}>
              <Zap size={20} />
              <span>Performance Config</span>
            </Link>
            <Link to="/departments" className={`nav-item ${location.pathname === '/departments' ? 'active' : ''}`}>
              <Building2 size={20} />
              <span>Department Master</span>
            </Link>
            <Link to="/user-management" className={`nav-item ${location.pathname === '/user-management' ? 'active' : ''}`}>
              <ShieldCheck size={20} />
              <span>Identity & Access</span>
            </Link>

            <div style={{ marginTop: '2rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '1rem' }}>Lifecycle & Offboarding</div>
            <Link to="/exit-management" className={`nav-item ${location.pathname === '/exit-management' ? 'active' : ''}`}>
              <Users size={20} />
              <span>Exit & FnF Settlement</span>
            </Link>
            <Link to="/bonus-management" className={`nav-item ${location.pathname === '/bonus-management' ? 'active' : ''}`}>
              <Coins size={20} />
              <span>Statutory Bonus</span>
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar" style={{ width: '36px', height: '36px', backgroundColor: isAdmin ? 'var(--color-primary)' : 'var(--color-success)' }}>{isAdmin ? 'AD' : 'EM'}</div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{isAdmin ? 'Admin Portal' : 'Self Service'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{isAdmin ? 'Management Access' : 'Restricted Access'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

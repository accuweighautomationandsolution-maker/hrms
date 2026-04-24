import React from 'react';
import { Bell, Search, LogOut } from 'lucide-react';

const Header = ({ onLogout, userRole, userName }) => {
  const initials = userName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || (userRole === 'management' ? 'M' : 'E');
  
  return (
    <header className="top-header hide-on-print">
      <div className="header-search">
        <Search size={18} color="var(--color-text-muted)" />
        <input type="text" placeholder="Search employees, leaves..." />
      </div>
      <div className="user-profile">
        <button className="btn btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <Bell size={20} />
        </button>
        <div className="profile-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <div className="avatar" style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: '600' }}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{userName || (userRole === 'management' ? 'HR Manager' : 'Employee Portal')}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{userRole === 'management' ? 'Admin Access' : 'Restricted Access'}</span>
          </div>
        </div>
        <button onClick={onLogout} title="Log Out" style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;

import React, { useState, useEffect } from "react";
import {
  Users,
  Key,
  UserPlus,
  Shield,
  Power,
  RefreshCw,
  Search,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { authService } from "../utils/authService";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [activeTab, setActiveTab] = useState("users");

  // Form State for new user
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "employee",
  });
  const [formError, setFormError] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(authService.getUsers());
    setLogs(authService.getLogs());
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await authService.createUser(newUser.email, newUser.password, newUser.role, newUser.name);
      setShowNewUserModal(false);
      setNewUser({ email: "", name: "", password: "", role: "employee" });
      loadData();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleToggleStatus = (userId, currentStatus) => {
    authService.updateUserStatus(userId, !currentStatus);
    loadData();
  };

  const handleResetPassword = async (userId) => {
    const newPwd = prompt("Enter new temporary password (must meet complexity requirements):");
    if (newPwd) {
      try {
        await authService.resetUserPassword(userId, newPwd);
        loadData();
        alert("Password has been reset. User will be forced to change it on next login.");
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRoleChange = (userId, newRole) => {
    if(window.confirm(`Are you sure you want to change this user's access role?`)) {
      authService.updateUserRole(userId, newRole);
      loadData();
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "All" || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={32} color="var(--color-primary)" />
            Identity & Access Management
          </h1>
          <p className="page-subtitle">Provision accounts and monitor security logs.</p>
        </div>
        <button 
          onClick={() => setShowNewUserModal(true)}
          className="btn btn-primary"
        >
          <UserPlus size={18} />
          Create User Login
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
            <Users size={32} color="var(--color-primary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: '800' }}>{users.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total Accounts</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
            <Activity size={32} color="var(--color-warning)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: '800' }}>{logs.filter(l => l.action.includes('FAIL')).length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Security Incidents</div>
        </div>

        <div className="card" style={{ textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={32} color="var(--color-success)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-success)' }}>SYSTEM SECURE</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: '700' }}>SHA-256 ENFORCED</div>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab("users")}
              style={{ padding: '1rem 0', fontSize: '0.875rem', fontWeight: '700', borderBottom: activeTab === 'users' ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeTab === 'users' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              User Accounts
            </button>
            <button 
              onClick={() => setActiveTab("logs")}
              style={{ padding: '1rem 0', fontSize: '0.875rem', fontWeight: '700', borderBottom: activeTab === 'logs' ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeTab === 'logs' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            >
              Audit Trail
            </button>
          </div>
          
          {activeTab === "users" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.5rem' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input 
                        placeholder="Search by name or email..." 
                        className="form-input"
                        style={{ paddingLeft: '2.25rem' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select 
                    className="form-input"
                    style={{ width: '160px' }}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                >
                    <option value="All">All Roles</option>
                    <option value="management">Management/HR</option>
                    <option value="employee">Employee</option>
                </select>
            </div>
          )}
        </div>

        {activeTab === "users" && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '1rem' }}>Name & Email</th>
                      <th style={{ padding: '1rem' }}>Role</th>
                      <th style={{ padding: '1rem' }}>Password</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem' }}>Created On</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: 'var(--color-text-main)' }}>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '700' }}>{user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{user.email}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <select 
                            className={`form-input`}
                            style={{ 
                              padding: '0.3rem 1.5rem 0.3rem 0.75rem', 
                              height: 'auto', 
                              fontSize: '0.75rem', 
                              fontWeight: 'bold', 
                              backgroundColor: user.role === 'management' ? 'rgba(37,99,235,0.1)' : 'var(--color-background)',
                              color: user.role === 'management' ? 'var(--color-primary)' : 'var(--color-text-main)',
                              border: user.role === 'management' ? '1px solid rgba(37,99,235,0.2)' : '1px solid var(--color-border)',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="management">HR / Admin</option>
                            <option value="employee">Employee</option>
                          </select>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {visiblePasswords[user.id] ? (user.plainPassword || '********') : '••••••••'}
                            </span>
                            <button 
                              className="btn btn-ghost" 
                              style={{ padding: '0.2rem' }}
                              onClick={() => togglePasswordVisibility(user.id)}
                              title={visiblePasswords[user.id] ? "Hide Password" : "Show Password"}
                            >
                              {visiblePasswords[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {user.active ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ h: '8px', w: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} /> ACTIVE
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ h: '8px', w: '8px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} /> DEACTIVATED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button 
                                className="btn btn-ghost"
                                style={{ padding: '0.4rem' }}
                                title="Reset Password"
                                onClick={() => handleResetPassword(user.id)}
                            >
                                <Key size={16} />
                            </button>
                            <button 
                                title={user.active ? "Deactivate" : "Activate"}
                                className="btn btn-ghost"
                                style={{ padding: '0.4rem', color: user.active ? 'var(--color-danger)' : 'var(--color-success)' }}
                                onClick={() => handleToggleStatus(user.id, user.active)}
                            >
                                <Power size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Audit Log</span>
                <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--color-primary)' }} onClick={loadData}>
                  <RefreshCw size={14} style={{ marginRight: '0.4rem' }} /> Refresh
                </button>
            </div>
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ padding: '1rem', borderBottom: '1px solid var(--color-background)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                       <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: log.action.includes('FAIL') ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)', color: log.action.includes('FAIL') ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                          {log.action.includes('PWD') ? <Lock size={16} /> : <Activity size={16} />}
                       </div>
                       <div style={{ flexGrow: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                             <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>{log.action.replace(/_/g, ' ')}</span>
                             <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: '0.875rem', margin: '0.25rem 0', color: 'var(--color-text-main)' }}>{log.details}</p>
                          <span className="badge badge-ghost" style={{ fontSize: '0.6rem', fontFamily: 'monospace' }}>{log.user}</span>
                       </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No logs available in current history.</div>
                  )}
            </div>
          </div>
        )}
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Provision New Access</h3>
              <p className="page-subtitle" style={{ margin: 0 }}>Create a login account for an employee.</p>
            </div>
            <form onSubmit={handleCreateUser}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {formError && (
                  <div className="auth-error-box" style={{ margin: 0 }}>
                    <AlertCircle size={16} /> {formError}
                  </div>
                )}
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Employee Name</label>
                  <input 
                    required 
                    placeholder="e.g. Robert Wilson"
                    className="form-input"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Login Email</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="email@company.com"
                    className="form-input"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Initial Password</label>
                  <input 
                    type="password" 
                    required 
                    className="form-input"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                  <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>Min 8 chars, 1 Uppercase, 1 Special Char.</p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Access Role</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      className={`btn ${newUser.role === 'employee' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setNewUser({...newUser, role: 'employee'})}
                    >Employee</button>
                    <button 
                      type="button" 
                      className={`btn ${newUser.role === 'management' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ backgroundColor: newUser.role === 'management' ? 'var(--color-text-main)' : '' }}
                      onClick={() => setNewUser({...newUser, role: 'management'})}
                    >HR / Admin</button>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-text-main)' }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

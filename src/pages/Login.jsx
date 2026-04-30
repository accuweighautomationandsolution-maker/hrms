import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  Briefcase,
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../utils/authService';

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset-code' | 'force-reset' | 'success'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [resetData, setResetData] = useState(null);
  
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);

  React.useEffect(() => {
    // Clear all states on mount to ensure fresh login
    setEmail('');
    setPassword('');
    setError('');
    
    if (searchParams.get('logout') === 'success') {
      setSuccess('Logged out successfully. All sessions cleared.');
      // Clean URL
      window.history.replaceState({}, document.title, "/login");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await authService.login(email, password);
      // result contains { profile, forcePasswordReset }
      if (result.forcePasswordReset) {
        setView('force-reset');
        setLoading(false);
      } else {
        onLoginSuccess(result.profile);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(email);
      setResetData(data);
      setView('reset-code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await authService.getUsers();
      await authService.updatePassword(newPassword);
      
      // Re-login after password change to get fresh session
      const newSession = await authService.login(email, newPassword);
      onLoginSuccess(newSession);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-layout">
      <div className="login-card">
        
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="login-brand-icon">
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
            {view === 'login' && 'Accuweigh Hrms System'}
            {view === 'forgot' && 'Identity Recovery'}
            {view === 'reset-code' && 'Verification Code'}
            {view === 'force-reset' && 'Security Update Required'}
            {view === 'success' && 'Ready to Connect'}
          </h1>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {view === 'login' && 'Enter your credentials to access the internal HRMS.'}
            {view === 'forgot' && 'Provide your work email to receive a recovery token.'}
            {view === 'reset-code' && `A 6-digit code has been sent to ${email}.`}
            {view === 'force-reset' && 'Management requires a password update on first access.'}
          </p>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontWeight: '500', fontStyle: 'italic' }}>{error}</p>
          </div>
        )}

        {success && (
          <div className="auth-error-box" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontWeight: '500' }}>{success}</p>
          </div>
        )}


          {/* Login View */}
          {view === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Work Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type="email"
                    placeholder="name@organization.com"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Security Password</label>
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)' }}
                  >
                    Forgot access?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: '3rem', width: '100%', fontSize: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>
            </form>
          )}

          {/* Forgot Password View */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Work Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type="email"
                    placeholder="name@organization.com"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '3rem' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Recovery Token'}
              </button>
              <button 
                type="button" 
                onClick={() => setView('login')}
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.875rem' }}
              >
                <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Return to Login
              </button>
            </form>
          )}

          {/* Reset Code / Demo result */}
          {view === 'reset-code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: '#fff7ed', borderRadius: '16px', border: '1px solid #ffedd5', textAlign: 'center' }}>
                <p style={{ color: '#9a3412', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: '500' }}>Verification code for simulation purposes:</p>
                <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '0.5em', color: '#7c2d12', fontFamily: 'monospace' }}>
                  {resetData?.token}
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Note: In a live environment, this code is delivered via synchronized SMTP relay.
              </p>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setView('login')}>
                Back to Login UI
              </button>
            </div>
          )}

          {/* Force Reset View */}
          {view === 'force-reset' && (
            <form onSubmit={handleForceReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>Min 8 chars, 1 Upper, 1 Special character.</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <CheckCircle size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-success)', width: '100%', height: '3rem' }} disabled={loading}>
                {loading ? 'Changing...' : 'Set New Password & Authenticate'}
              </button>
            </form>
          )}

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Briefcase size={12} /> System Security
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            v3.4.0-STABLE
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

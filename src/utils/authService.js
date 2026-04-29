import { supabase } from './supabaseClient';

// ── In-memory session cache (avoids async getCurrentUser in every component) ──
let _cachedProfile = null;

function normalizeEmail(e) { return e ? e.trim().toLowerCase() : ''; }

function validatePassword(p) {
  if (p.length < 7) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) return 'Password must contain at least one special character.';
  return null;
}

async function fetchProfile(userId) {
  const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
  return data || null;
}

async function addAuthLog(action, user, details) {
  const log = {
    id: `LOG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    action, user, details
  };
  try {
    await supabase.from('auth_logs').insert({ id: log.id, data: log });
  } catch (e) { console.warn('authLog failed', e); }
}

export const authService = {
  async init() {
    // Subscribe to auth state changes to keep cache in sync
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        _cachedProfile = await fetchProfile(session.user.id);
      } else {
        _cachedProfile = null;
      }
    });

    // Load current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      _cachedProfile = await fetchProfile(session.user.id);
    }

    // Seed default accounts if no profiles exist yet
    const { data: profiles } = await supabase.from('user_profiles').select('id').limit(1);
    if (!profiles || profiles.length === 0) {
      await this._seedDefaultAccounts();
    }
  },

  async _seedDefaultAccounts() {
    const accounts = [
      { email: 'admin@accuweigh.com', password: 'Admin@123', name: 'System Admin', role: 'management' },
      { email: 'alice@company.com', password: 'Alice@123', name: 'Alice Smith', role: 'employee' },
      { email: 'bob@company.com', password: 'Bob@123', name: 'Bob Johnson', role: 'employee' },
    ];
    for (const acc of accounts) {
      const { data, error } = await supabase.auth.signUp({
        email: acc.email,
        password: acc.password,
        options: { data: { name: acc.name } }
      });
      if (!error && data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: acc.email,
          name: acc.name,
          role: acc.role,
          active: true,
          force_password_reset: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    }
    await addAuthLog('SYSTEM_INIT', 'SYSTEM', 'Default accounts seeded via Supabase Auth.');
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) {
      await addAuthLog('LOGIN_FAIL', normalizeEmail(email), error.message);
      const msg = error.message.includes('Invalid login credentials')
        ? 'Incorrect email or password.'
        : error.message;
      throw new Error(msg);
    }
    const profile = await fetchProfile(data.user.id);
    if (!profile) throw new Error('User profile not found. Please contact HR.');
    if (!profile.active) {
      await supabase.auth.signOut();
      throw new Error('Your account is deactivated. Please contact HR.');
    }
    _cachedProfile = profile;
    await addAuthLog('LOGIN_SUCCESS', email, 'Login successful.');
    return profile;
  },

  async logout() {
    if (_cachedProfile) await addAuthLog('LOGOUT', _cachedProfile.email, 'User logged out.');
    _cachedProfile = null;
    await supabase.auth.signOut();
  },

  // Synchronous — returns cached profile (set during init/login)
  getCurrentUser() { return _cachedProfile; },
  getUserRole() { return _cachedProfile?.role || null; },

  async createUser(email, password, role, name) {
    const pwdError = validatePassword(password);
    if (pwdError) throw new Error(pwdError);

    const { data: existing } = await supabase
      .from('user_profiles').select('id').eq('email', normalizeEmail(email)).maybeSingle();
    if (existing) throw new Error('User with this email already exists.');

    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { name } }
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Failed to create user account.');

    const profile = {
      id: data.user.id, email: normalizeEmail(email), name, role,
      active: true, force_password_reset: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await supabase.from('user_profiles').insert(profile);
    await addAuthLog('USER_CREATED', _cachedProfile?.email || 'SYSTEM', `New user created: ${email}`);
    return profile;
  },

  async updatePassword(newPassword) {
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    if (_cachedProfile) {
      await supabase.from('user_profiles').update({
        force_password_reset: false, updated_at: new Date().toISOString()
      }).eq('id', _cachedProfile.id);
      _cachedProfile.force_password_reset = false;
      await addAuthLog('PWD_CHANGED', _cachedProfile.email, 'User updated their password.');
    }
  },

  async resetUserPassword(userId) {
    await supabase.from('user_profiles').update({
      force_password_reset: true, updated_at: new Date().toISOString()
    }).eq('id', userId);
    const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', userId).single();
    await addAuthLog('PWD_RESET_ADMIN', _cachedProfile?.email || 'SYSTEM', `Reset flag set for: ${profile?.email}`);
  },

  async updateUserStatus(userId, active) {
    await supabase.from('user_profiles').update({ active, updated_at: new Date().toISOString() }).eq('id', userId);
    const { data: p } = await supabase.from('user_profiles').select('email').eq('id', userId).single();
    await addAuthLog('USER_STATUS_CHANGE', _cachedProfile?.email || 'SYSTEM',
      `User ${p?.email} status set to ${active ? 'Active' : 'Inactive'}`);
  },

  async updateUserRole(userId, newRole) {
    const { data: p } = await supabase.from('user_profiles').select('email, role').eq('id', userId).single();
    await supabase.from('user_profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId);
    await addAuthLog('USER_ROLE_CHANGE', _cachedProfile?.email || 'SYSTEM',
      `User ${p?.email} role changed from ${p?.role} to ${newRole}`);
  },

  async getUsers() {
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at');
    if (error) { console.error('getUsers:', error); return []; }
    return data || [];
  },

  async getLogs() {
    const { data } = await supabase.from('auth_logs').select('data')
      .order('created_at', { ascending: false }).limit(500);
    return (data || []).map(r => r.data);
  },

  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
    await addAuthLog('PWD_RESET_REQUEST', email, 'Password reset email sent via Supabase.');
    return { email };
  },
};

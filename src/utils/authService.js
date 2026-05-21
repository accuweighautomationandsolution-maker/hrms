import { supabase, supabaseAdmin } from './supabaseClient';

// ── In-memory session cache (avoids async getCurrentUser in every component) ──
let _cachedProfile = null;
let _sessionCallback = null;

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
  onSessionChange(callback) {
    _sessionCallback = callback;
  },

  async init() {
    console.log('authService: Initializing...');
    if (!supabase) {
      console.warn('authService: Supabase client is NULL. Skipping initialization.');
      return;
    }
    try {
      console.log('authService: Checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('authService: Session found, fetching profile...');
        _cachedProfile = await fetchProfile(session.user.id);
      }

      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log(`authService: Auth event - ${event}`);
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          _cachedProfile = null;
          if (_sessionCallback) _sessionCallback(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            const profile = await fetchProfile(currentSession.user.id);
            if (profile) {
              _cachedProfile = profile;
              if (_sessionCallback) _sessionCallback(profile);
            }
          }
        }
      });

      console.log('authService: Checking if seed is needed...');
      const { data: profiles, error: pError } = await supabase.from('user_profiles').select('id').limit(1);
      if (!pError && (!profiles || profiles.length === 0)) {
        console.log('authService: No profiles found. Seeding default accounts...');
        await this._seedDefaultAccounts();
      }
      
      console.log('authService: Init sequence complete.');
    } catch (err) {
      console.error('authService: Initialization failed:', err);
    }
  },

  async _seedDefaultAccounts() {
    const accounts = [
      { email: 'admin@accuweigh.com', password: 'Admin@123', name: 'System Admin', role: 'management' },
      { email: 'alice@company.com', password: 'Alice@123', name: 'Alice Smith', role: 'employee' },
      { email: 'bob@company.com', password: 'Bob@123', name: 'Bob Johnson', role: 'employee' },
    ];
    
    for (const acc of accounts) {
      // First check if user already exists in auth.users (via a safe sign-in attempt or just skip if signup fails)
      const { data, error } = await supabase.auth.signUp({
        email: acc.email,
        password: acc.password,
        options: { data: { name: acc.name } }
      });

      let userId = data.user?.id;

      // If signUp fails because user exists, we don't have the UID easily via client SDK without admin privileges.
      // However, we can try to find them in user_profiles by email if they were partially created.
      if (error && error.message.includes('already registered')) {
        // User exists in Auth, check if they have a profile
        const { data: existingProf } = await supabase.from('user_profiles').select('id').eq('email', acc.email).maybeSingle();
        if (existingProf) continue; // Already fully setup
        
        // If they exist in Auth but not in user_profiles, we have a "broken" state.
        // In a production app, we'd need Admin API to get the UID. 
        // For this migration, we'll suggest the user manually logs in or we attempt a reset.
        console.warn(`User ${acc.email} exists in Auth but missing profile. Manual sync required or use Admin API.`);
        continue;
      }

      if (userId) {
        await supabase.from('user_profiles').upsert({
          id: userId,
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
    await addAuthLog('SYSTEM_INIT', 'SYSTEM', 'Default accounts seed attempted.');
  },

  async login(email, password) {
    const normEmail = normalizeEmail(email);
    
    // Strategy 1: Standard Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normEmail,
        password,
      });
      
      if (!error && data.user) {
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          if (!profile.active) {
            await supabase.auth.signOut();
            throw new Error('Your account is deactivated. Please contact HR.');
          }
          _cachedProfile = profile;
          await addAuthLog('LOGIN_SUCCESS', email, 'Login successful via Supabase Auth.');
          return { profile, forcePasswordReset: profile.force_password_reset };
        }
      }
    } catch (e) {
      console.log('Standard Auth failed, trying Internal Auth...', e.message);
    }

    // Strategy 2: Internal Shadow Auth (for Testing/Staging)
    // Credentials are stored in auth_logs as a SHADOW_CRED record (avoids BIGINT emp_id type conflict)
    const { data: profiles } = await supabase.from('user_profiles').select('*').eq('email', normEmail);
    const profile = profiles?.[0];

    if (profile) {
      try {
        const { data: shadowRows } = await supabase
          .from('auth_logs')
          .select('data')
          .eq('id', `SHADOW_CRED_${normEmail}`)
          .maybeSingle();

        if (shadowRows?.data?.hash) {
          const decoded = atob(shadowRows.data.hash);
          if (decoded === password) {
            if (!profile.active) throw new Error('Your account is deactivated.');
            _cachedProfile = profile;
            await addAuthLog('LOGIN_SUCCESS_INTERNAL', email, 'Login successful via Internal Auth Mode.');
            if (_sessionCallback) _sessionCallback(profile);
            return { profile, forcePasswordReset: profile.force_password_reset };
          }
        }

        // Legacy fallback: check old emp_id field (TEXT type only — skip if BIGINT)
        if (profile.emp_id && typeof profile.emp_id === 'string' && profile.emp_id.startsWith('INTERNAL_AUTH:')) {
          const encoded = profile.emp_id.replace('INTERNAL_AUTH:', '');
          const decoded = atob(encoded);
          if (decoded === password) {
            if (!profile.active) throw new Error('Your account is deactivated.');
            _cachedProfile = profile;
            await addAuthLog('LOGIN_SUCCESS_INTERNAL', email, 'Login successful via Internal Auth (legacy).');
            if (_sessionCallback) _sessionCallback(profile);
            return { profile, forcePasswordReset: profile.force_password_reset };
          }
        }
      } catch (err) {
        console.error('Internal Auth check failed:', err);
      }
    }

    await addAuthLog('LOGIN_FAIL', normEmail, 'Invalid credentials.');
    throw new Error('Incorrect email or password.');
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

    const normEmail = normalizeEmail(email);

    // Check if a user_profile already exists for this email
    const { data: existing } = await supabase
      .from('user_profiles').select('id').eq('email', normEmail).maybeSingle();
    if (existing) throw new Error('User with this email already exists.');

    let userId = null;

    // ── Strategy A: Admin API (requires VITE_SUPABASE_SERVICE_ROLE_KEY in .env) ──
    // This is the recommended approach — bypasses email confirmation, gives real UUID.
    if (supabaseAdmin) {
      const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
        email: normEmail,
        password,
        email_confirm: true,   // Auto-confirm, no verification email sent
        user_metadata: { name },
      });

      if (adminErr) {
        // If the user already exists in auth.users (orphaned from failed previous attempt),
        // delete it and retry once.
        if (adminErr.message?.toLowerCase().includes('already been registered') ||
            adminErr.message?.toLowerCase().includes('already exists')) {
          console.warn('Orphaned auth user detected. Deleting and retrying...');
          // Find the existing user by email and delete them
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const orphan = listData?.users?.find(u => u.email === normEmail);
          if (orphan) {
            await supabaseAdmin.auth.admin.deleteUser(orphan.id);
            // Retry
            const { data: retryData, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
              email: normEmail,
              password,
              email_confirm: true,
              user_metadata: { name },
            });
            if (retryErr) throw new Error(`Failed to create auth user: ${retryErr.message}`);
            userId = retryData.user.id;
          } else {
            throw new Error(`User already exists in auth but not found in list. Please check Supabase dashboard.`);
          }
        } else {
          throw new Error(`Failed to create auth user: ${adminErr.message}`);
        }
      } else {
        userId = adminData.user.id;
      }
    } else {
      // ── Strategy B: Regular signUp (requires email confirmation to be DISABLED in Supabase) ──
      // Go to: Supabase Dashboard → Authentication → Providers → Email → Toggle OFF "Confirm email"
      // OR add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file for the Admin API.
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normEmail,
        password,
        options: { data: { name } }
      });

      if (signUpErr) {
        throw new Error(
          `Auth signup failed: ${signUpErr.message}. ` +
          `Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env for reliable user creation.`
        );
      }

      if (!signUpData?.user?.id) {
        // Supabase returns null user when the email already exists in auth.users
        // This happens when a previous creation attempt partially succeeded.
        throw new Error(
          `This email (${normEmail}) already exists in the authentication system from a ` +
          `previous failed attempt. To fix this:\n\n` +
          `1. Go to Supabase Dashboard → Authentication → Users\n` +
          `2. Find and delete "${normEmail}"\n` +
          `3. Try creating the user again.\n\n` +
          `OR add VITE_SUPABASE_SERVICE_ROLE_KEY to .env to fix this automatically.`
        );
      }

      userId = signUpData.user.id;
    }

    // ── Insert user_profiles record using the valid UUID from auth.users ──
    // Note: emp_id is intentionally omitted — it is BIGINT in the DB and cannot store text.
    const profile = {
      id: userId,
      email: normEmail,
      name,
      role,
      active: true,
      force_password_reset: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insError } = await supabase.from('user_profiles').insert(profile);
    if (insError) throw new Error(`Failed to create profile: ${insError.message}`);

    // Store shadow credential for internal auth fallback (login without active session)
    const shadowId = `SHADOW_CRED_${normEmail}`;
    await supabase.from('auth_logs').upsert({
      id: shadowId,
      data: {
        id: shadowId,
        type: 'SHADOW_CRED',
        email: normEmail,
        hash: btoa(password),
        userId,
        createdAt: new Date().toISOString(),
      }
    }, { onConflict: 'id' });

    await addAuthLog('USER_CREATED', _cachedProfile?.email || 'SYSTEM', `Account provisioned: ${email}`);
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

  async resetUserPassword(userId, newPassword) {
    const pwdError = validatePassword(newPassword);
    if (pwdError) throw new Error(pwdError);

    const { data: profile } = await supabase.from('user_profiles').select('email').eq('id', userId).single();
    
    // Update user profile (do NOT write to emp_id — it is BIGINT and cannot hold text)
    await supabase.from('user_profiles').update({
      force_password_reset: true, 
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    // Update shadow credential record in auth_logs
    if (profile?.email) {
      const normEmail = normalizeEmail(profile.email);
      const shadowId = `SHADOW_CRED_${normEmail}`;
      await supabase.from('auth_logs').upsert({
        id: shadowId,
        data: {
          id: shadowId,
          type: 'SHADOW_CRED',
          email: normEmail,
          hash: btoa(newPassword),
          userId,
          updatedAt: new Date().toISOString(),
        }
      }, { onConflict: 'id' });
    }

    // Also try to update Supabase Auth if possible
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (e) {
      console.warn('Supabase Auth update skipped (expected for other users).');
    }

    await addAuthLog('PWD_RESET_ADMIN', _cachedProfile?.email || 'SYSTEM', `Password reset instantly for: ${profile?.email}`);
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

    // Fetch all shadow credential records to display passwords in admin panel
    const { data: shadowRows } = await supabase
      .from('auth_logs')
      .select('data')
      .like('id', 'SHADOW_CRED_%');
    const shadowMap = {};
    (shadowRows || []).forEach(r => {
      if (r.data?.email && r.data?.hash) {
        try { shadowMap[r.data.email] = atob(r.data.hash); } catch(e) {}
      }
    });

    return (data || []).map(u => {
      // Legacy: check old emp_id field (only works if column was changed to TEXT)
      let plain = shadowMap[u.email] || null;
      if (!plain && u.emp_id && typeof u.emp_id === 'string' && u.emp_id.startsWith('INTERNAL_AUTH:')) {
        try { plain = atob(u.emp_id.replace('INTERNAL_AUTH:', '')); } catch(e) {}
      }
      return { ...u, plainPassword: plain };
    });
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

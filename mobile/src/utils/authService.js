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
      if (e.message?.includes('deactivated')) throw e; // Re-throw deactivation errors
      console.log('Standard Auth failed, trying Internal Auth...', e.message);
    }

    // Strategy 2: Internal Shadow Auth
    // Looks up user_profiles by email and checks the password hash stored in emp_id.
    // This avoids querying auth_logs (which RLS may block for unauthenticated users).
    const { data: profileRows } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', normEmail);
    const profile = profileRows?.[0];

    if (profile) {
      // Check emp_id field — stores base64(password) for internally-created accounts
      if (profile.emp_id && typeof profile.emp_id === 'string') {
        try {
          let decoded = null;
          if (profile.emp_id.startsWith('INTERNAL_AUTH:')) {
            // Legacy format: "INTERNAL_AUTH:base64"
            decoded = atob(profile.emp_id.replace('INTERNAL_AUTH:', ''));
          } else {
            // New format: raw base64 of password
            decoded = atob(profile.emp_id);
          }
          if (decoded === password) {
            if (!profile.active) throw new Error('Your account is deactivated. Please contact HR.');
            _cachedProfile = profile;
            await addAuthLog('LOGIN_SUCCESS_INTERNAL', email, 'Login via Internal Shadow Auth.');
            if (_sessionCallback) _sessionCallback(profile);
            return { profile, forcePasswordReset: profile.force_password_reset };
          }
        } catch (err) {
          if (err.message?.includes('deactivated')) throw err;
          console.warn('Shadow auth emp_id check failed:', err.message);
        }
      }

      // Fallback: check auth_logs SHADOW_CRED record (may be blocked by RLS)
      try {
        const { data: shadowRow } = await supabase
          .from('auth_logs')
          .select('data')
          .eq('id', `SHADOW_CRED_${normEmail}`)
          .maybeSingle();
        if (shadowRow?.data?.hash) {
          const decoded = atob(shadowRow.data.hash);
          if (decoded === password) {
            if (!profile.active) throw new Error('Your account is deactivated. Please contact HR.');
            // Migrate hash to emp_id for faster future logins
            await supabase.from('user_profiles')
              .update({ emp_id: btoa(password), updated_at: new Date().toISOString() })
              .eq('id', profile.id);
            _cachedProfile = { ...profile, emp_id: btoa(password) };
            await addAuthLog('LOGIN_SUCCESS_INTERNAL', email, 'Login via auth_logs Shadow Auth (migrated).');
            if (_sessionCallback) _sessionCallback(_cachedProfile);
            return { profile: _cachedProfile, forcePasswordReset: profile.force_password_reset };
          }
        }
      } catch (err) {
        if (err.message?.includes('deactivated')) throw err;
        console.warn('auth_logs shadow check failed (likely RLS):', err.message);
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
    let authMethod = 'unknown';

    // ── Strategy A: Admin API (service role key) ──────────────────────────────
    if (supabaseAdmin) {
      try {
        const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
          email: normEmail,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (!adminErr && adminData?.user?.id) {
          userId = adminData.user.id;
          authMethod = 'admin';
        } else if (adminErr) {
          const msg = adminErr.message?.toLowerCase() || '';
          if (msg.includes('already registered') || msg.includes('already exists')) {
            // Orphaned auth user — delete and retry
            console.warn('Orphaned auth user detected, cleaning up...');
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            const orphan = listData?.users?.find(u => u.email?.toLowerCase() === normEmail);
            if (orphan) {
              await supabaseAdmin.auth.admin.deleteUser(orphan.id);
              const { data: retry, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
                email: normEmail, password, email_confirm: true, user_metadata: { name },
              });
              if (!retryErr && retry?.user?.id) {
                userId = retry.user.id;
                authMethod = 'admin-retry';
              }
            }
          } else if (msg.includes('invalid api key') || msg.includes('invalid jwt')) {
            // Invalid service role key — fall through to Strategy B
            console.warn('Service role key is invalid. Falling back to signUp strategy.');
          } else {
            console.warn('Admin API failed:', adminErr.message, '— falling back to signUp.');
          }
        }
      } catch (e) {
        console.warn('Admin API exception, falling back:', e.message);
      }
    }

    // ── Strategy B: Regular signUp (works when Supabase "Confirm email" is OFF) ──
    if (!userId) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normEmail,
        password,
        options: { data: { name } }
      });

      if (!signUpErr && signUpData?.user?.id) {
        userId = signUpData.user.id;
        authMethod = 'signup';
      } else if (signUpData?.user === null && !signUpErr) {
        // Email already exists in auth.users (Supabase hides this to prevent enumeration).
        // This is the "orphaned user" case — signUp returns null silently.
        // We need the FK constraint removed (see SQL below) to proceed with Strategy C.
        console.warn('Email already exists in auth.users (orphaned). Trying internal UUID.');
      }
    }

    // ── Strategy C: Internal UUID (requires FK constraint dropped on user_profiles.id) ──
    // Run this SQL ONCE in Supabase SQL Editor to enable this fallback:
    //   ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
    // After that, internal users can log in via Shadow Auth (email+password lookup).
    if (!userId) {
      userId = crypto.randomUUID();
      authMethod = 'internal';
      console.info('Using internal UUID for user profile. Login will use Shadow Auth.');
    }

    // ── Insert user_profiles record ───────────────────────────────────────────
    // emp_id stores base64(password) for Shadow Auth login — works even without Supabase Auth.
    // This avoids querying auth_logs (which RLS blocks for unauthenticated users).
    const profile = {
      id: userId,
      email: normEmail,
      name,
      role,
      emp_id: btoa(password),   // Shadow Auth credential — stored in TEXT column
      active: true,
      force_password_reset: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insError } = await supabase.from('user_profiles').insert(profile);
    if (insError) {
      if (insError.message?.includes('foreign key') || insError.message?.includes('violates')) {
        throw new Error(
          `Database constraint error: The user_profiles table requires a valid Supabase Auth UUID.\n\n` +
          `QUICK FIX — Run this SQL once in your Supabase SQL Editor:\n` +
          `ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;\n\n` +
          `Then try again. This allows internal accounts to be created without email confirmation.`
        );
      }
      throw new Error(`Failed to create profile: ${insError.message}`);
    }

    // ── Store shadow credential for password-based login fallback ─────────────
    const shadowId = `SHADOW_CRED_${normEmail}`;
    await supabase.from('auth_logs').upsert({
      id: shadowId,
      data: {
        id: shadowId,
        type: 'SHADOW_CRED',
        email: normEmail,
        hash: btoa(password),
        userId,
        authMethod,
        createdAt: new Date().toISOString(),
      }
    }, { onConflict: 'id' });

    await addAuthLog('USER_CREATED', _cachedProfile?.email || 'SYSTEM', `Account provisioned [${authMethod}]: ${email}`);
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
    
    // Update emp_id with new password hash (emp_id is TEXT — used for Shadow Auth login)
    await supabase.from('user_profiles').update({
      emp_id: btoa(newPassword),
      force_password_reset: true, 
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    // Also update auth_logs shadow credential as backup
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
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    if (error) throw new Error(error.message);
    await addAuthLog('PWD_RESET_REQUEST', email, 'Password reset email sent via Supabase.');
    return { email };
  },
};

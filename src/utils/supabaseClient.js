import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Fail gracefully if keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. DataService will fallback to LocalStorage mode.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url, options) => {
          const timeout = 15000;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          return fetch(url, { ...options, signal: controller.signal })
            .then(res => {
              clearTimeout(id);
              return res;
            })
            .catch(err => {
              clearTimeout(id);
              throw err;
            });
        }
      }
    })
  : null;

// Admin client uses the service role key — bypasses RLS and email confirmation.
// Used ONLY for admin operations like creating users (auth.admin.createUser).
// This key is safe for internal HRMS tools where all users are trusted admins.
export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url, options) => {
          const timeout = 15000;
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          return fetch(url, { ...options, signal: controller.signal })
            .then(res => {
              clearTimeout(id);
              return res;
            })
            .catch(err => {
              clearTimeout(id);
              throw err;
            });
        }
      }
    })
  : null;

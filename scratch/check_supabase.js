import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking Supabase Connection...');
  console.log('URL:', supabaseUrl);

  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.log('Error fetching user_profiles:', error.message);
    if (error.message.includes('relation "public.user_profiles" does not exist')) {
      console.log('CRITICAL: Schema is missing!');
    }
  } else {
    console.log('user_profiles table exists. Rows found:', data.length);
  }

  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  // Note: This will likely fail with anon key, but let's see.
  if (uError) {
    console.log('Auth check (listUsers) failed (expected with anon key):', uError.message);
  }
}

check();

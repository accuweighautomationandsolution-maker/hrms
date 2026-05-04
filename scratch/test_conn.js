import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- Supabase Diagnostic ---');
  
  const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
  if (error) {
    console.log('ERROR: user_profiles check failed!');
    console.log('Message:', error.message);
  } else {
    console.log('SUCCESS: user_profiles table found.');
    console.log('Count:', data.length);
  }

  // Try to sign in as admin
  console.log('Attempting login as admin@accuweigh.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  if (authError) {
    console.log('LOGIN FAILED:', authError.message);
  } else {
    console.log('LOGIN SUCCESS! User ID:', authData.user.id);
  }
}

check();

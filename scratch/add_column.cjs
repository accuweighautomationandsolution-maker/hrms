const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function tryAddColumn() {
  const { data, error } = await supabase.rpc('run_sql', {
    sql: 'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS internal_pwd_hash TEXT;'
  });
  if (error) {
    console.error('RPC run_sql failed (expected if not defined):', error.message);
    // Fallback plan: Use an existing field or tell the user
  } else {
    console.log('Successfully added internal_pwd_hash column!');
  }
}

tryAddColumn();

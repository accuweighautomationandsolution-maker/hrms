import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test(email, password) {
  console.log(`\nTesting INSERT ONLY for ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.log('LOGIN FAILED:', authErr.message);
    return;
  }
  
  const row = {
    name: `Test Insert Only from ${email}`,
    email: `test_only_${Date.now()}@example.com`,
    status: 'Active',
    data: { test: true }
  };
  
  const { data, error } = await supabase.from('employees').insert(row);
  if (error) {
    console.log('INSERT FAILED:', error.message);
  } else {
    console.log('INSERT SUCCESS!');
  }
}

async function run() {
  await test('bob@company.com', 'Bob@123');
}

run();

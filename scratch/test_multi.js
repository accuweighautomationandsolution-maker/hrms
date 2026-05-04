import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test(email, password) {
  console.log(`Testing ${email} / ${password}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log('FAILED:', error.message);
  } else {
    console.log('SUCCESS!');
  }
}

async function run() {
  await test('bob@company.com', 'Bob@123');
  await test('admin@accuweigh.com', 'Admin@123');
}

run();

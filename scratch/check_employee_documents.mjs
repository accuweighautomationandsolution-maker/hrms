import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching employee_documents:', error);
  } else {
    console.log('Fetched data successfully. Number of records:', data.length);
    if (data.length > 0) {
      console.log('Sample record keys:', Object.keys(data[0]));
      console.log('Sample record data:', JSON.stringify(data[0], null, 2));
    }
  }
}

run();

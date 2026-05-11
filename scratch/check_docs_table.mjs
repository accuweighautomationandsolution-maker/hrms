import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initTable() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { error } = await supabase.from('employee_documents').select('id').limit(1);
  if (error && error.code === 'PGRST205') {
    console.log("Table employee_documents missing. The user will have to run the SQL.");
  } else {
    console.log("Table exists or other error:", error);
  }
}

initTable();

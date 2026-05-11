import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPolicies() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'employees');

  console.log("Policies:", data);
  if (error) console.error("Error:", error);
}

checkPolicies();

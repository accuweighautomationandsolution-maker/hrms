import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  if (authErr) {
    console.error("Login failed:", authErr.message);
    return;
  }
  console.log("Logged in successfully as:", authData.user.email);

  const row = {
    id: Date.now(),
    name: 'Real Admin Insert',
    email: 'realadmin@example.com',
    emp_code: 'ADM-02',
    data: { name: 'Real Admin Insert' }
  };
  
  const { data, error } = await supabase.from('employees').upsert(row).select();
  console.log("Insert result:", { data, error });
}

testInsert();

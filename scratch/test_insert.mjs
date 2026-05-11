import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'admin'
  });

  const row = {
    name: 'Test Admin Insert',
    email: 'admininsert@example.com',
    emp_code: 'ADM-01',
    data: { name: 'Test Admin Insert' }
  };
  const { data, error } = await supabase.from('employees').insert(row).select();
  console.log("Admin Insert result:", { data, error });
}

testInsert();

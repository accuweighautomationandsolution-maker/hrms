import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLatest() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false }).limit(2);
  
  if (error) {
    console.log("Error:", error);
    return;
  }
  
  console.log("LATEST 2 EMPLOYEES:");
  data.forEach((r, i) => {
    console.log(`\n--- EMP ${i + 1} ---`);
    console.log("ID:", r.id);
    console.log("Top level name:", r.name);
    console.log("Top level emp_code:", r.emp_code);
    console.log("Top level designation:", r.designation);
    console.log("data column:", JSON.stringify(r.data, null, 2));
  });
}

checkLatest();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { data, error } = await supabase.from('employees').select('*').order('id', { ascending: false });
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  const mapped = data.map(r => r.data || r);
  console.log("MAPPED RESULTS:");
  mapped.forEach((emp, index) => {
    console.log(`\n--- Row ${index + 1} ---`);
    console.log("Raw object keys:", Object.keys(emp));
    console.log("Name:", emp.name);
    console.log("EmpCode:", emp.empCode || emp.emp_code);
    console.log("Role:", emp.role || emp.designation);
    console.log("Department:", emp.department);
    console.log("Status:", emp.status);
    console.log("Email:", emp.email);
  });
}

checkData();

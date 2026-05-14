const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreEmployees() {
  const employees = [
    { name: 'Grade Test', employee_code: 'EMP001', department: 'Testing', role: 'Tester', status: 'Active' },
    { name: 'UI Simulator Test', employee_code: 'EMP002', department: 'Development', role: 'Developer', status: 'Active' },
    { name: 'Pooja Govind Masalage', employee_code: 'EMP003', department: 'HR', role: 'HR Manager', status: 'Active' }
  ];

  console.log('Restoring employees to the database...');
  
  for (const emp of employees) {
    const { data, error } = await supabase
      .from('employees')
      .upsert(emp, { onConflict: 'name' }); // Using name as a temporary key if id is missing
    
    if (error) {
      console.error(`Error adding ${emp.name}:`, error.message);
    } else {
      console.log(`Successfully restored: ${emp.name}`);
    }
  }
}

restoreEmployees();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreEmployeesCorrectly() {
  const employees = [
    { name: 'Grade Test', emp_code: 'EMP001', department: 'Testing', designation: 'QA Tester', status: 'Active', biometric_code: '1' },
    { name: 'UI Simulator Test', emp_code: 'EMP002', department: 'Development', designation: 'Developer', status: 'Active', biometric_code: '2' },
    { name: 'Pooja Govind Masalage', emp_code: 'EMP003', department: 'HR', designation: 'HR Manager', status: 'Active', biometric_code: '3' }
  ];

  console.log('Restoring employees with correct schema...');
  
  for (const emp of employees) {
    const { data, error } = await supabase
      .from('employees')
      .upsert(emp, { onConflict: 'name' });
    
    if (error) {
      console.error(`Error adding ${emp.name}:`, error.message);
    } else {
      console.log(`Successfully restored: ${emp.name}`);
    }
  }
}

restoreEmployeesCorrectly();

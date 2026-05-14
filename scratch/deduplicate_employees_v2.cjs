const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deduplicateEmployees() {
  console.log('Cleaning up duplicate employees (BigInt ID)...');
  
  // 1. Delete ALL current employees (id > 0)
  const { error: delError } = await supabase.from('employees').delete().gt('id', 0);
  
  if (delError) {
    console.error('Purge failed:', delError.message);
    return;
  }

  // 2. Insert the 3 unique employees
  const employees = [
    { 
      name: 'Grade Test', 
      emp_code: 'GT-101', 
      biometric_code: '501', 
      department: 'Management', 
      designation: 'Associate', 
      status: 'Active', 
      data: { grade: 'G5', contact: '9999988888', type: 'Probation', email: 'gradetest@example.com' }
    },
    { 
      name: 'UI Simulator Test', 
      emp_code: 'SIM-01', 
      biometric_code: '881', 
      department: 'Test Dept', 
      designation: 'Test Role', 
      status: 'Active', 
      data: { grade: 'G2', contact: '9999900000', type: 'Permanent', email: 'uisimulator@example.com' }
    },
    { 
      name: 'Pooja Govind Masalage', 
      emp_code: 'E252659', 
      biometric_code: '12', 
      department: 'HR', 
      designation: 'Jr. Executive - HR', 
      status: 'Active', 
      data: { grade: 'G2', contact: '9527353482', type: 'Permanent', email: 'poojamasalage7@gmail.com' }
    }
  ];

  const { error: insError } = await supabase.from('employees').insert(employees);
  
  if (insError) {
    console.error('Restoration failed:', insError.message);
  } else {
    console.log('✅ Success! Duplicate names removed. Exactly 3 unique employees restored.');
  }
}

deduplicateEmployees();

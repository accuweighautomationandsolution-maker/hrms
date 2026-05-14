const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreActualData() {
  console.log('Purging incorrect sample data first...');
  await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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

  console.log('Restoring ACTUAL employee records from screenshot...');
  
  const { data, error } = await supabase
    .from('employees')
    .insert(employees);
    
  if (error) {
    console.error(`Restore failed:`, error.message);
  } else {
    console.log(`Successfully restored the 3 original employees with correct Codes and Bio IDs.`);
  }
}

restoreActualData();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateColumns() {
  console.log('Fetching employees...');
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*');
  
  if (error) {
    console.error('Error fetching employees:', error.message);
    return;
  }
  
  console.log(`Found ${employees.length} employees. Migrating top-level columns...`);
  
  for (const emp of employees) {
    let parsedData = {};
    if (typeof emp.data === 'string') {
      try { parsedData = JSON.parse(emp.data); } catch(e) { parsedData = {}; }
    } else if (emp.data && typeof emp.data === 'object') {
      parsedData = emp.data;
    }
    
    const row = {
      id: emp.id,
      emp_code: emp.emp_code || parsedData.empCode || parsedData.emp_code || '',
      biometric_code: emp.biometric_code || parsedData.biometricCode || parsedData.biometric_code || '',
      designation: emp.designation || parsedData.role || parsedData.designation || '',
      department: emp.department || parsedData.department || '',
      joining_date: emp.joining_date || parsedData.joiningDate || parsedData.joining_date || parsedData.joinDate || null,
      role: emp.role || parsedData.role || 'employee'
    };
    
    console.log(`Updating ${emp.name} (ID: ${emp.id}) with:`, {
      emp_code: row.emp_code,
      biometric_code: row.biometric_code,
      designation: row.designation,
      department: row.department,
      joining_date: row.joining_date,
      role: row.role
    });
    
    const { error: updateErr } = await supabase
      .from('employees')
      .update(row)
      .eq('id', emp.id);
      
    if (updateErr) {
      console.error(`Failed to update ${emp.name}:`, updateErr.message);
    } else {
      console.log(`Successfully migrated ${emp.name}`);
    }
  }
}

migrateColumns();

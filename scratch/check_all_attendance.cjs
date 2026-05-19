const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllAttendance() {
  const { data, error } = await supabase.from('attendance').select('id, emp_id, date, punch_in, punch_out, status');
  if (error) {
    console.error(error);
  } else {
    console.log(`Total attendance records fetched: ${data.length}`);
    const empCounts = {};
    data.forEach(r => {
      empCounts[r.emp_id] = (empCounts[r.emp_id] || 0) + 1;
    });
    console.log('Attendance counts per employee ID:', empCounts);
    
    // Let's also print all employees to match IDs
    const { data: emps } = await supabase.from('employees').select('id, name, biometric_code');
    console.log('Employees in database:');
    emps.forEach(e => {
      console.log(`  ID: ${e.id}, Name: ${e.name}, Biometric Code: ${e.biometric_code}, Attendance Count: ${empCounts[e.id] || 0}`);
    });
  }
}

checkAllAttendance();

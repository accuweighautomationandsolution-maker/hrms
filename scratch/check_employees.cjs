const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEmployees() {
  console.log('Fetching employees table...');
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error fetching employees:', error.message);
  } else {
    console.log('Employees found:', data.length);
    if (data.length > 0) {
       console.log('Sample data:', data[0]);
    }
  }
}

checkEmployees();

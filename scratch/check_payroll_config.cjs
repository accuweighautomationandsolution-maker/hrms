const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPayrollConfig() {
  const { data, error } = await supabase.from('payroll_config').select('*').limit(1);
  if (error) {
    console.error('Error fetching payroll_config:', error.message);
    return;
  }
  console.log('Payroll Config Columns:');
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log('No payroll_config found.');
  }
}

checkPayrollConfig();

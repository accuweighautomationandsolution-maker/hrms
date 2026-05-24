const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching employee_documents:', error);
  } else if (data.length > 0) {
    console.log('Columns in employee_documents table:', Object.keys(data[0]));
    console.log('Sample record:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No records found in employee_documents table. Let us select all to see if any exist.');
    const { data: allData, error: allErr } = await supabase.from('employee_documents').select('*');
    if (allErr) {
      console.error('Error fetching all:', allErr);
    } else {
      console.log('All records count:', allData.length);
    }
  }
}

run();

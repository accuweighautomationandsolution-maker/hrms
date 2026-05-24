const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  let output = '';
  try {
    await supabase.auth.signInWithPassword({
      email: 'admin@accuweigh.com',
      password: 'Admin@123'
    });

    const { data: colsSys, error: sysErr } = await supabase
      .from('information_schema.columns')
      .select('column_name,data_type')
      .eq('table_name', 'employee_documents');

    if (sysErr) {
      output += 'System columns query failed: ' + JSON.stringify(sysErr) + '\n';
    } else {
      output += 'Columns in employee_documents (system): ' + JSON.stringify(colsSys, null, 2) + '\n';
    }

    // Try a simple select to see what fields exist
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .limit(1);

    if (error) {
      output += 'Error fetching limit 1: ' + JSON.stringify(error) + '\n';
    } else {
      output += 'Limit 1 records: ' + JSON.stringify(data, null, 2) + '\n';
    }
  } catch (err) {
    output += 'Exception: ' + err.message + '\n';
  }

  fs.writeFileSync('c:\\Users\\Saurabh.b\\.gemini\\antigravity\\scratch\\hrms\\scratch\\print_out.txt', output);
  console.log('Done!');
}

run();

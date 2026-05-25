const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  let output = '';
  const testTables = [
    'out_duty_requests',
    'out_pass_requests',
    'positions',
    'designations',
    'employee_managers',
    'approval_history',
    'employee_documents',
    'employee_docs'
  ];

  try {
    await supabase.auth.signInWithPassword({
      email: 'admin@accuweigh.com',
      password: 'Admin@123'
    });

    for (const t of testTables) {
      const { error } = await supabase.from(t).select('id').limit(1);
      output += `Table '${t}': ${error ? 'FAIL (' + error.code + ': ' + error.message + ')' : 'OK'}\n`;
    }
  } catch (err) {
    output += 'Exception: ' + err.message + '\n';
  }

  fs.writeFileSync('c:\\Users\\Saurabh.b\\.gemini\\antigravity\\scratch\\hrms\\scratch\\probe_tables_out.txt', output);
  console.log('Done!');
}

run();

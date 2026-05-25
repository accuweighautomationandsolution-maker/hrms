const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  let output = '';
  try {
    const { data, error } = await supabase.rpc('run_sql', {
      sql: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';'
    });
    if (error) {
      output += 'RPC run_sql error: ' + JSON.stringify(error) + '\n';
    } else {
      output += 'Tables: ' + JSON.stringify(data, null, 2) + '\n';
    }
  } catch (err) {
    output += 'Exception: ' + err.message + '\n';
  }
  fs.writeFileSync('c:\\Users\\Saurabh.b\\.gemini\\antigravity\\scratch\\hrms\\scratch\\sql_tables.txt', output);
  console.log('Done!');
}

run();

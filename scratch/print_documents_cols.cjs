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
  } else {
    // If no records, we can try to query postgres columns info if public schema has access
    const { data: cols, error: colsErr } = await supabase.rpc('get_table_columns', { table_name: 'employee_documents' });
    if (colsErr) {
      console.log('RPC get_table_columns failed, attempting raw column lookup on system tables...');
      const { data: colsSys, error: sysErr } = await supabase
        .from('information_schema.columns')
        .select('column_name,data_type')
        .eq('table_name', 'employee_documents');
      if (sysErr) {
        console.error('System query failed:', sysErr);
      } else {
        console.log('Columns in employee_documents (system schema):', colsSys);
      }
    } else {
      console.log('Columns in employee_documents (RPC):', cols);
    }
  }
}

run();

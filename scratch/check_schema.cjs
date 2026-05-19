const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAttendanceSchema() {
  console.log('Querying table constraints...');
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'attendance' });
  
  if (error) {
    // If rpc doesn't exist, query standard PG catalog
    console.log('RPC not found, attempting raw SQL query...');
    const { data: sqlData, error: sqlErr } = await supabase
      .from('attendance')
      .select('*')
      .limit(1);
    if (sqlErr) {
      console.error('Error selecting:', sqlErr.message);
    } else {
      console.log('Sample row structure:', sqlData);
    }
  } else {
    console.log('Schema:', data);
  }
  
  // Let's get table definition by querying PG catalog directly via custom function if possible,
  // or let's select existing constraints if any.
}

getAttendanceSchema();

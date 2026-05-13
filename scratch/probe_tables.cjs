const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  // We can't list tables directly from the client without RPC or Admin key.
  // But we can try to 'select' from common names.
  const common = ['app_config', 'attendance', 'employees', 'user_profiles', 'holidays', 'leave_requests', 'salary_structures'];
  for (const t of common) {
    const { error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table '${t}': ${error ? 'FAIL (' + error.message + ')' : 'OK'}`);
  }
}

listTables();

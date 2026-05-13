const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  const { data, error } = await supabase.from('user_profiles').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  console.log('User Profiles:');
  data.forEach(u => {
    console.log(`- ${u.name} (${u.email}): Role=${u.role}, Active=${u.active}`);
  });
}

checkUsers();

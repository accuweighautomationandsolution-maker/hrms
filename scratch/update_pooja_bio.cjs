const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updatePoojaBioCode() {
  const { data, error } = await supabase.from('employees')
    .update({ biometric_code: '16' })
    .eq('id', 16)
    .select();
    
  if (error) {
    console.error('Error updating biometric code:', error);
  } else {
    console.log('Successfully updated Pooja\'s biometric code in Supabase:', data);
  }
}

updatePoojaBioCode();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deletePoojaMockData() {
  console.log('Deleting mock test records for Pooja...');
  
  // Delete the records we identified with 'Test Sync Script'
  const { data, error } = await supabase.from('attendance')
    .delete()
    .eq('emp_id', 16)
    .in('date', ['2026-05-18', '2026-05-19']);
    
  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Successfully deleted mock records.');
  }
}

deletePoojaMockData();

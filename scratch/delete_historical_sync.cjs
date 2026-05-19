const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteHistoricalSync() {
  console.log('Deleting mistakenly synced 2022 historical records mapped to 2026...');
  
  // Delete the records for Milind (empId = 1779101235079) and Pooja (empId = 16)
  const { data, error } = await supabase.from('attendance')
    .delete()
    .in('emp_id', [16, 1779101235079])
    .in('date', ['2026-05-18', '2026-05-19']);
    
  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Successfully deleted historical synced records.');
  }
}

deleteHistoricalSync();

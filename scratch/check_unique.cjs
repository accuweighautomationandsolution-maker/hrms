const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
  // Let's run a query to get constraints from pg_constraint
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'attendance'::regclass;
    `
  });
  
  if (error) {
    console.log('RPC execute_sql not available, testing unique constraint manually...');
    // Let's test by inserting two identical rows (emp_id, date) and seeing if it throws an error!
    const row = {
      emp_id: 16,
      date: '2026-05-20',
      punch_in: '2026-05-20T09:00:00Z',
      status: 'Present',
      data: { source: 'Unique Test' }
    };
    
    console.log('Inserting first row...');
    const { data: d1, error: e1 } = await supabase.from('attendance').insert(row).select();
    if (e1) {
      console.error('Error inserting first:', e1.message);
      return;
    }
    console.log('First inserted successfully:', d1);
    
    console.log('Inserting second identical row...');
    const { data: d2, error: e2 } = await supabase.from('attendance').insert(row).select();
    if (e2) {
      console.log('Second insert failed (indicating unique constraint exists!):', e2.message);
    } else {
      console.log('Second insert succeeded! (indicating NO unique constraint on emp_id, date):', d2);
      // Clean up the test rows
      console.log('Cleaning up...');
      await supabase.from('attendance').delete().eq('date', '2026-05-20');
    }
  } else {
    console.log('Constraints:', data);
  }
}

checkConstraints();

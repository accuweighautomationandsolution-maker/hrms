const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const testDocId = 'TEST_DOC_' + Date.now();
  const { error: insertErr } = await supabase
    .from('employee_documents')
    .insert({
      id: testDocId,
      emp_id: 16, // Pooja's ID is 16
      data: { id: testDocId, name: 'Test Insert Document', content: 'test content' }
    });

  if (insertErr) {
    console.error('Insert failed:', insertErr);
  } else {
    console.log('Insert succeeded! Now let us fetch it.');
    const { data, error: selectErr } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('id', testDocId);
    
    if (selectErr) {
      console.error('Select failed:', selectErr);
    } else {
      console.log('Fetched successfully:', data);
    }

    // Cleanup
    const { error: deleteErr } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', testDocId);
    if (deleteErr) {
      console.error('Delete cleanup failed:', deleteErr);
    } else {
      console.log('Cleanup succeeded!');
    }
  }
}

run();

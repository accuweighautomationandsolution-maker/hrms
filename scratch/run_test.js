const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  let output = '';
  try {
    await supabase.auth.signInWithPassword({
      email: 'admin@accuweigh.com',
      password: 'Admin@123'
    });

    const testDocId = 'TEST_DOC_RUN_' + Date.now();
    const { error: insertErr } = await supabase
      .from('employee_documents')
      .insert({
        id: testDocId,
        emp_id: 16,
        data: { id: testDocId, name: 'Test Document', content: 'content' }
      });

    if (insertErr) {
      output += 'Insert failed: ' + JSON.stringify(insertErr) + '\n';
    } else {
      output += 'Insert succeeded!\n';
      const { data, error: selectErr } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('id', testDocId);
      output += 'Select data: ' + JSON.stringify(data) + '\n';

      const { error: deleteErr } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', testDocId);
      output += 'Delete cleanup: ' + (deleteErr ? JSON.stringify(deleteErr) : 'Success') + '\n';
    }
  } catch (err) {
    output += 'Exception: ' + err.message + '\n';
  }

  fs.writeFileSync('c:\\Users\\Saurabh.b\\.gemini\\antigravity\\scratch\\hrms\\scratch\\test_out.txt', output);
  console.log('Done!');
}

run();

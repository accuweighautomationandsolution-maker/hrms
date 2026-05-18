const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log("Pinging letter_templates...");
  const { data, error } = await supabase.from('letter_templates').select('id').limit(1);
  if (error) {
    console.log("Error:", error.message, error.code);
  } else {
    console.log("Table exists! Data:", data);
  }

  console.log("Pinging app_config...");
  const { data: d2, error: e2 } = await supabase.from('app_config').select('key').limit(1);
  if (e2) {
    console.log("Error:", e2.message, e2.code);
  } else {
    console.log("Table exists! Data:", d2);
  }
}

checkTable();

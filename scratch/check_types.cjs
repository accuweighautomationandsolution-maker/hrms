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

async function checkTypes() {
  const { data, error } = await supabase.from('app_config').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("app_config row:", data[0]);
    console.log("value type:", typeof data[0].value);
  }
}

checkTypes();

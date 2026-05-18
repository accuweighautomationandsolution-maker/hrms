const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let serviceKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
});

if (!serviceKey) {
  console.log("No service key found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkDb() {
  // Test app_config
  const { data: d1, error: e1 } = await supabase.from('app_config').select('*').limit(1);
  console.log("app_config exists:", e1 ? e1.message : "Yes");
  
  // Upsert to letter_templates using service role
  const { error: e2 } = await supabase.from('letter_templates').upsert({ 
    id: 'sys_config_departments', 
    data: { key: 'departments', value: ['Management', 'Operations', 'Design'] } 
  }, { onConflict: 'id' });
  console.log("letter_templates upsert (service_role):", e2 ? e2.message : "Success");
}

checkDb();

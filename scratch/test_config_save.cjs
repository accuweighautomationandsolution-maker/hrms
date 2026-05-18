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

async function testSave() {
  const key = 'departments';
  const value = ['Management', 'Operations', 'Design'];
  
  console.log("Testing app_config upsert...");
  const { error: e1 } = await supabase.from('app_config').upsert({ key, value }, { onConflict: 'key' });
  console.log("app_config error:", e1?.message || "Success");

  console.log("Testing letter_templates fallback upsert...");
  const shadowId = `sys_config_${key}`;
  const { error: e2 } = await supabase.from('letter_templates').upsert({ 
    id: shadowId, 
    data: { key, value } 
  }, { onConflict: 'id' });
  
  console.log("letter_templates error:", e2?.message || "Success");
}

testSave();

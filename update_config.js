const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: config, error: fetchErr } = await supabase.from('payroll_config').select('*');
  if (fetchErr) {
    console.error('Error fetching config:', fetchErr);
    return;
  }
  
  if (config && config.length > 0) {
    console.log('Current Config:', config);
    
    // Update Basic to 45
    let { error: err1 } = await supabase.from('payroll_config').update({ formula_value: 45 }).eq('component_name', 'Basic');
    if (err1) console.error('Error updating Basic:', err1);
    else console.log('Updated Basic to 45');

    // Update DA to 5
    let { error: err2 } = await supabase.from('payroll_config').update({ formula_value: 5 }).eq('component_name', 'DA');
    if (err2) console.error('Error updating DA:', err2);
    else console.log('Updated DA to 5');
  } else {
    console.log('No config records found to update.');
  }
}
run();

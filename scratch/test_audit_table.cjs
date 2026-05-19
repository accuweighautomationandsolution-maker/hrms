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

async function testAuditTable() {
  const { data, error } = await supabase.from('attendance_audit_logs').select('*').limit(1);
  if (error) {
    console.error("Error fetching from attendance_audit_logs:", error.message);
  } else {
    console.log("Successfully connected to attendance_audit_logs, data:", data);
  }
}

testAuditTable();

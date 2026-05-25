import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  let log = "";
  try {
    log += "=== EMPLOYEES ===\n";
    const { data: emps, error: empsErr } = await supabase.from('employees').select('id, name, email, data');
    if (empsErr) {
      log += "Error fetching employees: " + JSON.stringify(empsErr) + "\n";
    } else {
      emps.forEach(e => {
        let parsed = {};
        try { parsed = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch(err) {}
        log += `ID: ${e.id} | Name: ${e.name} | Email: ${e.email} | managerIds: ${JSON.stringify(parsed?.managerIds)}\n`;
      });
    }

    log += "\n=== USER PROFILES ===\n";
    const { data: profiles, error: profsErr } = await supabase.from('user_profiles').select('*');
    if (profsErr) {
      log += "Error fetching user profiles: " + JSON.stringify(profsErr) + "\n";
    } else {
      profiles.forEach(p => {
        log += `ID: ${p.id} | Name: ${p.name} | Email: ${p.email} | emp_id: ${p.emp_id}\n`;
      });
    }

    log += "\n=== LEAVE REQUESTS ===\n";
    const { data: leaves, error: leavesErr } = await supabase.from('leave_requests').select('*');
    if (leavesErr) {
      log += "Error fetching leave requests: " + JSON.stringify(leavesErr) + "\n";
    } else {
      leaves.forEach(l => {
        log += `ID: ${l.id} | Emp ID: ${l.emp_id} | Type: ${l.type} | Status: ${l.status} | Start: ${l.start_date} | End: ${l.end_date}\n`;
      });
    }
  } catch (err) {
    log += "Exception: " + err.message + "\n";
  }

  fs.writeFileSync('inspect_output.txt', log);
  console.log("Written inspect_output.txt successfully.");
}

inspect();

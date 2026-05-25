import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJoin() {
  let log = "";
  try {
    log += "=== FETCH WITH JOIN ===\n";
    const { data, error } = await supabase.from('leave_requests').select('*, employees(name)');
    if (error) {
      log += "Error with employees join: " + JSON.stringify(error) + "\n";
    } else {
      log += `Fetched ${data.length} records:\n`;
      log += JSON.stringify(data, null, 2) + "\n";
    }
  } catch (err) {
    log += "Exception: " + err.message + "\n";
  }

  fs.writeFileSync('inspect_output_join.txt', log);
  console.log("Written inspect_output_join.txt");
}

testJoin();

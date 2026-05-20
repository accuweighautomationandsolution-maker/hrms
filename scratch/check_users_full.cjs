const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co'';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.time("CHECK_USERS_FLOW");
console.log("SCRIPT STARTED: check_users_full.cjs");

async function checkUsersFull() {
  try {
    console.log("STEP 1: Fetching users...");

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username');

    if (error) {
      console.error("DB ERROR:", error);
      return;
    }

    console.log("STEP 2: Users fetched =", data.length);

    // SAFE logging (prevents overload)
    console.log("Sample users:", data.slice(0, 5));

    console.log("STEP 3: Completed successfully");
  } catch (err) {
    console.error("FATAL ERROR:", err);
  } finally {
    console.timeEnd("CHECK_USERS_FLOW");
  }
}

checkUsersFull();
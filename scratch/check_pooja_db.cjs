const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPoojaDbAttendance() {
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .eq('emp_id', 16)
    .order('date', { ascending: false });
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Pooja's total records in DB: ${data.length}`);
    data.slice(0, 10).forEach(r => {
      console.log(`  Date: ${r.date}, Punch In: ${r.punch_in}, Punch Out: ${r.punch_out}, Status: ${r.status}, Data:`, r.data);
    });
  }
}

checkPoojaDbAttendance();

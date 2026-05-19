const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMilindAttendance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('emp_id', 1779101235079);
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Total records for Milind (1779101235079): ${data.length}`);
    console.table(data.map(r => ({
      id: r.id,
      date: r.date,
      punch_in: r.punch_in,
      punch_out: r.punch_out,
      status: r.status,
      source: r.data?.source
    })));
  }
}

checkMilindAttendance();

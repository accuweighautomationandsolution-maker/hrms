const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function printAllAttendance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching attendance:', error.message);
  } else {
    console.log(`Total records: ${data.length}`);
    console.log('Most recent 15 records in DB:');
    console.table(data.slice(0, 15).map(r => ({
      id: r.id,
      emp_id: r.emp_id,
      date: r.date,
      punch_in: r.punch_in,
      punch_out: r.punch_out,
      status: r.status,
      source: r.data?.source || 'N/A',
      remark: r.data?.remark || 'N/A'
    })));
  }
}

printAllAttendance();

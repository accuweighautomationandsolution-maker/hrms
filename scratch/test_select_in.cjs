const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSelectIn() {
  const chunkEmpIds = ['1779101235079'];
  const chunkDates = ['2026-05-04', '2026-05-05'];
  
  console.log('Querying existing records with strings:', chunkEmpIds, chunkDates);
  const { data: data1, error: err1 } = await supabase.from('attendance')
    .select('id, emp_id, date')
    .in('emp_id', chunkEmpIds)
    .in('date', chunkDates);
    
  if (err1) {
    console.error('Error 1:', err1.message);
  } else {
    console.log('Results with strings:', data1);
    data1.forEach(r => {
      console.log(`Type of emp_id: ${typeof r.emp_id}, value: ${r.emp_id}`);
    });
  }
  
  // Let's query with numbers
  const chunkEmpIdsNum = [1779101235079];
  console.log('Querying existing records with numbers:', chunkEmpIdsNum, chunkDates);
  const { data: data2, error: err2 } = await supabase.from('attendance')
    .select('id, emp_id, date')
    .in('emp_id', chunkEmpIdsNum)
    .in('date', chunkDates);
    
  if (err2) {
    console.error('Error 2:', err2.message);
  } else {
    console.log('Results with numbers:', data2);
  }
}

testSelectIn();

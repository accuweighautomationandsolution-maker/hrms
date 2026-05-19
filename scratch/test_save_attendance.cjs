const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSaveAttendance() {
  console.log('Testing saveAttendance...');
  
  // Try inserting a mock record for employee 16 (Pooja Govind Masalage) on "2026-05-19"
  const recordsMap = {
    "16_2026-05-19": {
      punchIn: "09:00",
      punchOut: "18:00",
      remark: "Test Sync Script Insert",
      source: "Biometric Terminal"
    }
  };
  
  try {
    const entries = Object.entries(recordsMap);
    console.log("Chunk entries:", entries);
    
    const chunkEmpIds = [...new Set(entries.map(([k]) => k.substring(0, k.lastIndexOf('_'))))];
    const chunkDates = [...new Set(entries.map(([k]) => k.substring(k.lastIndexOf('_') + 1)))];
    
    console.log("Querying existing records...");
    const { data: existingData, error: fetchErr } = await supabase.from('attendance')
      .select('id, emp_id, date')
      .in('emp_id', chunkEmpIds)
      .in('date', chunkDates);
      
    if (fetchErr) {
      console.error("Fetch Error:", fetchErr);
      return;
    }
    
    console.log("Existing Data:", existingData);
    
    const existingMap = {};
    if (existingData) {
      existingData.forEach(r => {
        existingMap[`${r.emp_id}_${r.date}`] = r.id;
      });
    }

    const rowsToUpsert = [];
    const rowsToInsert = [];

    entries.forEach(([key, val]) => {
      const lastUnderscore = key.lastIndexOf('_');
      const empId = key.substring(0, lastUnderscore);
      const dateStr = key.substring(lastUnderscore + 1);

      let punchInTs = `${dateStr}T${val.punchIn}:00.000Z`;
      let punchOutTs = `${dateStr}T${val.punchOut}:00.000Z`;

      const row = {
        emp_id: String(empId), 
        date: dateStr,
        punch_in: punchInTs,
        punch_out: punchOutTs,
        status: val.punchOut ? 'Present' : (val.punchIn ? 'Incomplete' : 'Absent'),
        data: { 
          remark: val.remark, 
          source: val.source,
          punchIn: val.punchIn,
          punchOut: val.punchOut
        }
      };

      const existingId = existingMap[key] || val.id;
      if (existingId) {
        row.id = existingId;
        rowsToUpsert.push(row);
      } else {
        rowsToInsert.push(row);
      }
    });

    console.log("rowsToUpsert:", rowsToUpsert);
    console.log("rowsToInsert:", rowsToInsert);

    if (rowsToUpsert.length > 0) {
      console.log("Performing upsert...");
      const { data, error } = await supabase.from('attendance').upsert(rowsToUpsert, { onConflict: 'id' }).select();
      if (error) {
        console.error("Upsert Error details:", error);
      } else {
        console.log("Upsert Success:", data);
      }
    }
    
    if (rowsToInsert.length > 0) {
      console.log("Performing insert...");
      const { data, error } = await supabase.from('attendance').insert(rowsToInsert).select();
      if (error) {
        console.error("Insert Error details:", error);
      } else {
        console.log("Insert Success:", data);
      }
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

testSaveAttendance();

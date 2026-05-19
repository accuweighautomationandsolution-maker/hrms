const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const filePath = 'C:\\Users\\Saurabh.b\\.gemini\\antigravity\\brain\\cbe8f90e-8b02-49ea-9103-3e1b2ead3c7c\\.system_generated\\steps\\660\\content.md';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const jsonLine = lines.find(l => l.trim().startsWith('{"logs":'));

const data = JSON.parse(jsonLine);
const milindRawLogs = data.logs.filter(log => log.empId === '6' && log.year === 2026 && log.month === 5);

console.log(`Found ${milindRawLogs.length} raw logs in May 2026 for biometric code '6'.`);

// Now let's import dataService.js saveAttendance logic.
// We can construct the recordsMap just like Attendance.jsx does.
const internalId = '1779101235079'; // Milind's DB ID
const recordsMap = {};

milindRawLogs.forEach(log => {
  const dStr = `${log.year}-${String(log.month).padStart(2, '0')}-${String(log.day).padStart(2, '0')}`;
  const logKey = `${internalId}_${dStr}`;
  recordsMap[logKey] = {
    punchIn: log.punchIn,
    punchOut: log.punchOut,
    remark: log.remark || 'Identix Hardware Pull',
    source: 'Biometric Terminal'
  };
});

console.log('Constructed recordsMap to save:', recordsMap);

// Mimic saveAttendance chunk logic
async function runSave() {
  const entries = Object.entries(recordsMap);
  console.log(`Processing ${entries.length} entries to save...`);
  
  const chunkEntries = entries;
  const chunkEmpIds = [...new Set(chunkEntries.map(([k]) => k.substring(0, k.lastIndexOf('_'))))];
  const chunkDates = [...new Set(chunkEntries.map(([k]) => k.substring(k.lastIndexOf('_') + 1)))];
  
  console.log('Querying existing records for empIds:', chunkEmpIds, 'dates:', chunkDates);
  
  const { data: existingData, error: fetchErr } = await supabase.from('attendance')
    .select('id, emp_id, date')
    .in('emp_id', chunkEmpIds)
    .in('date', chunkDates);
    
  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    return;
  }
  
  console.log('Existing data:', existingData);
  
  const existingMap = {};
  if (existingData) {
    existingData.forEach(r => {
      existingMap[`${r.emp_id}_${r.date}`] = r.id;
    });
  }

  const rowsToUpsert = [];
  const rowsToInsert = [];

  chunkEntries.forEach(([key, val]) => {
    const lastUnderscore = key.lastIndexOf('_');
    const empId = key.substring(0, lastUnderscore);
    const dateStr = key.substring(lastUnderscore + 1);

    let punchInTs = null;
    if (val.punchIn && val.punchIn.includes(':')) {
      punchInTs = new Date(`${dateStr}T${val.punchIn}:00`).toISOString();
    } else if (val.punchIn) {
      punchInTs = val.punchIn;
    }

    let punchOutTs = null;
    if (val.punchOut && val.punchOut.includes(':')) {
      punchOutTs = new Date(`${dateStr}T${val.punchOut}:00`).toISOString();
    } else if (val.punchOut) {
      punchOutTs = val.punchOut;
    }

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

  console.log('Rows to Insert:', rowsToInsert);
  console.log('Rows to Upsert:', rowsToUpsert);

  if (rowsToInsert.length > 0) {
    console.log('Inserting rows into database...');
    const { data: insData, error: insErr } = await supabase.from('attendance').insert(rowsToInsert).select();
    if (insErr) {
      console.error('Insert Error:', insErr);
    } else {
      console.log('Insert Success:', insData);
    }
  }
}

runSave();

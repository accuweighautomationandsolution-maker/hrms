const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateBioSync() {
  try {
    // 1. Fetch employees
    const { data: emps, error: empErr } = await supabase.from('employees').select('*');
    if (empErr) throw empErr;
    console.log(`Fetched ${emps.length} employees from DB.`);
    
    // Create bioIdMap
    const bioIdMap = {};
    emps.forEach(e => {
      const bCode = e.biometric_code; 
      if (bCode) bioIdMap[String(bCode).trim()] = e.id;
    });
    console.log('bioIdMap:', bioIdMap);

    // 2. Fetch logs from bridge
    console.log('Fetching logs from bridge...');
    const res = await fetch('http://localhost:9000/api/pull');
    const data = await res.json();
    const logs = data.logs;
    console.log(`Fetched ${logs.length} logs from bridge.`);

    // 3. Process logs
    const HARD_MIN_DATE = new Date("2026-05-01T00:00:00");
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let addedCount = 0;
    let skippedMappingCount = 0;
    let legacyRejectedCount = 0;
    let futureRejectedCount = 0;
    
    const recordsToSave = {};

    logs.forEach(log => {
      const logDate = new Date(log.year, log.month - 1, log.day);
      
      if (logDate > today) {
        futureRejectedCount++;
        return;
      }

      // 1. HARD CUTOFF: Ignore logs prior to May 1st 2026
      if (logDate < HARD_MIN_DATE) {
        legacyRejectedCount++;
        return;
      }

      // STRICT MAPPING
      const internalId = bioIdMap[String(log.empId)];
      if (!internalId) {
        skippedMappingCount++;
        return;
      }

      const dStr = `${log.year}-${String(log.month).padStart(2, '0')}-${String(log.day).padStart(2, '0')}`;
      const logKey = `${internalId}_${dStr}`;
      
      const entry = {
        punchIn: log.punchIn,
        punchOut: log.punchOut,
        remark: log.remark || 'Identix Hardware Pull',
        source: 'Biometric Terminal'
      };
      
      recordsToSave[logKey] = entry;
      addedCount++;
    });

    console.log('\nSimulation Results:');
    console.log(`- Records Synced: ${addedCount}`);
    console.log(`- Legacy Ignored (< May 2026): ${legacyRejectedCount}`);
    console.log(`- Skipped (No ID match): ${skippedMappingCount}`);
    console.log(`- Future Rejected: ${futureRejectedCount}`);
    
    console.log('\nSample records to save:', Object.keys(recordsToSave).slice(0, 10));
    console.log('Specific records for Milind (1779101235079):');
    Object.entries(recordsToSave).forEach(([k, v]) => {
      if (k.startsWith('1779101235079')) {
        console.log(`  ${k} =>`, v);
      }
    });

  } catch (err) {
    console.error('Simulation Failed:', err.message);
  }
}

simulateBioSync();

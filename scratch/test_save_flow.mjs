import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateUI() {
  await supabase.auth.signInWithPassword({
    email: 'admin@accuweigh.com',
    password: 'Admin@123'
  });

  const empData = {
    id: Date.now(),
    isNew: true,
    name: 'UI Simulator Test',
    email: 'uisimulator@example.com',
    role: 'Test Role',
    department: 'Test Dept',
    status: 'Active',
    empCode: 'SIM-01',
    biometricCode: '001',
  };

  const row = {
    id: empData.id,
    name: empData.name || '',
    email: empData.email || '',
    emp_code: empData.empCode || '',
    designation: empData.role || '', // wait, in dataService it was empData.designation
    department: empData.department || '',
    status: empData.status || 'Active',
    data: { ...empData, id: empData.id, status: empData.status }
  };
  
  // Actually, UI uses designation: empData.designation || '' but empData doesn't have designation, it has role.
  row.designation = empData.designation || ''; 

  console.log("Inserting row:", JSON.stringify(row, null, 2));
  const { error } = await supabase.from('employees').insert(row);
  if (error) {
    console.log("Insert Error:", error);
    return;
  }

  // Now fetch like getEmployees does
  const { data: dbData } = await supabase.from('employees').select('*').order('id', { ascending: false }).limit(1);
  
  const r = dbData[0];
  let parsedData = r.data || {};
  
  const mapped = {
    ...parsedData,
    id: r.id,
    name: r.name || parsedData.name || 'Unnamed Employee',
    email: r.email || parsedData.email || '',
    empCode: r.emp_code || parsedData.empCode || '',
    role: r.designation || parsedData.role || 'Associate',
    department: r.department || parsedData.department || 'Engineering',
    status: r.status || parsedData.status || 'Active'
  };

  console.log("MAPPED ROW RETURNED TO UI:", JSON.stringify(mapped, null, 2));
}

simulateUI();

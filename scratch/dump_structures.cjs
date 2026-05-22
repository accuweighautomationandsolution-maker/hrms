const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSalaryStructures() {
  const { data, error } = await supabase
    .from('salary_structures_ext')
    .select('*');

  if (error) {
    fs.writeFileSync(path.join(__dirname, 'structures_output.json'), JSON.stringify({ error: error.message }, null, 2));
  } else {
    fs.writeFileSync(path.join(__dirname, 'structures_output.json'), JSON.stringify(data, null, 2));
  }
  console.log("Written structure output to structures_output.json");
}

checkSalaryStructures();

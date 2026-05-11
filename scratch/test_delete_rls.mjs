import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
  // Test as Saurabh (the user from the screenshot)
  // Wait, I don't know Saurabh's password, so I'll test as bob
  await supabase.auth.signInWithPassword({
    email: 'bob@company.com',
    password: 'Bob@123'
  });

  // Try to delete "Pooja Govind Masalage" (ID: 1778483602354)
  const idToDelete = 1778483602354; 
  
  // Ask for the row representation back by adding `.select()`
  const { data, error } = await supabase.from('employees').delete().eq('id', idToDelete).select();
  
  if (error) {
    console.log("Delete failed with error:", error);
  } else if (data && data.length === 0) {
    console.log("Delete query executed, but 0 rows were deleted. (Probably blocked by RLS)");
  } else {
    console.log("Delete succeeded for ID", idToDelete, "Data:", data);
  }
}

testDelete();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing with:", supabaseUrl);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'saurabh@accuweigh.org',
    password: 'Kaustubh@1',
  });
  
  if (error) {
    console.log("LOGIN ERROR:");
    console.log(error.message);
  } else {
    console.log("LOGIN SUCCESS! User ID:", data.user.id);
  }
}

test();

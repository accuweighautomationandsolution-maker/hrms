const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqpwlhguxxqqpsnigmpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcHdsaGd1eHhxcXBzbmlnbXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTA5NjgsImV4cCI6MjA5MjUyNjk2OH0.XV3vAk68V1oTNNfch2ojEp6aVOjEUNsFnRzPjSKh9D8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('=== HRMS Login Diagnosis ===\n');

  // 1. Check if we can read user_profiles at all (RLS check)
  console.log('1. Testing user_profiles READ access (RLS check)...');
  const { data: allProfiles, error: readErr } = await supabase
    .from('user_profiles')
    .select('id, email, name, role, emp_id, active')
    .order('created_at');
  
  if (readErr) {
    console.log('   ❌ CANNOT READ user_profiles:', readErr.message);
    console.log('   → This means RLS is blocking unauthenticated reads!');
    console.log('   → FIX: Run this SQL in Supabase SQL Editor:');
    console.log('     CREATE POLICY "Allow public read" ON user_profiles FOR SELECT USING (true);');
    console.log('');
  } else {
    console.log(`   ✅ Can read user_profiles. Found ${allProfiles?.length || 0} users.`);
    if (allProfiles && allProfiles.length > 0) {
      console.log('\n   All users in user_profiles:');
      allProfiles.forEach(p => {
        const hasHash = p.emp_id ? `"${p.emp_id.substring(0, 30)}..."` : 'NULL ❌';
        console.log(`   - ${p.email} | emp_id: ${hasHash} | active: ${p.active}`);
      });
    }
  }

  // 2. Check milind specifically
  console.log('\n2. Looking for milind.chavan@accuweigh.org...');
  const { data: milind, error: milErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'milind.chavan@accuweigh.org')
    .maybeSingle();
  
  if (milErr) {
    console.log('   ❌ Error querying milind:', milErr.message);
  } else if (!milind) {
    console.log('   ❌ User NOT FOUND in user_profiles table!');
  } else {
    console.log('   ✅ Found user:');
    console.log('      ID:', milind.id);
    console.log('      Email:', milind.email);
    console.log('      Name:', milind.name);
    console.log('      Role:', milind.role);
    console.log('      Active:', milind.active);
    console.log('      emp_id:', milind.emp_id || 'NULL ❌ (password hash missing!)');
    
    if (milind.emp_id) {
      try {
        const decoded = Buffer.from(milind.emp_id.replace('INTERNAL_AUTH:', ''), 'base64').toString('utf-8');
        console.log('      Decoded password:', decoded);
      } catch(e) {
        console.log('      Could not decode emp_id:', e.message);
      }
    }
  }

  // 3. Check auth_logs for shadow credentials
  console.log('\n3. Checking auth_logs for SHADOW_CRED records...');
  const { data: shadowRows, error: shadowErr } = await supabase
    .from('auth_logs')
    .select('id, data')
    .like('id', 'SHADOW_CRED_%');
  
  if (shadowErr) {
    console.log('   ❌ Cannot read auth_logs:', shadowErr.message);
    console.log('   → RLS might be blocking auth_logs reads too.');
  } else {
    console.log(`   Found ${shadowRows?.length || 0} shadow credential records:`);
    (shadowRows || []).forEach(r => {
      const hash = r.data?.hash;
      let decoded = '';
      if (hash) {
        try { decoded = Buffer.from(hash, 'base64').toString('utf-8'); } catch(e) {}
      }
      console.log(`   - ${r.id} → hash: ${hash || 'MISSING'} → password: "${decoded}"`);
    });
  }

  // 4. Test Supabase Auth login
  console.log('\n4. Testing Supabase Auth login for milind.chavan@accuweigh.org...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'milind.chavan@accuweigh.org',
    password: 'Milind@123',  // Adjust this to the actual password used
  });
  
  if (authErr) {
    console.log('   ❌ Supabase Auth login failed:', authErr.message);
    console.log('   → This is expected if user was created via Strategy C (internal UUID)');
  } else {
    console.log('   ✅ Supabase Auth login succeeded! User ID:', authData.user?.id);
  }

  console.log('\n=== Diagnosis Complete ===');
  console.log('\nIf emp_id is NULL, run this SQL in Supabase SQL Editor to fix:');
  console.log("UPDATE user_profiles SET emp_id = encode('Milind@123'::bytea, 'base64') WHERE email = 'milind.chavan@accuweigh.org';");
  console.log('\nIf RLS is blocking reads, run:');
  console.log("CREATE POLICY \"Allow public read for login\" ON user_profiles FOR SELECT USING (true);");
}

diagnose().catch(e => console.error('Script error:', e));

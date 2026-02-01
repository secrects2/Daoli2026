const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyUsers() {
    console.log('🔍 Verifying User Roles...');

    // 1. Get all users from auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Auth List Error:', authError);
        return;
    }

    // 2. Get all profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('❌ Profile List Error:', profileError);
        return;
    }

    // 3. Match them
    const targetEmails = ['admin@daoli.com', 'pharmacist@daoli.com', 'family@daoli.com', 'elder@daoli.com'];

    for (const email of targetEmails) {
        const authUser = users.find(u => u.email === email);
        if (!authUser) {
            console.log(`❌ Auth User MISSING: ${email}`);
            continue;
        }

        const profile = profiles.find(p => p.id === authUser.id);
        if (!profile) {
            console.log(`❌ Profile MISSING: ${email} (Auth ID: ${authUser.id})`);
            continue;
        }

        const isConfirmed = authUser.email_confirmed_at ? '✅ Confirmed' : '❌ Unconfirmed';
        const roleMatch = profile.role ? `Role: ${profile.role}` : '❌ No Role';

        console.log(`👤 ${email.padEnd(20)} | ${isConfirmed} | ${roleMatch}`);
    }
}

verifyUsers();

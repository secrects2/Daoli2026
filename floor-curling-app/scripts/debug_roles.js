
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const emails = ['admin@daoli.com', 'pharmacist@daoli.com', 'family@daoli.com', 'elder@daoli.com'];

    for (const email of emails) {
        console.log(`Checking ${email}...`);

        // 1. Get Auth User
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            console.log(`❌ Auth User not found for ${email}`);
            continue;
        }

        console.log(`✅ Auth ID: ${user.id}`);

        // 2. Get Profile Role
        const { data: profile, error: dbError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (dbError) {
            console.log(`❌ DB Error: ${dbError.message}`);
        } else if (!profile) {
            console.log(`❌ Profile not found`);
        } else {
            console.log(`✅ Role: ${profile.role}`);
        }
        console.log('---');
    }
}

checkRoles();

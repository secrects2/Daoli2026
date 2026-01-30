const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // unquote
            }
        });
    } else {
        console.warn('⚠️ .env.local not found context');
    }
} catch (e) {
    console.error('Error reading .env.local:', e.message);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

if (!serviceRoleKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUsers() {
    console.log('🔍 Checking users in database...');

    // 1. List Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Error fetching auth users:', authError.message);
        return;
    }

    console.log(`\nFound ${users.length} users in auth.users:`);

    // 2. Fetch Profiles to cross-reference
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError.message);
    }

    const profileMap = new Map();
    if (profiles) {
        profiles.forEach(p => profileMap.set(p.id, p));
    }

    // 3. Display merged info
    users.forEach(u => {
        const profile = profileMap.get(u.id);
        const role = profile ? profile.role : 'N/A (No Profile)';
        const store = profile ? profile.store_id : 'N/A';

        console.log(`\n👤 User: ${u.email}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Role: ${role}`);
        console.log(`   Store: ${store}`);
        console.log(`   Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Last Sign In: ${u.last_sign_in_at}`);
        console.log('---');
    });

    if (users.length === 0) {
        console.log('⚠️ No users found.');
    }
}

checkUsers();

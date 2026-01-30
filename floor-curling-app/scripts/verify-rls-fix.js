const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // unquote
        }
    });
} catch (e) {
    console.error('Error reading .env.local:', e.message);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!anonKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function verifyFix() {
    console.log('🕵️ Verifying RLS fix with user simulation...');

    // 1. Sign in as the pharmacist
    const { data: { session }, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
        email: 'pharmacist_i18n@example.com',
        password: 'password123'
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }

    console.log('✅ Logged in as:', session.user.id);

    // 2. Create a client context for this user using the ANON key and the user's access token
    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    });

    // 3. Try to fetch own profile
    console.log('🔄 Fetching own profile...');
    const { data: profile, error: profileError } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error('❌ Fetch Profile Failed:', profileError);
    } else {
        console.log('✅ Fetch Profile Success:', profile.role);
        console.log('🎉 Infinite recursion issue resolved if you see this!');
    }
}

verifyFix();

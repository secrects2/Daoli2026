const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccess() {
    console.log('--- Testing Pharmacist Access ---');

    // 1. Sign In
    console.log('1. Signing in...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'pharmacist@daoli.com',
        password: 'password123'
    });

    if (loginError) {
        console.error('Login Failed:', loginError.message);
        return;
    }
    console.log('Login Success. User ID:', session.user.id);

    // 2. Fetch Own Profile (to get store_id)
    console.log('2. Fetching own profile...');
    const startProfile = Date.now();
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, store_id')
        .eq('id', session.user.id)
        .single();
    console.log(`Fetch Profile took ${Date.now() - startProfile}ms`);

    if (profileError) {
        console.error('Fetch Profile Failed:', profileError);
        // This confirms RLS recursion if it hangs or errors with 'infinite recursion'
    } else {
        console.log('Profile:', profile);
    }

    // 3. Fetch Elders
    if (profile) {
        console.log('3. Fetching elders...');
        const startElders = Date.now();
        const { data: elders, error: eldersError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'elder')
            .eq('store_id', profile.store_id); // As per page.tsx logic
        console.log(`Fetch Elders took ${Date.now() - startElders}ms`);

        if (eldersError) {
            console.error('Fetch Elders Failed:', eldersError);
        } else {
            console.log(`Found ${elders?.length || 0} elders.`);
        }
    }
}

testAccess();

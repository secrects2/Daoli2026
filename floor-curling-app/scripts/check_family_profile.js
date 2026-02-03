
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfile() {
    const email = 'family_bound@daoli.com';
    console.log(`🔍 Inspecting profile for: ${email}`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('❌ User not found in Auth!');
        return;
    }
    console.log(`✅ User Auth ID: ${user.id}`);

    // 2. Get Profile (Service Role - Bypass RLS)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
    } else {
        console.log('✅ Profile Data (Service Role):', profile);
        if (profile.linked_elder_id) {
            console.log(`   🔗 Linked Elder ID: ${profile.linked_elder_id}`);
            // Check elder existence
            const { data: elder } = await supabase.from('profiles').select('full_name').eq('id', profile.linked_elder_id).single();
            console.log(`   👴 Elder Name: ${elder?.full_name}`);
        } else {
            console.error('   ❌ linked_elder_id is NULL!');
        }
    }
}

checkProfile();

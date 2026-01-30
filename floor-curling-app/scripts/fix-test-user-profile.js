const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixProfile() {
    console.log('🔧 Fixing test user profile...');
    const userId = '143090c9-b95e-4591-aa16-f4c2d1d92300';

    // Check if profile exists
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (!profile) {
        console.log('➕ Inserting profile...');
        const { error } = await supabase.from('profiles').insert({
            id: userId,
            role: 'pharmacist',
            store_id: 'STORE_001'
            // No email here
        });
        if (error) console.error('❌ Insert failed:', error);
        else console.log('✅ Profile inserted');
    } else {
        console.log('🔄 Updating profile...');
        const { error } = await supabase.from('profiles').update({
            role: 'pharmacist',
            store_id: 'STORE_001'
        }).eq('id', userId);
        if (error) console.error('❌ Update failed:', error);
        else console.log('✅ Profile updated');
    }
}

fixProfile();

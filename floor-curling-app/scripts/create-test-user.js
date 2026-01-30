const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTestUser() {
    console.log('👤 Creating test user...');

    const email = 'pharmacist_i18n@example.com';
    const password = 'password123';

    // 1. Create User
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (createError) {
        console.log('⚠️ User creation failed (might already exist):', createError.message);
        // If exists, try to get ID? Or just skip.
    } else {
        console.log('✅ User created:', user.user.id);
    }

    // Get the user ID (either from creation or by query)
    let userId;
    if (user && user.user) {
        userId = user.user.id;
    } else {
        // Find existing
        const { data: existingUser } = await supabase
            .from('profiles') // Hacky way to find ID if we can't search auth.users easily without listUsers
            .select('id')
            .eq('email', email) // If email is in profiles? Usually not.
            // Actually admin.listUsers is better
            .single();

        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        const match = users.find(u => u.email === email);
        if (match) userId = match.id;
    }

    if (!userId) {
        console.error('❌ Could not find user ID');
        return;
    }

    // 2. Update Profile Role
    console.log('🔄 Updating profile for:', userId);

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) {
        // Create profile if missing (trigger might have failed or not fired)
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                role: 'pharmacist',
                store_id: 'STORE_001',
                email: email
            });

        if (insertError) console.error('❌ Profile creation failed:', insertError);
        else console.log('✅ Profile created manually');
    } else {
        // Update existing
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                role: 'pharmacist',
                store_id: 'STORE_001'
            })
            .eq('id', userId);

        if (updateError) console.error('❌ Profile update failed:', updateError);
        else console.log('✅ Profile updated to pharmacist');
    }

    // 3. Ensure Wallet exists
    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!wallet) {
        await supabase.from('wallets').insert({
            user_id: userId,
            local_points: 1000,
            global_points: 500
        });
        console.log('✅ Wallet created');
    }
}

createTestUser();


const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase Environment Variables!');
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
    console.log('🌱 Creating Test Users for Quick Login...');

    const users = [
        { email: 'admin@daoli.com', password: 'daoli_admin_2026', role: 'admin', name: '系統管理員' },
        { email: 'pharmacist@daoli.com', password: 'password123', role: 'pharmacist', name: '新北板橋店' },
        { email: 'family@daoli.com', password: 'password123', role: 'family', name: '王小明家屬' },
        { email: 'elder@daoli.com', password: 'password123', role: 'elder', name: '王大明爺爺' }
    ];

    for (const u of users) {
        console.log(`Processing ${u.email}...`);

        // 1. Check if user exists (by email) - listUsers doesn't allow filtering by email directly efficiently without paginating, 
        // but createUser sends confirmation if duplicate. Easier to just try creating/updating.
        // Actually, let's try to get by email directly via admin api? No, listUsers with filter.

        // Easier: Try to Create. If error says distinct_id already exists, we find the ID and update.
        // Or delete and recreate to be sure of password? 
        // Let's delete and recreate to ensure password matches what's in the Quick Login button.

        // Find user first
        const { data: { users: foundUsers } } = await supabase.auth.admin.listUsers();
        const existingUser = foundUsers.find(user => user.email === u.email);

        let userId;

        if (existingUser) {
            console.log(`   User exists (${existingUser.id}). Updating password...`);
            const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { password: u.password, user_metadata: { full_name: u.name } }
            );
            if (updateError) {
                console.error(`   ❌ Failed to update user: ${updateError.message}`);
                continue;
            }
            userId = existingUser.id;
        } else {
            console.log(`   Creating new user...`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: { full_name: u.name }
            });
            if (createError) {
                console.error(`   ❌ Failed to create user: ${createError.message}`);
                continue;
            }
            userId = newUser.user.id;
        }

        // 2. Upsert Profile
        console.log(`   Updating profile role to '${u.role}'...`);
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            role: u.role,
            full_name: u.name,
            email: u.email,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
        });

        if (profileError) {
            console.error(`   ❌ Failed to update profile: ${profileError.message}`);
        } else {
            console.log(`   ✅ Success!`);
        }

        // 3. For Elder, ensure Wallet
        if (u.role === 'elder') {
            const { error: walletError } = await supabase.from('wallets').insert({
                user_id: userId,
                global_points: 1000,
                local_points: 0
            }).select(); // insert if not exists? Wallets usually 1:1. 
            // Better to upsert or ignore conflict?
            // Since 'wallets' doesn't have simple unique constraint on user_id shown here (it should), let's assume it does or check first.
            // Actually let's just ignore error if it exists.
        }
    }

    console.log('🎉 All test users processed.');
}

createTestUsers();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    const email = 'admin@daoli.com';
    const password = 'daoli_admin_2026';

    console.log(`🔨 Creating/Updating Admin User: ${email}...`);

    let userId;

    // 1. Try to create user
    const { data: createUserData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: 'System Admin',
        }
    });

    if (createError) {
        if (createError.message.includes('already registered') || createError.status === 422) {
            console.log('⚠️ User already exists. Finding user...');
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) {
                console.error('❌ Failed to list users:', listError);
                return;
            }
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                userId = existingUser.id;
                console.log(`✅ Found existing user ID: ${userId}`);

                // Optionally update password if needed, but for now assuming it's fine or user knows it.
                // Let's update the password to be sure.
                const { error: updatePwError } = await supabase.auth.admin.updateUserById(
                    userId,
                    { password: password }
                );
                if (updatePwError) console.error('⚠️ Could not reset password:', updatePwError);
                else console.log('✅ Password reset to default.');

            } else {
                console.error('❌ Could not find the user even though create failed.');
                return;
            }
        } else {
            console.error('❌ Error creating user:', createError);
            return;
        }
    } else {
        userId = createUserData.user.id;
        console.log(`✅ User created. ID: ${userId}`);
    }

    // 2. Promote to Admin in profiles table
    console.log('👑 Promoting to Admin Role...');

    // Give the database a split second in case of triggers (though we are using await)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            role: 'admin',
            full_name: 'System Admin',
            updated_at: new Date().toISOString()
        });

    if (updateError) {
        console.error('❌ Error updating profile:', updateError);
    } else {
        console.log('🎉 Success! Admin account ready.');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
    }
}

createAdmin();

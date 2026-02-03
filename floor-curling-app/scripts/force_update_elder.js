
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceUpdateElder() {
    const email = 'elder@daoli.com';
    const password = 'password123';

    console.log(`🔨 Force Updating Password for ${email}...`);

    // 1. Find User
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('❌ User not found (unexpected).');
        return;
    }

    console.log(`   User ID: ${user.id}`);

    // 2. Update Password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: password }
    );

    if (updateError) {
        console.error('❌ Update failed:', updateError);
        return;
    }
    console.log('✅ Password Updated.');

    // 3. Verify Login Immediately
    console.log('🔐 Verifying login...');
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) console.error('❌ Verification failed:', loginError.message);
    else console.log('✅ Verification SUCCESS!');
}

forceUpdateElder();

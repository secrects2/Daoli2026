
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recreateElder() {
    const email = 'elder@daoli.com';
    const password = 'password123';

    console.log(`🔥 Scorched Earth: Recreation of ${email}`);

    // 1. Find User
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`🗑️ Deleting existing user (${user.id})...`);
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
            console.error('❌ Delete failed:', delError);
            return;
        }
        console.log('✅ User deleted.');
    } else {
        console.log('ℹ️ User does not exist, proceeding to create.');
    }

    // 2. Create User
    console.log(`✨ Creating user with password '${password}'...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: '王大明爺爺' }
    });

    if (createError) {
        console.error('❌ Creation failed:', createError);
        return;
    }

    const newUserId = newUser.user.id;
    console.log(`✅ User created! ID: ${newUserId}`);

    // 3. Restore Profile & Store Link (Taipei)
    // Need Store ID for '台北總店'
    const { data: store } = await supabase.from('stores').select('id').eq('name', '台北總店').single();

    // Note: If store not found, we might default to null, but let's try to get it.

    const { error: profileError } = await supabase.from('profiles').upsert({
        id: newUserId,
        email: email,
        role: 'elder',
        full_name: '王大明爺爺',
        store_id: store?.id || null
    });

    if (profileError) console.error('❌ Profile/Store link failed:', profileError);
    else console.log('✅ Profile restored and linked to Taipei Store.');

    // 4. Test Login Immediately
    console.log('🔐 Verifying login...');
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) console.error('❌ Immediate verification failed:', loginError.message);
    else console.log('✅ Immediate verification SUCCESS!');
}

recreateElder();

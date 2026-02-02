
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupUsers() {
    console.log('🔄 Setting up Users...');

    // 1. Get Taipei Store ID
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('name', '台北總店')
        .single();

    if (storeError || !store) {
        console.error('❌ Taipei Store not found!', storeError);
        // Fallback: Create it? No, assume seed data. Or search by roughly name.
        return;
    }
    console.log(`✅ Default Store: 台北總店 (${store.id})`);

    // 2. Setup Elder (elder@daoli.com)
    // Ensure auth user exists (handled by previous script, but double check role/store)
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const elderUser = users.find(u => u.email === 'elder@daoli.com');

    if (!elderUser) {
        console.error('❌ elder@daoli.com not found. Run create_test_users.js first.');
        return;
    }

    // Update Elder Profile
    const { error: elderProfileError } = await supabase.from('profiles').update({
        role: 'elder',
        store_id: store.id,
        full_name: '王大明爺爺',
        nickname: '大明'
    }).eq('id', elderUser.id);

    if (elderProfileError) console.error('❌ Failed to update elder profile:', elderProfileError);
    else console.log(`✅ Elder '王大明爺爺' linked to Taipei Store.`);

    // 3. Setup Bound Family (family_bound@daoli.com)
    const familyEmail = 'family_bound@daoli.com';
    let familyUser = users.find(u => u.email === familyEmail);

    if (!familyUser) {
        console.log(`Creating ${familyEmail}...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: familyEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: '王小明 (已綁定)' }
        });
        if (createError) {
            console.error('❌ Failed to create family user:', createError);
            return;
        }
        familyUser = newUser.user;
    } else {
        // Reset password just in case
        await supabase.auth.admin.updateUserById(familyUser.id, { password: 'password123' });
    }

    // Update Family Profile - Link to Elder
    const { error: familyProfileError } = await supabase.from('profiles').upsert({
        id: familyUser.id,
        role: 'family',
        full_name: '王小明 (已綁定)',
        linked_elder_id: elderUser.id,
        email: familyEmail
    });

    if (familyProfileError) console.error('❌ Failed to update family profile:', familyProfileError);
    else console.log(`✅ Family '王小明' linked to '王大明爺爺'.`);

    console.log('🎉 Setup Complete.');
    console.log(`Elder Name: 王大明爺爺`);
}

setupUsers();

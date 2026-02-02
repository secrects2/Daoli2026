
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOneUser(email, password, role, name) {
    console.log(`Checking user: ${email}...`);
    let userId;

    // Try to create first
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: name }
    });

    if (createError) {
        if (createError.message.includes('already been registered')) {
            // User exists, find ID
            // Note: listUsers() is the only way in admin api to search by email without raw SQL
            const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const found = users.find(u => u.email === email);
            if (found) {
                userId = found.id;
                console.log(`✅ User exists: ${email} (${userId})`);
                // Ensure password
                await supabase.auth.admin.updateUserById(userId, { password: password });
            } else {
                console.error(`❌ User said to exist but not found in list: ${email}`);
                return null;
            }
        } else {
            console.error(`❌ Failed to create ${email}:`, createError);
            return null;
        }
    } else {
        userId = createData.user.id;
        console.log(`✅ User created: ${email} (${userId})`);
    }

    // Ensure Profile
    if (userId) {
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            email: email,
            role: role,
            full_name: name,
        }); // This resets profile data, which is fine for test users

        if (profileError) console.error(`❌ Profile Error for ${email}:`, profileError);
        else console.log(`✅ Profile ensured for ${email}`);
    }

    return userId;
}

async function run() {
    console.log('🔄 Starting comprehensive user fix...');

    // 1. Ensure Elder
    const elderId = await fixOneUser('elder@daoli.com', '123456', 'elder', '王大明爺爺');
    if (!elderId) {
        console.error('❌ Could not get Elder ID. Aborting.');
        return;
    }

    // 2. Ensure Family
    const familyId = await fixOneUser('family_bound@daoli.com', 'password123', 'family', '王小明 (已綁定)');
    if (!familyId) {
        console.error('❌ Could not get Family ID. Aborting.');
        return;
    }

    // 3. Link Family to Elder
    console.log(`🔗 Linking family (${familyId}) to elder (${elderId})...`);
    const { error: linkError } = await supabase
        .from('profiles')
        .update({ linked_elder_id: elderId })
        .eq('id', familyId);

    if (linkError) console.error('❌ Link failed:', linkError);
    else console.log('✅ Link successful! Family member is now bound.');
}

run();

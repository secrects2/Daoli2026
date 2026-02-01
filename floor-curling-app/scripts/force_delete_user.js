const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceDeleteUser(email) {
    console.log(`\n🗑️  Attempting to force delete user: ${email}`);

    // 1. Find User ID in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === email);
    let userId = user?.id;

    if (userId) {
        console.log(`✅ Found Auth User ID: ${userId}`);

        // 2. Delete from Auth (Should cascade to public.profiles if set up correctly)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
        if (deleteError) {
            console.error('❌ Error deleting from Auth:', deleteError.message);
        } else {
            console.log('✅ Deleted from auth.users');
        }
    } else {
        console.log('⚠️  User not found in auth.users (User might have manually deleted it)');

        // If not in auth, we try to find in profiles by some other means or just checking orphaned profiles
        // Since profiles usually relies on auth.id, we can't search by email in profiles unless we stored it there?
        // Wait, profiles table usually doesn't have email in this schema schema? 
        // Let's check if we can match any other way.
        // Actually, if auth is gone, we can't easily find the ID unless we query profiles directly, 
        // but profiles likely doesn't have email column.
        // Let's check profiles for any rows that might be "orphaned" if possible, but hard without ID.

        // User said they deleted profile too.
    }

    // 3. Force check public tables if we have an ID (or if we can find it)
    // If we found userId above, we can explicitly clean up just in case cascade failed
    if (userId) {
        await cleanPublicTables(userId);
    } else {
        console.log('❓ Since ID is unknown, checking if any profile exists with that email (if email is stored in profiles)...');
        // Check if profiles table has email column?
        // Based on previous contexts, profiles has: id, full_name, avatar_url, role, line_user_id. NO EMAIL.
        // So if auth user is deleted, we can't find the profile by email.

        console.log('ℹ️  Cannot verify public tables without User ID (Profile does not store email).');
        console.log('   If the web page still shows it, it is likely CLIENT-SIDE CACHE or COOKIES.');
    }
}

async function cleanPublicTables(userId) {
    const tables = ['profiles', 'wallets', 'user_interactions'];
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq(table === 'user_interactions' ? 'user_id' : 'id', userId); // user_interactions probably uses user_id
        if (error) console.log(`   Error cleaning ${table}: ${error.message}`);
        else console.log(`   Ensured ${table} cleanup for ${userId}`);
    }
}

forceDeleteUser('secrects2@gmail.com');

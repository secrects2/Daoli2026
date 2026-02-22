require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updateAuthUsers() {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const elder = users.find(u => u.email === 'elder@daoli.com');
    if (elder) {
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(elder.id, {
            user_metadata: { ...elder.user_metadata, full_name: '林萬海', nickname: '林萬海' }
        });
        if (updErr) console.error('Error elder:', updErr);
        else console.log('Successfully updated elder user_metadata to: 林萬海');
    }

    const family = users.find(u => u.email === 'family_bound@daoli.com');
    if (family) {
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(family.id, {
            user_metadata: { ...family.user_metadata, full_name: '林萬海的家屬', nickname: '林萬海的家屬' }
        });
        if (updErr) console.error('Error family:', updErr);
        else console.log('Successfully updated family_bound user_metadata to: 林萬海的家屬');
    }
}

updateAuthUsers();

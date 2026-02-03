
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixElderPassword() {
    const email = 'elder@daoli.com';
    const password = 'password123'; // Matched with login-form.tsx

    console.log(`🔧 Fixing password for: ${email}`);

    // Find user
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('❌ Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log(`✅ User found (${user.id}). Updating password...`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) console.error('❌ Update failed:', updateError);
        else console.log('✅ Password updated successfully to: ' + password);
    } else {
        console.error('❌ Elder user not found! Please run the previous fix script first.');
    }
}

fixElderPassword();

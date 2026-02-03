
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use Anon key for login like frontend
);

async function testLogin() {
    console.log(`🌍 Checking Project: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    const email = 'elder@daoli.com';
    const password = 'password123';

    console.log(`🔐 Attempting login for ${email} with password '${password}'...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('❌ Login FAILED:', error.message);
    } else {
        console.log('✅ Login SUCCESS!');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);
    }
}

testLogin();

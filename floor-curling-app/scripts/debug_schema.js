const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
    console.log('Debugging Stores Schema...');
    // Try insert with minimal fields to provoke error
    const { data, error } = await supabase.from('stores').insert({
        name: 'Debug Store ' + Date.now(),
        status: 'active'
    }).select();

    if (error) {
        console.error('❌ Insert Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Insert Success:', data);
    }
}

debug();

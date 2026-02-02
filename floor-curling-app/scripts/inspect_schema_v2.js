
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
    console.log('--- Stores ---');
    const { data: stores } = await supabase.from('stores').select('id, name').limit(5);
    console.log(stores);

    console.log('\n--- Profiles Columns ---');
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(1);
    if (profiles && profiles.length > 0) {
        console.log(Object.keys(profiles[0]));
    } else {
        console.log('No profiles found or error:', error);
    }
}

inspect();

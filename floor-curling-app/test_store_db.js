require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: store, error } = await supabase.from('stores')
        .select('id, name, address, phone, contact_name')
        .eq('id', 'TPE-XINYI')
        .single();
    console.log('Error:', error);
}
run();

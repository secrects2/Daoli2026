const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugMatches() {
    console.log('🔍 Debugging Matches Table...');

    // 1. Get a store and an elder
    const { data: store } = await supabase.from('stores').select('id').limit(1).single();
    const { data: elder } = await supabase.from('profiles').select('id').eq('role', 'elder').limit(1).single();

    if (!store || !elder) {
        console.error('❌ Missing prerequisite data (store or elder).');
        return;
    }

    console.log(`Using Store: ${store.id}, Elder: ${elder.id}`);

    // 2. Try simple insert matches WITHOUT is_public
    const matchData = {
        store_id: store.id,
        red_team_elder_id: elder.id,
        yellow_team_elder_id: elder.id,
        winner_color: 'red',
        status: 'completed',
        // is_public: true, // REMOVED known missing column
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString() // Testing this one next
    };

    const { data, error } = await supabase.from('matches').insert(matchData).select();

    if (error) {
        console.error('❌ Match Insert Error:', JSON.stringify(error, null, 2));

        // Try inspection if insert fails
        if (error.code === '42703') { // Undefined column
            console.log('Possible missing columns. Checking schema...');
            // We can't easily check schema without pg, but error message usually tells which column.
        }
    } else {
        console.log('✅ Match Insert Success:', data);
    }
}

debugMatches();

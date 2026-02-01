require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMatchData() {
    console.log('--- Fixing Match Data to link with Real Elders ---');

    // 1. Get Real Elders
    const { data: elders, error: elderError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'elder')
        .limit(50);

    if (elderError || !elders || elders.length < 2) {
        console.error('Not enough elders found to link data. Create elders first.');
        return;
    }
    console.log(`Found ${elders.length} elders:`, elders.map(e => e.full_name).join(', '));

    // 2. Get Real Stores
    const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .limit(5);

    if (storeError) console.error('Store error', storeError);
    const validStoreId = stores?.[0]?.id;
    console.log('Using Store:', stores?.[0]?.name);

    // 3. Update Matches
    // We will update ALL completed matches to randomly use these elders
    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'completed');

    if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return;
    }

    console.log(`Updating ${matches.length} matches...`);

    for (const match of matches) {
        // Pick random elders
        const redParams = elders[Math.floor(Math.random() * elders.length)];
        let yellowParams = elders[Math.floor(Math.random() * elders.length)];
        while (yellowParams.id === redParams.id) {
            yellowParams = elders[Math.floor(Math.random() * elders.length)];
        }

        // 50% chance red wins, 50% yellow
        const winner = Math.random() > 0.5 ? 'red' : 'yellow';

        await supabase
            .from('matches')
            .update({
                store_id: validStoreId,
                red_team_elder_id: redParams.id,
                yellow_team_elder_id: yellowParams.id,
                winner_color: winner
            })
            .eq('id', match.id);

        process.stdout.write('.');
    }

    console.log('\n✅ Matches updated successfully!');
}

fixMatchData();

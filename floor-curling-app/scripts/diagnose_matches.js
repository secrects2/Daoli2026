require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- Diagnosing Matches Table ---');

    // 1. Check Total Count
    const { count, error: countError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error('Count Error:', countError);
    console.log(`Total Matches in DB: ${count}`);

    // 2. Check Completed Matches (What the API queries)
    const { data: completed, error: completedError } = await supabase
        .from('matches')
        .select(`
        id, 
        created_at, 
        completed_at,
        status,
        winner_color
    `)
        .eq('status', 'completed')
        .limit(5);

    if (completedError) console.error('Abnormal Error:', completedError);

    console.log(`Completed Matches Sample (${completed?.length || 0}):`);
    if (completed && completed.length > 0) {
        completed.forEach(m => {
            console.log(`- ID: ${m.id}`);
            console.log(`  Created: ${m.created_at}`);
            console.log(`  Completed: ${m.completed_at}`);
            console.log(`  Status: ${m.status}`);
        });
    } else {
        console.log('No completed matches found!');
    }

    // 3. Test Complex API Query (The one likely failing)
    console.log('--- Testing Complex Join ---');
    const { data: complexData, error: complexError } = await supabase
        .from('matches')
        .select(`
            id, 
            status,
            store:stores(name),
            red_elder:profiles!red_team_elder_id(full_name),
            yellow_elder:profiles!yellow_team_elder_id(full_name)
        `)
        .eq('status', 'completed')
        .limit(5);

    if (complexError) {
        console.error('❌ Complex Query Failed:', complexError);
    } else {
        console.log('✅ Complex Query Success!');
        console.log('Sample Row:', JSON.stringify(complexData[0], null, 2));
    }
}

diagnose();

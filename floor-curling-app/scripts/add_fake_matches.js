require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addFakeMatches() {
    const TARGET_ID = '93c08e56-c71f-418d-8fb2-48885e00ff9a'; // 林萬海
    const STORE_ID = 'TPE-XINYI';

    console.log('Adding fake matches for:', TARGET_ID);

    // Get current date
    const now = new Date();

    // Create 3 fake matches for this week
    for (let i = 0; i < 3; i++) {
        // Offset by i days to spread them out in the past week
        const matchDate = new Date(now);
        matchDate.setDate(now.getDate() - i - 1);

        const match = {
            store_id: STORE_ID,
            status: 'completed',
            red_team_elder_id: TARGET_ID,
            // 隨便塞一個隊友ID或 NULL
            yellow_team_elder_id: '0087db21-042c-4509-a58b-7ed83f62c717',
            winner_color: i % 2 === 0 ? 'red' : 'yellow',
            red_total_score: i % 2 === 0 ? 5 : 2,
            yellow_total_score: i % 2 === 0 ? 2 : 5,
            created_at: matchDate.toISOString(),
            updated_at: matchDate.toISOString()
        };

        const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert([match])
            .select()
            .single();

        if (matchError) {
            console.error('Error inserting match:', matchError);
            continue;
        }

        console.log(`Created match ${matchData.id} on ${matchData.created_at}`);

        // Insert fake ends
        const ends = [];
        for (let endNum = 1; endNum <= 4; endNum++) {
            ends.push({
                match_id: matchData.id,
                end_number: endNum,
                red_score: i % 2 === 0 ? (endNum === 4 ? 2 : 1) : (endNum === 1 ? 2 : 0),
                yellow_score: i % 2 === 0 ? (endNum === 2 ? 2 : 0) : (endNum === 4 ? 3 : 1),
                created_at: matchDate.toISOString()
            });
        }

        const { error: endsError } = await supabase.from('match_ends').insert(ends);
        if (endsError) console.error('Error inserting ends:', endsError);
    }

    console.log('Fake matches creation done.');
}

addFakeMatches();

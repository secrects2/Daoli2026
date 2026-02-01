require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bindFamilyToTaipeiElder() {
    console.log('--- Binding Family to Taipei Elder (Debug Mode) ---');

    // 1. Find the Taipei Store
    console.log('Searching for Taipei store...');
    const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .ilike('name', '%台北%')
        .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple found or 0

    if (storeError) console.error('Store Query Error:', storeError);

    let storeId = stores?.id;
    if (!storeId) {
        console.log('Taipei store not found, fetching ANY store...');
        const { data: anyStore } = await supabase.from('stores').select('id, name').limit(1).single();
        storeId = anyStore?.id;
        console.log(`Fallback Store: ${anyStore?.name}`);
    } else {
        console.log(`Target Store: ${stores?.name} (${storeId})`);
    }

    if (!storeId) {
        console.error('CRITICAL: No stores found in database.');
        return;
    }

    // 2. Find an Elder
    console.log('Searching for an Elder...');
    const { data: elder, error: elderError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'elder')
        .limit(1)
        .maybeSingle();

    if (elderError) console.error('Elder Query Error:', elderError);

    if (!elder) {
        console.error('CRITICAL: No elder profile found!');
        // Check if ANY profiles exist to debug
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        console.log(`Total profiles in DB: ${count}`);
        return;
    }
    console.log(`Selected Elder: ${elder.full_name || 'Unnamed'} (${elder.id})`);

    // Update Elder to be in the Store
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ store_id: storeId })
        .eq('id', elder.id);

    if (updateError) console.error('Failed to update elder store:', updateError);
    else console.log(`Updated Elder store_id to ${storeId}`);

    // 3. Find a Family User
    console.log('Searching for Family Candidates...');
    // Simplest query possible to debug
    // Removing 'email' in case it doesn't exist in profiles table
    const { data: allProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .limit(50);

    if (profileError) {
        console.error('Profile Fetch Error:', JSON.stringify(profileError, null, 2));
        return;
    }

    // Filter in JS to strictly avoid the elder and admins
    const families = allProfiles?.filter(p => p.id !== elder.id && p.role !== 'elder' && p.role !== 'admin') || [];

    if (families.length === 0) {
        console.error('No suitable family users found (non-elder, non-admin).');
        console.log('Dumping first 5 profiles found for inspection:');
        console.log(allProfiles?.slice(0, 5));
        return;
    }

    console.log(`Found ${families.length} potential family users. Binding first one: ${families[0].email} (${families[0].id})`);

    // Bind the first family user found
    const familyUser = families[0];

    // Update both potential binding columns
    const { error: bindError1 } = await supabase.from('profiles').update({ linked_elder_id: elder.id }).eq('id', familyUser.id);
    const { error: bindError2 } = await supabase.from('profiles').update({ linked_family_id: elder.id }).eq('id', familyUser.id);

    if (bindError1 && bindError2) console.error('Binding Error:', bindError1, bindError2);
    else console.log(`Successfully bound User ${familyUser.id} to Elder ${elder.id}`);

    // 4. Ensure Matches Exist
    console.log('Checking matches...');
    const { count: matchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`red_team_elder_id.eq.${elder.id},yellow_team_elder_id.eq.${elder.id}`);

    console.log(`Elder has ${matchCount} matches.`);

    if (matchCount === 0) {
        console.log('Creating fake matches for this elder...');
        const { error: insertError } = await supabase.from('matches').insert([
            {
                store_id: storeId,
                red_team_elder_id: elder.id,
                yellow_team_elder_id: families.length > 1 ? families[1].id : familyUser.id, // Use another user as dummy opponent if possible
                status: 'completed',
                winner_color: 'red',
                created_at: new Date().toISOString()
            },
            {
                store_id: storeId,
                red_team_elder_id: elder.id,
                yellow_team_elder_id: families.length > 1 ? families[1].id : familyUser.id,
                status: 'completed',
                winner_color: 'yellow',
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ]);
        if (insertError) console.error('Match Insert Error:', insertError);
        else console.log('Created 2 dummy matches.');
    }
}

bindFamilyToTaipeiElder();

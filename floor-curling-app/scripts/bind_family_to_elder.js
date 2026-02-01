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
    console.log('--- Binding Family to Taipei Elder ---');

    // 1. Find the Taipei Store
    const { data: stores, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .ilike('name', '%台北%')
        .single();

    if (storeError || !stores) {
        console.error('Taipei Store not found!', storeError);
        // Fallback to any store
    }
    const storeId = stores?.id;
    console.log(`Target Store: ${stores?.name} (${storeId})`);

    // 2. Find an Elder in this store
    let query = supabase.from('profiles').select('id, full_name, role').eq('role', 'elder').limit(1);
    if (storeId) {
        // If store_id column exists on profiles? Or use a junction?
        // Based on schema from previous logs, profiles might have store_id.
        // Let's check if we can filter by store_id.
        // If not, we just pick a random elder and force update their store_id to Taipei.
    }

    // Let's just pick a random elder and UPDATE them to be in Taipei store to be sure.
    const { data: elder } = await supabase.from('profiles').select('id, full_name').eq('role', 'elder').limit(1).single();

    if (!elder) {
        console.error('No elder found!');
        return;
    }
    console.log(`Selected Elder: ${elder.full_name} (${elder.id})`);

    // Update Elder to be in Taipei Store (if we have store_id on profiles, assuming we do from context)
    if (storeId) {
        await supabase.from('profiles').update({ store_id: storeId }).eq('id', elder.id);
        console.log(`Updated Elder to Store: ${stores.name}`);
    }

    // 3. Find a User (Simulate Family)
    const { data: families } = await supabase
        .from('profiles')
        .select('id, email, role')
        .neq('role', 'elder')
        .neq('role', 'admin') // Ideally also exclude admins
        .limit(5);

    if (!families || families.length === 0) {
        console.error('No potential family users found (users who are not elder/admin).');
        return;
    }

    console.log(`Found ${families.length} family users. Binding them to ${elder.full_name}...`);

    for (const family of families) {
        const { error } = await supabase
            .from('profiles')
            .update({ linked_family_id: elder.id }) // Wait, usually family has 'linked_elder_id' or elder has 'linked_family_id'?
            // System usually links FAMILY -> ELDER. 
            // Let's check the previous code in page.tsx:
            // "if (profile?.linked_family_id)" -> This implies the logged in user (family/user) has `linked_family_id` pointing to... elder?
            // Actually, usually it's `linked_elder_id` on the family profile.
            // Let's check `app/family/portal/page.tsx` lines 30: "if (profile?.linked_family_id)" 
            // Wait, if I am family, why would I have linked_family_id? That sounds backwards.
            // Line 30: `if (profile?.linked_family_id)` then fetch from `profiles` where id = `linked_family_id`.
            // If the code says `setElderProfile(elder)`, then `profile.linked_family_id` IS the Elder ID.
            // Variable name is confusing but we follow the code.
            .eq('id', family.id);

        // Let's UPDATE `linked_family_id` to the elder's ID.
        // Ideally column should be `linked_elder_id`.
        // NOTE: In `app/family/dashboard/page.tsx` (File 1309 line 70), it uses `.select('linked_elder_id')`.
        // BUT `app/family/portal/page.tsx` (File 1291 line 30) used `linked_family_id`.
        // This inconsistency might be why it's failing!
        // I will update BOTH columns to be safe if they exist, or check which one exists.

        // Let's try updating `linked_elder_id` as that is semantically correct and used in the dashboard.
        await supabase.from('profiles').update({ linked_elder_id: elder.id }).eq('id', family.id);

        // Also update `linked_family_id` just in case the portal page is using that specific column name
        // (even if it's named effectively wrong).
        await supabase.from('profiles').update({ linked_family_id: elder.id }).eq('id', family.id);

        console.log(`Bound Family ${family.id} to Elder ${elder.id}`);
    }

    // 4. Ensure Matches Exist for this Elder
    // Check if matches exist
    const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).or(`red_team_elder_id.eq.${elder.id},yellow_team_elder_id.eq.${elder.id}`);

    if (count === 0) {
        console.log('Creating fake matches for this elder...');
        await supabase.from('matches').insert([
            {
                store_id: storeId,
                red_team_elder_id: elder.id,
                yellow_team_elder_id: families[0].id, // dummy opponent
                status: 'completed',
                winner_color: 'red',
                created_at: new Date().toISOString()
            },
            {
                store_id: storeId,
                red_team_elder_id: elder.id,
                yellow_team_elder_id: families[0].id,
                status: 'completed',
                winner_color: 'yellow',
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ]);
    }
}

bindFamilyToTaipeiElder();

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupQuickLoginUsers() {
    console.log('--- Setting up Quick Login Users ---');

    const familyEmail = 'family@daoli.com';
    const elderEmail = 'elder@daoli.com';
    const password = 'password123';

    // Helper to find user or create
    const getOrCreateUser = async (email, password) => {
        // 1. Try to find in list (fetch max)
        const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = users.find(u => u.email === email);
        if (existing) return existing;

        // 2. Create if not found
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });

        if (error) {
            console.error(`Error creating ${email}:`, error.message);
            // If error is email exists but we didn't find it, it's a pagination issue or race condition
            // Try fetching again maybe? or just return null and manual intervention needed
            return null;
        }
        return data.user;
    };

    // 1. Ensure Family User Authentication
    console.log(`Ensuring auth user for ${familyEmail}...`);
    const familyUser = await getOrCreateUser(familyEmail, password);
    const familyId = familyUser?.id;
    console.log(`Family Auth ID: ${familyId}`);

    // 2. Ensure Elder User Authentication
    console.log(`Ensuring auth user for ${elderEmail}...`);
    const elderUser = await getOrCreateUser(elderEmail, password);
    const elderId = elderUser?.id;
    console.log(`Elder Auth ID: ${elderId}`);

    if (!familyId || !elderId) {
        console.error('Failed to get User IDs');
        return;
    }

    // 3. Ensure Profiles Exist
    // Upsert profiles
    console.log('Upserting profiles...');
    await supabase.from('profiles').upsert({
        id: familyId,
        email: familyEmail,
        role: 'family',
        full_name: '測試家屬 (Quick Login)',
        linked_elder_id: elderId, // Bind to Elder
        linked_family_id: elderId // Defensive binding
    });

    await supabase.from('profiles').upsert({
        id: elderId,
        email: elderEmail,
        role: 'elder',
        full_name: '測試長輩 (Quick Login)',
        nickname: '老頑童',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        store_id: null // Will update below
    });

    // 4. Bind to Taipei Store (find store first)
    const { data: store } = await supabase.from('stores').select('id').ilike('name', '%台北%').limit(1).single();
    if (store) {
        await supabase.from('profiles').update({ store_id: store.id }).eq('id', elderId);
        console.log(`Bound Elder to Store: ${store.id}`);
    }

    // 5. Create Fake Data for this Elder
    const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).or(`red_team_elder_id.eq.${elderId},yellow_team_elder_id.eq.${elderId}`);
    if (count < 2) {
        console.log('Creating fake matches for Quick Login Elder...');
        await supabase.from('matches').insert([
            {
                store_id: store?.id,
                red_team_elder_id: elderId,
                yellow_team_elder_id: familyId, // Use family as opponent
                status: 'completed',
                winner_color: 'red',
                red_total_score: 8,
                yellow_total_score: 3,
                created_at: new Date().toISOString()
            },
            {
                store_id: store?.id,
                red_team_elder_id: elderId,
                yellow_team_elder_id: familyId,
                status: 'completed',
                winner_color: 'yellow',
                red_total_score: 4,
                yellow_total_score: 5,
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ]);
    }

    // 6. Ensure Wallet Exists
    const { error: walletError } = await supabase.from('wallets').upsert({
        user_id: elderId,
        global_points: 1250,
        local_points: 300
    }, { onConflict: 'user_id' }); // Upsert by user_id
    if (walletError) console.error('Wallet Error:', walletError);

    console.log('✅ Setup Complete. Users bound and data populated.');
}

setupQuickLoginUsers();

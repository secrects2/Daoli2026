const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

// Explicitly load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase Environment Variables!');
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const LOCATIONS = ['台北總店', '台中分店', '高雄旗艦店', '新竹加盟店', '台南體驗館'];
const EMNAMES = ['阿公', '阿嬤', '伯伯', '阿姨', '奶奶', '爺爺'];
const NAMES = ['王', '李', '陳', '張', '林', '吳', '蔡', '黃', '鄭', '許'];

async function seedData() {
    console.log('🌱 Starting Admin Data Seeding...');

    // 1. Ensure Stores (Locations)
    const stores = [];
    for (const loc of LOCATIONS) {
        const { data: existingStore } = await supabase.from('stores').select('id').eq('name', loc).single();
        let storeId;

        if (!existingStore) {
            // Fix: Generate UUID explicitly since DB default might be missing
            const uuid = crypto.randomUUID();

            // Fix: Removed 'location' column, use 'name' and 'status'
            const { data: newStore, error: insertError } = await supabase.from('stores').insert({
                id: uuid,
                name: loc,
                status: 'active'
            }).select().single();

            if (insertError) {
                console.warn(`⚠️ Failed to create store ${loc} (skipping):`, insertError.message);
                continue;
            }
            if (!newStore) continue;
            storeId = newStore.id;
        } else {
            storeId = existingStore.id;
        }
        stores.push({ id: storeId, name: loc });
    }
    console.log(`✅ Loaded ${stores.length} stores.`);

    // 2. Create Fake Elders
    const elders = [];
    for (let i = 0; i < 20; i++) {
        const lastName = NAMES[Math.floor(Math.random() * NAMES.length)];
        const suffix = EMNAMES[Math.floor(Math.random() * EMNAMES.length)];
        const fullName = `${lastName}${suffix}`;
        const email = `fake_elder_${i}_${Date.now()}@test.com`;

        const { data: user, error } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (user.user) {
            const uid = user.user.id;
            // Update profile
            await supabase.from('profiles').upsert({
                id: uid,
                full_name: fullName,
                role: 'elder',
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`
            });
            // Create wallet
            await supabase.from('wallets').insert({ user_id: uid, global_points: Math.floor(Math.random() * 5000), local_points: 0 });
            elders.push(uid);
        }
    }
    console.log(`✅ Created ${elders.length} new fake elders.`);

    // Also fetch existing elders
    const { data: existingElders } = await supabase.from('profiles').select('id').eq('role', 'elder').limit(50);
    if (existingElders) {
        existingElders.forEach(e => {
            if (!elders.includes(e.id)) elders.push(e.id);
        });
    }

    // 3. Generate History (Matches & Points)
    if (stores.length === 0 || elders.length < 2) {
        console.error('❌ Not enough stores or elders to generate matches.');
        return;
    }

    const now = new Date();
    let matchCount = 0;

    for (let i = 0; i < 60; i++) {
        const elder1 = elders[Math.floor(Math.random() * elders.length)];
        let elder2 = elders[Math.floor(Math.random() * elders.length)];
        while (elder2 === elder1) elder2 = elders[Math.floor(Math.random() * elders.length)];

        const randomStore = stores[Math.floor(Math.random() * stores.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const matchTime = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

        const isWin = Math.random() > 0.5;
        const winnerColor = isWin ? 'red' : 'yellow';
        const points = 100;

        // A. Insert into 'user_interactions'
        await supabase.from('user_interactions').insert({
            user_id: elder1,
            interaction_type: 'match_result',
            data: {
                result: isWin ? 'win' : 'loss',
                opponent: 'Friendly Match',
                store_id: randomStore.id,
                store_name: randomStore.name,
                points_earned: isWin ? points : 10
            },
            created_at: matchTime.toISOString()
        });

        // B. Insert into 'matches'
        const { error: matchError } = await supabase.from('matches').insert({
            store_id: randomStore.id,
            red_team_elder_id: elder1,
            yellow_team_elder_id: elder2,
            winner_color: winnerColor,
            status: 'completed',
            created_at: matchTime.toISOString(),
            completed_at: matchTime.toISOString()
        });

        if (matchError) {
            console.warn('⚠️ Match insert failed:', matchError.message);
        } else {
            matchCount++;
        }

        // C. Point Log
        if (isWin) {
            const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', elder1).single();
            if (wallet) {
                await supabase.from('point_transactions').insert({
                    wallet_id: wallet.id,
                    amount: points,
                    type: 'earned',
                    description: '比賽勝利',
                    created_at: matchTime.toISOString()
                });
            }
        }
    }

    console.log(`✅ Generated ${matchCount} matches in 'matches' table.`);
    console.log('🎉 Seeding Complete!');
}

seedData();

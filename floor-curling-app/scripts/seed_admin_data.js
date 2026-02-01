const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

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
        // Simple check/insert logic (Store creation handled by script logic simplistically)
        // In real app, we check 'stores' table. Let's assume we just use ID strings for matches
        // But better to check or create.
        // Let's see if 'stores' table exists from previous context. Yes, created in CRUD task.
        const { data: existingStore } = await supabase.from('stores').select('id').eq('name', loc).single();
        let storeId;

        if (!existingStore) {
            const { data: newStore } = await supabase.from('stores').insert({
                name: loc,
                location: loc + '市區',
                status: 'active'
            }).select().single();
            storeId = newStore.id;
        } else {
            storeId = existingStore.id;
        }
        stores.push({ id: storeId, name: loc });
    }

    // 2. Create Fake Elders
    const elders = [];
    for (let i = 0; i < 50; i++) {
        const lastName = NAMES[Math.floor(Math.random() * NAMES.length)];
        const suffix = EMNAMES[Math.floor(Math.random() * EMNAMES.length)];
        const fullName = `${lastName}${suffix}`;

        // Ensure user exists in Auth (Fake for stats mainly, but cleaner if exists)
        // To speed up, we might just insert into profiles if no FK constraint blocks it... 
        // usually profiles.id references auth.users.
        // So we must use createUser.

        const email = `fake_elder_${i}_${Date.now()}@test.com`;
        const { data: user, error } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (user.user) {
            const uid = user.user.id;
            // Update profile role
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
    console.log(`✅ Created ${elders.length} fake elders.`);

    // 3. Generate History (Matches & Points)
    // Last 30 days
    const matches = [];
    const pointLogs = [];
    const now = new Date();

    for (let i = 0; i < 300; i++) {
        const randomElder = elders[Math.floor(Math.random() * elders.length)];
        const randomStore = stores[Math.floor(Math.random() * stores.length)];

        // Random time in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const matchTime = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

        // Match Result
        const win = Math.random() > 0.5;
        const points = win ? 100 : 10;

        // Insert Match
        // Assuming table 'matches' or 'user_interactions' (from previous context context seems user_interactions was used or proposed?)
        // Let's check schemas... previous user_interactions had 'interaction_type', 'data'.
        // Or 'matches' table?
        // Let's use 'user_interactions' as defined in setup_interactions.js standard
        // interaction_type: 'match_result'

        const matchData = {
            user_id: randomElder,
            interaction_type: 'match_result',
            data: {
                result: win ? 'win' : 'loss',
                opponent: 'AI', // or random
                store_id: randomStore.id,
                store_name: randomStore.name,
                points_earned: points
            },
            created_at: matchTime.toISOString()
        };

        await supabase.from('user_interactions').insert(matchData);

        // Point Log
        if (points > 0) {
            await supabase.from('point_transactions').insert({
                wallet_id: (await supabase.from('wallets').select('id').eq('user_id', randomElder).single()).data.id,
                amount: points,
                type: 'earned',
                description: win ? '比賽勝利' : '參賽獎勵',
                created_at: matchTime.toISOString()
            });
        }
    }

    console.log(`✅ Generated 300+ historical records.`);
    console.log('🎉 Seeding Complete!');
}

seedData();

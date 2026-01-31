const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log('🌱 Seeding Test Data...');

    // 1. Create or Get Demo Elder
    const elderEmail = 'demo_elder@example.com';
    let elderId;

    // Check if user exists (mocking auth user creation is hard via script without admin API mostly handling it, 
    // but we can check profiles directly if we assume auth user exists or we just create a profile linked to a fake ID if RLS allows, 
    // but better to search for an existing one or just pick the first 'elder' role user)

    // Let's try to find an existing elder first
    const { data: existingElders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'elder')
        .limit(1);

    if (existingElders && existingElders.length > 0) {
        elderId = existingElders[0].id;
        console.log(`✅ Found existing elder: ${existingElders[0].full_name} (${elderId})`);
    } else {
        console.log('⚠️ No existing elder found. Creating Demo Elder...');

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: elderEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: {
                full_name: '道里示範長輩',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            }
        });

        if (createError) {
            console.error('Failed to create demo user:', createError);
            process.exit(1);
        }

        elderId = newUser.user.id;
        console.log(`✅ Created Demo Elder: ${elderId}`);

        // Create Profile manually (if trigger didn't catch it or for safety)
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: elderId,
            full_name: '道里示範長輩',
            role: 'elder',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
        });

        if (profileError) console.error('Profile creation warning:', profileError);
    }

    // 2. Ensure Wallet
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', elderId)
        .single();

    if (!wallet) {
        await supabase.from('wallets').insert({
            user_id: elderId,
            global_points: 500,
            local_points: 100
        });
        console.log('💰 Created Wallet with 500 points');
    } else {
        await supabase.from('wallets').update({ global_points: 888 }).eq('user_id', elderId);
        console.log('💰 Updated Wallet to 888 points');
    }

    // 3. Create Weekly Matches (Activity Log)
    // Insert 5 completed matches in the last 3 days
    const matches = [];
    for (let i = 0; i < 5; i++) {
        matches.push({
            red_team_elder_id: elderId,
            yellow_team_elder_id: '00000000-0000-0000-0000-000000000000', // Dummy opponent
            status: 'completed',
            winner_color: i % 2 === 0 ? 'red' : 'yellow',
            created_at: new Date(Date.now() - i * 86400000).toISOString() // 1 day apart
        });
    }

    const { error: matchError } = await supabase.from('matches').insert(matches);
    if (matchError) console.error('Error creating matches:', matchError);
    else console.log('✅ Created 5 matches for Weekly Activity');

    // 4. Generate QR Code
    const qrContent = `daoli://elder/${elderId}`;
    const qrPath = path.join(__dirname, '..', 'elder_qr_test.png');

    await QRCode.toFile(qrPath, qrContent, {
        width: 400,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });

    console.log(`📸 Generated QR Code at: ${qrPath}`);
    console.log(`ℹ️ QR Content: ${qrContent}`);
}

seedData();

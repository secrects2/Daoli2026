const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // unquote
            }
        });
    } else {
        console.warn('⚠️ .env.local not found');
    }
} catch (e) {
    console.error('Error reading .env.local:', e.message);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

if (!serviceRoleKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createFamilyUser() {
    console.log('👪 Creating family test user...');

    const email = 'family_member@example.com';
    const password = 'password123';
    const role = 'family';
    // Using same store for simplicity, though functionality might differ
    const storeId = 'STORE_001';

    // 1. Create User in Auth
    console.log(`Creating auth user: ${email}`);
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: role }
    });

    let userId;

    if (createError) {
        console.log('⚠️ User creation failed (likely exists):', createError.message);
        // Try to find existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u => u.email === email);
        if (existing) {
            userId = existing.id;
            console.log('✅ Found existing user ID:', userId);
        } else {
            console.error('❌ Could not find existing user either.');
            return;
        }
    } else {
        userId = user.user.id;
        console.log('✅ User created:', userId);
    }

    if (!userId) return;

    // 2. Create/Update Profile
    console.log('🔄 ensuring profile exists...');

    // Check existing profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profile) {
        console.log('ℹ️ Profile exists, updating role if needed...');
        if (profile.role !== role) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: role, store_id: storeId })
                .eq('id', userId);

            if (updateError) console.error('❌ Profile update failed:', updateError.message);
            else console.log('✅ Profile updated to family role');
        } else {
            console.log('✅ Profile role is already correct.');
        }
    } else {
        console.log('➕ Creating new profile...');
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                role: role,
                store_id: storeId
            });

        if (insertError) console.error('❌ Profile creation failed:', insertError.message);
        else console.log('✅ Profile created successfully');
    }

    // 3. Create Wallet (Family members might need wallets too? Or maybe not, but safe to have)
    // Actually family might not play, but let's check policies. 
    // "Users can view own wallet". If they log in, frontend might fetch it.
    console.log('💰 Checking wallet...');
    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!wallet) {
        const { error: walletError } = await supabase.from('wallets').insert({
            user_id: userId,
            local_points: 0,
            global_points: 0
        });
        if (walletError) console.error('❌ Wallet creation failed:', walletError.message);
        else console.log('✅ Wallet created');
    } else {
        console.log('✅ Wallet exists');
    }
}

createFamilyUser();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbnB6cm1vbnB2c3JwY2p2enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODIwNDYsImV4cCI6MjA4NTE1ODA0Nn0.YQnILyC78llzVVtg2s2hVUlBtVswC9t66nq63TUprA4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createProfile() {
    console.log('🔐 登录获取用户 ID...');

    // 登录获取用户 ID
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'daoliinternational@gmail.com',
        password: 'Test123456'
    });

    if (authError) {
        console.error('❌ 登录失败:', authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log('✅ 用户 ID:', userId);

    // 创建 profile
    console.log('\n📋 创建 profile...');
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            role: 'pharmacist',
            store_id: 'store-001'
        });

    if (profileError) {
        console.log('⚠️  Profile:', profileError.message);
    } else {
        console.log('✅ Profile 创建成功!');
    }

    // 创建 wallet
    console.log('\n💰 创建 wallet...');
    const { error: walletError } = await supabase
        .from('wallets')
        .insert({
            user_id: userId,
            global_points: 0,
            local_points: 0
        });

    if (walletError) {
        console.log('⚠️  Wallet:', walletError.message);
    } else {
        console.log('✅ Wallet 创建成功!');
    }

    // 验证
    console.log('\n📊 验证数据...');
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    console.log('Profile:', profile);

    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    console.log('Wallet:', wallet);

    // 登出
    await supabase.auth.signOut();
    console.log('\n✅ 完成!');
}

createProfile();

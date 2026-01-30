const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
// 使用 service role key 获得管理员权限
const serviceRoleKey = 'sb_secret_NuNJEW1HjtJustg-DndNhw_Al37h-v4';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixDatabase() {
    console.log('🔧 开始修复数据库...\n');

    // 1. 检查 profiles 表数据
    console.log('📊 检查 profiles 表...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

    if (profilesError) {
        console.log('❌ 查询 profiles 失败:', profilesError.message);
    } else {
        console.log(`✅ profiles 表有 ${profiles.length} 条记录`);
        if (profiles.length > 0) {
            console.log('   记录:', JSON.stringify(profiles, null, 2));
        }
    }

    // 2. 检查 wallets 表数据
    console.log('\n📊 检查 wallets 表...');
    const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*');

    if (walletsError) {
        console.log('❌ 查询 wallets 失败:', walletsError.message);
    } else {
        console.log(`✅ wallets 表有 ${wallets.length} 条记录`);
    }

    // 3. 检查 equipment 表数据
    console.log('\n📊 检查 equipment 表...');
    const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('*');

    if (equipmentError) {
        console.log('❌ 查询 equipment 失败:', equipmentError.message);
    } else {
        console.log(`✅ equipment 表有 ${equipment.length} 条记录`);
    }

    console.log('\n✅ 数据库检查完成!');
}

fixDatabase();

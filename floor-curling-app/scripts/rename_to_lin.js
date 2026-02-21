
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('🔄 將長輩改名為「林伯伯」，家屬改名為「林伯伯的家屬」...');

    // 1. 取得所有用戶（加大分頁）
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    const elderUser = users.find(u => u.email === 'elder@daoli.com');
    const familyBoundUser = users.find(u => u.email === 'family_bound@daoli.com');

    if (!elderUser) {
        console.error('❌ 找不到 elder@daoli.com');
        return;
    }
    console.log(`✅ 找到長輩: ${elderUser.id}`);

    // 2. 更新長輩 profile 名稱為「林伯伯」
    const { error: elderError } = await supabase.from('profiles').update({
        full_name: '林伯伯',
        nickname: '林伯伯'
    }).eq('id', elderUser.id);

    if (elderError) {
        console.error('❌ 更新長輩名稱失敗:', elderError);
    } else {
        console.log('✅ 長輩名稱已更新為「林伯伯」');
    }

    // 3. 更新長輩的 auth user_metadata
    await supabase.auth.admin.updateUserById(elderUser.id, {
        user_metadata: { full_name: '林伯伯' }
    });
    console.log('✅ 長輩 auth metadata 已更新');

    // 4. 如果有 family_bound 用戶，更新名稱並確保綁定到長輩
    if (familyBoundUser) {
        console.log(`✅ 找到已綁定家屬: ${familyBoundUser.id}`);

        const { error: familyError } = await supabase.from('profiles').update({
            full_name: '林伯伯的家屬',
            linked_elder_id: elderUser.id
        }).eq('id', familyBoundUser.id);

        if (familyError) {
            console.error('❌ 更新家屬名稱失敗:', familyError);
        } else {
            console.log('✅ 家屬名稱已更新為「林伯伯的家屬」，並綁定到林伯伯');
        }

        await supabase.auth.admin.updateUserById(familyBoundUser.id, {
            user_metadata: { full_name: '林伯伯的家屬' }
        });
        console.log('✅ 家屬 auth metadata 已更新');
    } else {
        console.log('⚠️ 未找到 family_bound@daoli.com');
    }

    // 5. 驗證結果
    console.log('\n--- 驗證結果 ---');
    const { data: elderProfile } = await supabase.from('profiles').select('*').eq('id', elderUser.id).single();
    console.log('長輩 Profile:', JSON.stringify(elderProfile, null, 2));

    if (familyBoundUser) {
        const { data: familyProfile } = await supabase.from('profiles').select('*').eq('id', familyBoundUser.id).single();
        console.log('家屬 Profile:', JSON.stringify(familyProfile, null, 2));
        console.log(`綁定狀態: linked_elder_id = ${familyProfile?.linked_elder_id}`);
        console.log(`是否綁定到林伯伯: ${familyProfile?.linked_elder_id === elderUser.id ? '✅ 是' : '❌ 否'}`);
    }

    console.log('\n🎉 完成！');
}

run();

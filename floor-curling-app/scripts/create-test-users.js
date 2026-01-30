/**
 * 建立測試用戶：長輩 + 家屬
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createUser(email, password, role, nickname, storeId = null, linkedElderId = null) {
    console.log(`\n📝 建立用戶: ${email} (${role})`)

    // 1. 建立 auth 用戶
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    })

    if (authError) {
        if (authError.message.includes('already been registered')) {
            console.log('   ⚠️ 用戶已存在，查詢現有 ID...')
            const { data: users } = await supabase.auth.admin.listUsers()
            const existingUser = users.users.find(u => u.email === email)
            if (existingUser) {
                console.log('   ✅ 找到現有用戶: ' + existingUser.id.substring(0, 8) + '...')
                return await ensureProfile(existingUser.id, role, nickname, storeId, linkedElderId)
            }
        }
        console.log('   ❌ 錯誤:', authError.message)
        return null
    }

    console.log('   ✅ Auth 用戶建立成功: ' + authData.user.id.substring(0, 8) + '...')
    return await ensureProfile(authData.user.id, role, nickname, storeId, linkedElderId)
}

async function ensureProfile(userId, role, nickname, storeId, linkedElderId) {
    // 檢查 profile 是否存在
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

    if (existingProfile) {
        // 更新現有 profile
        const updateData = { role, nickname }
        if (storeId) updateData.store_id = storeId
        if (linkedElderId) updateData.linked_elder_id = linkedElderId

        await supabase.from('profiles').update(updateData).eq('id', userId)
        console.log('   ✅ Profile 已更新')
    } else {
        // 建立新 profile
        const insertData = { id: userId, role, nickname }
        if (storeId) insertData.store_id = storeId
        if (linkedElderId) insertData.linked_elder_id = linkedElderId

        await supabase.from('profiles').insert(insertData)
        console.log('   ✅ Profile 已建立')
    }

    // 確保錢包存在
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (!wallet) {
        await supabase.from('wallets').insert({
            user_id: userId,
            global_points: role === 'elder' ? 500 : 0,
            local_points: role === 'elder' ? 200 : 0
        })
        console.log('   ✅ 錢包已建立')
    }

    return userId
}

async function run() {
    console.log('🚀 建立測試用戶\n')
    console.log('==========================================')

    // 1. 建立長輩
    const elderId = await createUser(
        'elder_test@example.com',
        'Test123456!',
        'elder',
        '張爺爺',
        'store-001'
    )

    if (!elderId) {
        console.log('\n❌ 長輩建立失敗')
        return
    }

    // 2. 建立家屬並綁定長輩
    const familyId = await createUser(
        'family_test@example.com',
        'Test123456!',
        'family',
        '張小明',
        null,
        elderId  // 綁定長輩
    )

    // 3. 建立藥師
    await createUser(
        'pharmacist_test@example.com',
        'Test123456!',
        'pharmacist',
        '王藥師',
        'store-001'
    )

    console.log('\n==========================================')
    console.log('\n✅ 測試用戶建立完成！\n')
    console.log('📋 登入資訊：')
    console.log('─────────────────────────────────')
    console.log('長輩帳號:   elder_test@example.com')
    console.log('家屬帳號:   family_test@example.com')
    console.log('藥師帳號:   pharmacist_test@example.com')
    console.log('密碼 (通用): Test123456!')
    console.log('─────────────────────────────────')
    console.log('\n🔗 家屬已綁定長輩 ID: ' + elderId?.substring(0, 8) + '...')
    console.log('\n')
}

run().catch(console.error)

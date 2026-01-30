require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkFamilyBinding() {
    // 找家屬用戶
    const { data: familyUsers, error: familyError } = await supabase.auth.admin.listUsers()

    if (familyError) {
        console.log('❌ 錯誤:', familyError.message)
        return
    }

    const familyUser = familyUsers.users.find(u => u.email === 'family_test@example.com')

    if (!familyUser) {
        console.log('❌ 找不到家屬用戶')
        return
    }

    console.log('👨‍👩‍👧 家屬用戶 ID:', familyUser.id)

    // 查詢 profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, linked_elder_id')
        .eq('id', familyUser.id)
        .single()

    if (profileError) {
        console.log('❌ Profile 查詢錯誤:', profileError.message)
        return
    }

    console.log('📋 Profile:', profile)

    if (profile.linked_elder_id) {
        // 查詢長輩資料
        const { data: elder } = await supabase
            .from('profiles')
            .select('id, nickname, full_name')
            .eq('id', profile.linked_elder_id)
            .single()

        console.log('👴 綁定的長輩:', elder)
    } else {
        console.log('⚠️ linked_elder_id 為空！嘗試修復...')

        // 找長輩
        const elderUser = familyUsers.users.find(u => u.email === 'elder_test@example.com')
        if (elderUser) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ linked_elder_id: elderUser.id })
                .eq('id', familyUser.id)

            if (updateError) {
                console.log('❌ 更新失敗:', updateError.message)
            } else {
                console.log('✅ 已綁定長輩 ID:', elderUser.id)
            }
        }
    }
}

checkFamilyBinding()

/**
 * 添加 linked_elder_id 欄位到 profiles 表
 */

require('dotenv').config({ path: '.env.local' })

async function run() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.log('❌ 缺少環境變數')
        return
    }

    console.log('🚀 正在添加 linked_elder_id 欄位...\n')

    // 使用 Supabase REST API 直接執行 SQL
    const sql = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_elder_id UUID REFERENCES profiles(id);
        CREATE INDEX IF NOT EXISTS idx_profiles_linked_elder ON profiles(linked_elder_id);
    `

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ sql })
        })

        if (response.ok) {
            console.log('✅ 欄位添加成功！')
        } else {
            // RPC 不存在，嘗試直接通過 pgrest 驗證
            console.log('⚠️ RPC 不可用，正在驗證欄位...')

            const { createClient } = require('@supabase/supabase-js')
            const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

            const { data, error } = await supabase
                .from('profiles')
                .select('id, linked_elder_id')
                .limit(1)

            if (error && error.message.includes('linked_elder_id')) {
                console.log('\n❌ linked_elder_id 欄位不存在')
                console.log('\n請在 Supabase Dashboard > SQL Editor 執行：\n')
                console.log('----------------------------------------')
                console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_elder_id UUID REFERENCES profiles(id);')
                console.log('CREATE INDEX IF NOT EXISTS idx_profiles_linked_elder ON profiles(linked_elder_id);')
                console.log('----------------------------------------\n')
            } else {
                console.log('✅ linked_elder_id 欄位已存在！')
            }
        }
    } catch (err) {
        console.error('執行錯誤:', err.message)
    }
}

run()

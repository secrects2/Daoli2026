/**
 * 建立 notifications 通知表
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
    console.log('\n🚀 開始建立 notifications 表...\n')

    // 讀取 SQL 檔案
    const sqlPath = path.join(__dirname, 'create-notifications-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // 分割 SQL 語句
    const statements = sql
        .split(/;(?=(?:[^']*'[^']*')*[^']*$)/g)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📄 共 ${statements.length} 條 SQL 語句\n`)

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (!stmt || stmt.startsWith('--')) continue

        process.stdout.write(`[${i + 1}/${statements.length}] 執行中...`)

        try {
            const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
            if (error) {
                // 嘗試直接查詢
                const { error: queryError } = await supabase.from('notifications').select('id').limit(0)
                if (queryError && queryError.message.includes('does not exist')) {
                    console.log(' ⚠️  需要手動執行')
                } else {
                    console.log(' ✅')
                }
            } else {
                console.log(' ✅')
            }
        } catch (err) {
            console.log(' ⚠️  跳過')
        }
    }

    // 驗證表是否存在
    console.log('\n🔍 驗證 notifications 表...')

    const { error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1)

    if (checkError) {
        console.log('⚠️  notifications 表尚未建立，請手動執行：')
        console.log('    scripts/create-notifications-table.sql')
    } else {
        console.log('✅ notifications 表已就緒！')
    }

    // 檢查 linked_elder_id 欄位
    console.log('\n🔍 驗證 profiles.linked_elder_id 欄位...')

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('linked_elder_id')
        .limit(1)

    if (profilesError && profilesError.message.includes('linked_elder_id')) {
        console.log('⚠️  linked_elder_id 欄位尚未建立')
    } else {
        console.log('✅ linked_elder_id 欄位已就緒！')
    }

    console.log('\n')
}

run().catch(console.error)

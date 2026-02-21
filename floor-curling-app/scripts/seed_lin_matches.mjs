import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedData() {
    console.log('🌱 尋找林伯伯並寫入比賽資料...')

    let targetElder;
    const { data: elders } = await supabase
        .from('profiles')
        .select('*, store_id')
        .eq('role', 'elder')
        .ilike('full_name', '%林%')

    if (elders && elders.length > 0) {
        targetElder = elders.find(e => e.full_name?.includes('林伯伯') || e.nickname?.includes('林伯伯') || e.full_name?.includes('林'))
    }

    if (!targetElder) {
        const { data: familyLinks } = await supabase.from('family_elder_links').select('elder_id').limit(1)
        if (familyLinks && familyLinks.length > 0) {
            const { data: elder } = await supabase.from('profiles').select('*').eq('id', familyLinks[0].elder_id).single()
            targetElder = elder
        }
    }

    if (!targetElder) {
        console.error('❌ 無法找到林伯伯或任何已綁定的長輩，請確認資料庫狀態。')
        process.exit(1)
    }

    console.log(`✅ 找到目標長輩：${targetElder.full_name || targetElder.nickname} (${targetElder.id})`)

    const storeId = targetElder.store_id || 'store-01';

    const matches = []
    const now = new Date()
    for (let i = 0; i < 8; i++) {
        const rand = Math.random()
        const result = rand > 0.4 ? 'win' : (rand > 0.1 ? 'loss' : 'draw')

        matches.push({
            red_team_elder_id: targetElder.id,
            yellow_team_elder_id: '00000000-0000-0000-0000-000000000000',
            status: 'completed',
            winner_color: result === 'win' ? 'red' : (result === 'loss' ? 'yellow' : null),
            created_at: new Date(now.getTime() - (i * 12 * 60 * 60 * 1000)).toISOString(),
            store_id: storeId
        })
    }

    const { error: altError } = await supabase.from('matches').insert(matches)
    if (altError) {
        console.error('❌ 二次嘗試新增比賽紀錄失敗:', altError.message)
    } else {
        console.log(`✅ 成功建立 ${matches.length} 筆比賽紀錄！`)
    }

    const { data: wallet } = await supabase.from('wallets').select('id, global_points').eq('user_id', targetElder.id).single()
    if (wallet) {
        await supabase.from('wallets').update({ global_points: wallet.global_points + 300 }).eq('id', wallet.id)
        console.log('💰 增加錢包積分成功！')
    }
}

seedData();

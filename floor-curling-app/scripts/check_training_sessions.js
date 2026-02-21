
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    // 1. 查看所有 training_sessions
    const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, elder_id, created_at, metrics')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ 查詢失敗:', error);
        return;
    }

    console.log(`共找到 ${sessions?.length || 0} 筆 training_sessions:`);
    sessions?.forEach(s => {
        console.log(`  elder_id: ${s.elder_id} | created: ${s.created_at} | ROM: ${s.metrics?.avg_rom}`);
    });

    // 2. 查看林伯伯的 ID
    const { data: elderProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('full_name', '林伯伯')
        .single();

    console.log(`\n林伯伯 Profile ID: ${elderProfile?.id}`);

    // 3. 對比
    if (elderProfile && sessions?.length) {
        const matchingSessions = sessions.filter(s => s.elder_id === elderProfile.id);
        console.log(`\n屬於林伯伯的 sessions: ${matchingSessions.length}`);

        if (matchingSessions.length === 0) {
            console.log('\n❌ training_sessions 中沒有林伯伯的資料！');
            console.log('training_sessions 中的 elder_id 們:');
            const uniqueIds = [...new Set(sessions.map(s => s.elder_id))];
            for (const id of uniqueIds) {
                const { data: p } = await supabase.from('profiles').select('full_name').eq('id', id).single();
                console.log(`  ${id} => ${p?.full_name || '(未知)'}`);
            }
        }
    }
}

run();

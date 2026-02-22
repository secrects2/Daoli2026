// 為林伯伯建立地板滾球假比賽數據
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    // 1. 找到林伯伯的 ID
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const elderUser = users.find(u => u.email === 'elder@daoli.com');
    if (!elderUser) { console.error('❌ 找不到 elder@daoli.com'); return; }
    const elderId = elderUser.id;
    console.log(`🎯 林伯伯 ID: ${elderId}`);

    // 2. 找另一位長輩當對手
    const { data: elders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'elder')
        .neq('id', elderId)
        .limit(1);

    const opponentId = elders?.[0]?.id || elderId;
    console.log(`🎯 對手: ${elders?.[0]?.full_name || '林伯伯自己'} (${opponentId})`);

    // 3. 建立 5 場地板滾球比賽（過去 2 週內）
    const bocciaMatches = [];
    const results = ['red', 'yellow', 'red', null, 'red']; // 3勝1平1負

    for (let i = 0; i < 5; i++) {
        const daysAgo = Math.floor(i * 2.5) + 1; // 1, 3, 6, 8, 11 天前
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        const completedAt = new Date(createdAt.getTime() + 25 * 60 * 1000); // 25分鐘

        const isRedTeam = i % 2 === 0; // 林伯伯交替紅藍隊
        const winnerColor = results[i];

        const { data: match, error } = await supabase
            .from('matches')
            .insert({
                store_id: 'TPE-XINYI',
                red_team_elder_id: isRedTeam ? elderId : opponentId,
                yellow_team_elder_id: isRedTeam ? opponentId : elderId,
                winner_color: winnerColor,
                status: 'completed',
                sport_type: 'boccia',
                created_at: createdAt.toISOString(),
                completed_at: completedAt.toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error(`❌ 比賽 ${i + 1} 失敗:`, error.message);
            continue;
        }

        // 4. 為每場比賽建立 4 回合計分
        const endScores = [];
        for (let e = 1; e <= 4; e++) {
            const redScore = Math.floor(Math.random() * 4);
            const yellowScore = Math.floor(Math.random() * 4);
            endScores.push({
                match_id: match.id,
                end_number: e,
                red_score: redScore,
                yellow_score: yellowScore,
            });
        }

        await supabase.from('match_ends').insert(endScores);

        // 5. 加入 match_participants
        await supabase.from('match_participants').insert([
            { match_id: match.id, elder_id: isRedTeam ? elderId : opponentId, team: 'red' },
            { match_id: match.id, elder_id: isRedTeam ? opponentId : elderId, team: 'yellow' },
        ]).then(() => { }, () => { }); // ignore conflict

        const elderTeam = isRedTeam ? 'red' : 'yellow';
        const elderResult = !winnerColor ? '平局' : winnerColor === elderTeam ? '勝利' : '落敗';
        console.log(`✅ 地板滾球 ${i + 1}: ${daysAgo} 天前 | 林伯伯(${elderTeam}) ${elderResult}`);
        bocciaMatches.push(match);
    }

    // 6. 驗證
    const { data: verify } = await supabase
        .from('matches')
        .select('id, sport_type, winner_color, created_at')
        .eq('sport_type', 'boccia')
        .or(`red_team_elder_id.eq.${elderId},yellow_team_elder_id.eq.${elderId}`)
        .order('created_at', { ascending: false });

    console.log(`\n📊 林伯伯共有 ${verify?.length || 0} 場地板滾球比賽記錄`);
}
run();

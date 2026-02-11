import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { submitMatchSchema } from '@/lib/validations/match'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod' // We need to extend the schema locally or update it, easier to extend check here for now

// 使用 Service Role Key 初始化 Supabase Admin 客戶端
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const POINTS_WIN = 100
const POINTS_DRAW = 50
const POINTS_LOSS = 10

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Temporary Schema Check for Arrays (until we update validations lib)
        // We expect body to have redTeamIds: string[], yellowTeamIds: string[], storeId, ends
        // The previous schema expected redElderId, yellowElderId.
        // We will adapt the validation manually here for the new fields, or try to coerce.
        const { storeId, ends, redTeamIds, yellowTeamIds } = body

        if (!storeId || !ends || !Array.isArray(redTeamIds) || !Array.isArray(yellowTeamIds)) {
            return NextResponse.json({ success: false, error: '資料格式錯誤 (需包含隊伍名單)' }, { status: 400 })
        }
        if (redTeamIds.length === 0 || yellowTeamIds.length === 0) {
            return NextResponse.json({ success: false, error: '每隊至少需有一名長輩' }, { status: 400 })
        }
        if (redTeamIds.length > 6 || yellowTeamIds.length > 6) {
            return NextResponse.json({ success: false, error: '每隊最多 6 名長輩' }, { status: 400 })
        }

        // Check for duplicates across teams
        const allIds = [...redTeamIds, ...yellowTeamIds]
        if (new Set(allIds).size !== allIds.length) {
            return NextResponse.json({ success: false, error: '長輩不能同時存在於兩隊' }, { status: 400 })
        }

        // 驗證 Ends (簡單檢查)
        if (ends.length === 0) {
            return NextResponse.json({ success: false, error: '至少需有一局比賽' }, { status: 400 })
        }

        // ✅ 強制證據驗證 (Manual check as we bypassed Zod)
        const missingPhotoEnds = ends.filter((end: any) => !end.houseSnapshotUrl)
        if (missingPhotoEnds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: '【雙機流協議違規】缺少證據照片',
                    code: 'EVIDENCE_REQUIRED'
                },
                { status: 400 }
            )
        }


        // 2. Calculate Result
        const redTotal = ends.reduce((sum: number, end: any) => sum + (parseInt(end.redScore) || 0), 0)
        const yellowTotal = ends.reduce((sum: number, end: any) => sum + (parseInt(end.yellowScore) || 0), 0)

        let winnerColor: 'red' | 'yellow' | null = null
        if (redTotal > yellowTotal) winnerColor = 'red'
        else if (yellowTotal > redTotal) winnerColor = 'yellow'

        // 3. Database Operations (Transaction-like)

        // A. Insert Match
        const { data: match, error: matchError } = await supabaseAdmin
            .from('matches')
            .insert({
                store_id: storeId,
                red_team_elder_id: null, // Legacy field
                yellow_team_elder_id: null, // Legacy field
                winner_color: winnerColor,
                status: 'completed',
                completed_at: new Date().toISOString(),
                // Store raw ends data if needed, but usually we just store match record.
                // If we need to store ends detail in DB, we'd need a match_ends table, but currently logic implied calculate_and_record handled it.
                // Assuming 'match' table is enough for history summary. 
            })
            .select()
            .single()

        if (matchError) throw new Error('建立比賽失敗: ' + matchError.message)
        const matchId = match.id

        // B. Insert Participants & Interactions & Points
        const participants = [
            ...redTeamIds.map(id => ({ match_id: matchId, elder_id: id, team: 'red' })),
            ...yellowTeamIds.map(id => ({ match_id: matchId, elder_id: id, team: 'yellow' }))
        ]

        const { error: partError } = await supabaseAdmin
            .from('match_participants')
            .insert(participants)

        if (partError) throw new Error('建立參賽名單失敗: ' + partError.message)

        // B2. Insert Match Ends (per-end scores + media URLs)
        const matchEnds = ends.map((end: any, index: number) => ({
            match_id: matchId,
            end_number: end.endNumber || index + 1,
            red_score: parseInt(end.redScore) || 0,
            yellow_score: parseInt(end.yellowScore) || 0,
            house_snapshot_url: end.houseSnapshotUrl || null,
            vibe_video_url: end.vibeVideoUrl || null
        }))

        const { error: endsError } = await supabaseAdmin
            .from('match_ends')
            .insert(matchEnds)

        if (endsError) {
            console.error('寫入 match_ends 失敗:', endsError)
            // Non-fatal: log but don't block match creation
            // The match_ends table may not exist yet in some environments
        }

        // C. Process Interactions & Points for EACH Elder
        const processElder = async (elderId: string, team: 'red' | 'yellow') => {
            let result: 'win' | 'loss' | 'draw' = 'draw'
            let points = POINTS_DRAW

            if (winnerColor) {
                if (team === winnerColor) {
                    result = 'win'
                    points = POINTS_WIN
                } else {
                    result = 'loss'
                    points = POINTS_LOSS
                }
            }

            // 1. Interaction
            await supabaseAdmin.from('user_interactions').insert({
                user_id: elderId,
                interaction_type: 'match_result',
                data: {
                    match_id: matchId,
                    result,
                    opponent: 'Multi-Elder Match', // Simplified
                    points_earned: points,
                    scores: { red: redTotal, yellow: yellowTotal }
                }
            })

            // 2. Wallet & Transaction
            // Check wallet existence
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('id, global_points, local_points')
                .eq('user_id', elderId)
                .single()

            if (wallet) {
                // Insert Transaction
                await supabaseAdmin.from('point_transactions').insert({
                    wallet_id: wallet.id,
                    amount: points,
                    type: 'earned',
                    description: `比賽${result === 'win' ? '勝利' : result === 'loss' ? '參加' : '平局'} (${new Date().toLocaleDateString()}) - 獲得賽事分與兌換分`
                })

                // Update Wallet (Both Global & Local)
                // Global = Honor, Local = Currency
                await supabaseAdmin.from('wallets').update({
                    global_points: (wallet.global_points || 0) + points,
                    local_points: (wallet.local_points || 0) + points
                }).eq('id', wallet.id)
            }

            // 3. Notify
            const title = result === 'win' ? '勝利！🏆' : result === 'draw' ? '比賽平局 🤝' : '比賽完成 🥌'
            const msg = result === 'win'
                ? `您的長輩在團隊賽中獲勝！總分 ${Math.max(redTotal, yellowTotal)}`
                : `比分 ${redTotal}:${yellowTotal}`

            await notifyFamily(elderId, title, msg, matchId)
        }

        // Run in parallel
        await Promise.all(allIds.map(id => {
            const team = redTeamIds.includes(id) ? 'red' : 'yellow'
            return processElder(id, team as 'red' | 'yellow')
        }))

        return NextResponse.json({
            success: true,
            matchId: matchId,
            message: '多長輩比賽結果已記錄'
        })

    } catch (error: any) {
        console.error('API 錯誤:', error)
        return NextResponse.json(
            { success: false, error: error.message || '服務器內部錯誤' },
            { status: 500 }
        )
    }
}

// 輔助函數：通知家屬 (S2B2C) - 支持多長輩綁定
async function notifyFamily(elderId: string, title: string, message: string, matchId: string) {
    if (!elderId) return

    // 1. 從新的 family_elder_links 表查詢
    const { data: familyLinks } = await supabaseAdmin
        .from('family_elder_links')
        .select('family_id')
        .eq('elder_id', elderId)

    // 2. 從舊的 linked_elder_id 查詢 (向後兼容)
    const { data: legacyFamilyMembers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('linked_elder_id', elderId)
        .eq('role', 'family')

    // 合併去重
    const familyIds = new Set<string>()
    if (familyLinks) {
        familyLinks.forEach(link => familyIds.add(link.family_id))
    }
    if (legacyFamilyMembers) {
        legacyFamilyMembers.forEach(member => familyIds.add(member.id))
    }

    if (familyIds.size === 0) return

    const { data: elderProfile } = await supabaseAdmin
        .from('profiles')
        .select('nickname, full_name')
        .eq('id', elderId)
        .single()

    const elderName = elderProfile?.nickname || elderProfile?.full_name || '長輩'

    for (const familyId of familyIds) {
        await createNotification({
            userId: familyId,
            title,
            message: message.replace('您的長輩', elderName),
            type: 'match_result',
            metadata: { elderId, elderName, matchId }
        })
    }
}

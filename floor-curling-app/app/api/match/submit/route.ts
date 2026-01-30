import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { submitMatchSchema } from '@/lib/validations/match'
import { createNotification } from '@/lib/notifications'

// 使用 Service Role Key 初始化 Supabase Admin 客戶端
// 這是為了繞過 RLS 策略，特別是更新 wallets 和 transactions 表
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // 1. Zod 驗證輸入 (包含雙機流協議驗證)
        const validationResult = submitMatchSchema.safeParse(body)
        if (!validationResult.success) {
            // 返回詳細的驗證錯誤
            const errors = validationResult.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
            }))

            // 檢查是否為證據缺失錯誤
            const evidenceError = errors.find(e => e.path.includes('houseSnapshotUrl'))
            if (evidenceError) {
                return NextResponse.json(
                    {
                        success: false,
                        error: '【雙機流協議違規】缺少證據照片，積分寫入被拒絕',
                        code: 'EVIDENCE_REQUIRED',
                        details: errors
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { success: false, error: '資料驗證失敗', details: errors },
                { status: 400 }
            )
        }

        const { redElderId, yellowElderId, storeId, ends } = validationResult.data

        if (redElderId === yellowElderId) {
            return NextResponse.json(
                { success: false, error: '紅方和黃方不能是同一位長者' },
                { status: 400 }
            )
        }

        // 2. 創建比賽記錄
        const { data: match, error: matchError } = await supabaseAdmin
            .from('matches')
            .insert({
                store_id: storeId,
                red_team_elder_id: redElderId,
                yellow_team_elder_id: yellowElderId,
                status: 'in_progress'
            })
            .select()
            .single()

        if (matchError) throw matchError

        // 3. 創建回合記錄
        const matchEnds = ends.map((end, index) => ({
            match_id: match.id,
            end_number: end.endNumber,
            red_score: end.redScore,
            yellow_score: end.yellowScore,
            house_snapshot_url: end.houseSnapshotUrl,
            vibe_video_url: end.vibeVideoUrl || null
        }))

        const { error: endsError } = await supabaseAdmin
            .from('match_ends')
            .insert(matchEnds)

        if (endsError) throw endsError

        // 4. 計算總分和獲勝者
        const redTotalScore = ends.reduce((sum, end) => sum + end.redScore, 0)
        const yellowTotalScore = ends.reduce((sum, end) => sum + end.yellowScore, 0)

        let winnerColor = null
        let winnerId = null
        let loserId = null

        if (redTotalScore > yellowTotalScore) {
            winnerColor = 'red'
            winnerId = redElderId
            loserId = yellowElderId
        } else if (yellowTotalScore > redTotalScore) {
            winnerColor = 'yellow'
            winnerId = yellowElderId
            loserId = redElderId
        }

        // 5. 更新比賽狀態
        await supabaseAdmin
            .from('matches')
            .update({
                winner_color: winnerColor,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', match.id)

        // 獲取第一回合的證據 URL (用於交易記錄)
        const evidenceUrl = ends[0]?.houseSnapshotUrl || null

        // 6. 更新積分並記錄交易 (使用 Service Role)
        if (winnerId) {
            // 勝者 +100 Global, +50 Local
            await updateWalletWithTransaction({
                userId: winnerId,
                globalPointsDelta: 100,
                localPointsDelta: 50,
                type: 'match_win',
                matchId: match.id,
                storeId,
                description: `比賽勝利獎勵 (比分 ${Math.max(redTotalScore, yellowTotalScore)}:${Math.min(redTotalScore, yellowTotalScore)})`,
                evidenceUrl
            })

            // 通知勝者家屬
            await notifyFamily(winnerId, '勝利！🏆', `您的長輩在比賽中獲勝！總分 ${Math.max(redTotalScore, yellowTotalScore)}`)
        }

        if (loserId) {
            // 敗方積分邏輯 (參與獎勵)
            await updateWalletWithTransaction({
                userId: loserId,
                globalPointsDelta: 10,
                localPointsDelta: 5,
                type: 'match_participate',
                matchId: match.id,
                storeId,
                description: `比賽參與獎勵 (比分 ${Math.min(redTotalScore, yellowTotalScore)}:${Math.max(redTotalScore, yellowTotalScore)})`,
                evidenceUrl
            })

            // 通知敗方家屬
            await notifyFamily(loserId, '比賽完成 🥌', `您的長輩完成了一場精彩的比賽！`)
        }

        return NextResponse.json({
            success: true,
            matchId: match.id,
            message: '比賽結果已記錄，積分已更新'
        })

    } catch (error: any) {
        console.error('API 錯誤:', error)
        return NextResponse.json(
            { success: false, error: error.message || '服務器內部錯誤' },
            { status: 500 }
        )
    }
}

// 交易記錄參數介面
interface TransactionParams {
    userId: string
    globalPointsDelta: number
    localPointsDelta: number
    type: 'match_win' | 'match_participate' | 'local_grant' | 'local_redeem' | 'adjustment'
    matchId?: string
    storeId?: string
    operatorId?: string
    operatorRole?: string
    description?: string
    evidenceUrl?: string | null
}

// 輔助函數：更新錢包並記錄交易
async function updateWalletWithTransaction(params: TransactionParams) {
    const {
        userId,
        globalPointsDelta,
        localPointsDelta,
        type,
        matchId,
        storeId,
        operatorId,
        operatorRole,
        description,
        evidenceUrl
    } = params

    // 1. 獲取當前錢包餘額
    const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('global_points, local_points')
        .eq('user_id', userId)
        .single()

    let newGlobalPoints: number
    let newLocalPoints: number

    if (wallet) {
        // 2a. 更新現有錢包
        newGlobalPoints = (wallet.global_points || 0) + globalPointsDelta
        newLocalPoints = (wallet.local_points || 0) + localPointsDelta

        await supabaseAdmin
            .from('wallets')
            .update({
                global_points: newGlobalPoints,
                local_points: newLocalPoints
            })
            .eq('user_id', userId)
    } else {
        // 2b. 創建新錢包
        newGlobalPoints = globalPointsDelta
        newLocalPoints = localPointsDelta

        await supabaseAdmin
            .from('wallets')
            .insert({
                user_id: userId,
                global_points: newGlobalPoints,
                local_points: newLocalPoints
            })
    }

    // 3. 寫入交易記錄 (稽核軌跡)
    await supabaseAdmin
        .from('transactions')
        .insert({
            user_id: userId,
            type,
            global_points_delta: globalPointsDelta,
            local_points_delta: localPointsDelta,
            global_points_after: newGlobalPoints,
            local_points_after: newLocalPoints,
            match_id: matchId || null,
            store_id: storeId || null,
            operator_id: operatorId || null,
            operator_role: operatorRole || 'system',
            description,
            evidence_url: evidenceUrl
        })
}

// 輔助函數：通知家屬 (S2B2C)
async function notifyFamily(elderId: string, title: string, message: string) {
    try {
        // 查找綁定這位長輩的所有家屬
        const { data: familyMembers } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('linked_elder_id', elderId)
            .eq('role', 'family')

        if (familyMembers && familyMembers.length > 0) {
            // 獲取長輩名稱用於通知
            const { data: elderProfile } = await supabaseAdmin
                .from('profiles')
                .select('nickname, full_name')
                .eq('id', elderId)
                .single()

            const elderName = elderProfile?.nickname || elderProfile?.full_name || '長輩'

            // 發送通知給所有綁定的家屬
            for (const family of familyMembers) {
                await createNotification({
                    userId: family.id,
                    title,
                    message: message.replace('您的長輩', elderName),
                    type: 'match_result',
                    metadata: { elderId, elderName }
                })
            }
        }
    } catch (error) {
        console.error('通知家屬失敗:', error)
    }
}

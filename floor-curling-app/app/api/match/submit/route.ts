import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { submitMatchSchema } from '@/lib/validations/match'
import { createNotification } from '@/lib/notifications'

// 使用 Service Role Key 初始化 Supabase Admin 客戶端
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // 1. Zod 驗證輸入 (保留前端驗證作為第一道防線)
        const validationResult = submitMatchSchema.safeParse(body)
        if (!validationResult.success) {
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

        // 2. 呼叫核心資料庫函數 (The Core)
        // 將所有計算、分數記錄、錢包更新邏輯下沉到資料庫
        const { data: result, error: rpcError } = await supabaseAdmin.rpc('calculate_and_record_match_result', {
            p_store_id: storeId,
            p_red_elder_id: redElderId,
            p_yellow_elder_id: yellowElderId,
            p_ends: ends,
            p_operator_id: null // 未來可擴充
        })

        if (rpcError) {
            console.error('RPC Error:', rpcError)
            throw new Error(`核心計算錯誤: ${rpcError.message}`)
        }

        // 3. 處理通知 (The Shell - 應用層邏輯)
        // 根據核心返回的結果發送通知
        const { match_id, red_total, yellow_total, winner_color, winner_id } = result

        // 找出敗方 ID
        const loserId = winner_id === redElderId ? yellowElderId : redElderId;
        // 如果平局 (winner_id is null)，則兩個都是參與者，這裡簡化處理

        // 異步發送通知，不阻塞回應
        (async () => {
            try {
                if (winner_color) {
                    // 有勝負
                    await notifyFamily(winner_id, '勝利！🏆', `您的長輩在比賽中獲勝！總分 ${Math.max(red_total, yellow_total)}`, match_id, winner_id)
                    await notifyFamily(loserId, '比賽完成 🥌', `您的長輩完成了一場精彩的比賽！`, match_id, loserId)
                } else {
                    // 平局
                    await notifyFamily(redElderId, '比賽平局 🤝', `這是一場勢均力敵的比賽！比分 ${red_total}:${yellow_total}`, match_id, redElderId)
                    await notifyFamily(yellowElderId, '比賽平局 🤝', `這是一場勢均力敵的比賽！比分 ${red_total}:${yellow_total}`, match_id, yellowElderId)
                }
            } catch (notifyError) {
                console.error('Notification Error:', notifyError)
            }
        })()

        return NextResponse.json({
            success: true,
            matchId: match_id,
            message: '比賽結果已記錄，積分已更新 (Core Validated)'
        })

    } catch (error: any) {
        console.error('API 錯誤:', error)
        return NextResponse.json(
            { success: false, error: error.message || '服務器內部錯誤' },
            { status: 500 }
        )
    }
}

// 輔助函數：通知家屬 (S2B2C)
async function notifyFamily(elderId: string, title: string, message: string, matchId: string, elderIdParam: string) {
    // Check if valid elderId
    if (!elderId) return

    const { data: familyMembers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('linked_elder_id', elderId)
        .eq('role', 'family')

    if (familyMembers && familyMembers.length > 0) {
        const { data: elderProfile } = await supabaseAdmin
            .from('profiles')
            .select('nickname, full_name')
            .eq('id', elderId)
            .single()

        const elderName = elderProfile?.nickname || elderProfile?.full_name || '長輩'

        for (const family of familyMembers) {
            await createNotification({
                userId: family.id,
                title,
                message: message.replace('您的長輩', elderName),
                type: 'match_result',
                metadata: { elderId, elderName, matchId }
            })
        }
    }
}

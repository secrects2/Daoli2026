import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 補充本地積分
 * 
 * ⚠️ 安全控制：僅管理員可用
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用')
    }

    try {
        const supabaseAdmin = getSupabaseAdmin()

        // 找出所有 local_points 為 0 或 null 的錢包
        const { data: wallets, error: fetchError } = await supabaseAdmin
            .from('wallets')
            .select('id, user_id, global_points, local_points')
            .or('local_points.is.null,local_points.eq.0')

        if (fetchError) throw fetchError

        let updated = 0
        for (const wallet of wallets || []) {
            const globalPoints = wallet.global_points || 0
            if (globalPoints > 0) {
                await supabaseAdmin
                    .from('wallets')
                    .update({ local_points: globalPoints })
                    .eq('id', wallet.id)
                updated++
            }
        }

        return NextResponse.json({
            success: true,
            message: `已更新 ${updated} 個錢包的本地積分`,
            totalChecked: wallets?.length || 0,
            updatedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 修復家屬綁定
 * 
 * ⚠️ 安全控制：僅管理員可用
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用')
    }

    try {
        const body = await request.json()
        const { familyId, elderId } = body

        if (!familyId || !elderId) {
            return NextResponse.json({ error: '缺少 familyId 或 elderId' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        // 更新 profiles 表中的 linked_elder_id
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ linked_elder_id: elderId })
            .eq('id', familyId)
            .select()
            .single()

        if (error) throw error

        // 也在 family_elder_links 表中創建記錄
        await supabaseAdmin
            .from('family_elder_links')
            .upsert({
                family_id: familyId,
                elder_id: elderId,
                is_primary: true
            }, { onConflict: 'family_id,elder_id' })

        return NextResponse.json({
            success: true,
            message: '綁定已修復',
            profile: data,
            updatedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

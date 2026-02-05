import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 設定用戶角色
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
        const { userId, role } = body

        if (!userId || !role) {
            return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
        }

        const validRoles = ['admin', 'pharmacist', 'elder', 'family']
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: '無效的角色' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ role })
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `用戶角色已更新為 ${role}`,
            user: data,
            updatedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

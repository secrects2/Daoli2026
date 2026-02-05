import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, isDevelopment, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 列出用戶
 * 
 * ⚠️ 安全控制：僅管理員可用
 */
export async function GET(request: NextRequest) {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用')
    }

    try {
        const supabaseAdmin = getSupabaseAdmin()
        const { data: users, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, nickname, email, role, store_id, is_active, created_at')
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) throw error

        return NextResponse.json({
            success: true,
            count: users?.length || 0,
            users,
            accessedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

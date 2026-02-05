import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 檢查用戶
 * 
 * ⚠️ 安全控制：僅管理員可用
 */
export async function GET(request: NextRequest) {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用')
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    const email = searchParams.get('email')

    if (!userId && !email) {
        return NextResponse.json({ error: '需提供 id 或 email 參數' }, { status: 400 })
    }

    try {
        const supabaseAdmin = getSupabaseAdmin()

        let query = supabaseAdmin
            .from('profiles')
            .select('*, wallets(*)')

        if (userId) {
            query = query.eq('id', userId)
        } else if (email) {
            query = query.eq('email', email)
        }

        const { data, error } = await query.single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            user: data,
            accessedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

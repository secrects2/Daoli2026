import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 重設密碼
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
        const { email, newPassword } = body

        if (!email || !newPassword) {
            return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: '密碼至少需要 6 個字符' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        // 先查找用戶
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.users.find(u => u.email === email)

        if (!user) {
            return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
        }

        // 更新密碼
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword
        })

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `用戶 ${email} 密碼已重設`,
            updatedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - 修復家屬姓名
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
        const { userId, fullName, nickname } = body

        if (!userId) {
            return NextResponse.json({ error: '缺少 userId' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        const updateData: any = {}
        if (fullName) updateData.full_name = fullName
        if (nickname) updateData.nickname = nickname

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: '沒有需要更新的數據' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: '姓名已更新',
            profile: data,
            updatedBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

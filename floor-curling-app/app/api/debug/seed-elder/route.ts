import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Debug API - Seed 長輩測試數據
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

        // 創建測試長輩
        const testElder = {
            email: `elder_test_${Date.now()}@example.com`,
            password: 'test123456'
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testElder.email,
            password: testElder.password,
            email_confirm: true
        })

        if (authError) throw authError

        // 創建 profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authUser.user.id,
                email: testElder.email,
                role: 'elder',
                full_name: '測試長輩',
                nickname: '阿公'
            })

        if (profileError) throw profileError

        // 創建錢包
        await supabaseAdmin
            .from('wallets')
            .insert({
                user_id: authUser.user.id,
                global_points: 100,
                local_points: 100
            })

        return NextResponse.json({
            success: true,
            message: '測試長輩已創建',
            elder: {
                id: authUser.user.id,
                email: testElder.email,
                password: testElder.password
            },
            createdBy: auth.userId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

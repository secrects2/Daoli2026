import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin, unauthorizedResponse } from '@/lib/auth-utils'

/**
 * Test API - 取得測試用長輩資料
 *
 * ⚠️ 安全控制：僅管理員可用
 */
export async function GET() {
    const auth = await verifyAdmin()
    if (!auth.isAdmin) {
        return unauthorizedResponse('僅限管理員使用此測試 API')
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: elder } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, nickname, role, store_id')
            .eq('role', 'elder')
            .limit(1)
            .single()

        if (!elder) {
            return NextResponse.json({ error: 'No elders found in DB' }, { status: 404 })
        }

        return NextResponse.json({ elder, accessedBy: auth.userId })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

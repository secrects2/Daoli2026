import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// 使用 Service Role Key 繞過 RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 驗證 Schema
const grantPointsSchema = z.object({
    elderId: z.string().uuid({ message: '無效的長輩 ID' }),
    localPoints: z.number().min(1, { message: '積分必須大於 0' }).max(10000, { message: '單次發放上限 10000 點' }),
    description: z.string().min(1, { message: '請填寫發放原因' }).max(200),
    storeId: z.string().min(1, { message: '缺少店鋪 ID' })
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // 驗證輸入
        const validationResult = grantPointsSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: '資料驗證失敗',
                    details: validationResult.error.issues
                },
                { status: 400 }
            )
        }

        const { elderId, localPoints, description, storeId } = validationResult.data

        // 獲取操作者資訊 (從 Authorization header)
        const authHeader = req.headers.get('Authorization')
        let operatorId: string | null = null

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const { data: { user } } = await supabaseAdmin.auth.getUser(token)
            operatorId = user?.id || null
        }

        // 驗證長輩是否存在且屬於該店鋪
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('profiles')
            .select('id, nickname, full_name, store_id, role')
            .eq('id', elderId)
            .single()

        if (elderError || !elder) {
            return NextResponse.json(
                { success: false, error: '找不到該長輩' },
                { status: 404 }
            )
        }

        if (elder.role !== 'elder') {
            return NextResponse.json(
                { success: false, error: '只能為長輩發放積分' },
                { status: 400 }
            )
        }

        if (elder.store_id !== storeId) {
            return NextResponse.json(
                { success: false, error: '無權為其他店鋪的長輩發放積分' },
                { status: 403 }
            )
        }

        // 獲取當前錢包餘額
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('global_points, local_points')
            .eq('user_id', elderId)
            .single()

        let newLocalPoints: number
        let currentGlobalPoints: number

        if (wallet) {
            newLocalPoints = (wallet.local_points || 0) + localPoints
            currentGlobalPoints = wallet.global_points || 0

            await supabaseAdmin
                .from('wallets')
                .update({ local_points: newLocalPoints })
                .eq('user_id', elderId)
        } else {
            newLocalPoints = localPoints
            currentGlobalPoints = 0

            await supabaseAdmin
                .from('wallets')
                .insert({
                    user_id: elderId,
                    global_points: 0,
                    local_points: newLocalPoints
                })
        }

        // 寫入交易記錄
        await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: elderId,
                type: 'local_grant',
                global_points_delta: 0,
                local_points_delta: localPoints,
                global_points_after: currentGlobalPoints,
                local_points_after: newLocalPoints,
                store_id: storeId,
                operator_id: operatorId,
                operator_role: 'pharmacist',
                description: description
            })

        return NextResponse.json({
            success: true,
            message: `成功發放 ${localPoints} 點給 ${elder.nickname || elder.full_name || '長輩'}`,
            data: {
                elderId,
                elderName: elder.nickname || elder.full_name,
                pointsGranted: localPoints,
                newBalance: newLocalPoints
            }
        })

    } catch (error: any) {
        console.error('API 錯誤:', error)
        return NextResponse.json(
            { success: false, error: error.message || '服務器內部錯誤' },
            { status: 500 }
        )
    }
}

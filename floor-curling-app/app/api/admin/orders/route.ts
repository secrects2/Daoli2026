import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 管理員訂單 API
 */

// GET: 取得所有訂單
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        )

        // 驗證是管理員
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: '請先登入' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: '無權限' }, { status: 403 })
        }

        // 取得查詢參數
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        let query = supabase
            .from('orders')
            .select(`
                *,
                buyer:profiles!buyer_id(id, full_name, email),
                recipient:profiles!recipient_id(id, full_name),
                order_items(id, product_name, quantity, unit_price, subtotal)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1)

        if (status) {
            query = query.eq('status', status)
        }

        const { data: orders, error, count } = await query

        if (error) {
            console.error('Orders fetch error:', error)
            return NextResponse.json({ error: '訂單查詢失敗' }, { status: 500 })
        }

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })

    } catch (error: any) {
        console.error('Admin orders error:', error)
        return NextResponse.json({ error: error.message || '系統錯誤' }, { status: 500 })
    }
}

// PATCH: 更新訂單狀態
export async function PATCH(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch { }
                    },
                },
            }
        )

        // 驗證是管理員
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: '請先登入' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: '無權限' }, { status: 403 })
        }

        const body = await request.json()
        const { orderId, status } = body

        if (!orderId || !status) {
            return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
        }

        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: '無效的狀態' }, { status: 400 })
        }

        const updateData: any = { status }
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString()
        }

        const { data: order, error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single()

        if (error) {
            console.error('Order update error:', error)
            return NextResponse.json({ error: '訂單更新失敗' }, { status: 500 })
        }

        return NextResponse.json({ success: true, order })

    } catch (error: any) {
        console.error('Admin orders patch error:', error)
        return NextResponse.json({ error: error.message || '系統錯誤' }, { status: 500 })
    }
}

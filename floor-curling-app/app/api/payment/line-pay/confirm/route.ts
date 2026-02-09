import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * LINE Pay 付款確認 API (Mock 版本)
 * 
 * 流程：
 * 1. 驗證訂單存在且為 pending 狀態
 * 2. 更新訂單狀態為 paid
 * 3. 將商品加入收禮者庫存
 * 4. 發送通知給收禮者
 */
export async function POST(request: NextRequest) {
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

        // 驗證使用者
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: '請先登入' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId } = body

        if (!orderId) {
            return NextResponse.json({ error: '缺少訂單 ID' }, { status: 400 })
        }

        // 取得訂單
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return NextResponse.json({ error: '訂單不存在' }, { status: 404 })
        }

        // 驗證是訂單擁有者
        if (order.buyer_id !== user.id) {
            return NextResponse.json({ error: '無權操作此訂單' }, { status: 403 })
        }

        // 驗證訂單狀態
        if (order.status !== 'pending') {
            return NextResponse.json({ error: `訂單狀態異常: ${order.status}` }, { status: 400 })
        }

        // Mock: 模擬 LINE Pay 驗證成功
        const mockTransactionId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

        // 更新訂單狀態為已付款
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'paid',
                payment_transaction_id: mockTransactionId,
                paid_at: new Date().toISOString()
            })
            .eq('id', orderId)

        if (updateError) {
            console.error('Order update error:', updateError)
            return NextResponse.json({ error: '訂單更新失敗' }, { status: 500 })
        }

        // 將商品加入收禮者庫存
        const inventoryItems = order.order_items.map((item: any) => ({
            user_id: order.recipient_id,
            product_id: item.product_id,
            status: 'active',
            data: {
                gift_from: user.id,
                order_id: orderId,
                gift_note: order.note
            }
        }))

        const { error: inventoryError } = await supabase
            .from('inventory')
            .insert(inventoryItems)

        if (inventoryError) {
            console.error('Inventory insert error:', inventoryError)
            // 不回滾訂單，但記錄錯誤
        }

        // 發送通知給收禮者
        const { data: buyer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const productNames = order.order_items.map((item: any) => item.product_name).join('、')

        await supabase.from('notifications').insert({
            user_id: order.recipient_id,
            title: '🎁 收到新禮物！',
            message: `${buyer?.full_name || '您的家人'} 送給您：${productNames}${order.note ? `\n留言：${order.note}` : ''}`,
            type: 'info'
        })

        return NextResponse.json({
            success: true,
            orderId,
            orderNumber: order.order_number,
            transactionId: mockTransactionId,
            message: '付款成功！禮物已送達長輩'
        })

    } catch (error: any) {
        console.error('Payment confirm error:', error)
        return NextResponse.json({ error: error.message || '系統錯誤' }, { status: 500 })
    }
}

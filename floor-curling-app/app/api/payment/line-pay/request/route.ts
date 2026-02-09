import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * LINE Pay 付款請求 API (Mock 版本)
 * 
 * 流程：
 * 1. 驗證使用者身份
 * 2. 驗證商品資訊
 * 3. 建立訂單
 * 4. 回傳付款 URL (Mock: 導向確認頁)
 */
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // 使用 service role 建立訂單
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
        const { items, recipientId, note } = body

        // items: [{ productId, quantity }]
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: '請選擇商品' }, { status: 400 })
        }

        if (!recipientId) {
            return NextResponse.json({ error: '請指定收禮者' }, { status: 400 })
        }

        // 取得商品資訊
        const productIds = items.map((item: any) => item.productId)
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id, name, price_twd, is_active')
            .in('id', productIds)

        if (productError || !products) {
            return NextResponse.json({ error: '商品查詢失敗' }, { status: 500 })
        }

        // 驗證所有商品都存在且可購買
        const productMap = new Map(products.map(p => [p.id, p]))
        let totalAmount = 0
        const orderItems: any[] = []

        for (const item of items) {
            const product = productMap.get(item.productId)
            if (!product) {
                return NextResponse.json({ error: `商品 ${item.productId} 不存在` }, { status: 400 })
            }
            if (!product.is_active) {
                return NextResponse.json({ error: `商品 ${product.name} 已下架` }, { status: 400 })
            }
            if (!product.price_twd) {
                return NextResponse.json({ error: `商品 ${product.name} 價格未設定` }, { status: 400 })
            }

            const quantity = item.quantity || 1
            const subtotal = product.price_twd * quantity
            totalAmount += subtotal

            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity,
                unit_price: product.price_twd,
                subtotal
            })
        }

        // 生成訂單編號
        const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

        // 建立訂單
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: user.id,
                recipient_id: recipientId,
                total_amount: totalAmount,
                note: note || null,
                status: 'pending'
            })
            .select()
            .single()

        if (orderError) {
            console.error('Order creation error:', orderError)
            return NextResponse.json({ error: '訂單建立失敗' }, { status: 500 })
        }

        // 建立訂單明細
        const itemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }))

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsWithOrderId)

        if (itemsError) {
            console.error('Order items creation error:', itemsError)
            // 回滾訂單
            await supabase.from('orders').delete().eq('id', order.id)
            return NextResponse.json({ error: '訂單明細建立失敗' }, { status: 500 })
        }

        // Mock LINE Pay: 回傳確認頁 URL
        // 真實環境會呼叫 LINE Pay API 並回傳 LINE Pay 的付款頁面 URL
        const confirmUrl = `/family/shop/checkout/confirm?orderId=${order.id}&orderNumber=${orderNumber}`

        return NextResponse.json({
            success: true,
            orderId: order.id,
            orderNumber,
            totalAmount,
            paymentUrl: confirmUrl // Mock payment URL
        })

    } catch (error: any) {
        console.error('Payment request error:', error)
        return NextResponse.json({ error: error.message || '系統錯誤' }, { status: 500 })
    }
}

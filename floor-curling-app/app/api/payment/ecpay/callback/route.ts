import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCallback } from '@/lib/ecpay'

/**
 * ECPay 付款結果回傳 API (Server-to-Server)
 * 
 * 綠界會在付款完成後 POST 到此 URL
 * 必須回傳 "1|OK" 告知綠界已成功接收
 * 
 * 注意：此 API 是由綠界伺服器呼叫，不帶使用者 Cookie
 * 因此使用 Service Role 直接操作資料庫
 */
export async function POST(request: NextRequest) {
    try {
        // 綠界回傳的資料是 application/x-www-form-urlencoded
        const formData = await request.formData()
        const params: Record<string, string> = {}
        formData.forEach((value, key) => {
            params[key] = value.toString()
        })

        console.log('ECPay callback received:', JSON.stringify(params))

        // 1. 驗證 CheckMacValue
        if (!verifyCallback(params)) {
            console.error('ECPay callback: CheckMacValue verification failed')
            return new NextResponse('0|CheckMacValue Error', { status: 400 })
        }

        // 2. 檢查交易結果
        const rtnCode = params.RtnCode   // 1 = 付款成功
        const merchantTradeNo = params.MerchantTradeNo
        const tradeNo = params.TradeNo    // 綠界交易編號
        const tradeAmt = params.TradeAmt
        const paymentDate = params.PaymentDate

        if (!merchantTradeNo) {
            console.error('ECPay callback: Missing MerchantTradeNo')
            return new NextResponse('0|Missing MerchantTradeNo', { status: 400 })
        }

        // 使用 Service Role 操作資料庫（不需要使用者 Cookie）
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 3. 查找對應的訂單
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('ecpay_trade_no', merchantTradeNo)
            .single()

        if (orderError || !order) {
            console.error('ECPay callback: Order not found for', merchantTradeNo, orderError)
            return new NextResponse('1|OK')  // 仍回傳 OK 避免綠界重試
        }

        // 避免重複處理
        if (order.status === 'paid') {
            console.log('ECPay callback: Order already paid', merchantTradeNo)
            return new NextResponse('1|OK')
        }

        // 4. 付款成功
        if (rtnCode === '1') {
            // 更新訂單狀態
            await supabase
                .from('orders')
                .update({
                    status: 'paid',
                    payment_transaction_id: tradeNo,
                    paid_at: paymentDate || new Date().toISOString()
                })
                .eq('id', order.id)

            // 將商品加入收禮者庫存
            if (order.order_items && order.order_items.length > 0) {
                const inventoryItems = order.order_items.map((item: any) => ({
                    user_id: order.recipient_id,
                    product_id: item.product_id,
                    status: 'active',
                    data: {
                        gift_from: order.buyer_id,
                        order_id: order.id,
                        gift_note: order.note,
                        payment_method: 'ecpay'
                    }
                }))

                const { error: inventoryError } = await supabase
                    .from('inventory')
                    .insert(inventoryItems)

                if (inventoryError) {
                    console.error('ECPay callback: Inventory insert error:', inventoryError)
                }
            }

            // 發送通知給收禮者
            const { data: buyer } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', order.buyer_id)
                .single()

            const productNames = order.order_items
                .map((item: any) => item.product_name)
                .join('、')

            await supabase.from('notifications').insert({
                user_id: order.recipient_id,
                title: '🎁 收到新禮物！',
                message: `${buyer?.full_name || '您的家人'} 送給您：${productNames}${order.note ? `\n留言：${order.note}` : ''}`,
                type: 'info'
            })

            console.log('ECPay callback: Payment success for', merchantTradeNo)
        } else {
            // 付款失敗
            await supabase
                .from('orders')
                .update({
                    status: 'cancelled',
                    payment_transaction_id: tradeNo
                })
                .eq('id', order.id)

            console.log('ECPay callback: Payment failed for', merchantTradeNo, 'RtnCode:', rtnCode)
        }

        // 5. 回傳 "1|OK"
        return new NextResponse('1|OK')

    } catch (error: any) {
        console.error('ECPay callback error:', error)
        return new NextResponse('1|OK')  // 即使錯誤也回傳 OK 避免綠界無限重試
    }
}

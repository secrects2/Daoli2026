'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface OrderInfo {
    id: string
    order_number: string
    total_amount: number
    recipient_name: string
    items: { product_name: string; quantity: number; unit_price: number }[]
    note: string | null
}

function CheckoutConfirmContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orderId = searchParams.get('orderId')
    const orderNumber = searchParams.get('orderNumber')

    const [order, setOrder] = useState<OrderInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (orderId) {
            fetchOrder()
        } else {
            setError('缺少訂單資訊')
            setLoading(false)
        }
    }, [orderId])

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, order_number, total_amount, note,
                    recipient:profiles!recipient_id(full_name),
                    order_items(product_name, quantity, unit_price)
                `)
                .eq('id', orderId)
                .single()

            if (error) throw error

            setOrder({
                id: data.id,
                order_number: data.order_number,
                total_amount: data.total_amount,
                recipient_name: (data.recipient as any)?.full_name || '長輩',
                items: data.order_items,
                note: data.note
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmPayment = async () => {
        setProcessing(true)
        try {
            const res = await fetch('/api/payment/line-pay/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            router.push(`/family/shop/payment-result?success=true&orderNumber=${orderNumber}`)

        } catch (err: any) {
            setError(err.message)
            setProcessing(false)
        }
    }

    const handleCancel = () => {
        router.push('/family/shop')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card rounded-xl p-8 shadow-lg text-center max-w-md">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-foreground mb-2">發生錯誤</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/family/shop')}
                        className="px-6 py-2 bg-primary text-white rounded-lg"
                    >
                        返回商店
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-card shadow-card py-4 px-4 sticky top-0 z-10">
                <div className="max-w-lg mx-auto flex items-center gap-3">
                    <button onClick={handleCancel} className="p-2 hover:bg-muted rounded-full" aria-label="返回">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold">確認付款</h1>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">
                {/* 訂單資訊 */}
                <div className="bg-card rounded-xl shadow-card p-5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-muted-foreground">訂單編號</span>
                        <span className="font-mono text-sm">{order?.order_number}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-muted-foreground">收禮者</span>
                        <span className="font-medium">{order?.recipient_name}</span>
                    </div>
                    {order?.note && (
                        <div className="bg-yellow-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800">💬 {order.note}</p>
                        </div>
                    )}
                </div>

                {/* 商品列表 */}
                <div className="bg-card rounded-xl shadow-card p-5">
                    <h3 className="font-medium text-gray-700 mb-3">購買商品</h3>
                    <div className="space-y-3">
                        {order?.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div>
                                    <span className="text-foreground">{item.product_name}</span>
                                    <span className="text-muted-foreground text-sm ml-2">x{item.quantity}</span>
                                </div>
                                <span className="font-medium">NT$ {item.unit_price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t mt-4 pt-4 flex justify-between items-center">
                        <span className="font-bold text-lg">總計</span>
                        <span className="font-bold text-2xl text-orange-600">NT$ {order?.total_amount}</span>
                    </div>
                </div>

                {/* 付款方式 */}
                <div className="bg-card rounded-xl shadow-card p-5">
                    <h3 className="font-medium text-gray-700 mb-3">付款方式</h3>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-2 border-green-500">
                        <div className="w-10 h-10 bg-[#06C755] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">LINE</span>
                        </div>
                        <div>
                            <p className="font-medium text-foreground">LINE Pay</p>
                            <p className="text-xs text-muted-foreground">模擬付款（測試環境）</p>
                        </div>
                    </div>
                </div>

                {/* 付款按鈕 */}
                <button
                    onClick={handleConfirmPayment}
                    disabled={processing}
                    className="w-full py-4 bg-[#06C755] hover:bg-[#05b84d] text-white font-bold text-lg rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            處理中...
                        </>
                    ) : (
                        <>
                            <span>確認付款 NT$ {order?.total_amount}</span>
                        </>
                    )}
                </button>

                <button
                    onClick={handleCancel}
                    className="w-full py-3 text-muted-foreground hover:text-gray-700"
                >
                    取消訂單
                </button>
            </div>
        </div>
    )
}

export default function CheckoutConfirmPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        }>
            <CheckoutConfirmContent />
        </Suspense>
    )
}

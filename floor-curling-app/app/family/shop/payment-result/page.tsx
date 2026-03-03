'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const success = searchParams.get('success') === 'true'
    const orderNumber = searchParams.get('orderNumber')

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
                <div className="bg-card rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
                    {/* 成功動畫 */}
                    <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground mb-2">付款成功！🎉</h1>
                    <p className="text-gray-600 mb-6">禮物已送達長輩帳號，長輩會收到通知。</p>

                    {orderNumber && (
                        <div className="bg-background rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground">訂單編號</p>
                            <p className="font-mono font-bold text-foreground">{orderNumber}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/family/shop')}
                            className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                        >
                            繼續購物
                        </button>
                        <button
                            onClick={() => router.push('/family/portal')}
                            className="w-full py-3 bg-muted hover:bg-accent text-gray-700 font-medium rounded-xl transition-colors"
                        >
                            返回首頁
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // 失敗狀態
    return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
                <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">付款失敗</h1>
                <p className="text-gray-600 mb-6">抱歉，付款過程中發生問題。請稍後再試。</p>

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/family/shop')}
                        className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                    >
                        返回商店
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}

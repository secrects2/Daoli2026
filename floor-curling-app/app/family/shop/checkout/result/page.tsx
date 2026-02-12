'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function ResultContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    // 綠界付款完成後會導回此頁面
    // 實際付款狀態由 callback API 處理（Server-to-Server）
    // 這裡只顯示一個通用的「付款完成」訊息

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">付款流程完成</h1>
                <p className="text-gray-500 mb-6">
                    若付款成功，禮物將自動送達長輩帳戶。<br />
                    您可以在訂單記錄中查看詳情。
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/family/shop')}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        繼續購物
                    </button>
                    <button
                        onClick={() => router.push('/family/portal')}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        回到首頁
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        }>
            <ResultContent />
        </Suspense>
    )
}

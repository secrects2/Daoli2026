'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
    id: string
    name: string
    description: string
    price_points: number
    image_url: string
    type: string
}

interface FamilyShopClientProps {
    user: any
    elder: any | null
    points: number
    products: Product[]
}

export default function FamilyShopClient({ user, elder, points: initialPoints, products }: FamilyShopClientProps) {
    const router = useRouter()
    const [points, setPoints] = useState(initialPoints)
    const [purchasing, setPurchasing] = useState<string | null>(null)

    const handleBuy = async (product: Product) => {
        if (!elder) return alert('請先綁定長輩帳號')

        if (!confirm(`確定要為 ${elder.full_name} 購買「${product.name}」嗎？\n(將扣除長輩積分 ${product.price_points})`)) return

        setPurchasing(product.id)
        try {
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    buyerId: user.id,
                    targetUserId: elder.id // Buying FOR Elder
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert(`購買成功！長輩 ${elder.full_name} 會很高興的！`)
            setPoints(data.remainingPoints)
            router.refresh()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setPurchasing(null)
        }
    }

    if (!elder) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <p className="text-xl text-gray-600 mb-4">您尚未綁定長輩，無法使用商店功能。</p>
                <button onClick={() => router.back()} className="text-blue-600 underline">返回</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white shadow-sm pt-4 pb-4 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-600 hover:bg-gray-100 p-2 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">送禮給 {elder.full_name}</h1>
                            <p className="text-xs text-gray-500">協助長輩兌換裝備與戰力</p>
                        </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <div>
                            <p className="text-[10px] text-yellow-600 leading-none">長輩積分</p>
                            <p className="font-bold text-yellow-800 leading-none">{points}</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all border border-transparent hover:border-blue-200">
                            <div className="aspect-video bg-gray-100 p-6 flex items-center justify-center">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.type === 'equipment'
                                        ? 'bg-green-100 text-green-700'
                                        : product.type === 'avatar' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                        {product.type === 'equipment' ? '🛡️ 戰力裝備' : product.type === 'avatar' ? '👕 外觀造型' : '🏆 榮譽徽章'}
                                    </span>
                                    <span className="font-bold text-orange-600 text-lg">{product.price_points} 分</span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{product.description}</p>

                                <button
                                    onClick={() => handleBuy(product)}
                                    disabled={!!purchasing || points < product.price_points}
                                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${points >= product.price_points
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {purchasing === product.id ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            處理中...
                                        </>
                                    ) : (
                                        <>
                                            <span>🎁</span>
                                            {points >= product.price_points ? '贈送禮物' : '積分不足'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

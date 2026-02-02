'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
    id: string
    name: string
    description: string
    price: number
    image_url: string
    category: string
}

interface ElderShopClientProps {
    user: any
    points: number
    products: Product[]
}

export default function ElderShopClient({ user, points: initialPoints, products }: ElderShopClientProps) {
    const router = useRouter()
    const [points, setPoints] = useState(initialPoints)
    const [purchasing, setPurchasing] = useState<string | null>(null)

    const handleBuy = async (product: Product) => {
        if (!confirm(`確定要花費 ${product.price} 積分購買「${product.name}」嗎？`)) return

        setPurchasing(product.id)
        try {
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    buyerId: user.id,
                    targetUserId: user.id // Elder buying for self
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('購買成功！')
            setPoints(data.remainingPoints)
            router.refresh()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setPurchasing(null)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-2xl">⬅️</button>
                    <h1 className="text-xl font-bold">榮譽商店</h1>
                    <div className="bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-1">
                        <span>💰</span>
                        <span className="font-bold text-yellow-700">{points}</span>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Categories - Simplified for now */}
                <div className="space-y-4">
                    {products.map(product => (
                        <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 items-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-xl flex-shrink-0 p-2">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200">
                                        {product.category === 'health' ? '健康' : '裝備'}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-orange-600 font-bold text-lg">{product.price} 分</span>
                                    <button
                                        onClick={() => handleBuy(product)}
                                        disabled={!!purchasing || points < product.price}
                                        className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${points >= product.price
                                            ? 'bg-blue-600 text-white shadow-md active:scale-95'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {purchasing === product.id ? '處理中...' : '購買'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

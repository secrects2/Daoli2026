'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface Product {
    id: string
    name: string
    description: string
    price_points: number
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
    const { confirm } = useConfirm()
    const [points, setPoints] = useState(initialPoints)
    const [purchasing, setPurchasing] = useState<string | null>(null)

    // 暫時隱藏地壺球相關商品
    const hideKeywords = ['壺', '底座', '把手', '藍衫', '戰袍', '披風', '徽章']
    const filteredProducts = products.filter(product => {
        return !hideKeywords.some(keyword => product.name.includes(keyword))
    })

    const handleBuy = async (product: Product) => {
        if (!await confirm({ message: `確定要花費 ${product.price_points} 積分購買「${product.name}」嗎？`, confirmLabel: '購買' })) return

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

            toast.success('購買成功！')
            setPoints(data.remainingPoints)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setPurchasing(null)
        }
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl pt-5 pb-2 px-4 border-b border-border shadow-soft">
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-2xl">⬅️</button>
                    <h1 className="text-lg font-extrabold text-foreground">榮譽商店</h1>
                    <div className="bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                        <span>💰</span>
                        <span className="font-bold text-amber-700">{points}</span>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Categories - Simplified for now */}
                <div className="space-y-4">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex gap-4 items-center hover:shadow-card-hover transition-shadow">
                            <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0 p-2">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-base text-foreground">{product.name}</h3>
                                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                                        {product.category === 'health' ? '健康' : '裝備'}
                                    </span>
                                </div>
                                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{product.description}</p>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-amber-600 font-bold text-lg">{product.price_points} 分</span>
                                    <button
                                        onClick={() => handleBuy(product)}
                                        disabled={!!purchasing || points < product.price_points}
                                        className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${points >= product.price_points
                                            ? 'bg-primary text-primary-foreground shadow-md active:scale-95'
                                            : 'bg-muted text-muted-foreground cursor-not-allowed'
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

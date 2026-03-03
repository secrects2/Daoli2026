'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getAiPrescription } from '@/lib/ai-diagnosis'

interface Product {
    id: string
    name: string
    description: string
    price_points: number
    price_twd: number | null
    image_url: string
    type: string
}

interface FamilyShopClientProps {
    user: any
    elder: any | null
    points: number
    products: Product[]
    aiSessions?: any[]
}

export default function FamilyShopClient({ user, elder, products, aiSessions = [] }: FamilyShopClientProps) {
    const router = useRouter()
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    // 暫時隱藏地壺球相關裝備
    const floorCurlingKeywords = ['壺', '底座', '把手', '藍衫', '戰袍', '披風', '徽章']
    const displayProducts = products.filter(p => !floorCurlingKeywords.some(kw => p.name.includes(kw)))

    const handleBuyClick = (product: Product) => {
        if (!elder) {
            toast.error('請先綁定長輩帳號')
            return
        }
        setSelectedProduct(product)
        setShowNoteModal(true)
    }

    const handleConfirmPurchase = async () => {
        if (!selectedProduct || !elder) return

        setPurchasing(selectedProduct.id)
        setShowNoteModal(false)

        try {
            const res = await fetch('/api/payment/ecpay/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{ productId: selectedProduct.id, quantity: 1 }],
                    recipientId: elder.id,
                    note: note || null
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }

            // ECPay API 回傳 HTML 表單，包含自動送出腳本
            // 使用動態建立 div 方式插入當前頁面以避免破壞 PWA 路由歷史
            const html = await res.text()
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = html
            tempDiv.style.display = 'none'
            document.body.appendChild(tempDiv)

            const form = tempDiv.querySelector('form')
            if (form) {
                form.submit()
            } else {
                throw new Error('無法產生付款表單')
            }

        } catch (error: any) {
            toast.error(error.message)
            setPurchasing(null)
        }
    }

    if (!elder) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <p className="text-xl text-gray-600 mb-4">您尚未綁定長輩，無法使用商店功能。</p>
                <button onClick={() => router.push('/family/bind')} className="text-primary underline">
                    前往綁定
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card shadow-card pt-4 pb-4 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-600 hover:bg-muted p-2 rounded-full" aria-label="返回">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">送禮給 {elder.full_name}</h1>
                            <p className="text-xs text-muted-foreground">💰 用新台幣為長輩購買禮物</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {aiSessions.length > 0 && (
                    <div className="mb-8 p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-card relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 text-8xl opacity-5">💡</div>
                        <h4 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2 relative z-10">
                            <span>✨</span> 專屬 AI 智能推薦
                        </h4>
                        <p className="text-sm text-indigo-800 mb-4 relative z-10 font-medium tracking-wide">
                            根據 {elder.full_name} 的最新 AI 處方分析結果，我們為您推薦最適合的配件：
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                            {getAiPrescription(aiSessions[0].metrics || {}).recommendedProducts?.map((product, idx) => {
                                // Find actual product to pass to handleBuyClick
                                const actualProduct = products.find(p => p.name === product.name)

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => actualProduct && handleBuyClick(actualProduct)}
                                        className={`bg-card/90 backdrop-blur-sm p-4 rounded-xl flex items-center gap-4 shadow-card border border-indigo-50 transition-all group ${actualProduct ? 'hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'opacity-70'}`}
                                    >
                                        <div className="text-4xl bg-indigo-50/50 w-16 h-16 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform">{product.icon}</div>
                                        <div className="flex-1">
                                            <p className="font-bold text-foreground text-lg">{product.name}</p>
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{product.reason}</p>
                                        </div>
                                        {actualProduct && (
                                            <button className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                贈送 &rarr;
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {displayProducts.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">目前沒有可購買的商品</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayProducts.map(product => (
                            <div key={product.id} className="bg-card rounded-xl shadow-card overflow-hidden hover:shadow-md transition-all border border-transparent hover:border-blue-200">
                                <div className="aspect-video bg-muted p-6 flex items-center justify-center">
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.type === 'equipment'
                                            ? 'bg-green-100 text-green-700'
                                            : product.type === 'avatar'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {product.type === 'equipment' ? '🛡️ 戰力裝備' : product.type === 'avatar' ? '👕 外觀造型' : '🏆 榮譽徽章'}
                                        </span>
                                        <span className="font-bold text-orange-600 text-lg">
                                            NT$ {product.price_twd || product.price_points}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-foreground text-lg mb-1">{product.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">{product.description}</p>

                                    <button
                                        onClick={() => handleBuyClick(product)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors bg-primary text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {purchasing === product.id ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                處理中...
                                            </>
                                        ) : (
                                            <>
                                                <span>🎁</span>
                                                贈送禮物
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Note Modal */}
            {showNoteModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-foreground mb-4">送禮給 {elder.full_name}</h3>

                        <div className="bg-background rounded-lg p-4 mb-4">
                            <div className="flex justify-between">
                                <span className="font-medium">{selectedProduct.name}</span>
                                <span className="text-orange-600 font-bold">NT$ {selectedProduct.price_twd || selectedProduct.price_points}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                附上祝福語（選填）
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="例：爸爸加油！比賽必勝！"
                                className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowNoteModal(false)
                                    setSelectedProduct(null)
                                    setNote('')
                                }}
                                className="flex-1 py-3 bg-muted text-gray-700 rounded-lg font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleConfirmPurchase}
                                className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                            >
                                💳 信用卡付款
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

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
}

export default function FamilyShopClient({ user, elder, products }: FamilyShopClientProps) {
    const router = useRouter()
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

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

            // ECPay API 回傳 HTML 表單，需要在新頁面中渲染並自動提交到綠界
            const html = await res.text()
            const newWindow = window.open('', '_self')
            if (newWindow) {
                newWindow.document.write(html)
                newWindow.document.close()
            }

        } catch (error: any) {
            toast.error(error.message)
            setPurchasing(null)
        }
    }

    if (!elder) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <p className="text-xl text-gray-600 mb-4">您尚未綁定長輩，無法使用商店功能。</p>
                <button onClick={() => router.push('/family/bind')} className="text-blue-600 underline">
                    前往綁定
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white shadow-sm pt-4 pb-4 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-600 hover:bg-gray-100 p-2 rounded-full" aria-label="返回">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">送禮給 {elder.full_name}</h1>
                            <p className="text-xs text-gray-500">💰 用新台幣為長輩購買禮物</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {products.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-500">目前沒有可購買的商品</p>
                    </div>
                ) : (
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
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{product.description}</p>

                                    <button
                                        onClick={() => handleBuyClick(product)}
                                        disabled={!!purchasing}
                                        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">送禮給 {elder.full_name}</h3>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
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
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleConfirmPurchase}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
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

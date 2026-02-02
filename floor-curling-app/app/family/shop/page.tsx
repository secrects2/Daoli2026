'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function FamilyShop() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [user, setUser] = useState<any>(null)
    const [elder, setElder] = useState<any>(null)
    const [points, setPoints] = useState(0)
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // 1. Get Family Profile to find Elder ID
            const { data: familyProfile } = await supabase.from('profiles').select('linked_elder_id').eq('id', user.id).single()

            if (familyProfile?.linked_elder_id) {
                // 2. Get Elder Profile (Name) & Wallet (Points)
                const { data: elderProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('id', familyProfile.linked_elder_id)
                    .single()

                if (elderProfile) {
                    setElder(elderProfile)

                    const { data: wallet } = await supabase
                        .from('wallets')
                        .select('local_points')
                        .eq('user_id', elderProfile.id)
                        .single()

                    if (wallet) setPoints(wallet.local_points || 0)
                }
            }

            // Fetch Products
            const { data: products } = await supabase.from('products').select('*').order('price', { ascending: true })
            if (products) setProducts(products)

            setLoading(false)
        }
        init()
    }, [supabase, router])

    const handleBuy = async (product: any) => {
        if (!elder) return alert('請先綁定長輩帳號')

        if (!confirm(`確定要為 ${elder.full_name} 購買「${product.name}」嗎？\n(將扣除長輩積分 ${product.price})`)) return

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

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

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
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${product.category === 'health'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {product.category === 'health' ? '❤️ 健康補給' : '🛡️ 戰力裝備'}
                                    </span>
                                    <span className="font-bold text-orange-600 text-lg">{product.price} 分</span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{product.description}</p>

                                <button
                                    onClick={() => handleBuy(product)}
                                    disabled={!!purchasing || points < product.price}
                                    className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${points >= product.price
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
                                            {points >= product.price ? '贈送禮物' : '積分不足'}
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

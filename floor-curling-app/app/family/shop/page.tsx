'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function ShopPage() {
    const [points, setPoints] = useState(0)
    const [loading, setLoading] = useState(true)

    // Fake Shop Data
    const products = [
        { id: 1, name: '專業冰壺推桿', price: 500, image: '🏑', desc: '輕量化設計，適合長輩使用' },
        { id: 2, name: '防滑運動手套', price: 200, image: '🧤', desc: '增加抓握力，安全更有保障' },
        { id: 3, name: '能量營養棒 (盒)', price: 150, image: '🍫', desc: '比賽後的最佳體力補充' },
        { id: 4, name: '道里紀念毛巾', price: 300, image: '🧣', desc: '吸汗透氣，舒適運動體驗' },
        { id: 5, name: '關節護膝', price: 800, image: '🦵', desc: '保護膝蓋，減少運動傷害' },
        { id: 6, name: '線上課程：戰術分析', price: 1000, image: '🎓', desc: '大師級教練親自解說' },
    ]

    useEffect(() => {
        // Fetch fake wallet points
        const fetchPoints = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Try to get linked elder's wallet
                const { data: profile } = await supabase.from('profiles').select('linked_elder_id').eq('id', user.id).single()
                if (profile?.linked_elder_id) {
                    const { data: wallet } = await supabase.from('wallets').select('global_points').eq('user_id', profile.linked_elder_id).single()
                    if (wallet) setPoints(wallet.global_points)
                }
            }
            setLoading(false)
        }
        fetchPoints()
    }, [])

    const handleBuy = (product: any) => {
        if (points < product.price) {
            alert('積分不足！請多鼓勵長輩參加比賽賺取積分。')
            return
        }
        if (confirm(`確定要花費 ${product.price} 積分兌換「${product.name}」嗎？`)) {
            alert('兌換成功！商品將寄送至長輩所屬據點。')
            setPoints(prev => prev - product.price)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/family/dashboard" className="text-blue-600 font-medium">← 返回</Link>
                        <h1 className="text-lg font-bold">數位市集</h1>
                    </div>
                    <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        🪙 {loading ? '...' : points.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Banner */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white shadow-md">
                    <h2 className="text-2xl font-bold mb-2">長輩專屬裝備</h2>
                    <p className="opacity-90">用積分兌換優質商品，讓運動更安全、更有趣！</p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map(p => (
                        <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center text-4xl">
                                {p.image}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 mb-1">{p.name}</h3>
                                <p className="text-xs text-gray-500 mb-3 flex-1">{p.desc}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="font-bold text-amber-600">
                                        {p.price} 積分
                                    </span>
                                    <button
                                        onClick={() => handleBuy(p)}
                                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full hover:bg-blue-700 active:scale-95 transition-transform"
                                    >
                                        兌換
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

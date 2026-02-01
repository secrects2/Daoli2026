'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function FamilyPointsPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [points, setPoints] = useState(0)
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('linked_elder_id').eq('id', user.id).single()
                if (profile?.linked_elder_id) {
                    const { data: wallet } = await supabase.from('wallets').select('global_points').eq('user_id', profile.linked_elder_id).single()
                    if (wallet) setPoints(wallet.global_points)

                    // Fake History
                    setHistory([
                        { id: 1, type: 'earn', title: '贏得比賽', amount: 50, date: '2025/02/01' },
                        { id: 2, type: 'earn', title: '每日簽到', amount: 10, date: '2025/02/01' },
                        { id: 3, type: 'spend', title: '兌換商品：運動手套', amount: -200, date: '2025/01/28' },
                        { id: 4, type: 'earn', title: '贏得比賽', amount: 50, date: '2025/01/25' },
                    ])
                }
            }
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-bold">積分查詢</h1>
                    </div>
                    <Link href="/family/shop" className="text-sm font-bold text-blue-600">
                        去兌換商品 →
                    </Link>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <p className="opacity-90 text-sm font-medium mb-1">目前累積積分</p>
                    <h2 className="text-4xl font-bold">{loading ? '...' : points.toLocaleString()}</h2>
                    <div className="mt-4 flex gap-3">
                        <Link href="/family/shop" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                            🛍️ 兌換商品
                        </Link>
                    </div>
                </div>

                {/* History */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-3 px-1">積分記錄</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                        {history.map(item => (
                            <div key={item.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                                        ${item.type === 'earn' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}
                                    `}>
                                        {item.type === 'earn' ? '💰' : '🎁'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{item.title}</p>
                                        <p className="text-xs text-gray-500">{item.date}</p>
                                    </div>
                                </div>
                                <span className={`font-mono font-bold ${item.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                    {item.amount > 0 ? '+' : ''}{item.amount}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

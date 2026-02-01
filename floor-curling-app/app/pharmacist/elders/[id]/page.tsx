'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function GenericElderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [elder, setElder] = useState<any>(null)
    const [family, setFamily] = useState<any[]>([])
    const [equipment, setEquipment] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totalMatches: 0, winRate: 0, points: 0 })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchElderData = async () => {
            if (!params.id) return

            // 1. Fetch Profile & Wallet
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', params.id)
                .single()

            if (!profile) {
                alert('查無此長輩')
                router.push('/pharmacist/elders')
                return
            }

            const { data: wallet } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', params.id)
                .single()

            setElder({ ...profile, points: wallet?.global_points || 0 })

            // 2. Fetch Linked Family
            const { data: familyMembers } = await supabase
                .from('profiles')
                .select('*')
                .eq('linked_elder_id', params.id)

            setFamily(familyMembers || [])

            // 3. Fetch Stats (Matches)
            const { count: matchCount } = await supabase
                .from('user_interactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', params.id)
                .eq('interaction_type', 'match_result')

            const { count: winCount } = await supabase
                .from('user_interactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', params.id)
                .eq('interaction_type', 'match_result')
                .eq('data->>result', 'win')

            setStats({
                totalMatches: matchCount || 0,
                winRate: matchCount ? Math.round((winCount || 0) / matchCount * 100) : 0,
                points: wallet?.global_points || 0
            })

            // 4. Fetch Equipment (Simulated via Point Transactions)
            const allProducts = [
                { id: 1, name: '專業冰壺推桿', icon: '🏑', price: 500 },
                { id: 2, name: '防滑運動手套', icon: '🧤', price: 200 },
                { id: 3, name: '能量營養棒', icon: '🍫', price: 150 },
                { id: 4, name: '紀念毛巾', icon: '🧣', price: 300 },
            ]

            const { data: transactions } = await supabase
                .from('point_transactions')
                .select('description')
                .eq('wallet_id', wallet?.id)
                .eq('type', 'spent')

            const ownedProductIds = new Set()
            transactions?.forEach(t => {
                allProducts.forEach(p => {
                    if (t.description?.includes(p.name)) {
                        ownedProductIds.add(p.id)
                    }
                })
            })

            setEquipment(allProducts.map(p => ({
                ...p,
                owned: ownedProductIds.has(p.id)
            })))

            setLoading(false)
        }
        fetchElderData()
    }, [params.id, supabase, router])

    if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">載入中...</div>
    if (!elder) return null

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Nav */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link href="/pharmacist/elders" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        &larr; 返回長輩名單
                    </Link>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <img
                        src={elder.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=defaults'}
                        className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg"
                        alt="Avatar"
                    />
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{elder.full_name}</h1>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            加入時間：{new Date(elder.created_at).toLocaleDateString('zh-TW')}
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-600 mt-2">
                            <span>📱 0912-345-678</span>
                            <span>📍 台北大安旗艦店</span>
                        </div>
                    </div>
                    {/* Key Stat Big Number */}
                    <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-amber-600 text-xs font-bold uppercase mb-1">目前積分</p>
                        <p className="text-3xl font-mono font-black text-amber-600">{stats.points}</p>
                    </div>
                </div>

                {/* Additional Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Health/Notes */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span>📋</span> 健康與備註
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">緊急聯絡人</p>
                                    <p className="font-medium">王曉明 (兒子)</p>
                                    <p className="text-sm text-blue-600">0988-888-888</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">健康注意事項</p>
                                    <p className="font-medium text-red-600">高血壓、膝蓋舊傷</p>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg">
                                💡 備註：每週二固定參加早上的復健課程，比賽安排請避開該時段。
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">生涯戰績</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                <span className="text-gray-500">總場次</span>
                                <span className="font-bold text-xl">{stats.totalMatches}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                <span className="text-gray-500">勝率</span>
                                <span className={`font-bold text-xl ${stats.winRate > 50 ? 'text-red-500' : 'text-gray-700'}`}>
                                    {stats.winRate}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">排名</span>
                                <span className="font-bold text-xl text-yellow-600">Top 10%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Family Connections */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>👨‍👩‍👧‍👦</span> 綁定家屬 ({family.length})
                    </h3>

                    {family.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {family.map(f => (
                                <div key={f.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                                    <img
                                        src={f.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fam'}
                                        className="w-12 h-12 rounded-full bg-gray-100"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900">{f.full_name}</p>
                                        <p className="text-xs text-gray-500">最後上線：{new Date(f.updated_at).toLocaleDateString()}</p>
                                        <div className="flex gap-2 mt-1">
                                            <button className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">發送訊息</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-400 mb-2">尚未綁定任何家屬</p>
                            <button className="text-sm text-blue-600 font-bold hover:underline">
                                下載綁定 QR Code
                            </button>
                        </div>
                    )}
                </div>

                {/* Equipment Inventory */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🎒</span> 裝備庫與成就
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {equipment.map(item => (
                            <div
                                key={item.id}
                                className={`
                                    relative p-4 rounded-xl border text-center transition-all
                                    ${item.owned
                                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200 shadow-sm'
                                        : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
                                    }
                                `}
                            >
                                <div className="text-4xl mb-2">{item.icon}</div>
                                <p className={`text-sm font-bold ${item.owned ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {item.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {item.owned ? '已擁有' : '未解鎖'}
                                </p>
                                {item.owned && (
                                    <div className="absolute top-2 right-2 text-green-500">
                                        ✓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    )
}

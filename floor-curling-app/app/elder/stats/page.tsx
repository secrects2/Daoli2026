'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ElderStatsPage() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const res = await fetch(`/api/elder/stats?id=${user.id}`)
            const data = await res.json()
            setStats(data)
            setLoading(false)
        }
        fetchStats()
    }, [router, supabase])

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5 flex items-center gap-3">
                <Link href="/elder/dashboard" className="text-blue-500 font-medium">
                    ← 返回
                </Link>
                <h1 className="text-xl font-bold flex-1 text-center pr-10">健康存摺詳情</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 text-sm mb-1">本週場次</p>
                        <p className="text-3xl font-bold text-blue-600">{stats?.weeklyMatches || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 text-sm mb-1">累積積分</p>
                        <p className="text-3xl font-bold text-orange-500">{stats?.totalPoints || 0}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">近期表現 (積分趨勢)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.history || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    hide
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="points"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">詳細紀錄</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats?.recentMatches?.map((match: any, index: number) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${match.result === 'win' ? 'bg-yellow-100 text-yellow-600' :
                                            match.result === 'loss' ? 'bg-gray-100 text-gray-500' :
                                                'bg-blue-50 text-blue-500'
                                        }`}>
                                        {match.result === 'win' ? '🏆' : match.result === 'loss' ? '💪' : '🤝'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{match.date}</p>
                                        <p className="text-xs text-gray-500">{match.result === 'win' ? '勝利' : match.result === 'loss' ? '完賽' : '平局'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">+{match.points}</p>
                                    <p className="text-xs text-gray-500">積分</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

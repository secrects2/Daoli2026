'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function AdminMatchesPage() {
    const [matches, setMatches] = useState<any[]>([])
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const res = await fetch('/api/admin/matches')
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || 'Failed to fetch')

                if (data.success && data.matches) {
                    setMatches(data.matches)

                    // Process for Chart
                    const grouped = data.matches.reduce((acc: any, curr: any) => {
                        const date = new Date(curr.completed_at || curr.created_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
                        acc[date] = (acc[date] || 0) + 1
                        return acc
                    }, {})

                    const chart = Object.keys(grouped).reverse().map(date => ({
                        date,
                        count: grouped[date]
                    }))
                    setChartData(chart)
                }
            } catch (error) {
                console.error('Error loading matches:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchMatches()
    }, [])

    if (loading) return <div className="p-8 text-center text-gray-500">載入數據中...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">比賽數據詳細報表</h1>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-900">返回總部</Link>
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">近30日比賽趨勢</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">最新比賽紀錄 (Top 100)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-medium">
                                <tr>
                                    <th className="p-4">時間</th>
                                    <th className="p-4">紅隊 (長輩)</th>
                                    <th className="p-4">黃隊 (長輩)</th>
                                    <th className="p-4">比賽據點</th>
                                    <th className="p-4 text-center">勝利方</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {matches.map((match) => (
                                    <tr key={match.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            {new Date(match.completed_at || match.created_at).toLocaleString('zh-TW')}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-red-600">
                                                {match.red_elder?.nickname || match.red_elder?.full_name || '未知'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-yellow-600">
                                                {match.yellow_elder?.nickname || match.yellow_elder?.full_name || '未知'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-900">
                                            {match.store?.name || '未知據點'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                                ${match.winner_color === 'red' ? 'bg-red-100 text-red-800' :
                                                    match.winner_color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {match.winner_color === 'red' ? '紅隊勝' : match.winner_color === 'yellow' ? '黃隊勝' : '平局'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

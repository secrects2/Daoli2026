'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AdminEldersPage() {
    const [elders, setElders] = useState<any[]>([])
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Elders data (Profiles joined with Wallets)
            // Note: Supabase join syntax needs proper FK setup. 
            // We'll fetch profiles properly.

            // Get Profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'elder')
                .order('created_at', { ascending: false })

            if (!profiles) return

            // Get Wallets
            const { data: wallets } = await supabase
                .from('wallets')
                .select('*')

            // Merge
            const combined = profiles.map(p => {
                const w = wallets?.find(wallet => wallet.user_id === p.id)
                return {
                    ...p,
                    points: w?.global_points || 0
                }
            })

            setElders(combined)

            // 2. Chart Data: Distribution by Point Ranges
            const ranges = [
                { name: '0-500', min: 0, max: 500, count: 0 },
                { name: '501-2000', min: 501, max: 2000, count: 0 },
                { name: '2001-5000', min: 2001, max: 5000, count: 0 },
                { name: '5000+', min: 5001, max: 999999, count: 0 },
            ]

            combined.forEach(e => {
                const range = ranges.find(r => e.points >= r.min && e.points <= r.max)
                if (range) range.count++
            })

            setChartData(ranges)
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    if (loading) return <div className="p-8 text-center text-gray-500">載入數據中...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">長輩關懷名單</h1>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-900">返回總部</Link>
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">長輩活躍程度 (積分分佈)</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#9CA3AF', '#60A5FA', '#3B82F6', '#2563EB'][index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">全部長輩名冊 ({elders.length}人)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-medium">
                                <tr>
                                    <th className="p-4">頭像</th>
                                    <th className="p-4">姓名</th>
                                    <th className="p-4">註冊時間</th>
                                    <th className="p-4">積分錢包</th>
                                    <th className="p-4 text-center">狀態</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {elders.map((elder) => (
                                    <tr key={elder.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                                <img src={elder.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="user" />
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">
                                            {elder.full_name}
                                        </td>
                                        <td className="p-4">
                                            {new Date(elder.created_at).toLocaleDateString('zh-TW')}
                                        </td>
                                        <td className="p-4 font-mono text-amber-600 font-bold">
                                            {elder.points.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-bold">
                                                Active
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-blue-600 font-medium hover:underline text-xs">
                                                查看詳情
                                            </button>
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

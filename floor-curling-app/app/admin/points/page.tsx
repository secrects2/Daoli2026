'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminPointsPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase
                .from('point_transactions')
                .select('*, wallets:wallet_id(profiles:user_id(full_name))')
                .order('created_at', { ascending: false })
                .limit(200)

            if (data) {
                setTransactions(data)

                // Accumulate points over time
                const sorted = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                let cumulative = 0
                const trend = sorted.map(t => {
                    if (t.type === 'earned') cumulative += t.amount
                    else cumulative -= t.amount

                    return {
                        date: new Date(t.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
                        total: cumulative
                    }
                })
                // Downsample for chart clarity (take every nth item if too many)
                setChartData(trend.filter((_, i) => i % 5 === 0 || i === trend.length - 1))
            }
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    if (loading) return <div className="p-8 text-center text-gray-500">載入數據中...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">榮譽積分流向</h1>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-900">返回總部</Link>
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">總積分發放趨勢</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#F59E0B" fillOpacity={1} fill="url(#colorPoints)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">最新積分異動</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-medium">
                                <tr>
                                    <th className="p-4">時間</th>
                                    <th className="p-4">長輩姓名</th>
                                    <th className="p-4">原因</th>
                                    <th className="p-4 text-right">變動數值</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            {new Date(t.created_at).toLocaleString('zh-TW')}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">
                                            {t.wallets?.profiles?.full_name || '未知用戶'}
                                        </td>
                                        <td className="p-4">
                                            {t.description}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold
                                            ${t.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'earned' ? '+' : '-'}{t.amount}
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

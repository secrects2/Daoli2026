'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

export default function AdminLocationsPage() {
    const [stores, setStores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/locations')
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || 'Failed to fetch')

                if (data.success) {
                    setStores(data.stores)
                }
            } catch (error) {
                console.error('Error loading location stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return <div className="p-8 text-center text-gray-500">載入數據中...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">據點營運排行</h1>
                    <Link href="/admin" className="text-gray-500 hover:text-gray-900">返回總部</Link>
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">各據點比賽熱度</h2>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={stores} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#E5E7EB" />
                                <XAxis type="number" stroke="#9CA3AF" />
                                <YAxis dataKey="name" type="category" width={100} stroke="#4B5563" tick={{ fontSize: 14, fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="match_count" radius={[0, 4, 4, 0]} barSize={20} name="比賽場次">
                                    {stores.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            index === 0 ? '#F59E0B' : // Gold
                                                index === 1 ? '#9CA3AF' : // Silver
                                                    index === 2 ? '#B45309' : // Bronze
                                                        '#3B82F6' // Blue
                                        } />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">加盟店詳細清單</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-medium">
                                <tr>
                                    <th className="p-4 w-16">排名</th>
                                    <th className="p-4">店鋪名稱</th>
                                    <th className="p-4">位置</th>
                                    <th className="p-4">狀態</th>
                                    <th className="p-4 text-right">比賽場次</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stores.map((store, index) => (
                                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-500'}
                                            `}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">
                                            {store.name}
                                        </td>
                                        <td className="p-4">
                                            {store.location}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold
                                                ${store.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                            `}>
                                                {store.status === 'active' ? '營運中' : '暫停'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-blue-600">
                                            {store.match_count}
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

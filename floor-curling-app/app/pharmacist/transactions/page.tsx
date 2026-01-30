'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Transaction {
    id: string
    user_id: string
    type: string
    global_points_delta: number
    local_points_delta: number
    global_points_after: number
    local_points_after: number
    description: string | null
    store_id: string | null
    created_at: string
    profiles?: {
        nickname?: string
        full_name?: string
    }
}

const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
    match_win: { label: '比賽勝利', color: 'bg-green-100 text-green-700', icon: '🏆' },
    match_participate: { label: '比賽參與', color: 'bg-blue-100 text-blue-700', icon: '🥌' },
    local_grant: { label: '藥師發放', color: 'bg-purple-100 text-purple-700', icon: '🎁' },
    local_redeem: { label: '積分兌換', color: 'bg-orange-100 text-orange-700', icon: '🛒' },
    adjustment: { label: '管理員調整', color: 'bg-gray-100 text-gray-700', icon: '⚙️' }
}

export default function TransactionsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('week')
    const [stats, setStats] = useState({
        totalGlobalGranted: 0,
        totalLocalGranted: 0,
        transactionCount: 0
    })

    useEffect(() => {
        fetchTransactions()
    }, [filter, dateRange])

    const fetchTransactions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id, role')
                .eq('id', user.id)
                .single()

            if (!profile?.store_id) return

            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    profiles!transactions_user_id_fkey (nickname, full_name)
                `)
                .eq('store_id', profile.store_id)
                .order('created_at', { ascending: false })

            // 類型過濾
            if (filter !== 'all') {
                query = query.eq('type', filter)
            }

            // 時間過濾
            if (dateRange !== 'all') {
                const now = new Date()
                let startDate: Date

                switch (dateRange) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0))
                        break
                    case 'week':
                        startDate = new Date(now.setDate(now.getDate() - 7))
                        break
                    case 'month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1))
                        break
                    default:
                        startDate = new Date(0)
                }
                query = query.gte('created_at', startDate.toISOString())
            }

            const { data, error } = await query.limit(100)

            if (!error && data) {
                setTransactions(data)

                // 計算統計
                let totalGlobal = 0
                let totalLocal = 0
                data.forEach(tx => {
                    if (tx.global_points_delta > 0) totalGlobal += tx.global_points_delta
                    if (tx.local_points_delta > 0) totalLocal += tx.local_points_delta
                })
                setStats({
                    totalGlobalGranted: totalGlobal,
                    totalLocalGranted: totalLocal,
                    transactionCount: data.length
                })
            }
        } catch (err) {
            console.error('獲取交易記錄失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 導航欄 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-blue-600">積分交易記錄</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">交易筆數</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.transactionCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">發出 Global Points</p>
                                <p className="text-2xl font-bold text-yellow-600">+{stats.totalGlobalGranted}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">發出 Local Points</p>
                                <p className="text-2xl font-bold text-green-600">+{stats.totalLocalGranted}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 過濾器 */}
                <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                    <div className="flex flex-wrap gap-4">
                        {/* 類型過濾 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">交易類型</label>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    全部
                                </button>
                                {Object.entries(typeLabels).map(([key, { label, icon }]) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === key
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {icon} {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 時間範圍 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">時間範圍</label>
                            <div className="flex gap-2">
                                {[
                                    { key: 'today', label: '今天' },
                                    { key: 'week', label: '本週' },
                                    { key: 'month', label: '本月' },
                                    { key: 'all', label: '全部' }
                                ].map(item => (
                                    <button
                                        key={item.key}
                                        onClick={() => setDateRange(item.key as any)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${dateRange === item.key
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 交易列表 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">長輩</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類型</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Global</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">說明</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        暫無交易記錄
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(tx => {
                                    const typeInfo = typeLabels[tx.type] || { label: tx.type, color: 'bg-gray-100 text-gray-700', icon: '📝' }
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleString('zh-TW', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900">
                                                    {tx.profiles?.nickname || tx.profiles?.full_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                    {typeInfo.icon} {typeInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {tx.global_points_delta !== 0 && (
                                                    <span className={tx.global_points_delta > 0 ? 'text-yellow-600 font-semibold' : 'text-red-600'}>
                                                        {tx.global_points_delta > 0 ? '+' : ''}{tx.global_points_delta}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {tx.local_points_delta !== 0 && (
                                                    <span className={tx.local_points_delta > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                                        {tx.local_points_delta > 0 ? '+' : ''}{tx.local_points_delta}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                {tx.description || '—'}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}

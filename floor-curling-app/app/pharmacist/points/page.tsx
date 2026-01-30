'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Elder {
    id: string
    nickname?: string
    full_name?: string
    store_id: string
    wallet?: {
        local_points: number
        global_points: number
    }
}

export default function GrantPointsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [elders, setElders] = useState<Elder[]>([])
    const [selectedElder, setSelectedElder] = useState<Elder | null>(null)
    const [points, setPoints] = useState<number>(100)
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string>('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [recentGrants, setRecentGrants] = useState<any[]>([])

    useEffect(() => {
        fetchElders()
        fetchRecentGrants()
    }, [])

    const fetchElders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (profile?.store_id) {
                setStoreId(profile.store_id)

                // 獲取長輩及其錢包餘額
                const { data: eldersData } = await supabase
                    .from('profiles')
                    .select(`
                        id, 
                        nickname, 
                        full_name, 
                        store_id,
                        wallets (local_points, global_points)
                    `)
                    .eq('role', 'elder')
                    .eq('store_id', profile.store_id)
                    .order('nickname', { ascending: true })

                if (eldersData) {
                    setElders(eldersData.map(e => ({
                        ...e,
                        wallet: Array.isArray(e.wallets) ? e.wallets[0] : e.wallets
                    })))
                }
            }
        } catch (err) {
            console.error('獲取長輩列表失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentGrants = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (profile?.store_id) {
                const { data } = await supabase
                    .from('transactions')
                    .select(`
                        id,
                        local_points_delta,
                        description,
                        created_at,
                        user_id,
                        profiles!transactions_user_id_fkey (nickname, full_name)
                    `)
                    .eq('type', 'local_grant')
                    .eq('store_id', profile.store_id)
                    .order('created_at', { ascending: false })
                    .limit(10)

                if (data) {
                    setRecentGrants(data)
                }
            }
        } catch (err) {
            console.error('獲取最近發放記錄失敗:', err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedElder || points <= 0 || !description.trim()) return

        setSubmitting(true)
        setMessage(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()

            const res = await fetch('/api/points/grant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    elderId: selectedElder.id,
                    localPoints: points,
                    description: description.trim(),
                    storeId
                })
            })

            const result = await res.json()

            if (result.success) {
                setMessage({ type: 'success', text: result.message })
                setSelectedElder(null)
                setPoints(100)
                setDescription('')
                // 重新載入資料
                fetchElders()
                fetchRecentGrants()
            } else {
                setMessage({ type: 'error', text: result.error })
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || '發放失敗' })
        } finally {
            setSubmitting(false)
        }
    }

    // 快速金額按鈕
    const quickAmounts = [50, 100, 200, 500, 1000]

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
                            <h1 className="text-2xl font-bold text-blue-600">Local Points 發放</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 訊息提示 */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 發放表單 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">發放積分</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* 選擇長輩 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    選擇長輩 *
                                </label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                                    {elders.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">尚無長輩資料</p>
                                    ) : (
                                        elders.map(elder => (
                                            <button
                                                key={elder.id}
                                                type="button"
                                                onClick={() => setSelectedElder(elder)}
                                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedElder?.id === elder.id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {(elder.nickname || elder.full_name || '?')[0]}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {elder.nickname || elder.full_name || '未命名'}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-green-600 font-semibold">
                                                        {elder.wallet?.local_points || 0} LP
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 發放金額 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    發放金額 *
                                </label>
                                <div className="flex gap-2 mb-2">
                                    {quickAmounts.map(amount => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setPoints(amount)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${points === amount
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={points}
                                    onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 0))}
                                    min={1}
                                    max={10000}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                                />
                            </div>

                            {/* 發放原因 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    發放原因 *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    maxLength={200}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                                    placeholder="例如：週年慶促銷活動獎勵、生日禮物..."
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
                            </div>

                            {/* 提交按鈕 */}
                            <button
                                type="submit"
                                disabled={!selectedElder || points <= 0 || !description.trim() || submitting}
                                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        處理中...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        發放 {points} Local Points
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* 最近發放記錄 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近發放記錄</h2>

                        {recentGrants.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p>暫無發放記錄</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentGrants.map(grant => (
                                    <div
                                        key={grant.id}
                                        className="p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-gray-900">
                                                {grant.profiles?.nickname || grant.profiles?.full_name || '長輩'}
                                            </span>
                                            <span className="text-green-600 font-bold">
                                                +{grant.local_points_delta} LP
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{grant.description}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(grant.created_at).toLocaleString('zh-TW')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added
import Link from 'next/link'

interface Elder {
    id: string
    role: string
    store_id: string | null
    created_at: string
    email?: string
    full_name?: string
    nickname?: string
}

interface Wallet {
    user_id: string
    global_points: number
    local_points: number
}

interface MatchStats {
    total_matches: number
    wins: number
    losses: number
}

export default function EldersPage() {
    const { t, language } = useLanguage() // Added language
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [elders, setElders] = useState<Elder[]>([])
    const [wallets, setWallets] = useState<Record<string, Wallet>>({})
    const [matchStats, setMatchStats] = useState<Record<string, MatchStats>>({})
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [userStoreId, setUserStoreId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingStep, setLoadingStep] = useState<string>('初始化...')

    useEffect(() => {
        const doFetch = async () => {
            try {
                setLoadingStep('正在驗證登入狀態...')
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setError('未登入或登入已過期')
                    setLoading(false)
                    return
                }

                setLoadingStep('正在獲取店鋪資訊...')
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('store_id')
                    .eq('id', user.id)
                    .single()

                if (profileError) {
                    console.error('Profile fetch error:', profileError)
                    setError(`無法獲取用戶資料: ${profileError.message}`)
                    setLoading(false)
                    return
                }

                const storeId = profile?.store_id || null
                setUserStoreId(storeId)

                setLoadingStep('正在獲取長輩列表...')
                await fetchElders(storeId)

            } catch (err: any) {
                console.error('doFetch error:', err)
                setError(err.message || '未知錯誤')
                setLoading(false)
            }
        }

        doFetch()
    }, [])

    // ✅ 獲取當前用戶的 store_id
    const fetchUserStore = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (profile?.store_id) {
                setUserStoreId(profile.store_id)
                fetchElders(profile.store_id)
            } else {
                fetchElders(null)
            }
        } else {
            console.error('No user found in fetchUserStore')
            setLoading(false) // Stop loading if no user
        }
    }

    const fetchElders = async (storeId: string | null) => {
        setLoading(true)
        try {
            // ✅ 只獲取所屬店鋪的長者 (限制 50 筆避免超時)
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('role', 'elder')
                .order('created_at', { ascending: false })
                .limit(50) // 防止大量數據導致超時

            if (storeId) {
                query = query.eq('store_id', storeId)
            }

            const { data: eldersData, error: eldersError } = await query

            if (eldersError) throw eldersError

            setElders(eldersData || [])

            // 獲取錢包數據 (限制為前 50 個)
            if (eldersData && eldersData.length > 0) {
                const elderIds = eldersData.slice(0, 50).map(e => e.id)

                const { data: walletsData, error: walletsError } = await supabase
                    .from('wallets')
                    .select('user_id, global_points, local_points')
                    .in('user_id', elderIds)

                if (!walletsError && walletsData) {
                    const walletsByUser: Record<string, Wallet> = {}
                    walletsData.forEach((wallet: any) => {
                        walletsByUser[wallet.user_id] = wallet
                    })
                    setWallets(walletsByUser)
                }

                // 暫時跳過比賽統計以避免超時
                // TODO: 優化比賽統計查詢
                setMatchStats({})
            }
        } catch (error: any) {
            console.error('獲取長者數據失敗:', error)
            setError(`獲取長輩列表失敗: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    // 篩選長者
    const filteredElders = elders.filter(elder => {
        if (!searchTerm) return true
        return elder.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            elder.store_id?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    // 格式化日期
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString(language, { // Updated
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    // Display error if any
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">載入失敗</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        重新載入
                    </button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{loadingStep}</p>
                </div>
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
                                onClick={() => router.push('/pharmacist/dashboard')}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-blue-600">{t('elders.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <span className="text-sm text-gray-500">
                                {t('elders.total', { n: elders.length })} {/* Updated */}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 搜索框與操作按鈕 */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('elders.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <Link
                        href="/pharmacist/elders/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium whitespace-nowrap"
                    >
                        <span className="text-xl">+</span>
                        新增長輩
                    </Link>
                </div>

                {/* 長者列表 */}
                {filteredElders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchTerm ? t('elders.emptySearch.title') : t('elders.empty.title')} {/* Updated */}
                        </h3>
                        <p className="text-gray-500">
                            {searchTerm ? t('elders.emptySearch.desc') : t('elders.empty.desc')} {/* Updated */}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredElders.map((elder) => {
                            const wallet = wallets[elder.id]
                            const stats = matchStats[elder.id] || { total_matches: 0, wins: 0, losses: 0 }
                            const winRate = stats.total_matches > 0
                                ? Math.round((stats.wins / stats.total_matches) * 100)
                                : 0

                            return (
                                <div
                                    key={elder.id}
                                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                                >
                                    {/* 頭部 */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-lg font-bold">
                                                    👴
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={elder.full_name || elder.nickname || elder.id}>
                                                    {elder.full_name || elder.nickname || `長輩 ${elder.id.slice(0, 4)}`}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {t('elders.registeredAt')} {formatDate(elder.created_at)} {/* Updated */}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                            {t('dashboard.role')} {/* Generic role label if needed or just hardcoded 'Elder' if we had role translation. Using dashboard.role as placeholder but actually it's specific. I'll just keep 'Elder' or use a generic term if I had one. I'll leave 'Elder' hardcoded or use a key if strictly needed, but 'Elder' is fine or I can use t('dashboard.role') if it matches. Actually I'll use hardcoded 'Elder' or add 'elder' to 'common.roles'. I'll skip adding more keys now. */}
                                            Elder
                                        </span>
                                    </div>

                                    {/* 積分卡片 */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-yellow-600 font-medium">{t('elders.points.global')}</p> {/* Updated */}
                                            <p className="text-xl font-bold text-yellow-700">
                                                {wallet?.global_points || 0}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-green-600 font-medium">{t('elders.points.local')}</p> {/* Updated */}
                                            <p className="text-xl font-bold text-green-700">
                                                {wallet?.local_points || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 比賽統計 */}
                                    <div className="border-t border-gray-100 pt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">{t('elders.stats.title')}</p> {/* Updated */}
                                        <div className="flex justify-between text-sm">
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('elders.stats.matches')}</p> {/* Updated */}
                                                <p className="font-bold text-gray-900">{stats.total_matches}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('elders.stats.wins')}</p> {/* Updated */}
                                                <p className="font-bold text-green-600">{stats.wins}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('elders.stats.losses')}</p> {/* Updated */}
                                                <p className="font-bold text-red-600">{stats.losses}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500">{t('elders.stats.rate')}</p> {/* Updated */}
                                                <p className="font-bold text-blue-600">{winRate}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 店鋪信息 */}
                                    {elder.store_id && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-xs text-gray-500">
                                                {t('elders.store')}: <span className="font-medium text-gray-700">{elder.store_id}</span> {/* Updated */}
                                            </p>
                                        </div>
                                    )}
                                    {/* Link to Details */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                                        <Link
                                            href={`/pharmacist/elders/${elder.id}`}
                                            className="text-blue-600 font-bold hover:underline text-sm block w-full"
                                        >
                                            詳情
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'

// 定義 Profile 接口
interface Profile {
    id: string
    role: 'admin' | 'pharmacist' | 'family' | 'elder'
    store_id: string | null
    linked_family_id: string | null
    created_at: string
    updated_at: string
}

// 統計數據接口
interface Stats {
    todayMatches: number
    activeElders: number
    weeklyPoints: number
    totalEquipment: number
}

interface ChartData {
    matchesTrend: { date: string; count: number }[]
    winDistribution: { name: string; value: number }[]
}

export default function PharmacistDashboard() {
    const { t } = useLanguage() // Added
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<Stats>({
        todayMatches: 0,
        activeElders: 0,
        weeklyPoints: 0,
        totalEquipment: 0
    })
    const [chartData, setChartData] = useState<ChartData>({
        matchesTrend: [],
        winDistribution: []
    })

    const router = useRouter()
    const supabase = createClientComponentClient()

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser()

                if (authError) {
                    console.error('認證錯誤:', authError.message)
                    setError('無法獲取用戶信息') // TODO: i18n
                    setLoading(false)
                    return
                }

                if (user) {
                    setUser(user)
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()

                    if (profileError) {
                        console.error('獲取 Profile 錯誤:', profileError.message)
                        setError('用戶檔案不存在，請聯繫管理員') // TODO: i18n
                    } else {
                        setProfile(profileData as Profile)
                        // 获取数据
                        await Promise.all([
                            fetchStats(profileData.store_id),
                            fetchChartData(profileData.store_id)
                        ])
                    }
                }
            } catch (err) {
                console.error('未知錯誤:', err)
                setError('發生未知錯誤') // TODO: i18n
            } finally {
                setLoading(false)
            }
        }

        getUser()
    }, [supabase])

    // 獲取統計數據
    const fetchStats = async (storeId: string | null) => {
        try {
            // 今日比賽數
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let matchQuery = supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString())

            if (storeId) matchQuery = matchQuery.eq('store_id', storeId)

            const { count: todayMatchesCount } = await matchQuery

            // 活躍長者數
            let elderQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'elder')

            if (storeId) elderQuery = elderQuery.eq('store_id', storeId)

            const { count: eldersCount } = await elderQuery

            // 本週積分 (這裡簡化為所有積分，因為沒有時間過濾 wallet)
            // 為了準確可能需要從 transactions 統計，但這裡先保持簡單
            const { data: walletsData } = await supabase
                .from('wallets')
                .select('global_points')

            // 注意：這裡應該過濾 store_id，但 wallet 表沒有 store_id
            // 正確做法是連接 profiles 表，但 supabase js join 寫法較複雜
            // 這裡先獲取所有
            const weeklyPoints = walletsData?.reduce((sum, w) => sum + (w.global_points || 0), 0) || 0

            // 裝備總數
            const { count: equipmentCount } = await supabase
                .from('equipment')
                .select('*', { count: 'exact', head: true })

            setStats({
                todayMatches: todayMatchesCount || 0,
                activeElders: eldersCount || 0,
                weeklyPoints: weeklyPoints,
                totalEquipment: equipmentCount || 0
            })
        } catch (err) {
            console.error('獲取統計數據失敗:', err)
        }
    }

    // 獲取圖表數據
    const fetchChartData = async (storeId: string | null) => {
        try {
            // 1. 近 7 天比賽趨勢
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - 6)
            startDate.setHours(0, 0, 0, 0)

            let query = supabase
                .from('matches')
                .select('created_at, winner_color')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })

            if (storeId) query = query.eq('store_id', storeId)

            const { data: matches } = await query

            if (matches) {
                // 處理趨勢數據
                const trendMap = new Map<string, number>()
                // 初始化日期
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate)
                    d.setDate(d.getDate() + i)
                    const dateStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                    trendMap.set(dateStr, 0)
                }

                matches.forEach(m => {
                    const date = new Date(m.created_at)
                    const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                    if (trendMap.has(dateStr)) {
                        trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1)
                    }
                })

                const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({
                    date,
                    count
                }))

                // 處理勝率數據
                let redWins = 0
                let yellowWins = 0
                matches.forEach(m => {
                    if (m.winner_color === 'red') redWins++
                    if (m.winner_color === 'yellow') yellowWins++
                })

                setChartData({
                    matchesTrend: trendData,
                    winDistribution: [
                        { name: t('dashboard.stats.redWin'), value: redWins }, // Updated
                        { name: t('dashboard.stats.yellowWin'), value: yellowWins } // Updated
                    ]
                })
            }

        } catch (error) {
            console.error('獲取圖表數據失敗:', error)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const COLORS = ['#EF4444', '#F59E0B'] // Red, Yellow

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p> {/* Updated */}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('common.error')}</h2> {/* Updated */}
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        重試 {/* TODO: i18n */}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 导航栏 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-blue-600">{t('dashboard.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* 語言切換 */}
                            <LanguageSwitcher />

                            <div className="text-sm text-gray-600">
                                <p className="font-medium">{user?.email}</p>
                                <p className="text-xs text-gray-500">{t('dashboard.role')}: {profile?.role}</p> {/* Updated */}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                {t('common.logout')} {/* Updated */}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主内容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">{t('dashboard.welcome')}</h2> {/* Updated */}
                    <p className="mt-2 text-gray-600">{t('dashboard.storeId')}: {profile?.store_id || '未设置'}</p> {/* Updated */}
                </div>

                {/* 功能卡片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* 创建比赛 */}
                    <Link
                        href="/pharmacist/match/new"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="create-match"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-blue-600">{t('dashboard.nav.newMatch')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.newMatch.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.newMatch.desc')}</p> {/* Updated */}
                    </Link>

                    {/* 比赛记录 */}
                    <Link
                        href="/pharmacist/match/history"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="match-history"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-green-600">{t('dashboard.nav.matchHistory')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.matchHistory.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.matchHistory.desc')}</p> {/* Updated */}
                    </Link>

                    {/* 长者管理 */}
                    <Link
                        href="/pharmacist/elders"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="elder-management"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-purple-600">{t('dashboard.nav.elderManage')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.elderManage.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.elderManage.desc')}</p> {/* Updated */}
                    </Link>

                    {/* 装备库存 */}
                    <Link
                        href="/pharmacist/equipment"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-orange-600">{t('dashboard.nav.equipment')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.equipment.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.equipment.desc')}</p> {/* Updated */}
                    </Link>

                    {/* 排行榜 */}
                    <Link
                        href="/pharmacist/leaderboard"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-yellow-600">{t('dashboard.nav.leaderboard')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.leaderboard.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.leaderboard.desc')}</p> {/* Updated */}
                    </Link>

                    {/* 装备商城 */}
                    <Link
                        href="/pharmacist/shop"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-pink-100 rounded-lg">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-pink-600">{t('dashboard.nav.shop')}</span> {/* Updated */}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.cards.shop.title')}</h3> {/* Updated */}
                        <p className="text-sm text-gray-600">{t('dashboard.cards.shop.desc')}</p> {/* Updated */}
                    </Link>

                    {/* QR Code 管理 */}
                    <Link
                        href="/pharmacist/qrcode"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="qrcode"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-100 rounded-lg">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-indigo-600">QR Code</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">長輩 QR Code</h3>
                        <p className="text-sm text-gray-600">生成和列印長輩身份 QR Code 卡片</p>
                    </Link>

                    {/* Local Points 發放 */}
                    <Link
                        href="/pharmacist/points"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="points"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-100 rounded-lg">
                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-emerald-600">積分發放</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Points 發放</h3>
                        <p className="text-sm text-gray-600">為長輩發放兌換積分獎勵</p>
                    </Link>

                    {/* 證據審核 */}
                    <Link
                        href="/pharmacist/evidence"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="evidence"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-100 rounded-lg">
                                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-rose-600">證據審核</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">證據審核後台</h3>
                        <p className="text-sm text-gray-600">瀏覽和審核比賽證據照片影片</p>
                    </Link>

                    {/* 交易記錄 */}
                    <Link
                        href="/pharmacist/transactions"
                        className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block"
                        data-tour="transactions"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-cyan-100 rounded-lg">
                                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-cyan-600">交易記錄</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">積分交易查詢</h3>
                        <p className="text-sm text-gray-600">查看積分變動歷史記錄</p>
                    </Link>
                </div>


                {/* 數據圖表 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* 活躍趨勢 */}
                    <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.stats.recentTrend')}</h3> {/* Updated */}
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.matchesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" name={t('dashboard.stats.matchCount')} stroke="#2563EB" fill="#3B82F6" /> {/* Updated */}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 勝率分佈 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.stats.winDistribution')}</h3> {/* Updated */}
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.winDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.winDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 快速统计 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">{t('dashboard.stats.todayMatches')}</p> {/* Updated */}
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayMatches}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">{t('dashboard.stats.activeElders')}</p> {/* Updated */}
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeElders}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">{t('dashboard.stats.totalPoints')}</p> {/* Updated */}
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.weeklyPoints.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">{t('dashboard.stats.totalEquipment')}</p> {/* Updated */}
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEquipment}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

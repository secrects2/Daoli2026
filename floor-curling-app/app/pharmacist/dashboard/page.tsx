'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
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

// Interfaces
interface Profile {
    id: string
    role: 'admin' | 'pharmacist' | 'family' | 'elder'
    store_id: string | null
    created_at: string
}

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
    const { t } = useLanguage()
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

                if (authError || !user) {
                    router.push('/login')
                    return
                }

                setUser(user)
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileData) {
                    setProfile(profileData as Profile)
                    // Fetch Data
                    Promise.all([
                        fetchStats(profileData.store_id),
                        fetchChartData(profileData.store_id)
                    ])
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        getUser()
    }, [supabase, router])

    const fetchStats = async (storeId: string | null) => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let matchQuery = supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
            if (storeId) matchQuery = matchQuery.eq('store_id', storeId)
            const { count: todayMatchesCount } = await matchQuery

            let elderQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'elder')
            if (storeId) elderQuery = elderQuery.eq('store_id', storeId)
            const { count: eldersCount } = await elderQuery

            // Simplified points (all)
            const { data: walletsData } = await supabase.from('wallets').select('global_points')
            const weeklyPoints = walletsData?.reduce((sum, w) => sum + (w.global_points || 0), 0) || 0

            const { count: equipmentCount } = await supabase.from('equipment').select('*', { count: 'exact', head: true })

            setStats({
                todayMatches: todayMatchesCount || 0,
                activeElders: eldersCount || 0,
                weeklyPoints: weeklyPoints,
                totalEquipment: equipmentCount || 0
            })
        } catch (err) {
            console.error(err)
        }
    }

    const fetchChartData = async (storeId: string | null) => {
        try {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - 6)
            startDate.setHours(0, 0, 0, 0)

            let query = supabase.from('matches')
                .select('created_at, winner_color')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })
            if (storeId) query = query.eq('store_id', storeId)

            const { data: matches } = await query

            if (matches) {
                const trendMap = new Map<string, number>()
                for (let i = 0; i < 7; i++) {
                    const d = new Date(startDate)
                    d.setDate(d.getDate() + i)
                    const dateStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                    trendMap.set(dateStr, 0)
                }

                let redWins = 0, yellowWins = 0
                matches.forEach(m => {
                    const d = new Date(m.created_at)
                    const dateStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                    if (trendMap.has(dateStr)) trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1)
                    if (m.winner_color === 'red') redWins++
                    if (m.winner_color === 'yellow') yellowWins++
                })

                setChartData({
                    matchesTrend: Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })),
                    winDistribution: [
                        { name: t('dashboard.stats.redWin'), value: redWins },
                        { name: t('dashboard.stats.yellowWin'), value: yellowWins }
                    ]
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    const COLORS = ['#EF4444', '#F59E0B']

    if (loading) return <div className="min-h-screen pt-20 text-center text-muted-foreground">載入中...</div>

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5 flex justify-between items-end">
                <div>
                    <h1 className="ios-large-title">加盟店管理平台</h1>
                    <p className="text-xs text-muted-foreground mt-1 ml-1">{profile?.store_id || '總部'}</p>
                </div>
                <div className="flex gap-3 mb-1 items-center">
                    <LanguageSwitcher />
                    <Link href="/pharmacist/settings" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="px-4 mt-6 space-y-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase">{t('dashboard.stats.todayMatches')}</p>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{stats.todayMatches}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase">{t('dashboard.stats.activeElders')}</p>
                        <p className="text-2xl font-bold mt-1 text-green-600">{stats.activeElders}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase">{t('dashboard.stats.totalPoints')}</p>
                        <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.weeklyPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase">{t('dashboard.stats.totalEquipment')}</p>
                        <p className="text-2xl font-bold mt-1 text-purple-600">{stats.totalEquipment}</p>
                    </div>
                </div>

                {/* Operations Menu (Inset List Style) */}
                <div>
                    <h3 className="ios-section-header">管理功能</h3>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                        <Link href="/pharmacist/match/new" className="ios-list-item active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                                <span className="font-medium text-gray-900">{t('dashboard.cards.newMatch.title')}</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>

                        <Link href="/pharmacist/match/history" className="ios-list-item active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                                <span className="font-medium text-gray-900">{t('dashboard.nav.matchHistory')}</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>

                        <Link href="/pharmacist/elders" className="ios-list-item active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                                <span className="font-medium text-gray-900">{t('dashboard.cards.elderManage.title')}</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>

                        <Link href="/pharmacist/qrcode" className="ios-list-item active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg></div>
                                <span className="font-medium text-gray-900">長輩 QR Code</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>
                    </div>
                </div>

                {/* Charts */}
                <div className="pb-4">
                    <h3 className="ios-section-header">數據分佈</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl shadow-sm p-4">
                            <h4 className="text-sm font-semibold mb-4">{t('dashboard.stats.recentTrend')}</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.matchesTrend}>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#EFF6FF" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-4">
                            <h4 className="text-sm font-semibold mb-4">{t('dashboard.stats.winDistribution')}</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.winDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                            {chartData.winDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

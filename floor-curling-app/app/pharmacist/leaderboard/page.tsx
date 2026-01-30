'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added

interface LeaderboardEntry {
    id: string
    global_points: number
    store_id: string | null
    rank: number
}

export default function LeaderboardPage() {
    const { t } = useLanguage() // Added
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [scope, setScope] = useState<'global' | 'store'>('global')
    const [userStoreId, setUserStoreId] = useState<string | null>(null)

    useEffect(() => {
        fetchUserStore()
    }, [])

    useEffect(() => {
        if (userStoreId !== null || scope === 'global') {
            fetchLeaderboard()
        }
    }, [scope, userStoreId])

    const fetchUserStore = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            setUserStoreId(profile?.store_id || null)
        }
    }

    const fetchLeaderboard = async () => {
        setLoading(true)
        try {
            // 獲取所有長者及其積分
            let query = supabase
                .from('wallets')
                .select(`
                    user_id,
                    global_points,
                    profiles!inner(id, role, store_id)
                `)
                .order('global_points', { ascending: false })
                .limit(50)

            const { data, error } = await query

            if (error) throw error

            if (data) {
                // 過濾只顯示長者，並根據範圍篩選
                let filteredData = data.filter((item: any) =>
                    item.profiles?.role === 'elder'
                )

                if (scope === 'store' && userStoreId) {
                    filteredData = filteredData.filter((item: any) =>
                        item.profiles?.store_id === userStoreId
                    )
                }

                const leaderboard: LeaderboardEntry[] = filteredData.map((item: any, index: number) => ({
                    id: item.user_id,
                    global_points: item.global_points,
                    store_id: item.profiles?.store_id,
                    rank: index + 1
                }))

                setEntries(leaderboard)
            }
        } catch (error) {
            console.error('獲取排行榜失敗:', error)
        } finally {
            setLoading(false)
        }
    }

    // 獲取獎牌顏色
    const getMedalColor = (rank: number) => {
        switch (rank) {
            case 1: return 'text-yellow-500'
            case 2: return 'text-gray-400'
            case 3: return 'text-amber-600'
            default: return 'text-gray-300'
        }
    }

    // 獲取獎牌圖標
    const getMedalIcon = (rank: number) => {
        if (rank <= 3) {
            return '🏅'
        }
        return null
    }

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
                            <h1 className="text-2xl font-bold text-blue-600">{t('leaderboard.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* 語言切換 */}
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 範圍切換 */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setScope('global')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${scope === 'global'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {t('leaderboard.scope.global')} {/* Updated */}
                    </button>
                    {userStoreId && (
                        <button
                            onClick={() => setScope('store')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${scope === 'store'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {t('leaderboard.scope.store')} {/* Updated */}
                        </button>
                    )}
                </div>

                {/* 排行榜列表 */}
                {entries.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <span className="text-6xl mb-4 block">🏆</span>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('leaderboard.empty.title')}</h3> {/* Updated */}
                        <p className="text-gray-500">{t('leaderboard.empty.desc')}</p> {/* Updated */}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* 前三名特殊顯示 */}
                        {entries.slice(0, 3).length > 0 && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6">
                                <div className="flex justify-center items-end gap-4">
                                    {/* 第二名 */}
                                    {entries[1] && (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                                                <span className="text-2xl">👴</span>
                                            </div>
                                            <span className="text-3xl">🥈</span>
                                            <p className="text-sm font-medium text-gray-700 mt-1">
                                                {entries[1].id.slice(0, 8)}...
                                            </p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {entries[1].global_points} {t('leaderboard.list.scoreUnit')} {/* Updated */}
                                            </p>
                                        </div>
                                    )}

                                    {/* 第一名 */}
                                    {entries[0] && (
                                        <div className="text-center transform scale-110">
                                            <div className="w-20 h-20 bg-yellow-200 rounded-full mx-auto mb-2 flex items-center justify-center border-4 border-yellow-400">
                                                <span className="text-3xl">👴</span>
                                            </div>
                                            <span className="text-4xl">🥇</span>
                                            <p className="text-sm font-medium text-gray-700 mt-1">
                                                {entries[0].id.slice(0, 8)}...
                                            </p>
                                            <p className="text-xl font-bold text-yellow-600">
                                                {entries[0].global_points} {t('leaderboard.list.scoreUnit')} {/* Updated */}
                                            </p>
                                        </div>
                                    )}

                                    {/* 第三名 */}
                                    {entries[2] && (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                                                <span className="text-2xl">👴</span>
                                            </div>
                                            <span className="text-3xl">🥉</span>
                                            <p className="text-sm font-medium text-gray-700 mt-1">
                                                {entries[2].id.slice(0, 8)}...
                                            </p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {entries[2].global_points} {t('leaderboard.list.scoreUnit')} {/* Updated */}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 其他排名 */}
                        <div className="divide-y divide-gray-100">
                            {entries.slice(3).map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-bold w-8 text-center ${getMedalColor(entry.rank)}`}>
                                            {entry.rank}
                                        </span>
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="text-lg">👴</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {entry.id.slice(0, 8)}...
                                            </p>
                                            {entry.store_id && (
                                                <p className="text-xs text-gray-500">
                                                    {t('leaderboard.list.store')}: {entry.store_id} {/* Updated */}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-blue-600">
                                            {entry.global_points.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500">{t('leaderboard.list.points')}</p> {/* Updated */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

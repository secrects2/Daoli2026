'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext' // Added
import LanguageSwitcher from '@/components/LanguageSwitcher' // Added

interface Match {
    id: string
    store_id: string
    red_team_elder_id: string
    yellow_team_elder_id: string
    winner_color: 'red' | 'yellow' | null
    status: string
    created_at: string
    completed_at: string | null
}

interface MatchEnd {
    end_number: number
    red_score: number
    yellow_score: number
}

export default function MatchHistoryPage() {
    const { t, language } = useLanguage() // Added language for date formatting
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [matches, setMatches] = useState<Match[]>([])
    const [matchEnds, setMatchEnds] = useState<Record<string, MatchEnd[]>>({})
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
    const [userStoreId, setUserStoreId] = useState<string | null>(null)

    useEffect(() => {
        fetchUserStore()
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
                fetchMatches(profile.store_id)
            } else {
                fetchMatches(null)
            }
        }
    }

    const fetchMatches = async (storeId: string | null) => {
        setLoading(true)
        try {
            // ✅ 只獲取所屬店鋪的比賽
            let query = supabase
                .from('matches')
                .select('*')
                .order('created_at', { ascending: false })

            if (storeId) {
                query = query.eq('store_id', storeId)
            }

            const { data: matchesData, error: matchesError } = await query

            if (matchesError) throw matchesError

            setMatches(matchesData || [])

            // 獲取每場比賽的回合數據
            if (matchesData && matchesData.length > 0) {
                const matchIds = matchesData.map(m => m.id)
                const { data: endsData, error: endsError } = await supabase
                    .from('match_ends')
                    .select('match_id, end_number, red_score, yellow_score')
                    .in('match_id', matchIds)
                    .order('end_number')

                if (!endsError && endsData) {
                    const endsByMatch: Record<string, MatchEnd[]> = {}
                    endsData.forEach((end: any) => {
                        if (!endsByMatch[end.match_id]) {
                            endsByMatch[end.match_id] = []
                        }
                        endsByMatch[end.match_id].push({
                            end_number: end.end_number,
                            red_score: end.red_score,
                            yellow_score: end.yellow_score
                        })
                    })
                    setMatchEnds(endsByMatch)
                }
            }
        } catch (error) {
            console.error('獲取比賽數據失敗:', error)
        } finally {
            setLoading(false)
        }
    }

    // 計算比賽總分
    const calculateTotalScores = (matchId: string) => {
        const ends = matchEnds[matchId] || []
        return {
            red: ends.reduce((sum, end) => sum + end.red_score, 0),
            yellow: ends.reduce((sum, end) => sum + end.yellow_score, 0)
        }
    }

    // 篩選比賽
    const filteredMatches = matches.filter(match => {
        if (filter === 'all') return true
        return match.status === filter
    })

    // 格式化日期
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString(language, { // Use current language context
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
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
                            <h1 className="text-2xl font-bold text-blue-600">{t('matchHistory.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* 語言切換 */}
                            <LanguageSwitcher />

                            <Link
                                href="/pharmacist/match/new"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('matchHistory.newMatch')} {/* Updated */}
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 篩選器 */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {t('matchHistory.filter.all')} ({matches.length}) {/* Updated */}
                    </button>
                    <button
                        onClick={() => setFilter('in_progress')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'in_progress'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {t('matchHistory.filter.inProgress')} ({matches.filter(m => m.status === 'in_progress').length}) {/* Updated */}
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {t('matchHistory.filter.completed')} ({matches.filter(m => m.status === 'completed').length}) {/* Updated */}
                    </button>
                </div>

                {/* 比賽列表 */}
                {filteredMatches.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('matchHistory.empty.title')}</h3> {/* Updated */}
                        <p className="text-gray-500 mb-4">{t('matchHistory.empty.desc')}</p> {/* Updated */}
                        <Link
                            href="/pharmacist/match/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('matchHistory.empty.action')} {/* Updated */}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMatches.map((match) => {
                            const scores = calculateTotalScores(match.id)
                            const ends = matchEnds[match.id] || []

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${match.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : match.status === 'in_progress'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {match.status === 'completed' ? t('matchHistory.status.completed') :
                                                        match.status === 'in_progress' ? t('matchHistory.status.inProgress') : match.status} {/* Updated */}
                                                </span>
                                                {match.winner_color && (
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${match.winner_color === 'red'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {match.winner_color === 'red' ? t('matchHistory.result.redWin') : t('matchHistory.result.yellowWin')} {/* Updated */}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(match.created_at)}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {t('matchHistory.store')}: {match.store_id}
                                        </p>
                                    </div>

                                    {/* 分數顯示 */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className={`text-center p-4 rounded-lg ${match.winner_color === 'red'
                                            ? 'bg-red-100 border-2 border-red-300'
                                            : 'bg-red-50'
                                            }`}>
                                            <p className="text-sm text-red-600 font-medium mb-1">{t('matchHistory.red')}</p> {/* Updated */}
                                            <p className="text-3xl font-bold text-red-700">{scores.red}</p>
                                            <p className="text-xs text-gray-500 mt-1 truncate" title={match.red_team_elder_id}>
                                                {match.red_team_elder_id.slice(0, 8)}...
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="text-2xl font-bold text-gray-400">VS</span>
                                        </div>
                                        <div className={`text-center p-4 rounded-lg ${match.winner_color === 'yellow'
                                            ? 'bg-yellow-100 border-2 border-yellow-300'
                                            : 'bg-yellow-50'
                                            }`}>
                                            <p className="text-sm text-yellow-600 font-medium mb-1">{t('matchHistory.yellow')}</p> {/* Updated */}
                                            <p className="text-3xl font-bold text-yellow-700">{scores.yellow}</p>
                                            <p className="text-xs text-gray-500 mt-1 truncate" title={match.yellow_team_elder_id}>
                                                {match.yellow_team_elder_id.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>

                                    {/* 回合詳情 */}
                                    {ends.length > 0 && (
                                        <div className="border-t border-gray-100 pt-4">
                                            <p className="text-sm font-medium text-gray-700 mb-2">{t('matchHistory.endsDetail')}</p> {/* Updated */}
                                            <div className="flex gap-2 flex-wrap">
                                                {ends.map((end) => (
                                                    <div
                                                        key={end.end_number}
                                                        className="flex items-center gap-1 bg-gray-50 rounded-lg px-3 py-1"
                                                    >
                                                        <span className="text-xs text-gray-500">{t('matchHistory.endN', { n: end.end_number })}</span> {/* Updated */}
                                                        <span className="text-sm font-medium text-red-600">{end.red_score}</span>
                                                        <span className="text-gray-400">:</span>
                                                        <span className="text-sm font-medium text-yellow-600">{end.yellow_score}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

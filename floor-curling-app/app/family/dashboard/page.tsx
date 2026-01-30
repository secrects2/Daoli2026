'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Link from 'next/link'

interface Elder {
    id: string
    nickname?: string
    full_name?: string
    avatar_url?: string
    store_id?: string
}

interface Wallet {
    global_points: number
    local_points: number
}

interface Match {
    id: string
    created_at: string
    status: string
    winner_color: string | null
    red_team_elder_id: string
    yellow_team_elder_id: string
}

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    created_at: string
}

export default function FamilyDashboard() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [user, setUser] = useState<any>(null)
    const [elder, setElder] = useState<Elder | null>(null)
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [recentMatches, setRecentMatches] = useState<Match[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalMatches: 0,
        wins: 0,
        winRate: 0
    })


    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // 獲取當前用戶
            const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
            if (userError) console.error(`User Error: ${userError.message}`)

            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)

            // 獲取家屬 profile 和綁定的長輩
            const { data: profile } = await supabase
                .from('profiles')
                .select('linked_elder_id')
                .eq('id', authUser.id)
                .single()

            if (!profile?.linked_elder_id) {
                setLoading(false)
                return
            }

            // 獲取長輩資料
            const { data: elderData, error: elderError } = await supabase
                .from('profiles')
                .select('id, nickname, full_name, avatar_url, store_id')
                .eq('id', profile.linked_elder_id)
                .single()

            if (elderError) console.error(`Elder Error: ${elderError.message} (Code: ${elderError.code})`)

            if (elderData) {
                setElder(elderData)

                // 獲取長輩錢包
                const { data: walletData } = await supabase
                    .from('wallets')
                    .select('global_points, local_points')
                    .eq('user_id', elderData.id)
                    .single()

                if (walletData) {
                    setWallet(walletData)
                }

                // 獲取長輩的比賽記錄
                const { data: matchesData } = await supabase
                    .from('matches')
                    .select('id, created_at, status, winner_color, red_team_elder_id, yellow_team_elder_id')
                    .or(`red_team_elder_id.eq.${elderData.id},yellow_team_elder_id.eq.${elderData.id}`)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(10)

                if (matchesData) {
                    setRecentMatches(matchesData)

                    // 計算統計
                    let wins = 0
                    matchesData.forEach(match => {
                        const isRed = match.red_team_elder_id === elderData.id
                        const won = (isRed && match.winner_color === 'red') ||
                            (!isRed && match.winner_color === 'yellow')
                        if (won) wins++
                    })

                    setStats({
                        totalMatches: matchesData.length,
                        wins,
                        winRate: matchesData.length > 0 ? Math.round((wins / matchesData.length) * 100) : 0
                    })
                }
            }

            // 獲取通知
            const { data: notificationsData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false })
                .limit(5)

            if (notificationsData) {
                setNotifications(notificationsData)
            }

        } catch (err) {
            console.error('獲取資料失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const getMatchResult = (match: Match) => {
        if (!elder) return { text: '—', color: 'text-gray-500' }
        const isRed = match.red_team_elder_id === elder.id
        const won = (isRed && match.winner_color === 'red') ||
            (!isRed && match.winner_color === 'yellow')

        if (match.winner_color === null) {
            return { text: '平手', color: 'text-gray-500', icon: '🤝' }
        }
        return won
            ? { text: '勝利', color: 'text-green-600', icon: '🏆' }
            : { text: '落敗', color: 'text-red-500', icon: '💪' }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">載入中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
            {/* 導航欄 */}
            <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-2xl mr-2">👨‍👩‍👧</span>
                            <h1 className="text-xl font-bold text-purple-600">家屬中心</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                            <button
                                onClick={handleLogout}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!elder ? (
                    /* 未綁定長輩狀態 */
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                        <div className="text-6xl mb-4">👴👵</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">尚未綁定長輩</h2>
                        <p className="text-gray-600 mb-6">
                            請聯繫藥局為您綁定長輩帳號，<br />
                            即可查看長輩的比賽記錄和成績
                        </p>
                        <div className="inline-flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-full mb-4">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            請提供您的帳號 ID 給藥局
                        </div>


                        {/* LINE 綁定卡片 */}
                        <div className="bg-[#00B900] rounded-2xl shadow-lg p-6 text-white mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                                        💬
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">綁定 LINE 通知</h3>
                                        <p className="text-white/80 text-sm">比賽結束後即時收到成績推播</p>
                                    </div>
                                </div>
                                <button className="bg-white text-[#00B900] px-4 py-2 rounded-lg font-bold hover:bg-white/90 transition-colors">
                                    立即綁定
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    <>
                        {/* 長輩資訊卡片 */}
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white mb-6" data-tour="elder-info">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                                    {elder.avatar_url ? (
                                        <img src={elder.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        '👴'
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">{elder.nickname || elder.full_name || '長輩'}</h2>
                                    <p className="text-white/80">{elder.store_id || '道里地壺球'}</p>
                                </div>
                            </div>

                            {/* 積分顯示 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/20 rounded-xl p-4">
                                    <p className="text-white/80 text-sm mb-1">🏆 榮譽積分</p>
                                    <p className="text-3xl font-bold">{wallet?.global_points || 0}</p>
                                </div>
                                <div className="bg-white/20 rounded-xl p-4">
                                    <p className="text-white/80 text-sm mb-1">💰 兌換積分</p>
                                    <p className="text-3xl font-bold">{wallet?.local_points || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* 統計卡片 */}
                        <div className="grid grid-cols-3 gap-4 mb-6" data-tour="stats">
                            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600">{stats.totalMatches}</p>
                                <p className="text-sm text-gray-500">總比賽</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
                                <p className="text-sm text-gray-500">獲勝</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600">{stats.winRate}%</p>
                                <p className="text-sm text-gray-500">勝率</p>
                            </div>
                        </div>

                        {/* 功能入口 */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <Link
                                href="/family/notifications"
                                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                                data-tour="notifications"
                            >
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">通知中心</p>
                                    <p className="text-sm text-gray-500">
                                        {notifications.filter(n => !n.read).length > 0
                                            ? `${notifications.filter(n => !n.read).length} 則新通知`
                                            : '查看所有通知'
                                        }
                                    </p>
                                </div>
                            </Link>

                            <Link
                                href="/family/matches"
                                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                                data-tour="matches"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">比賽記錄</p>
                                    <p className="text-sm text-gray-500">查看完整戰績</p>
                                </div>
                            </Link>
                        </div>

                        {/* 最近比賽 */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">最近比賽</h3>

                            {recentMatches.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl mb-2 block">🥌</span>
                                    <p>尚無比賽記錄</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentMatches.slice(0, 5).map(match => {
                                        const result = getMatchResult(match)
                                        return (
                                            <div
                                                key={match.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{result.icon}</span>
                                                    <div>
                                                        <p className={`font-semibold ${result.color}`}>
                                                            {result.text}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(match.created_at).toLocaleDateString('zh-TW', {
                                                                month: 'numeric',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

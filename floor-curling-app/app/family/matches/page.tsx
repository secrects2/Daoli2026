'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface MatchEnd {
    id: string
    end_number: number
    red_score: number
    yellow_score: number
    house_snapshot_url: string | null
}

interface Match {
    id: string
    created_at: string
    status: string
    winner_color: string | null
    red_team_elder_id: string
    yellow_team_elder_id: string | null
    red_total_score: number
    yellow_total_score: number | null
    match_ends: MatchEnd[]
}

export default function FamilyMatchesPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [elderId, setElderId] = useState<string | null>(null)
    const [elderName, setElderName] = useState<string>('')
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 獲取綁定的長輩 ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('linked_elder_id')
                .eq('id', user.id)
                .single()

            if (!profile?.linked_elder_id) {
                setLoading(false)
                return
            }

            setElderId(profile.linked_elder_id)

            // 獲取長輩名稱
            const { data: elderProfile } = await supabase
                .from('profiles')
                .select('nickname, full_name')
                .eq('id', profile.linked_elder_id)
                .single()

            if (elderProfile) {
                setElderName(elderProfile.nickname || elderProfile.full_name || '長輩')
            }

            // 獲取所有比賽記錄
            const { data: matchesData } = await supabase
                .from('matches')
                .select(`
                    id,
                    created_at,
                    status,
                    winner_color,
                    red_team_elder_id,
                    yellow_team_elder_id,
                    red_total_score,
                    yellow_total_score,
                    match_ends (
                        id,
                        end_number,
                        red_score,
                        yellow_score,
                        house_snapshot_url
                    )
                `)
                .or(`red_team_elder_id.eq.${profile.linked_elder_id},yellow_team_elder_id.eq.${profile.linked_elder_id}`)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(50)

            if (matchesData) {
                setMatches(matchesData as any)
            }
        } catch (err) {
            console.error('獲取比賽記錄失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const getMatchResult = (match: Match) => {
        if (!elderId) return { text: '—', color: 'text-muted-foreground', won: false }
        const isRed = match.red_team_elder_id === elderId
        const won = (isRed && match.winner_color === 'red') ||
            (match.yellow_team_elder_id === elderId && match.winner_color === 'yellow')

        if (match.winner_color === null) {
            return { text: '平手', color: 'text-muted-foreground', icon: '🤝', won: false }
        }
        return won
            ? { text: '勝利', color: 'text-green-600', icon: '🏆', won: true }
            : { text: '落敗', color: 'text-red-500', icon: '💪', won: false }
    }

    const getElderScore = (match: Match) => {
        if (!elderId) return { elder: 0, opponent: 0 }
        const isRed = match.red_team_elder_id === elderId
        const isYellow = match.yellow_team_elder_id === elderId

        let opponentScore = 0
        let myScore = 0

        if (isRed) {
            myScore = match.red_total_score || 0
            opponentScore = match.yellow_total_score || 0
        } else if (isYellow) {
            myScore = match.yellow_total_score || 0
            opponentScore = match.red_total_score || 0
        }

        return {
            elder: myScore,
            opponent: opponentScore
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
            {/* 導航欄 */}
            <nav className="bg-card/80 backdrop-blur-sm shadow-card sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 text-gray-600 hover:text-foreground"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-bold text-purple-600">{elderName} 的比賽記錄</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {matches.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 text-center">
                        <span className="text-6xl mb-4 block">🥌</span>
                        <h3 className="text-lg font-semibold text-foreground mb-2">尚無比賽記錄</h3>
                        <p className="text-muted-foreground">長輩完成比賽後會顯示在這裡</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map(match => {
                            const result = getMatchResult(match)
                            const score = getElderScore(match)

                            return (
                                <div
                                    key={match.id}
                                    className="bg-card rounded-xl shadow-card overflow-hidden"
                                >
                                    {/* 比賽標題 */}
                                    <div
                                        className={`p-4 cursor-pointer ${result.won ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-background'
                                            }`}
                                        onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl">{result.icon}</span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xl font-bold ${result.color}`}>
                                                            {result.text}
                                                        </span>
                                                        <span className="text-2xl font-bold text-muted-foreground">
                                                            {score.elder} : {score.opponent}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(match.created_at).toLocaleString('zh-TW', {
                                                            year: 'numeric',
                                                            month: 'numeric',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-5 h-5 text-muted-foreground transition-transform ${selectedMatch?.id === match.id ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* 回合詳情 */}
                                    {selectedMatch?.id === match.id && (
                                        <div className="p-4 border-t">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">回合詳情</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {match.match_ends?.sort((a, b) => a.end_number - b.end_number).map(end => {
                                                    const isRed = match.red_team_elder_id === elderId
                                                    const elderScore = isRed ? end.red_score : end.yellow_score
                                                    const opponentScore = isRed ? end.yellow_score : end.red_score

                                                    return (
                                                        <div
                                                            key={end.id}
                                                            className="bg-background rounded-lg p-3 text-center"
                                                        >
                                                            <p className="text-xs text-muted-foreground mb-1">第 {end.end_number} 回合</p>
                                                            <p className={`text-lg font-bold ${elderScore > opponentScore ? 'text-green-600' :
                                                                elderScore < opponentScore ? 'text-red-500' : 'text-gray-600'
                                                                }`}>
                                                                {elderScore} : {opponentScore}
                                                            </p>
                                                            {end.house_snapshot_url && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setViewingPhoto(end.house_snapshot_url!)
                                                                    }}
                                                                    className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center justify-center gap-1"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    查看照片
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* 照片預覽 */}
            {viewingPhoto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
                    onClick={() => setViewingPhoto(null)}
                >
                    <button
                        onClick={() => setViewingPhoto(null)}
                        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={viewingPhoto}
                        alt="比賽照片"
                        className="max-w-full max-h-[90vh] object-contain"
                    />
                </div>
            )}
        </div>
    )
}

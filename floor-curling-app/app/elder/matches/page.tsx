'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

interface Match {
    id: string
    created_at: string
    winner_color: 'red' | 'yellow' | 'draw' | null
    red_score: number
    yellow_score: number
    total_ends: number
    store_id: string
}

interface MatchEnd {
    end_number: number
    red_score: number
    yellow_score: number
}

export default function ElderMatchesPage() {
    const supabase = createClientComponentClient()
    const [matches, setMatches] = useState<Match[]>([])
    const [matchEnds, setMatchEnds] = useState<Record<string, MatchEnd[]>>({})
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        fetchMatches()
    }, [])

    const fetchMatches = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)

            // 查詢參與過的比賽
            const { data: participations } = await supabase
                .from('match_participants')
                .select('match_id')
                .eq('elder_id', user.id)

            const matchIds = participations?.map(p => p.match_id) || []

            if (matchIds.length === 0) {
                // 嘗試舊的查詢方式
                const { data: legacyMatches } = await supabase
                    .from('matches')
                    .select('*')
                    .or(`red_team_id.eq.${user.id},yellow_team_id.eq.${user.id}`)
                    .order('created_at', { ascending: false })

                if (legacyMatches && legacyMatches.length > 0) {
                    setMatches(legacyMatches)
                    await fetchEnds(legacyMatches.map(m => m.id))
                }
            } else {
                const { data: matchesData } = await supabase
                    .from('matches')
                    .select('*')
                    .in('id', matchIds)
                    .order('created_at', { ascending: false })

                if (matchesData) {
                    setMatches(matchesData)
                    await fetchEnds(matchesData.map(m => m.id))
                }
            }
        } catch (error) {
            console.error('Error fetching matches:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchEnds = async (matchIds: string[]) => {
        const { data } = await supabase
            .from('match_ends')
            .select('match_id, end_number, red_score, yellow_score')
            .in('match_id', matchIds)
            .order('end_number')

        if (data) {
            const ends: Record<string, MatchEnd[]> = {}
            data.forEach((end: any) => {
                if (!ends[end.match_id]) ends[end.match_id] = []
                ends[end.match_id].push(end)
            })
            setMatchEnds(ends)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getWinnerBadge = (match: Match) => {
        if (!match.winner_color || match.winner_color === 'draw') {
            return <span className="px-2 py-1 text-xs font-bold bg-muted text-gray-600 rounded-full">平手</span>
        }
        if (match.winner_color === 'red') {
            return <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-600 rounded-full">紅隊勝</span>
        }
        return <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full">黃隊勝</span>
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-card/80 border-b border-border/50 px-5 pt-12 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/elder/dashboard"
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-gray-600 hover:bg-accent transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold text-foreground">我的比賽</h1>
                        <p className="text-sm text-muted-foreground">共 {matches.length} 場比賽</p>
                    </div>
                </div>
            </div>

            {/* Match List */}
            <div className="px-5 py-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">🏆</span>
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">尚無比賽記錄</h3>
                        <p className="text-muted-foreground text-sm">參加比賽後，記錄會顯示在這裡</p>
                    </div>
                ) : (
                    matches.map(match => {
                        const ends = matchEnds[match.id] || []
                        const redTotal = ends.reduce((sum, e) => sum + e.red_score, 0)
                        const yellowTotal = ends.reduce((sum, e) => sum + e.yellow_score, 0)

                        return (
                            <div
                                key={match.id}
                                className="bg-card rounded-2xl p-5 border border-border/50 shadow-card"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {formatDate(match.created_at)}
                                    </span>
                                    {getWinnerBadge(match)}
                                </div>

                                {/* Score Display */}
                                <div className="flex items-center justify-center gap-6">
                                    <div className="flex-1 text-center">
                                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${match.winner_color === 'red' ? 'bg-red-500 text-white' : 'bg-red-100'
                                            }`}>
                                            <span className={`text-3xl font-extrabold ${match.winner_color === 'red' ? 'text-white' : 'text-red-600'}`}>
                                                {redTotal}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground font-medium mt-2 block">紅隊</span>
                                    </div>

                                    <div className="text-gray-300 text-3xl font-extrabold">VS</div>

                                    <div className="flex-1 text-center">
                                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${match.winner_color === 'yellow' ? 'bg-yellow-500 text-white' : 'bg-yellow-100'
                                            }`}>
                                            <span className={`text-3xl font-extrabold ${match.winner_color === 'yellow' ? 'text-white' : 'text-yellow-600'}`}>
                                                {yellowTotal}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground font-medium mt-2 block">黃隊</span>
                                    </div>
                                </div>

                                {/* Ends Detail */}
                                {ends.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">回合詳情</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {ends.map(end => (
                                                <div key={end.end_number} className="flex items-center gap-1 bg-background rounded-lg px-3 py-1.5">
                                                    <span className="text-xs text-muted-foreground">第{end.end_number}局</span>
                                                    <span className="text-sm font-bold text-red-600">{end.red_score}</span>
                                                    <span className="text-gray-300">:</span>
                                                    <span className="text-sm font-bold text-yellow-600">{end.yellow_score}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

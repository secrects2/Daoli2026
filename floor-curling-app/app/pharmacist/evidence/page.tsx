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
    vibe_video_url: string | null
}

interface Match {
    id: string
    created_at: string
    status: string
    winner_color: string | null
    store_id: string
    red_profile?: { nickname?: string; full_name?: string }
    yellow_profile?: { nickname?: string; full_name?: string }
    match_ends: MatchEnd[]
}

export default function EvidencePage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [viewingMedia, setViewingMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null)
    const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')

    useEffect(() => {
        fetchMatches()
    }, [filter])

    const fetchMatches = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (!profile?.store_id) return

            let query = supabase
                .from('matches')
                .select(`
                    id,
                    created_at,
                    status,
                    winner_color,
                    store_id,
                    red_profile:profiles!matches_red_team_elder_id_fkey (nickname, full_name),
                    yellow_profile:profiles!matches_yellow_team_elder_id_fkey (nickname, full_name),
                    match_ends (
                        id,
                        end_number,
                        red_score,
                        yellow_score,
                        house_snapshot_url,
                        vibe_video_url
                    )
                `)
                .eq('store_id', profile.store_id)
                .order('created_at', { ascending: false })

            // 時間過濾
            if (filter === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                query = query.gte('created_at', today.toISOString())
            } else if (filter === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                query = query.gte('created_at', weekAgo.toISOString())
            }

            const { data, error } = await query.limit(50)

            if (!error && data) {
                setMatches(data as any)
            }
        } catch (err) {
            console.error('獲取比賽記錄失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const getEvidenceCount = (match: Match) => {
        let photos = 0
        let videos = 0
        match.match_ends?.forEach(end => {
            if (end.house_snapshot_url) photos++
            if (end.vibe_video_url) videos++
        })
        return { photos, videos }
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
                            <h1 className="text-2xl font-bold text-blue-600">證據審核後台</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 過濾器 */}
                <div className="mb-6 flex gap-2">
                    {[
                        { key: 'all', label: '全部' },
                        { key: 'today', label: '今天' },
                        { key: 'week', label: '本週' }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key as any)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* 比賽列表 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左側：比賽列表 */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">比賽列表 ({matches.length})</h2>

                        {matches.length === 0 ? (
                            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p>暫無比賽記錄</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {matches.map(match => {
                                    const evidence = getEvidenceCount(match)
                                    return (
                                        <button
                                            key={match.id}
                                            onClick={() => setSelectedMatch(match)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all bg-white ${selectedMatch?.id === match.id
                                                ? 'border-blue-500'
                                                : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-500">
                                                    {new Date(match.created_at).toLocaleDateString('zh-TW')}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${match.status === 'completed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {match.status === 'completed' ? '已完成' : '進行中'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                                    {match.red_profile?.nickname || match.red_profile?.full_name || '紅方'}
                                                </span>
                                                <span className="text-gray-400">vs</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                                    {match.yellow_profile?.nickname || match.yellow_profile?.full_name || '黃方'}
                                                </span>
                                            </div>
                                            <div className="flex gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {evidence.photos} 照片
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    {evidence.videos} 影片
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* 右側：證據詳情 */}
                    <div className="lg:col-span-2">
                        {selectedMatch ? (
                            <div className="bg-white rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        比賽證據 - {selectedMatch.match_ends?.length || 0} 回合
                                    </h2>
                                    <span className="text-sm text-gray-500">
                                        {new Date(selectedMatch.created_at).toLocaleString('zh-TW')}
                                    </span>
                                </div>

                                {/* 回合證據 */}
                                <div className="space-y-6">
                                    {selectedMatch.match_ends?.sort((a, b) => a.end_number - b.end_number).map(end => (
                                        <div key={end.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-gray-900">
                                                    第 {end.end_number} 回合
                                                </h3>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                                        {end.red_score} 分
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                                                        {end.yellow_score} 分
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* House Snapshot */}
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        Cam B - 證據照片
                                                    </p>
                                                    {end.house_snapshot_url ? (
                                                        <button
                                                            onClick={() => setViewingMedia({ type: 'image', url: end.house_snapshot_url! })}
                                                            className="w-full aspect-video bg-gray-200 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                                        >
                                                            <img
                                                                src={end.house_snapshot_url}
                                                                alt={`End ${end.end_number} snapshot`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                                            無照片
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Vibe Video */}
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Cam A - 氛圍影片
                                                    </p>
                                                    {end.vibe_video_url ? (
                                                        <button
                                                            onClick={() => setViewingMedia({ type: 'video', url: end.vibe_video_url! })}
                                                            className="w-full aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                                                        >
                                                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                                            無影片
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <p>請從左側選擇一場比賽</p>
                                <p className="text-sm mt-1">查看證據照片和影片</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 媒體預覽模態框 */}
            {viewingMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                    onClick={() => setViewingMedia(null)}
                >
                    <button
                        onClick={() => setViewingMedia(null)}
                        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div
                        className="max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {viewingMedia.type === 'image' ? (
                            <img
                                src={viewingMedia.url}
                                alt="證據照片"
                                className="max-w-full max-h-[90vh] object-contain"
                            />
                        ) : (
                            <video
                                src={viewingMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[90vh]"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

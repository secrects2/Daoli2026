'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import Link from 'next/link'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { parseElderQRCode } from '@/components/QRCode'

// Types
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
    const [loading, setLoading] = useState(true)
    const [isLineLinked, setIsLineLinked] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [bindError, setBindError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const handleLineBind = () => {
        window.location.href = '/api/auth/line/login'
    }

    const fetchData = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)

            // Check for LINE identity
            const lineIdentity = authUser.identities?.find(id => id.provider === 'line')
            setIsLineLinked(!!lineIdentity)

            const { data: profile } = await supabase.from('profiles').select('linked_elder_id').eq('id', authUser.id).single()
            if (!profile?.linked_elder_id) {
                setLoading(false)
                return
            }

            const { data: elderData } = await supabase.from('profiles').select('*').eq('id', profile.linked_elder_id).single()

            if (elderData) {
                setElder(elderData)
                const { data: walletData } = await supabase.from('wallets').select('global_points, local_points').eq('user_id', elderData.id).single()
                if (walletData) setWallet(walletData)

                const { data: matchesData } = await supabase
                    .from('matches')
                    .select('*')
                    .or(`red_team_elder_id.eq.${elderData.id},yellow_team_elder_id.eq.${elderData.id}`)
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (matchesData) setRecentMatches(matchesData)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleScan = async (qrContent: string) => {
        try {
            if (!parseElderQRCode(qrContent)) {
                // Ignore non-Daoli QR codes or show error
                setBindError('這不是有效的道里長輩條碼')
                return;
            }

            const res = await fetch('/api/family/bind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrContent })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('綁定成功！')
            setShowScanner(false)
            fetchData() // Refresh data
        } catch (error: any) {
            console.error(error)
            setBindError(error.message)
        }
        const handleUnbind = async () => {
            if (!confirm('確定要解除與長輩的綁定嗎？')) return

            try {
                const res = await fetch('/api/family/unbind', { method: 'POST' })
                if (!res.ok) throw new Error('解除失敗')

                alert('已解除綁定')
                fetchData()
            } catch (error) {
                console.error(error)
                alert('解除綁定時發生錯誤')
            }
        }

        const getMatchResult = (match: Match) => {
            if (!elder) return { text: '—', color: 'text-muted-foreground' }
            const isRed = match.red_team_elder_id === elder.id
            const won = (isRed && match.winner_color === 'red') || (!isRed && match.winner_color === 'yellow')

            if (match.winner_color === null) return { text: '平手', color: 'text-muted-foreground', icon: '🤝' }
            return won ? { text: '勝利', color: 'text-green-600', icon: '🏆' } : { text: '落敗', color: 'text-red-500', icon: '💪' }
        }

        if (loading) return <div className="min-h-screen py-20 text-center text-muted-foreground">載入中...</div>

        // Unlinked State
        if (!elder) {
            return (
                <div className="min-h-screen p-4">
                    <h1 className="ios-large-title mb-6">家屬中心</h1>
                    {showScanner ? (
                        <div className="bg-black rounded-2xl overflow-hidden p-4 relative">
                            <button
                                onClick={() => setShowScanner(false)}
                                className="absolute top-4 right-4 z-10 text-white bg-black/50 p-2 rounded-full"
                            >
                                ✕
                            </button>
                            <h3 className="text-white text-center mb-4">掃描長輩條碼</h3>
                            <QRCodeScanner onScan={handleScan} />
                            {bindError && <p className="text-red-400 text-center mt-4">{bindError}</p>}
                        </div>
                    ) : (
                        <div className="bg-card p-6 rounded-2xl shadow-sm text-center">
                            <div className="text-5xl mb-4">🔗</div>
                            <h3 className="font-semibold text-lg mb-2">尚未綁定長輩</h3>
                            <p className="text-muted-foreground text-sm mb-6">請聯繫藥局人員或掃描長輩 QR Code 進行綁定。</p>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="ios-btn bg-blue-600 hover:bg-blue-700 w-full"
                            >
                                掃描 QR Code
                            </button>
                        </div>
                    )}
                </div>
            )
        }

        return (
            <div className="min-h-screen pb-20">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5">
                    <div className="flex justify-between items-end">
                        <h1 className="ios-large-title">家屬中心</h1>
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                            {/* Placeholder Avatar */}
                            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                    </div>
                </div>

                <div className="px-4 mt-4 space-y-6">

                    {/* Elder Profile Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden">
                            {elder.avatar_url ? (
                                <img src={elder.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">👴</div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{elder.nickname || elder.full_name}</h2>
                            <p className="text-sm text-muted-foreground">{elder.store_id || '未所屬分店'}</p>
                        </div>
                        <button
                            onClick={handleUnbind}
                            className="ml-auto text-xs bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-full transition-colors"
                        >
                            解除綁定
                        </button>
                    </div>

                    {/* Points Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">榮譽積分</p>
                            <p className="text-3xl font-bold text-primary">{wallet?.global_points || 0}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">兌換積分</p>
                            <p className="text-3xl font-bold text-orange-500">{wallet?.local_points || 0}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                        <Link href="/family/matches" className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">🏃</span>
                                <span className="font-medium">比賽記錄</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>
                        <Link href="/family/notifications" className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">🔔</span>
                                <span className="font-medium">通知中心</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>

                        {!isLineLinked && (
                            <button onClick={handleLineBind} className="w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#06C755] text-white flex items-center justify-center">💬</span>
                                    <div>
                                        <span className="font-medium">綁定 LINE 通知</span>
                                        <p className="text-xs text-muted-foreground">開啟即時比賽推播</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-blue-600">立即設定</span>
                            </button>
                        )}
                    </div>

                    {/* Recent Matches */}
                    <div>
                        <h3 className="ios-section-header">最近比賽</h3>
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                            {recentMatches.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">暫無記錄</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {recentMatches.map(match => {
                                        const result = getMatchResult(match)
                                        return (
                                            <div key={match.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{result.icon}</span>
                                                    <div>
                                                        <p className={`font-semibold text-sm ${result.color}`}>{result.text}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(match.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono tracking-tighter">
                                                    {match.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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

export default function FamilyDashboard() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [user, setUser] = useState<any>(null)
    const [elder, setElder] = useState<Elder | null>(null)
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [stats, setStats] = useState<any>(null)
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
            const lineIdentity = authUser.identities?.find((id: any) => id.provider === 'line')
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

                // Interactions / Matches
                // Note: Schema might be user_interactions or matches depending on progress.
                // Assuming user_interactions for now based on seed script.
                const { data: interactions } = await supabase
                    .from('user_interactions')
                    .select('*')
                    .eq('user_id', elderData.id)
                    .eq('interaction_type', 'match_result')
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (interactions) {
                    // Map interaction to match-like structure for display
                    setRecentMatches(interactions.map((i: any) => ({
                        id: i.id,
                        created_at: i.created_at,
                        status: 'completed',
                        winner_color: i.data.result === 'win' ? 'red' : 'yellow', // Mock logic
                        red_team_elder_id: i.data.result === 'win' ? elderData.id : 'opponent',
                        yellow_team_elder_id: i.data.result === 'win' ? 'opponent' : elderData.id
                    })))
                }

                // Mock Stats if API missing
                setStats({ weeklyMatches: interactions ? interactions.length : 3 })
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
    }

    const handleUnbind = async () => {
        if (!confirm('確定要解除與長輩的綁定嗎？')) return

        try {
            const res = await fetch('/api/family/unbind', { method: 'POST' })
            if (!res.ok) throw new Error('解除失敗')

            alert('已解除綁定')
            setElder(null)
            fetchData()
        } catch (error) {
            console.error(error)
            alert('解除綁定時發生錯誤')
        }
    }

    const getMatchResult = (match: Match) => {
        if (!elder) return { text: '—', color: 'text-muted-foreground' }
        const isRed = match.red_team_elder_id === elder.id
        // Simple logic for fake data
        const won = (isRed && match.winner_color === 'red') || (!isRed && match.winner_color === 'yellow')
        return won ? { text: '勝利', color: 'text-green-600', icon: '🏆' } : { text: '落敗', color: 'text-red-500', icon: '💪' }
    }

    if (loading) return <div className="min-h-screen py-20 text-center text-muted-foreground">載入中...</div>

    // Unlinked State
    if (!elder) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-gray-50">
                <h1 className="text-2xl font-bold mb-8">歡迎來到家屬中心</h1>

                {showScanner ? (
                    <div className="bg-black rounded-2xl overflow-hidden p-4 relative w-full max-w-sm">
                        <button
                            onClick={() => setShowScanner(false)}
                            className="absolute top-4 right-4 z-10 text-white bg-black/50 p-2 rounded-full"
                        >
                            ✕
                        </button>
                        <h3 className="text-white text-center mb-4">掃描長輩專屬 QR Code</h3>
                        <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                            <QRCodeScanner onScan={handleScan} />
                        </div>
                        {bindError && <p className="text-red-400 text-center mt-4 font-bold bg-white/10 p-2 rounded">{bindError}</p>}
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center w-full max-w-sm">
                        <div className="text-6xl mb-6">🔗</div>
                        <h3 className="font-bold text-xl mb-3">尚未綁定長輩</h3>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            綁定後，您將可以查看長輩的<br />
                            比賽記錄、照片以及發送鼓勵訊息。
                        </p>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="ios-btn bg-blue-600 hover:bg-blue-700 text-white w-full py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            掃描長輩條碼
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-20 bg-[#F5F5F7]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900">家屬中心</h1>
                    <div className="flex items-center gap-2">
                        <Link href="/family/messages" className="relative p-2 rounded-full hover:bg-gray-100">
                            <span className="text-2xl">💬</span>
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </Link>
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 mt-6 space-y-6 max-w-2xl mx-auto">

                {/* Elder Profile Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden border-2 border-white shadow-md z-10">
                        {elder.avatar_url ? (
                            <img src={elder.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-200">🧓</div>
                        )}
                    </div>
                    <div className="z-10">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{elder.nickname || elder.full_name}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {elder.store_id ? '加盟店會員' : '一般會員'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleUnbind}
                        className="ml-auto z-10 text-xs text-gray-400 hover:text-red-500 underline"
                    >
                        解除
                    </button>
                </div>

                {/* Weekly Activity Stat Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <p className="text-blue-100 text-sm font-medium mb-2">本週活動摘要</p>
                        <div className="flex items-baseline gap-2 mb-4">
                            <h3 className="text-4xl font-bold">{stats?.weeklyMatches || 0}</h3>
                            <span className="opacity-80">場比賽</span>
                        </div>
                        <p className="text-blue-100 text-xs leading-relaxed max-w-[80%]">
                            長輩本週表現活躍！建議您可以傳送訊息給予鼓勵。
                        </p>
                        <Link href="/family/messages" className="absolute right-6 bottom-6 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold transition-colors">
                            發送鼓勵 →
                        </Link>
                    </div>
                </div>

                {/* Digital Store Link */}
                <Link href="/family/shop" className="block group">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-1">
                                <span>🛍️</span> 數位市集
                            </h3>
                            <p className="text-sm text-gray-500">
                                為長輩添購裝備，目前擁有 <span className="font-bold text-amber-500">{wallet?.global_points || 0}</span> 積分
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            →
                        </div>
                    </div>
                </Link>

                {/* Recent Matches */}
                <div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-gray-900">比賽記錄</h3>
                        <span className="text-xs text-gray-400">最近 5 筆</span>
                    </div>

                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-50">
                        {recentMatches.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                尚無比賽記錄
                            </div>
                        ) : (
                            recentMatches.map(match => {
                                const result = getMatchResult(match)
                                return (
                                    <div key={match.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gray-50`}>
                                                {result.icon}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${result.color}`}>{result.text}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(match.created_at).toLocaleDateString('zh-TW')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono text-gray-300">
                                                ID: {match.id.slice(0, 4)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Photo & Video Placeholders */}
                <div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-gray-900">照片與影片</h3>
                        <span className="text-xs text-gray-400">共 12 張</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                </div>

                {/* Line Bind CTA */}
                {!isLineLinked && (
                    <button onClick={handleLineBind} className="w-full bg-[#06C755] text-white p-4 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-[#05b34c] transition-colors shadow-lg shadow-green-100">
                        <span className="text-xl">💬</span>
                        綁定 LINE 帳號，接收即時通知
                    </button>
                )}
            </div>
        </div >
    )
}

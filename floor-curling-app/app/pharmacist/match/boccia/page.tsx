'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { QRScanModal } from '@/components/QRScanModal'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

// 動態載入 BocciaCam 避免 SSR 問題 (Webcam + MediaPipe)
const BocciaCam = dynamic(() => import('@/components/ai/BocciaCam'), { ssr: false })

interface BocciaEnd {
    endNumber: number
    redScore: number
    blueScore: number
}

interface AITarget {
    elderId: string
    side: 'red' | 'blue'
}

export default function BocciaMatchPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [redTeamIds, setRedTeamIds] = useState<string[]>([])
    const [blueTeamIds, setBlueTeamIds] = useState<string[]>([])
    const [redInput, setRedInput] = useState('')
    const [blueInput, setBlueInput] = useState('')
    const [storeId, setStoreId] = useState('')
    const [matchId, setMatchId] = useState<string | undefined>(undefined)
    const [ends, setEnds] = useState<BocciaEnd[]>([
        { endNumber: 1, redScore: 0, blueScore: 0 },
        { endNumber: 2, redScore: 0, blueScore: 0 },
        { endNumber: 3, redScore: 0, blueScore: 0 },
        { endNumber: 4, redScore: 0, blueScore: 0 },
    ])
    const [loading, setLoading] = useState(false)
    const [showQRScanner, setShowQRScanner] = useState<'red' | 'blue' | null>(null)

    // AI 分析模態框
    const [aiTarget, setAiTarget] = useState<AITarget | null>(null)

    useEffect(() => {
        const fetchStoreId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('store_id')
                    .eq('id', user.id)
                    .single()
                if (profile?.store_id) setStoreId(profile.store_id)
            }
        }
        fetchStoreId()
    }, [supabase])

    const handleQRScan = (elderId: string) => {
        if (showQRScanner === 'red') {
            if (!redTeamIds.includes(elderId)) {
                setRedTeamIds(prev => [...prev, elderId])
                toast.success('紅隊加入成功')
            }
        } else if (showQRScanner === 'blue') {
            if (!blueTeamIds.includes(elderId)) {
                setBlueTeamIds(prev => [...prev, elderId])
                toast.success('藍隊加入成功')
            }
        }
        setShowQRScanner(null)
    }

    const addPlayer = (team: 'red' | 'blue') => {
        const input = team === 'red' ? redInput : blueInput
        if (!input.trim()) return
        if (team === 'red') {
            if (!redTeamIds.includes(input)) {
                setRedTeamIds(prev => [...prev, input])
                setRedInput('')
            }
        } else {
            if (!blueTeamIds.includes(input)) {
                setBlueTeamIds(prev => [...prev, input])
                setBlueInput('')
            }
        }
    }

    const removePlayer = (team: 'red' | 'blue', id: string) => {
        if (team === 'red') {
            setRedTeamIds(prev => prev.filter(p => p !== id))
        } else {
            setBlueTeamIds(prev => prev.filter(p => p !== id))
        }
    }

    const updateEndScore = (index: number, team: 'red' | 'blue', score: number) => {
        setEnds(prev => prev.map((end, i) =>
            i === index
                ? { ...end, [team === 'red' ? 'redScore' : 'blueScore']: Math.max(0, score) }
                : end
        ))
    }

    const redTotal = ends.reduce((s, e) => s + e.redScore, 0)
    const blueTotal = ends.reduce((s, e) => s + e.blueScore, 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (redTeamIds.length === 0 || blueTeamIds.length === 0) {
            toast.error('紅隊和藍隊各至少需要一名選手')
            return
        }
        setLoading(true)

        try {
            const endsData = ends.map(end => ({
                endNumber: end.endNumber,
                redScore: end.redScore,
                yellowScore: end.blueScore,
            }))

            const { data, error } = await supabase.rpc('calculate_and_record_match_result', {
                p_store_id: storeId,
                p_red_elder_id: redTeamIds[0],
                p_yellow_elder_id: blueTeamIds[0],
                p_ends: endsData,
                p_sport_type: 'boccia',
            })

            if (error) throw error

            // 儲存 match_id 供 AI 分析關聯
            if (data?.match_id) {
                setMatchId(data.match_id)
            }

            toast.success(`🎯 滾球比賽完成！紅 ${redTotal} : ${blueTotal} 藍`)
            router.push('/pharmacist/match/history')
        } catch (error: any) {
            toast.error(error.message || '提交失敗')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 pt-12 pb-4 shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10" aria-label="返回">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-white">🎯 地板滾球</h1>
                            <p className="text-orange-100 text-xs">Boccia • 4 回合制</p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Team Selection */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Red Team */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-4">
                        <h3 className="font-black text-red-600 text-lg mb-3 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-red-500 inline-block" />
                            紅隊
                        </h3>
                        <div className="space-y-2 mb-3">
                            {redTeamIds.map(id => (
                                <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                                    <span className="text-sm text-red-700 font-mono truncate flex-1">{id.slice(0, 8)}...</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setAiTarget({ elderId: id, side: 'red' })}
                                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-200 transition-colors"
                                            title="啟動 AI 分析"
                                        >
                                            📹 AI
                                        </button>
                                        <button type="button" onClick={() => removePlayer('red', id)} className="text-red-400 hover:text-red-600 ml-1" aria-label="移除選手">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={redInput}
                                onChange={e => setRedInput(e.target.value)}
                                placeholder="輸入 ID"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <button type="button" onClick={() => addPlayer('red')} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold" aria-label="加入紅隊">+</button>
                        </div>
                        <button type="button" onClick={() => setShowQRScanner('red')} className="w-full mt-2 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors">
                            📷 掃描 QR Code
                        </button>
                    </div>

                    {/* Blue Team */}
                    <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-200 p-4">
                        <h3 className="font-black text-blue-600 text-lg mb-3 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-500 inline-block" />
                            藍隊
                        </h3>
                        <div className="space-y-2 mb-3">
                            {blueTeamIds.map(id => (
                                <div key={id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                                    <span className="text-sm text-blue-700 font-mono truncate flex-1">{id.slice(0, 8)}...</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setAiTarget({ elderId: id, side: 'blue' })}
                                            className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-200 transition-colors"
                                            title="啟動 AI 分析"
                                        >
                                            📹 AI
                                        </button>
                                        <button type="button" onClick={() => removePlayer('blue', id)} className="text-blue-400 hover:text-blue-600 ml-1" aria-label="移除選手">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                value={blueInput}
                                onChange={e => setBlueInput(e.target.value)}
                                placeholder="輸入 ID"
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <button type="button" onClick={() => addPlayer('blue')} className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg text-sm font-bold" aria-label="加入藍隊">+</button>
                        </div>
                        <button type="button" onClick={() => setShowQRScanner('blue')} className="w-full mt-2 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors">
                            📷 掃描 QR Code
                        </button>
                    </div>
                </div>

                {/* Scoring - 4 Ends */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">回合計分</h3>
                    </div>

                    <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2 bg-gray-50 border-b text-xs font-bold text-gray-500">
                        <span>回合</span>
                        <span className="text-center text-red-600">🔴 紅隊</span>
                        <span className="text-center text-blue-600">🔵 藍隊</span>
                    </div>

                    {ends.map((end, index) => (
                        <div key={end.endNumber} className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-gray-50 items-center">
                            <span className="font-bold text-gray-700">第 {end.endNumber} 回合</span>
                            <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => updateEndScore(index, 'red', end.redScore - 1)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold hover:bg-red-200" aria-label="紅隊減分">-</button>
                                <span className="w-8 text-center font-black text-lg text-red-600">{end.redScore}</span>
                                <button type="button" onClick={() => updateEndScore(index, 'red', end.redScore + 1)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold hover:bg-red-200" aria-label="紅隊加分">+</button>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                                <button type="button" onClick={() => updateEndScore(index, 'blue', end.blueScore - 1)} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold hover:bg-blue-200" aria-label="藍隊減分">-</button>
                                <span className="w-8 text-center font-black text-lg text-blue-600">{end.blueScore}</span>
                                <button type="button" onClick={() => updateEndScore(index, 'blue', end.blueScore + 1)} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold hover:bg-blue-200" aria-label="藍隊加分">+</button>
                            </div>
                        </div>
                    ))}

                    <div className="grid grid-cols-[1fr_80px_80px] px-5 py-4 bg-gray-900 text-white items-center">
                        <span className="font-black text-lg">總分</span>
                        <span className="text-center font-black text-2xl text-red-400">{redTotal}</span>
                        <span className="text-center font-black text-2xl text-blue-400">{blueTotal}</span>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || redTeamIds.length === 0 || blueTeamIds.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            提交中...
                        </span>
                    ) : (
                        `🎯 提交比賽結果 (${redTotal} : ${blueTotal})`
                    )}
                </button>
            </form>

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <QRScanModal
                    isOpen={!!showQRScanner}
                    onScan={handleQRScan}
                    onClose={() => setShowQRScanner(null)}
                />
            )}

            {/* AI Analysis Modal */}
            {aiTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                        <BocciaCam
                            elderId={aiTarget.elderId}
                            matchId={matchId}
                            side={aiTarget.side}
                            onClose={() => {
                                setAiTarget(null)
                                toast.success('AI 分析完成')
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

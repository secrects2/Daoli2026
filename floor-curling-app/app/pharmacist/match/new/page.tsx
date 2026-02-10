'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { uploadFile } from '@/app/actions/match'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { QRScanModal } from '@/components/QRScanModal'
import clsx from 'clsx'
import toast from 'react-hot-toast'

type End = {
    endNumber: number
    redScore: number
    yellowScore: number
    houseSnapshotFile?: File
    vibeVideoFile?: File
    houseSnapshotUrl?: string
    vibeVideoUrl?: string
}

type MatchMode = '1v1' | '3v3' | '6v6'

export default function NewMatchPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    // 狀態管理
    const [matchMode, setMatchMode] = useState<MatchMode>('3v3')
    const [redTeamIds, setRedTeamIds] = useState<string[]>([])
    const [yellowTeamIds, setYellowTeamIds] = useState<string[]>([])

    // Manual Input State
    const [redInput, setRedInput] = useState('')
    const [yellowInput, setYellowInput] = useState('')

    const [storeId, setStoreId] = useState('')
    const [ends, setEnds] = useState<End[]>([])
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string>('')

    // QR 掃描狀態
    const [showQRScanner, setShowQRScanner] = useState<'red' | 'yellow' | null>(null)

    useEffect(() => {
        const fetchStoreId = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('store_id')
                    .eq('id', user.id)
                    .single()

                if (profile?.store_id) {
                    setStoreId(profile.store_id)
                }
            }
        }
        fetchStoreId()
    }, [supabase])

    const getMaxPlayers = () => {
        switch (matchMode) {
            case '1v1': return 1;
            case '3v3': return 3;
            case '6v6': return 6;
            default: return 6;
        }
    }

    const MAX_PLAYERS = getMaxPlayers()

    // QR 掃描處理
    const handleQRScan = (elderId: string) => {
        if (showQRScanner === 'red') {
            if (redTeamIds.length >= MAX_PLAYERS) {
                toast.error(`此模式每隊最多 ${MAX_PLAYERS} 人`)
                return
            }
            if (!redTeamIds.includes(elderId) && !yellowTeamIds.includes(elderId)) {
                setRedTeamIds([...redTeamIds, elderId])
            }
        } else if (showQRScanner === 'yellow') {
            if (yellowTeamIds.length >= MAX_PLAYERS) {
                toast.error(`此模式每隊最多 ${MAX_PLAYERS} 人`)
                return
            }
            if (!yellowTeamIds.includes(elderId) && !redTeamIds.includes(elderId)) {
                setYellowTeamIds([...yellowTeamIds, elderId])
            }
        }
        setShowQRScanner(null)
    }

    // 手動添加 ID
    const addElder = (team: 'red' | 'yellow') => {
        const id = team === 'red' ? redInput.trim() : yellowInput.trim()
        if (!id) return

        if (team === 'red') {
            if (redTeamIds.length >= MAX_PLAYERS) return
            if (!redTeamIds.includes(id) && !yellowTeamIds.includes(id)) {
                setRedTeamIds([...redTeamIds, id])
                setRedInput('')
            } else {
                toast.error('此 ID 已存在')
            }
        } else {
            if (yellowTeamIds.length >= MAX_PLAYERS) return
            if (!yellowTeamIds.includes(id) && !redTeamIds.includes(id)) {
                setYellowTeamIds([...yellowTeamIds, id])
                setYellowInput('')
            } else {
                toast.error('此 ID 已存在')
            }
        }
    }

    // 移除 ID
    const removeElder = (team: 'red' | 'yellow', id: string) => {
        if (team === 'red') {
            setRedTeamIds(redTeamIds.filter(e => e !== id))
        } else {
            setYellowTeamIds(yellowTeamIds.filter(e => e !== id))
        }
    }

    // 添加新回合
    const addEnd = () => {
        if (ends.length >= 6) {
            toast.error('Max 6 ends')
            return
        }

        setEnds([...ends, {
            endNumber: ends.length + 1,
            redScore: 0,
            yellowScore: 0
        }])

        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }, 100)
    }

    // 删除回合
    const removeEnd = (index: number) => {
        setEnds(ends.filter((_, i) => i !== index))
    }

    // 更新回合分数
    const updateEndScore = (index: number, team: 'red' | 'yellow', score: number) => {
        const newEnds = [...ends]
        if (team === 'red') {
            newEnds[index].redScore = Math.max(0, score)
        } else {
            newEnds[index].yellowScore = Math.max(0, score)
        }
        setEnds(newEnds)
    }

    // 更新回合文件
    const updateEndFile = (index: number, type: 'photo' | 'video', file: File | undefined) => {
        const newEnds = [...ends]
        if (type === 'photo') {
            newEnds[index].houseSnapshotFile = file
        } else {
            newEnds[index].vibeVideoFile = file
        }
        setEnds(newEnds)
    }

    // 提交比賽
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setUploadProgress(t('matchNew.submitting'))

        try {
            // 验证
            if (redTeamIds.length === 0 || yellowTeamIds.length === 0 || !storeId) {
                throw new Error(t('matchNew.validation.required'))
            }

            if (ends.length === 0) {
                throw new Error(t('matchNew.validation.atLeastOneEnd'))
            }

            // ✅ 強制證據驗證
            const missingPhotoEnds = ends.filter(end => !end.houseSnapshotFile)
            if (missingPhotoEnds.length > 0) {
                throw new Error(t('matchNew.validation.missingPhoto', { ends: missingPhotoEnds.map(e => e.endNumber).join(', ') }))
            }

            // 先创建临时比赛 ID（用于文件上传路径）
            const tempMatchId = crypto.randomUUID()

            // 上传所有文件
            setUploadProgress(t('common.loading') + ' (Files)')
            const endsWithUrls = await Promise.all(
                ends.map(async (end, index) => {
                    const endData = { ...end } as any

                    // 上传照片
                    if (end.houseSnapshotFile) {
                        setUploadProgress(`Uploading End ${index + 1} Photo...`)
                        const result = await uploadFile(end.houseSnapshotFile, tempMatchId, index + 1, 'photo')
                        if (result.success) {
                            endData.houseSnapshotUrl = result.url
                        }
                    }

                    // 上传视频
                    if (end.vibeVideoFile) {
                        setUploadProgress(`Uploading End ${index + 1} Video...`)
                        const result = await uploadFile(end.vibeVideoFile, tempMatchId, index + 1, 'video')
                        if (result.success) {
                            endData.vibeVideoUrl = result.url
                        }
                    }

                    return endData
                })
            )

            // 调用后端 API 创建比赛
            setUploadProgress(t('matchNew.submitting'))

            const response = await fetch('/api/match/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    redTeamIds,
                    yellowTeamIds,
                    storeId,
                    ends: endsWithUrls.map(end => ({
                        endNumber: end.endNumber,
                        redScore: end.redScore,
                        yellowScore: end.yellowScore,
                        houseSnapshotUrl: end.houseSnapshotUrl || '',
                        vibeVideoUrl: end.vibeVideoUrl || ''
                    }))
                })
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || t('common.error'))
            }

            toast.success(t('matchNew.validation.success'))

            setTimeout(() => {
                router.push('/pharmacist/dashboard')
            }, 2000)

        } catch (error: any) {
            console.error('提交失败:', error)
            toast.error(error.message)
        } finally {
            setLoading(false)
            setUploadProgress('')
        }
    }

    // 计算当前总分
    const redTotal = ends.reduce((sum, end) => sum + end.redScore, 0)
    const yellowTotal = ends.reduce((sum, end) => sum + end.yellowScore, 0)

    const matchModes = [
        { id: '1v1', label: '1 vs 1', icon: '👤' },
        { id: '3v3', label: '3 vs 3', icon: '👥' },
        { id: '6v6', label: '6 vs 6', icon: '👨‍👩‍👧‍👦' },
    ]

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Sticky Glass Header */}
            <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-white/50 px-5 pt-12 pb-4 shadow-glass transition-all">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('matchNew.title')}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8 animate-fade-in-up">

                {/* Scoreboard */}
                <div className="relative bg-black rounded-3xl p-6 shadow-2xl overflow-hidden border border-gray-800">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 grid grid-cols-2 gap-8 text-center text-white">
                        <div>
                            <p className="text-red-500 font-bold uppercase tracking-widest text-sm mb-2">Red Team</p>
                            <div className="text-6xl font-black tabular-nums tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                {redTotal}
                            </div>
                        </div>
                        <div className="border-l border-white/10">
                            <p className="text-yellow-400 font-bold uppercase tracking-widest text-sm mb-2">Yellow Team</p>
                            <div className="text-6xl font-black tabular-nums tracking-tighter text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                                {yellowTotal}
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-mono text-gray-500">LIVE</span>
                    </div>
                    {storeId && <div className="absolute bottom-4 left-0 w-full text-center text-xs font-mono text-gray-600">STORE ID: {storeId}</div>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-900 mb-2">Store ID <span className="text-xs font-normal text-gray-400 ml-2">(Auto-filled)</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={storeId}
                                    readOnly
                                    className="w-full px-5 py-3 pl-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 font-mono cursor-not-allowed select-all"
                                    placeholder="Loading Store ID..."
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-900 mb-2">Match Mode</label>
                            <div className="grid grid-cols-3 gap-3 p-1 bg-gray-50 rounded-2xl border border-gray-200">
                                {matchModes.map(mode => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setMatchMode(mode.id as MatchMode)}
                                        className={clsx(
                                            "py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                                            matchMode === mode.id
                                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                        )}
                                    >
                                        <span className="text-lg">{mode.icon}</span>
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Red Team */}
                            <div className="p-4 rounded-3xl bg-red-50/50 border border-red-100 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h3 className="font-bold text-red-900 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        {t('matchNew.redElderId')}
                                    </h3>
                                    <span className={clsx(
                                        "text-xs font-medium border px-2 py-0.5 rounded-full",
                                        redTeamIds.length >= MAX_PLAYERS ? "text-red-600 bg-red-100 border-red-200" : "text-red-400 border-red-200"
                                    )}>{redTeamIds.length}/{MAX_PLAYERS}</span>
                                </div>

                                {/* Visual Slots */}
                                <div className="grid grid-cols-1 gap-2 mb-4 relative z-10">
                                    {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
                                        redTeamIds[i] ? (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100 shadow-sm text-sm animate-fade-in-up">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                    <span className="font-mono text-gray-600">{redTeamIds[i].slice(0, 8)}...</span>
                                                </div>
                                                <button type="button" onClick={() => removeElder('red', redTeamIds[i])} className="text-red-400 hover:text-red-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-red-200 bg-white/50 text-sm text-red-300">
                                                <div className="w-6 h-6 rounded-full bg-red-50 text-red-200 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                <span>Waiting for player...</span>
                                            </div>
                                        )
                                    ))}
                                </div>

                                <div className="flex gap-2 relative z-10 mt-auto">
                                    <input
                                        type="text"
                                        value={redInput}
                                        onChange={(e) => setRedInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addElder('red')
                                            }
                                        }}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-red-100 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                        placeholder="Scan or Type ID..."
                                        disabled={redTeamIds.length >= MAX_PLAYERS}
                                    />
                                    {/* Manual Add Button */}
                                    <button
                                        type="button"
                                        onClick={() => addElder('red')}
                                        disabled={!redInput || redTeamIds.length >= MAX_PLAYERS}
                                        className="shrink-0 w-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center font-bold transition-colors disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    {/* QR Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowQRScanner('red')}
                                        disabled={redTeamIds.length >= MAX_PLAYERS}
                                        className="shrink-0 w-12 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Yellow Team */}
                            <div className="p-4 rounded-3xl bg-yellow-50/50 border border-yellow-100 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <h3 className="font-bold text-yellow-900 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        {t('matchNew.yellowElderId')}
                                    </h3>
                                    <span className={clsx(
                                        "text-xs font-medium border px-2 py-0.5 rounded-full",
                                        yellowTeamIds.length >= MAX_PLAYERS ? "text-yellow-600 bg-yellow-100 border-yellow-200" : "text-yellow-600 border-yellow-200"
                                    )}>{yellowTeamIds.length}/{MAX_PLAYERS}</span>
                                </div>

                                {/* Visual Slots */}
                                <div className="grid grid-cols-1 gap-2 mb-4 relative z-10">
                                    {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
                                        yellowTeamIds[i] ? (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-yellow-100 shadow-sm text-sm animate-fade-in-up">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                    <span className="font-mono text-gray-600">{yellowTeamIds[i].slice(0, 8)}...</span>
                                                </div>
                                                <button type="button" onClick={() => removeElder('yellow', yellowTeamIds[i])} className="text-yellow-500 hover:text-yellow-700">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-yellow-200 bg-white/50 text-sm text-yellow-500/50">
                                                <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600/50 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                <span>Waiting for player...</span>
                                            </div>
                                        )
                                    ))}
                                </div>

                                <div className="flex gap-2 relative z-10 mt-auto">
                                    <input
                                        type="text"
                                        value={yellowInput}
                                        onChange={(e) => setYellowInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addElder('yellow')
                                            }
                                        }}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-yellow-100 focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                                        placeholder="Scan or Type ID..."
                                        disabled={yellowTeamIds.length >= MAX_PLAYERS}
                                    />
                                    {/* Manual Add Button */}
                                    <button
                                        type="button"
                                        onClick={() => addElder('yellow')}
                                        disabled={!yellowInput || yellowTeamIds.length >= MAX_PLAYERS}
                                        className="shrink-0 w-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center font-bold transition-colors disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                    </button>
                                    {/* QR Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowQRScanner('yellow')}
                                        disabled={yellowTeamIds.length >= MAX_PLAYERS}
                                        className="shrink-0 w-12 rounded-xl bg-yellow-400 text-white flex items-center justify-center shadow-lg shadow-yellow-200 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ends List ... */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Game Ends</h3>
                            <button
                                type="button"
                                onClick={addEnd}
                                disabled={ends.length >= 6}
                                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-full shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add End
                            </button>
                        </div>

                        {ends.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-400 mb-2">No ends recorded yet</p>
                                <p className="text-sm text-gray-400">Press "Add End" to start recording scores</p>
                            </div>
                        ) : (
                            ends.map((end, index) => (
                                <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative group overflow-hidden">
                                    <div className="absolute top-0 left-0 bg-gray-100 px-4 py-2 rounded-br-2xl text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        End {end.endNumber}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeEnd(index)}
                                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>

                                    <div className="mt-8 grid grid-cols-2 gap-8 mb-8">
                                        <div className="text-center">
                                            <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Red Score</label>
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => updateEndScore(index, 'red', end.redScore - 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-red-100 hover:text-red-600 transition-colors">-</button>
                                                <input
                                                    type="number"
                                                    value={end.redScore}
                                                    onChange={(e) => updateEndScore(index, 'red', parseInt(e.target.value) || 0)}
                                                    className="w-16 h-16 text-center text-3xl font-black bg-white rounded-2xl border-2 border-red-50 text-red-600 focus:border-red-500 focus:ring-0 outline-none appearance-none"
                                                />
                                                <button type="button" onClick={() => updateEndScore(index, 'red', end.redScore + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-red-100 hover:text-red-600 transition-colors">+</button>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-wider mb-2">Yellow Score</label>
                                            <div className="flex items-center justify-center gap-3">
                                                <button type="button" onClick={() => updateEndScore(index, 'yellow', end.yellowScore - 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-yellow-100 hover:text-yellow-600 transition-colors">-</button>
                                                <input
                                                    type="number"
                                                    value={end.yellowScore}
                                                    onChange={(e) => updateEndScore(index, 'yellow', parseInt(e.target.value) || 0)}
                                                    className="w-16 h-16 text-center text-3xl font-black bg-white rounded-2xl border-2 border-yellow-50 text-yellow-500 focus:border-yellow-500 focus:ring-0 outline-none appearance-none"
                                                />
                                                <button type="button" onClick={() => updateEndScore(index, 'yellow', end.yellowScore + 1)} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-yellow-100 hover:text-yellow-600 transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative group/upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => updateEndFile(index, 'photo', e.target.files?.[0])}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`
                                                flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all
                                                ${end.houseSnapshotFile
                                                    ? 'bg-blue-50 border-blue-400'
                                                    : 'bg-gray-50 border-gray-200 group-hover/upload:border-blue-400 group-hover/upload:bg-blue-50'}
                                            `}>
                                                {end.houseSnapshotFile ? (
                                                    <>
                                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                        <span className="text-xs font-bold text-blue-700 max-w-full truncate px-2">{end.houseSnapshotFile.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-500 mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 group-hover/upload:text-blue-600">Upload House Photo</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative group/upload">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => updateEndFile(index, 'video', e.target.files?.[0])}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`
                                                flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all
                                                ${end.vibeVideoFile
                                                    ? 'bg-green-50 border-green-400'
                                                    : 'bg-gray-50 border-gray-200 group-hover/upload:border-green-400 group-hover/upload:bg-green-50'}
                                            `}>
                                                {end.vibeVideoFile ? (
                                                    <>
                                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                        <span className="text-xs font-bold text-green-700 max-w-full truncate px-2">{end.vibeVideoFile.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-green-500 mb-2">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 group-hover/upload:text-green-600">Upload Vibe Video</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 pb-8 z-40">
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex gap-3 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || ends.length === 0}
                                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-transform active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Match
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {loading && uploadProgress && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
                            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing</h3>
                            <p className="text-gray-500 animate-pulse">{uploadProgress}</p>
                        </div>
                    </div>
                )}
            </main>

            <QRScanModal
                isOpen={showQRScanner !== null}
                onClose={() => setShowQRScanner(null)}
                onScan={handleQRScan}
                title={showQRScanner === 'red' ? '掃描紅方長輩 QR Code' : '掃描黃方長輩 QR Code'}
            />
        </div>
    )
}

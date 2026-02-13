'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { QRScanModal } from '@/components/QRScanModal'
import BocciaCam, { BocciaMetrics } from '@/components/ai/BocciaCam'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AITestPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(true)
    const [showQRScanner, setShowQRScanner] = useState(false)
    const [elderId, setElderId] = useState<string | null>(null)
    const [elderName, setElderName] = useState<string>('')
    const [isCamOpen, setIsCamOpen] = useState(false)
    const [lastMetrics, setLastMetrics] = useState<BocciaMetrics | null>(null)
    const [manualId, setManualId] = useState('')

    const handleManualSubmit = async () => {
        if (!manualId.trim()) return
        // Reuse handleScan logic essentially
        await handleScan(manualId.trim())
    }

    // 驗證權限
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || !['pharmacist', 'admin'].includes(profile.role)) {
                router.replace('/dashboard')
                return
            }
            setLoading(false)
        }
        checkUser()
    }, [router, supabase])

    // [DEV] 自動填入測試用長輩 ID
    useEffect(() => {
        const fetchTestElder = async () => {
            try {
                // 取得最近新增的一位長輩
                const { data: elder } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'elder')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (elder) {
                    setManualId(elder.id)
                    toast('已自動填入測試用長輩 ID', { icon: '🧪', duration: 3000 })
                }
            } catch (e) {
                console.error('Auto-fill error', e)
            }
        }

        if (!loading && !elderId) {
            fetchTestElder()
        }
    }, [loading, supabase, elderId])

    // 處理掃碼
    const handleScan = async (scannedId: string) => {
        try {
            // 驗證長輩身分
            const { data: elder, error } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', scannedId)
                .eq('role', 'elder')
                .single()

            if (error || !elder) {
                toast.error('找不到此長輩或無效的 QR Code')
                return
            }

            setElderId(scannedId)
            setElderName(elder.full_name)
            setShowQRScanner(false)
            toast.success(`已載入長輩：${elder.full_name}`)
        } catch (err) {
            console.error(err)
            toast.error('掃描發生錯誤')
        }
    }

    const handleCamClose = () => {
        setIsCamOpen(false)
        // refresh or stay? 
    }

    const resetTest = () => {
        setElderId(null)
        setElderName('')
        setLastMetrics(null)
        setIsCamOpen(false)
    }

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">載入中...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="px-5 py-4 flex items-center gap-4">
                    <Link href="/pharmacist/dashboard" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transaction-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">AI 動作檢測</h1>
                        <p className="text-xs text-gray-500">獨立檢測模式 • 不計入比賽</p>
                    </div>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">

                {/* 1. Elder Selection Card */}
                {!elderId ? (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center min-h-[40vh]">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">👤</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">請先掃描長輩 ID</h2>
                        <p className="text-gray-500 mb-8 max-w-xs mx-auto">即使是練習或測試，也需要綁定長輩身分以記錄數據。</p>

                        <button
                            onClick={() => setShowQRScanner(true)}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            開啟掃描器
                        </button>

                        <div className="mt-8 w-full max-w-xs mx-auto border-t border-gray-100 pt-6">
                            <p className="text-xs text-gray-400 mb-2 font-medium">或手動輸入長輩 ID</p>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-gray-400 font-mono text-sm">#</span>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-8 pr-20 py-3 bg-gray-50 border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                    placeholder="輸入 ID (UUID)"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    // 按 Enter 也可以提交
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                />
                                <button
                                    onClick={handleManualSubmit}
                                    disabled={!manualId.trim()}
                                    className="absolute inset-y-1.5 right-1.5 px-4 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    確認
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Elder Info Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-sm">
                                    👴
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">目前檢測對象</p>
                                    <h3 className="text-xl font-black text-gray-900">{elderName}</h3>
                                </div>
                            </div>
                            <button
                                onClick={resetTest}
                                className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200"
                            >
                                更換
                            </button>
                        </div>

                        {/* Camera Section */}
                        {isCamOpen ? (
                            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-black/5">
                                <BocciaCam
                                    elderId={elderId}
                                    side="blue" // Default to blue/neutral for test
                                    onClose={handleCamClose}
                                    onMetricsUpdate={(m) => setLastMetrics(m)}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                <button
                                    onClick={() => setIsCamOpen(true)}
                                    className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-3xl shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all text-left relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
                                    <span className="text-4xl mb-4 block">📸</span>
                                    <h3 className="text-2xl font-black mb-1">啟動 AI 檢測</h3>
                                    <p className="text-indigo-100 opacity-80 text-sm">與比賽模式相同，但數據會標記為練習</p>
                                </button>

                                {lastMetrics && (
                                    <div className="bg-white rounded-3xl p-6 border border-gray-100">
                                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <span>📊 上次檢測結果</span>
                                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">剛剛</span>
                                        </h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                <p className="text-xs text-gray-400">ROM</p>
                                                <p className="text-xl font-black text-gray-900">{lastMetrics.elbowROM}°</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                <p className="text-xs text-gray-400">穩定度</p>
                                                <p className="text-xl font-black text-gray-900">{lastMetrics.trunkStability}°</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-xl text-center">
                                                <p className="text-xs text-gray-400">速度</p>
                                                <p className="text-xl font-black text-gray-900">{lastMetrics.velocity}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <QRScanModal
                isOpen={showQRScanner}
                onClose={() => setShowQRScanner(false)}
                onScan={handleScan}
            />
        </div>
    )
}

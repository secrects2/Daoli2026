'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { QRScanModal } from '@/components/QRScanModal'
import BocciaCam, { BocciaMetrics } from '@/components/ai/BocciaCam'
import { getAiPrescription } from '@/lib/ai-diagnosis'
import toast from 'react-hot-toast'
import Link from 'next/link'
import AISetupGuideModal from '@/components/ai/AISetupGuideModal'
import ElderSearchInput from '@/components/ElderSearchInput'
import AiAnalysisSection from '@/components/AiAnalysisSection'

export default function AITestPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(true)
    const [showQRScanner, setShowQRScanner] = useState(false)
    const [elderId, setElderId] = useState<string | null>(null)
    const [elderName, setElderName] = useState<string>('')
    const [isCamOpen, setIsCamOpen] = useState(false)
    const [lastMetrics, setLastMetrics] = useState<BocciaMetrics | null>(null)
    const [showGuide, setShowGuide] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0) // 用以觸發 AiAnalysisSection 重新抓取

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

    // [DEV] 自動填入林萬海
    useEffect(() => {
        const fetchTestElder = async () => {
            try {
                // 取得名為林萬海的長輩
                const { data: elder } = await supabase
                    .from('profiles')
                    .select('id, full_name, nickname')
                    .eq('id', '93c08e56-c71f-418d-8fb2-48885e00ff9a')
                    .single()

                if (elder) {
                    setElderId(elder.id)
                    setElderName(elder.full_name || elder.nickname || '林萬海')
                    toast('已自動載入檢測對象：林萬海', { icon: '🧪', duration: 3000 })
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
        setRefreshKey(prev => prev + 1) // 觸發重整
    }

    const resetTest = () => {
        setElderId(null)
        setElderName('')
        setLastMetrics(null)
        setIsCamOpen(false)
    }

    // Stabilize the handler to prevent BocciaCam re-renders
    const handleMetricsUpdate = useCallback((m: BocciaMetrics) => {
        setLastMetrics(m)
    }, [])

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
                        <h1 className="text-xl font-black text-gray-900">AI 動作檢測(地板滾球)</h1>
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
                            <p className="text-xs text-gray-400 mb-2 font-medium">或搜尋長輩姓名</p>
                            <ElderSearchInput
                                onSelect={(id, name) => {
                                    setElderId(id)
                                    setElderName(name)
                                    toast.success(`已載入長輩：${name}`)
                                }}
                            />
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

                        {/* Guide Button - New */}
                        <button
                            onClick={() => setShowGuide(true)}
                            className="w-full bg-blue-50 border border-blue-100 text-blue-700 px-6 py-4 rounded-2xl flex items-center justify-between font-bold hover:bg-blue-100 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-xl">📏</span>
                                AI 檢測架設規範與教學
                            </span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        {/* Camera Section */}
                        {isCamOpen ? (
                            <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center">
                                <BocciaCam
                                    elderId={elderId}
                                    side="blue" // Default to blue/neutral for test
                                    onClose={handleCamClose}
                                    onMetricsUpdate={handleMetricsUpdate}
                                    className="h-full w-full rounded-none"
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

                                {/* 使用全站共用的 AiAnalysisSection 來確保所有數據邏輯與首頁一致 */}
                                <div key={refreshKey} className="mt-4">
                                    <AiAnalysisSection elderId={elderId} showLink={false} />
                                </div>
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

            <AISetupGuideModal
                isOpen={showGuide}
                onClose={() => setShowGuide(false)}
            />
        </div>
    )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { QRCodeGenerator, generateElderQRContent, generateQRCodeDataUrl, parseElderQRCode } from '@/components/QRCode'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Elder {
    id: string
    nickname?: string
    full_name?: string
    store_id: string
    created_at: string
}

export default function ElderQRCodePage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate')
    const [elders, setElders] = useState<Elder[]>([])
    const [selectedElder, setSelectedElder] = useState<Elder | null>(null)
    const [loading, setLoading] = useState(true)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchElders()
    }, [])

    const fetchElders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            const userStoreId = profile?.store_id || null
            if (userStoreId) setStoreId(userStoreId)

            let query = supabase
                .from('profiles')
                .select('id, nickname, full_name, store_id, created_at')
                .eq('role', 'elder')
                .order('created_at', { ascending: false })

            if (userStoreId) {
                query = query.eq('store_id', userStoreId)
            }

            const { data: eldersData, error } = await query

            if (!error && eldersData) {
                setElders(eldersData)
            }
        } catch (err) {
            console.error('獲取長輩列表失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = async () => {
        if (!selectedElder) return

        const qrDataUrl = await generateQRCodeDataUrl(
            generateElderQRContent(selectedElder.id),
            400
        )

        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const elderName = selectedElder.nickname || selectedElder.full_name || '長輩'

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${elderName} - QR Code</title>
                <style>
                    @page { size: 85mm 54mm; margin: 0; }
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
                    .card { width: 85mm; height: 54mm; border: 2px solid #1e3a5f; border-radius: 8px; padding: 8px; box-sizing: border-box; display: flex; align-items: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); }
                    .qr-section { flex-shrink: 0; }
                    .qr-code { width: 45mm; height: 45mm; }
                    .info-section { flex: 1; padding-left: 8px; text-align: center; }
                    .logo { font-size: 14px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
                    .name { font-size: 16px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
                    .store { font-size: 10px; color: #64748b; margin-bottom: 8px; }
                    .instructions { font-size: 9px; color: #94a3b8; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="qr-section"><img class="qr-code" src="${qrDataUrl}" alt="QR Code" /></div>
                    <div class="info-section">
                        <div class="logo">🥌 道里地壺球</div>
                        <div class="name">${elderName}</div>
                        <div class="store">${storeId || ''}</div>
                        <div class="instructions">請藥師掃描此 QR Code<br/>參加比賽</div>
                    </div>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const handleDownload = async () => {
        if (!selectedElder) return
        const qrDataUrl = await generateQRCodeDataUrl(generateElderQRContent(selectedElder.id), 400)
        const link = document.createElement('a')
        link.download = `qr-${selectedElder.nickname || selectedElder.id}.png`
        link.href = qrDataUrl
        link.click()
    }

    const handleScan = async (qrContent: string) => {
        setScanResult(null)
        try {
            // Validate QR format locally first
            if (!parseElderQRCode(qrContent)) {
                setScanResult({ success: false, message: '無效的長輩條碼' })
                return
            }

            const res = await fetch('/api/pharmacist/bind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrContent })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setScanResult({ success: true, message: `成功綁定長輩：${data.elder.nickname || data.elder.full_name}` })
            // Refresh list
            fetchElders()

            // Switch to Generate tab and select this elder? Or stay to scan more?
            // Staying to scan more is probably better for bulk operations.

        } catch (error: any) {
            console.error(error)
            setScanResult({ success: false, message: error.message || '綁定失敗' })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 導航欄 */}
            <nav className="bg-white shadow-sm sticky top-0 z-10">
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
                            <h1 className="text-xl md:text-2xl font-bold text-blue-600">長輩 QR Code 管理</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'generate'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <span className="mr-2">🖨️</span> 列印條碼
                        </button>
                        <button
                            onClick={() => setActiveTab('scan')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'scan'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <span className="mr-2">📷</span> 掃描綁定
                        </button>
                    </div>
                </div>
            </div>

            {/* 主內容 */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Mode: Generate */}
                {activeTab === 'generate' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 長輩列表 */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">選擇長輩</h2>

                            {elders.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>尚無長輩資料</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {elders.map(elder => (
                                        <button
                                            key={elder.id}
                                            onClick={() => setSelectedElder(elder)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedElder?.id === elder.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {(elder.nickname || elder.full_name || '?')[0]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {elder.nickname || elder.full_name || '未命名長輩'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        ID: {elder.id.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* QR Code 預覽 */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code 預覽</h2>
                            {selectedElder ? (
                                <div className="text-center">
                                    <div ref={printRef} className="inline-block bg-gradient-to-br from-slate-50 to-slate-200 border-2 border-blue-900 rounded-xl p-6 mb-6">
                                        <div className="flex items-center gap-4">
                                            <QRCodeGenerator value={generateElderQRContent(selectedElder.id)} size={180} className="rounded-lg" />
                                            <div className="text-left">
                                                <p className="text-blue-900 font-bold text-lg mb-1">🥌 道里地壺球</p>
                                                <p className="text-blue-900 font-semibold text-xl">{selectedElder.nickname || selectedElder.full_name || '長輩'}</p>
                                                <p className="text-gray-500 text-sm">{storeId}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">列印卡片</button>
                                        <button onClick={handleDownload} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">下載圖片</button>
                                    </div>
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                                        <p className="text-sm text-gray-600"><span className="font-semibold">ID：</span><span className="font-mono">{selectedElder.id}</span></p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500"><p>請從左側選擇一位長輩</p></div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode: Scan */}
                {activeTab === 'scan' && (
                    <div className="max-w-md mx-auto">
                        <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-[3/4]">
                            <QRCodeScanner onScan={handleScan} />

                            {/* Overlay UI */}
                            <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent text-white text-center">
                                <h3 className="text-xl font-bold">掃描長輩 QR Code</h3>
                                <p className="text-sm opacity-80 mt-1">將長輩手機上的條碼對準框框</p>
                            </div>
                        </div>

                        {/* Result Message */}
                        {scanResult && (
                            <div className={`mt-6 p-4 rounded-xl text-center border-2 ${scanResult.success
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                <div className="text-3xl mb-2">{scanResult.success ? '🎉' : '❌'}</div>
                                <p className="font-bold">{scanResult.message}</p>
                            </div>
                        )}

                        <div className="mt-8 text-center text-gray-500 text-sm">
                            <p>或是</p>
                            <button className="text-blue-600 font-bold mt-2 hover:underline">
                                手動輸入 ID (開發中)
                            </button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    )
}

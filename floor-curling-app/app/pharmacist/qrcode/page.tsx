'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { QRCodeGenerator, generateElderQRContent, generateQRCodeDataUrl } from '@/components/QRCode'
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

    const [elders, setElders] = useState<Elder[]>([])
    const [selectedElder, setSelectedElder] = useState<Elder | null>(null)
    const [loading, setLoading] = useState(true)
    const [storeId, setStoreId] = useState<string | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchElders()
    }, [])

    const fetchElders = async () => {
        try {
            // 先獲取當前藥師的 store_id
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (profile?.store_id) {
                setStoreId(profile.store_id)

                // 獲取同店鋪的長輩
                const { data: eldersData, error } = await supabase
                    .from('profiles')
                    .select('id, nickname, full_name, store_id, created_at')
                    .eq('role', 'elder')
                    .eq('store_id', profile.store_id)
                    .order('created_at', { ascending: false })

                if (!error && eldersData) {
                    setElders(eldersData)
                }
            }
        } catch (err) {
            console.error('獲取長輩列表失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = async () => {
        if (!selectedElder) return

        // 生成高解析度 QR Code
        const qrDataUrl = await generateQRCodeDataUrl(
            generateElderQRContent(selectedElder.id),
            400
        )

        // 建立列印視窗
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const elderName = selectedElder.nickname || selectedElder.full_name || '長輩'

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${elderName} - QR Code</title>
                <style>
                    @page {
                        size: 85mm 54mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    .card {
                        width: 85mm;
                        height: 54mm;
                        border: 2px solid #1e3a5f;
                        border-radius: 8px;
                        padding: 8px;
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    }
                    .qr-section {
                        flex-shrink: 0;
                    }
                    .qr-code {
                        width: 45mm;
                        height: 45mm;
                    }
                    .info-section {
                        flex: 1;
                        padding-left: 8px;
                        text-align: center;
                    }
                    .logo {
                        font-size: 14px;
                        font-weight: bold;
                        color: #1e3a5f;
                        margin-bottom: 4px;
                    }
                    .name {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1e3a5f;
                        margin-bottom: 4px;
                    }
                    .store {
                        font-size: 10px;
                        color: #64748b;
                        margin-bottom: 8px;
                    }
                    .instructions {
                        font-size: 9px;
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="qr-section">
                        <img class="qr-code" src="${qrDataUrl}" alt="QR Code" />
                    </div>
                    <div class="info-section">
                        <div class="logo">🥌 道里地壺球</div>
                        <div class="name">${elderName}</div>
                        <div class="store">${storeId || ''}</div>
                        <div class="instructions">請藥師掃描此 QR Code<br/>參加比賽</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const handleDownload = async () => {
        if (!selectedElder) return

        const qrDataUrl = await generateQRCodeDataUrl(
            generateElderQRContent(selectedElder.id),
            400
        )

        const link = document.createElement('a')
        link.download = `qr-${selectedElder.nickname || selectedElder.id}.png`
        link.href = qrDataUrl
        link.click()
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
                            <h1 className="text-2xl font-bold text-blue-600">長輩 QR Code 管理</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 長輩列表 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">選擇長輩</h2>

                        {elders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
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
                                {/* QR Code 卡片預覽 */}
                                <div
                                    ref={printRef}
                                    className="inline-block bg-gradient-to-br from-slate-50 to-slate-200 border-2 border-blue-900 rounded-xl p-6 mb-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <QRCodeGenerator
                                            value={generateElderQRContent(selectedElder.id)}
                                            size={180}
                                            className="rounded-lg"
                                        />
                                        <div className="text-left">
                                            <p className="text-blue-900 font-bold text-lg mb-1">🥌 道里地壺球</p>
                                            <p className="text-blue-900 font-semibold text-xl">
                                                {selectedElder.nickname || selectedElder.full_name || '長輩'}
                                            </p>
                                            <p className="text-gray-500 text-sm">{storeId}</p>
                                            <p className="text-gray-400 text-xs mt-2">
                                                請藥師掃描此 QR Code<br />參加比賽
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按鈕 */}
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={handlePrint}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        列印卡片
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        下載圖片
                                    </button>
                                </div>

                                {/* QR Code 內容說明 */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">QR Code 內容：</span>
                                    </p>
                                    <code className="block mt-1 text-xs bg-gray-200 p-2 rounded text-gray-700 break-all">
                                        {generateElderQRContent(selectedElder.id)}
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                <p>請從左側選擇一位長輩</p>
                                <p className="text-sm mt-1">以生成 QR Code</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

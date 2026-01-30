'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { parseElderQRCode } from './QRCode'

// 動態載入掃描器，避免 SSR 問題
const QRCodeScanner = dynamic(
    () => import('./QRCodeScanner').then(mod => mod.QRCodeScanner),
    { ssr: false, loading: () => <div className="w-full aspect-square bg-gray-900 rounded-lg animate-pulse" /> }
)

interface QRScanModalProps {
    isOpen: boolean
    onClose: () => void
    onScan: (elderId: string) => void
    title?: string
}

/**
 * QR Code 掃描模態框
 * 用於快速選擇長輩
 */
export function QRScanModal({ isOpen, onClose, onScan, title = '掃描長輩 QR Code' }: QRScanModalProps) {
    const [error, setError] = useState<string | null>(null)

    const handleScan = useCallback((result: string) => {
        const parsed = parseElderQRCode(result)
        if (parsed) {
            onScan(parsed.elderId)
            onClose()
        } else {
            setError('無效的 QR Code 格式')
        }
    }, [onScan, onClose])

    const handleError = useCallback((err: string) => {
        setError(err)
    }, [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* 標題 */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 掃描器 */}
                <div className="p-4">
                    <QRCodeScanner
                        onScan={handleScan}
                        onError={handleError}
                        className="w-full"
                    />

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <p className="mt-4 text-center text-sm text-gray-500">
                        將長輩的 QR Code 卡片對準相機掃描
                    </p>
                </div>

                {/* 手動輸入提示 */}
                <div className="p-4 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                    >
                        取消掃描，手動輸入 ID
                    </button>
                </div>
            </div>
        </div>
    )
}

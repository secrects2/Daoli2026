'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

interface ElderQRModalProps {
    isOpen: boolean
    onClose: () => void
    elderId: string
    elderName: string
}

export function ElderQRModal({ isOpen, onClose, elderId, elderName }: ElderQRModalProps) {
    const [copied, setCopied] = useState(false)

    // QR 內容是 JSON 格式，包含 elder ID
    const qrValue = JSON.stringify({ elderId, type: 'elder_bind' })

    const handleCopyId = () => {
        navigator.clipboard.writeText(elderId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                {/* 標題 */}
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-1">我的 QR Code</h3>
                    <p className="text-sm text-muted-foreground">
                        讓家屬掃描此 QR Code 來綁定您的帳號
                    </p>
                </div>

                {/* QR Code */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 mb-6">
                    <div className="bg-card rounded-xl p-4 shadow-inner">
                        <QRCode
                            value={qrValue}
                            size={200}
                            style={{ width: '100%', height: 'auto' }}
                            level="M"
                            fgColor="#1f2937"
                        />
                    </div>
                </div>

                {/* 長輩資訊 */}
                <div className="bg-background rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">長輩姓名</p>
                            <p className="text-lg font-bold text-foreground">{elderName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">ID</p>
                            <p className="text-xs font-mono text-gray-600 truncate max-w-[100px]">
                                {elderId.slice(0, 8)}...
                            </p>
                        </div>
                    </div>
                </div>

                {/* 複製 ID 按鈕 */}
                <button
                    onClick={handleCopyId}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${copied
                            ? 'bg-green-100 text-green-700'
                            : 'bg-muted text-gray-600 hover:bg-accent'
                        }`}
                >
                    {copied ? '✓ 已複製 ID' : '📋 複製完整 ID'}
                </button>

                {/* 關閉按鈕 */}
                <button
                    onClick={onClose}
                    className="w-full mt-3 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                    關閉
                </button>

                {/* 使用說明 */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                    家屬可以在「家屬入口」掃描此 QR Code 進行綁定
                </p>
            </div>
        </div>
    )
}

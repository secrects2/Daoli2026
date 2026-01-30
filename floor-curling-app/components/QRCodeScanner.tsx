'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRCodeScannerProps {
    onScan: (result: string) => void
    onError?: (error: string) => void
    className?: string
}

/**
 * QR Code 掃描元件
 * 使用裝置相機掃描 QR Code
 */
export function QRCodeScanner({ onScan, onError, className = '' }: QRCodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const startScanner = useCallback(async () => {
        if (!containerRef.current) return

        try {
            const scanner = new Html5Qrcode('qr-scanner-container')
            scannerRef.current = scanner

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    onScan(decodedText)
                    // 掃描成功後暫停
                    stopScanner()
                },
                (errorMessage) => {
                    // 忽略一般的掃描錯誤 (找不到 QR Code)
                }
            )

            setIsScanning(true)
            setHasPermission(true)
        } catch (err: any) {
            console.error('QR Scanner error:', err)
            setHasPermission(false)
            onError?.(err.message || '無法啟動相機')
        }
    }, [onScan, onError])

    const stopScanner = useCallback(async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop()
                setIsScanning(false)
            } catch (err) {
                console.error('Stop scanner error:', err)
            }
        }
    }, [isScanning])

    useEffect(() => {
        return () => {
            stopScanner()
        }
    }, [stopScanner])

    return (
        <div className={`relative ${className}`}>
            <div
                id="qr-scanner-container"
                ref={containerRef}
                className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden"
            />

            {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
                    <button
                        onClick={startScanner}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        開啟相機掃描
                    </button>
                </div>
            )}

            {hasPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 rounded-lg">
                    <div className="text-center p-4">
                        <svg className="w-12 h-12 mx-auto mb-2 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-200">無法存取相機</p>
                        <p className="text-red-300 text-sm mt-1">請允許相機權限</p>
                    </div>
                </div>
            )}

            {isScanning && (
                <button
                    onClick={stopScanner}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}

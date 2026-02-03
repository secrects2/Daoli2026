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
    const [isLoading, setIsLoading] = useState(true) // Default to loading for auto-start
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    // Generate a somewhat unique ID for this instance
    const [elementId] = useState(() => `qr-scanner-${Math.random().toString(36).substring(2, 9)}`)

    const startScanner = useCallback(async () => {
        if (!document.getElementById(elementId)) {
            console.warn('Scanner container not found in DOM')
            return
        }

        setIsLoading(true)
        try {
            // Clean up existing instance if any
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop()
                } catch (e) {
                    console.warn('Failed to stop previous scanner instance', e)
                }
                try {
                    await scannerRef.current.clear()
                } catch (e) {
                    // ignore clear error
                }
            }

            const scanner = new Html5Qrcode(elementId)
            scannerRef.current = scanner

            // Configuration for better mobile support
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            }

            await scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    onScan(decodedText)
                    // Don't stop immediately, let the parent handle close or keep scanning
                    // but if we want to scan only once per modal open:
                    // stopScanner() // Let's keep it running unless parent closes it
                },
                (errorMessage) => {
                    // Ignore frame parse errors
                }
            )

            setIsScanning(true)
            setHasPermission(true)
        } catch (err: any) {
            console.error('QR Scanner error:', err)
            // If it's a permission denied error
            if (err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
                setHasPermission(false)
            }
            onError?.(err.message || '無法啟動相機')
        } finally {
            setIsLoading(false)
        }
    }, [elementId, onScan, onError])

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (isScanning) {
                    await scannerRef.current.stop()
                }
                scannerRef.current.clear()
            } catch (err) {
                console.error('Stop scanner error:', err)
            } finally {
                setIsScanning(false)
            }
        }
    }, [isScanning])

    // Auto-start on mount
    useEffect(() => {
        let mounted = true

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            if (mounted) {
                startScanner()
            }
        }, 300)

        return () => {
            mounted = false
            clearTimeout(timer)
            stopScanner()
        }
    }, [startScanner, stopScanner])

    return (
        <div className={`relative ${className}`}>
            <div
                id={elementId}
                className="w-full aspect-square bg-gray-900 rounded-lg overflow-hidden relative z-0"
            />

            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p className="text-white text-sm">正在啟動相機...</p>
                </div>
            )}

            {/* Start Button (only if not scanning and not loading) */}
            {!isScanning && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                    <button
                        onClick={startScanner}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        重試開啟相機
                    </button>
                </div>
            )}

            {/* Permission Denied State */}
            {hasPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 z-20">
                    <div className="text-center p-4">
                        <svg className="w-12 h-12 mx-auto mb-2 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-200 mt-2 font-bold">無法存取相機</p>
                        <p className="text-red-300 text-sm mt-1 mb-3">請檢查瀏覽器權限設定</p>
                        <button
                            onClick={startScanner}
                            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
                        >
                            再試一次
                        </button>
                    </div>
                </div>
            )}

            {/* Close / Overlay UI when scanning */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none border-2 border-white/30 z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-yellow-400 rounded-lg opacity-50"></div>
                </div>
            )}
        </div>
    )
}

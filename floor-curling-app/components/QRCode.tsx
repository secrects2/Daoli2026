'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeGeneratorProps {
    value: string
    size?: number
    className?: string
}

/**
 * QR Code 生成元件
 * 將長輩 UID 編碼為 QR Code
 */
export function QRCodeGenerator({ value, size = 200, className = '' }: QRCodeGeneratorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (canvasRef.current && value) {
            QRCode.toCanvas(canvasRef.current, value, {
                width: size,
                margin: 2,
                color: {
                    dark: '#1e3a5f',  // 深藍色
                    light: '#ffffff'
                }
            }).catch((err: Error) => {
                setError(err.message)
            })
        }
    }, [value, size])

    if (error) {
        return <div className="text-red-500">QR Code 生成錯誤: {error}</div>
    }

    return <canvas ref={canvasRef} className={className} />
}

/**
 * 生成 QR Code Data URL
 * 用於列印或下載
 */
export async function generateQRCodeDataUrl(value: string, size = 300): Promise<string> {
    return QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: {
            dark: '#1e3a5f',
            light: '#ffffff'
        }
    })
}

// Re-export utility functions for frontend convenience
export { parseElderQRCode, generateElderQRContent } from '@/lib/qr-utils'

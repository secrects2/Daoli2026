/**
 * 解析 QR Code 內容
 * 格式: daoli://elder/{elderId}
 */
export function parseElderQRCode(content: string): { elderId: string } | null {
    if (!content) return null

    // Support both URI format and raw UUID
    if (content.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return { elderId: content }
    }

    const match = content.match(/^daoli:\/\/elder\/([a-f0-9-]+)$/i)
    if (match) {
        return { elderId: match[1] }
    }
    return null
}

/**
 * 生成長輩 QR Code 內容
 * 格式: daoli://elder/{elderId}
 */
export function generateElderQRContent(elderId: string): string {
    return `daoli://elder/${elderId}`
}

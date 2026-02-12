/**
 * 綠界 ECPay All-In-One 金流工具函式
 * 
 * 文件參考：https://developers.ecpay.com.tw/?p=2856
 * 
 * 使用方式：
 * - 測試環境（Sandbox）：使用預設的測試商店 ID 和金鑰
 * - 正式環境：更新 .env 中的 ECPAY_MERCHANT_ID、ECPAY_HASH_KEY、ECPAY_HASH_IV、ECPAY_API_URL
 */

import crypto from 'crypto'

// ============ 設定 ============

const ECPAY_CONFIG = {
    MerchantID: process.env.ECPAY_MERCHANT_ID || '3002607',
    HashKey: process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6',
    HashIV: process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs',
    // 測試環境 URL
    ApiUrl: process.env.ECPAY_API_URL || 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://daoli2026.vercel.app'

// ============ CheckMacValue 產生 ============

/**
 * 產生綠界 CheckMacValue（SHA256）
 * 
 * 步驟：
 * 1. 將參數按 key 排序（A-Z，不分大小寫）
 * 2. 組合為 HashKey=xxx&key1=val1&key2=val2&...&HashIV=yyy
 * 3. URL Encode（小寫）
 * 4. 對特殊字元做 .NET 相容的替換
 * 5. 轉小寫後 SHA256 雜湊
 * 6. 結果轉大寫
 */
export function generateCheckMacValue(params: Record<string, string>): string {
    // 1. 排序（不分大小寫）
    const sortedKeys = Object.keys(params).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    )

    // 2. 組合字串
    const paramStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&')
    const raw = `HashKey=${ECPAY_CONFIG.HashKey}&${paramStr}&HashIV=${ECPAY_CONFIG.HashIV}`

    // 3. URL Encode
    let encoded = encodeURIComponent(raw)

    // 4. .NET 相容的特殊字元替換
    encoded = encoded.replace(/%2d/gi, '-')
    encoded = encoded.replace(/%5f/gi, '_')
    encoded = encoded.replace(/%2e/gi, '.')
    encoded = encoded.replace(/%21/gi, '!')
    encoded = encoded.replace(/%2a/gi, '*')
    encoded = encoded.replace(/%28/gi, '(')
    encoded = encoded.replace(/%29/gi, ')')
    encoded = encoded.replace(/%20/gi, '+')

    // 5. 轉小寫
    encoded = encoded.toLowerCase()

    // 6. SHA256 雜湊並轉大寫
    const hash = crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase()

    return hash
}

// ============ 付款參數產生 ============

export interface ECPayOrderParams {
    merchantTradeNo: string     // 訂單編號（最多20碼）
    totalAmount: number         // 總金額（整數）
    tradeDesc: string           // 交易描述
    itemName: string            // 商品名稱（多項用 # 分隔）
    returnUrl?: string          // 付款結果通知 URL（Server-to-Server）
    clientBackUrl?: string      // 付款完成導回 URL（使用者瀏覽器）
}

/**
 * 建構 ECPay 付款參數
 */
export function buildECPayParams(order: ECPayOrderParams): Record<string, string> {
    const now = new Date()
    const merchantTradeDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    const params: Record<string, string> = {
        MerchantID: ECPAY_CONFIG.MerchantID,
        MerchantTradeNo: order.merchantTradeNo,
        MerchantTradeDate: merchantTradeDate,
        PaymentType: 'aio',
        TotalAmount: String(Math.round(order.totalAmount)),
        TradeDesc: order.tradeDesc,
        ItemName: order.itemName,
        ReturnURL: order.returnUrl || `${BASE_URL}/api/payment/ecpay/callback`,
        ClientBackURL: order.clientBackUrl || `${BASE_URL}/family/shop/checkout/result`,
        ChoosePayment: 'Credit',  // 只開放信用卡
        EncryptType: '1',         // SHA256
        NeedExtraPaidInfo: 'N',
    }

    // 產生 CheckMacValue
    params.CheckMacValue = generateCheckMacValue(params)

    return params
}

// ============ 回傳驗證 ============

/**
 * 驗證綠界回傳的 CheckMacValue
 */
export function verifyCallback(params: Record<string, string>): boolean {
    const receivedMac = params.CheckMacValue
    if (!receivedMac) return false

    // 移除 CheckMacValue 後重新計算
    const paramsWithoutMac = { ...params }
    delete paramsWithoutMac.CheckMacValue

    const calculatedMac = generateCheckMacValue(paramsWithoutMac)
    return calculatedMac === receivedMac
}

/**
 * 產生自動提交到綠界的 HTML 表單
 */
export function generateAutoSubmitForm(params: Record<string, string>): string {
    const inputs = Object.entries(params)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`)
        .join('\n')

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>正在導向付款頁面...</title>
    <style>
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; font-family: sans-serif; }
        .loading { text-align: center; }
        .spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>正在導向綠界付款頁面，請稍候...</p>
    </div>
    <form id="ecpay-form" method="POST" action="${ECPAY_CONFIG.ApiUrl}">
        ${inputs}
    </form>
    <script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`
}

// ============ 工具函式 ============

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/**
 * 產生 ECPay 訂單編號（最多20碼，不能有特殊字元）
 */
export function generateMerchantTradeNo(): string {
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `D${ts}${rand}`.substring(0, 20)
}

export { ECPAY_CONFIG }

import { NextResponse } from 'next/server'
import { verifyAdmin, isDevelopment, unauthorizedResponse } from '@/lib/auth-utils'

/**
 * Debug API - 環境檢查
 * 
 * ⚠️ 安全控制：
 * - 生產環境需要管理員權限
 * - 開發環境允許訪問
 */
export async function GET() {
    // 生產環境需要管理員權限
    if (!isDevelopment()) {
        const auth = await verifyAdmin()
        if (!auth.isAdmin) {
            return unauthorizedResponse('Debug API 僅限管理員在生產環境使用')
        }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    return NextResponse.json({
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        config: {
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'DEFINED' : 'MISSING',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? 'DEFINED (Hidden)' : 'MISSING',
            SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'DEFINED (Hidden)' : 'MISSING',
        },
        warning: isDevelopment() ? null : '⚠️ 生產環境 Debug API 已啟用管理員驗證'
    })
}

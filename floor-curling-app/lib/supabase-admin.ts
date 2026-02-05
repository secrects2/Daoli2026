import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 集中管理的 Supabase Admin 客戶端
 * 使用 Service Role Key，繞過 RLS 用於後端操作
 * 
 * ⚠️ 安全警告：
 * - 僅在服務端使用
 * - 永遠不要在客戶端暴露
 * - 所有使用此客戶端的 API 必須先驗證用戶權限
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 驗證環境變量
if (!supabaseUrl) {
    console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing!')
}

if (!supabaseServiceKey) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
}

// 創建單例 Admin 客戶端
let supabaseAdminInstance: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseAdminInstance) {
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing')
        }

        supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })
    }
    return supabaseAdminInstance
}

// 便捷導出（向後兼容）
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    : null

import { createClient } from '@supabase/supabase-js'

// 使用 Service Role Key 初始化 Supabase Admin 客戶端
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface NotificationData {
    userId: string
    title: string
    message: string
    type: 'match_result' | 'points_update' | 'system' | 'info'
    metadata?: any
}

export async function createNotification(data: NotificationData) {
    try {
        // 1. 創建數據庫通知記錄
        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                metadata: data.metadata,
                read: false
            })

        if (error) {
            console.error('創建通知失敗:', error)
            return { success: false, error: error.message }
        }

        // 2. 模擬外部推送 (如 LINE)
        await sendExternalPush(data)

        return { success: true }
    } catch (error: any) {
        console.error('通知處理異常:', error)
        return { success: false, error: error.message }
    }
}


async function sendExternalPush(data: NotificationData) {
    // 這裡模擬調用 LINE API 或其他推送服務
    console.log(`[Mock Push] Sending to ${data.userId}: ${data.title} - ${data.message}`)

    // 檢查用戶是否有關聯的 LINE ID (假設存儲在 profiles 或 linked_accounts 表)
    /*
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('line_user_id')
        .eq('id', data.userId)
        .single()
        
    if (profile?.line_user_id) {
        // Call LINE API
    }
    */

    return true
}

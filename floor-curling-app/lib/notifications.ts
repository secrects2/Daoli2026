import { createClient } from '@supabase/supabase-js'

// moved inside createNotification to avoid build-time env var issues

interface NotificationData {
    userId: string
    title: string
    message: string
    type: 'match_result' | 'points_update' | 'system' | 'info'
    metadata?: any
}

export async function createNotification(data: NotificationData) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
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
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    try {
        // 1. Get user's LINE ID from profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('line_user_id')
            .eq('id', data.userId)
            .single()

        // 2. If LINE ID exists, send push message
        if (profile?.line_user_id) {

            // Construct message based on type
            let lineMessage = {
                type: 'text',
                text: `${data.title}\n\n${data.message}`
            }

            // Customize message for rich content if needed (e.g. flex message) in future

            // Dynamic import to avoid circular dependencies if any
            const { pushMessage } = await import('./line')
            await pushMessage(profile.line_user_id, [lineMessage])
        }
    } catch (error) {
        console.error('External Push Failed:', error)
    }

    return true
}


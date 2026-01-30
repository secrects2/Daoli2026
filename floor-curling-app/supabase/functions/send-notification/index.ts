// Supabase Edge Function: 发送 LINE 通知
// 部署: supabase functions deploy send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// LINE Messaging API 配置（需要设置环境变量）
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || ''

interface NotificationPayload {
    notification_id: string
    recipient_id: string
    message: string
    notification_type: string
}

serve(async (req) => {
    try {
        const payload: NotificationPayload = await req.json()

        console.log(`📱 Processing notification: ${payload.notification_id}`)
        console.log(`   Recipient: ${payload.recipient_id}`)
        console.log(`   Type: ${payload.notification_type}`)
        console.log(`   Message: ${payload.message}`)

        // 初始化 Supabase 客户端
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 获取用户的 LINE User ID（假设存储在 profiles 的 metadata 中）
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, metadata')
            .eq('id', payload.recipient_id)
            .single()

        if (profileError) {
            throw new Error(`Failed to get profile: ${profileError.message}`)
        }

        const lineUserId = profile?.metadata?.line_user_id

        if (lineUserId && LINE_CHANNEL_ACCESS_TOKEN) {
            // 实际发送 LINE 通知
            const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                    to: lineUserId,
                    messages: [
                        {
                            type: 'text',
                            text: payload.message,
                        },
                    ],
                }),
            })

            if (!lineResponse.ok) {
                console.error(`LINE API error: ${await lineResponse.text()}`)
            } else {
                console.log(`✅ LINE notification sent to ${lineUserId}`)
            }
        } else {
            // 模拟发送（开发环境）
            console.log(`🔔 SIMULATED: Sending LINE notification to [${payload.recipient_id}]:`)
            console.log(`   "${payload.message}"`)
        }

        // 更新通知状态
        await supabase
            .from('notifications')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
            })
            .eq('id', payload.notification_id)

        return new Response(
            JSON.stringify({ success: true, message: 'Notification processed' }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error processing notification:', error)

        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})

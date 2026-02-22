import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// Service role for unrestricted message access/insert
// const supabaseAdmin = ... removed top level init

export async function GET(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    try {
        const { searchParams } = new URL(request.url)
        const targetId = searchParams.get('target_id')

        if (!targetId) return NextResponse.json({ error: 'Missing target_id' }, { status: 400 })

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) { }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch conversation
        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, messages })

    } catch (error: any) {
        console.error('Messages API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    try {
        const { receiver_id, content } = await request.json()

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) { }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .insert({
                sender_id: user.id,
                receiver_id: receiver_id,
                content: content,
                is_read: false
            })
            .select()
            .single()

        if (error) throw error

        // Fetch sender and receiver profiles for notifications
        const { data: senderProfile } = await supabase.from('profiles').select('full_name, nickname').eq('id', user.id).single()
        const { data: receiverProfile } = await supabase.from('profiles').select('line_user_id').eq('id', receiver_id).single()
        const senderName = senderProfile?.full_name || senderProfile?.nickname || user.user_metadata?.full_name || '新訊息'

        // If the receiver has a line_user_id, send LINE Push Message
        if (receiverProfile?.line_user_id) {
            // Dynamic import for pushMessage
            import('@/lib/line').then(({ pushMessage }) => {
                pushMessage(receiverProfile.line_user_id, [{
                    type: 'text',
                    text: `[${senderName}]: ${content}`
                }
                ]).catch((lineError: any) => console.error('LINE Push Message Error:', lineError));
            });
        }

        // Trigger Notification (Async, don't await/block response)
        // Dynamic import to avoid circular dependency issues if any
        import('@/lib/notifications').then(({ createNotification }) => {
            createNotification({
                userId: receiver_id,
                title: senderName, // Use fetched sender name
                message: content,
                type: 'info',
                metadata: {
                    senderId: user.id
                }
            })
        })

        return NextResponse.json({ success: true, message })

    } catch (error: any) {
        console.error('Message Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

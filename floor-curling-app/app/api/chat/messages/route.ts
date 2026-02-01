import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// Service role for unrestricted message access/insert
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
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

        // Trigger Notification (Async, don't await/block response)
        // Dynamic import to avoid circular dependency issues if any
        import('@/lib/notifications').then(({ createNotification }) => {
            createNotification({
                userId: receiver_id,
                title: user.user_metadata?.full_name || '新訊息',
                message: content,
                type: 'info',
                metadata: {
                    senderId: user.id
                }
            })
        })

        return NextResponse.json({ success: true, message })

    } catch (error: any) {
        console.error('Send Message Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

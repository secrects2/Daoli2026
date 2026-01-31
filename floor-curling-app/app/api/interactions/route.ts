import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { receiver_id, type, content } = await request.json()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { error } = await supabase.from('interactions').insert({
            sender_id: user.id,
            receiver_id,
            type,
            content
        })

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const userId = requestUrl.searchParams.get('userId')
    const unreadOnly = requestUrl.searchParams.get('unreadOnly') === 'true'

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
        let query = supabase
            .from('interactions')
            .select('*, sender:sender_id(full_name, avatar_url)')
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (unreadOnly) {
            query = query.eq('read', false)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ interactions: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

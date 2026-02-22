import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { pushMessage } from '@/lib/line'

export async function POST(request: Request) {
    const { receiver_id, type, content } = await request.json()
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    // Admin Client for looking up families and users
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        if (type === 'checkin') {
            // 1. Find all linked family members
            const { data: families, error: fetchError } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .eq('linked_elder_id', user.id)

            if (fetchError) throw fetchError

            if (!families || families.length === 0) {
                return NextResponse.json({ message: 'No linked families found' })
            }

            const notifications = []

            // 2. Loop through families
            for (const family of families) {
                // Create Interaction Record
                await supabaseAdmin.from('interactions').insert({
                    sender_id: user.id,
                    receiver_id: family.id,
                    type: 'checkin',
                    content: content || '📍 我已安全抵達'
                })

                // Fetch User Identity for LINE ID
                const { data: { user: familyUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(family.id)

                if (familyUser) {
                    const lineIdentity = familyUser.identities?.find((id: any) => id.provider === 'line')
                    const lineUserId = lineIdentity?.identity_data?.sub || lineIdentity?.id

                    if (lineUserId) {
                        const { data: elderProfile } = await supabase.from('profiles').select('full_name, nickname').eq('id', user.id).single()
                        const elderName = elderProfile?.full_name || elderProfile?.nickname || user.user_metadata?.full_name || '長輩'

                        // Send Push Message
                        await pushMessage(lineUserId, [ // Assuming pushMessage is the function to use, or it's been renamed to sendLineMessage
                            {
                                type: 'text',
                                text: `${elderName} 已安全抵達！📍`
                            },
                            {
                                type: 'sticker',
                                packageId: "789",
                                stickerId: "10857"
                            }
                        ])
                        notifications.push(family.full_name)
                    }
                }
            }

            return NextResponse.json({ success: true, notified: notifications })

        } else {
            // Standard Cheer (One-to-One)
            const { error } = await supabase.from('interactions').insert({
                sender_id: user.id,
                receiver_id,
                type,
                content
            })

            if (error) throw error
            return NextResponse.json({ success: true })
        }

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const userId = requestUrl.searchParams.get('userId')
    const unreadOnly = requestUrl.searchParams.get('unreadOnly') === 'true'

    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

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

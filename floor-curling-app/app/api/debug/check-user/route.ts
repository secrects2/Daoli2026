import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) return NextResponse.json({ error: 'Email required' })

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get User ID from Auth with Pagination
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })

    if (error) return NextResponse.json({ error: error.message })

    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
        return NextResponse.json({ error: 'User not found in Auth', scanned: users.length })
    }

    // 2. Get Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUser.id)
        .single()

    return NextResponse.json({
        auth: {
            id: targetUser.id,
            email: targetUser.email,
            last_sign_in: targetUser.last_sign_in_at
        },
        profile
    })
}

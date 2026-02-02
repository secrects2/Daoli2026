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

    // 1. Get User ID from Auth
    // Admin API listUsers is expensive/restricted usually, but `rpc` or select from auth schema is hard.
    // Instead we query `profiles` which we sync.
    // Wait, profiles might be keyed by ID. We can't search profiles by email if email is not in profile.
    // But usually auth.users has email.

    // Actually, Supabase Admin API can list users by email
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
        return NextResponse.json({ error: 'User not found in Auth' })
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

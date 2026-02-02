import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const role = searchParams.get('role')

    if (!email || !role) return NextResponse.json({ error: 'Email and Role required' })

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Find User
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
        return NextResponse.json({ error: 'User not found' })
    }

    // 2. Update Role
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', targetUser.id)
        .select()

    return NextResponse.json({
        success: true,
        user: { email: targetUser.email, id: targetUser.id },
        new_role: role,
        data,
        error
    })
}

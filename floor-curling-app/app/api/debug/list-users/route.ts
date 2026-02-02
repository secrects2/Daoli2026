import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) return NextResponse.json({ error: error.message })

    const userList = users.map(u => ({
        id: u.id,
        email: u.email,
        last_sign_in: u.last_sign_in_at
    }))

    return NextResponse.json({ count: userList.length, users: userList })
}

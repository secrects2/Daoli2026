import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { get: () => undefined, set: () => { }, remove: () => { } } }
        )

        // 1. Search with Pagination
        let allUsers: any[] = []
        let page = 1
        let hasMore = true

        while (hasMore) {
            const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 })
            if (error) throw error
            if (users.length === 0) hasMore = false
            else {
                allUsers = [...allUsers, ...users]
                page++
            }
        }

        const elder = allUsers.find(u => u.email === 'elder@daoli.com')

        if (!elder) {
            return NextResponse.json({ error: 'Elder Not Found (even after pagination)' }, { status: 404 })
        }

        // 2. Force Update
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            elder.id,
            { password: 'password123', email_confirm: true }
        )

        if (updateError) throw updateError

        return NextResponse.json({
            status: 'Success',
            message: 'Password FORCE UPDATED to password123',
            userId: elder.id
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

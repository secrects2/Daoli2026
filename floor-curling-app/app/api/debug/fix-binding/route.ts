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

        // 1. Find Elder with Pagination
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
        const family = allUsers.find(u => u.email === 'family_bound@daoli.com')

        if (!elder) return NextResponse.json({ error: 'Elder user not found. Run /api/debug/seed-elder first.' }, { status: 404 })
        if (!family) return NextResponse.json({ error: 'Family user not found.' }, { status: 404 })

        // 2. Update Binding
        const { error } = await supabase
            .from('profiles')
            .update({ linked_elder_id: elder.id })
            .eq('id', family.id)

        if (error) throw error

        return NextResponse.json({
            status: 'Success',
            message: 'Binding updated',
            elderId: elder.id,
            familyId: family.id,
            oldLinkedId: 'Replaced with ' + elder.id
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

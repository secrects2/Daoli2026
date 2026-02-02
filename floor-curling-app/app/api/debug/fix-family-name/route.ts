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

        // 1. Find Family User
        const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const family = users.find(u => u.email === 'family_bound@daoli.com')

        if (!family) return NextResponse.json({ error: 'Family user not found.' }, { status: 404 })

        // 2. Update Profile Name
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: '王小美 (家屬)',
                avatar_url: 'https://api.dicebear.com/7.x/micah/svg?seed=family1' // Add a random avatar too
            })
            .eq('id', family.id)

        if (error) throw error

        return NextResponse.json({
            status: 'Success',
            message: 'Family profile name updated to "王小美 (家屬)"',
            familyId: family.id
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

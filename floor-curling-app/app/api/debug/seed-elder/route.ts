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

        const email = 'elder@daoli.com'
        const password = 'password123'

        // 1. Check if user exists
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existing = users.find(u => u.email === email)

        if (existing) {
            // Force update password
            await supabase.auth.admin.updateUserById(existing.id, { password: password })
            return NextResponse.json({
                status: 'User already exists',
                message: 'Password updated to password123',
                userId: existing.id
            })
        }

        // 2. Create User
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: '王大明爺爺' }
        })

        if (error) throw error

        // 3. Ensure Profile (Try to link to Taipei Store if possible)
        const userId = data.user.id

        // Try to find Taipei store, or just leave null
        const { data: store } = await supabase.from('stores').select('id').eq('name', '台北總店').single()

        await supabase.from('profiles').upsert({
            id: userId,
            email,
            role: 'elder',
            full_name: '王大明爺爺',
            store_id: store?.id || null
        })

        return NextResponse.json({
            status: 'Success',
            message: 'User created successfully',
            userId
        })

    } catch (error: any) {
        return NextResponse.json({
            status: 'Error',
            message: error.message
        }, { status: 500 })
    }
}

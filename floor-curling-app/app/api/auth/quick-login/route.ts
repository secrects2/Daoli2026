import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { role } = await request.json()
    const cookieStore = await cookies()

    const creds: Record<string, any> = {
        admin: { email: 'admin@daoli.com', password: 'daoli_admin_2026' },
        pharmacist: { email: 'pharmacist@daoli.com', password: 'password123' },
        family: { email: 'family@daoli.com', password: 'password123' },
        family_bound: { email: 'family_bound@daoli.com', password: 'password123' },
        elder: { email: 'elder@daoli.com', password: 'password123' }
    }

    if (!creds[role]) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { error } = await supabase.auth.signInWithPassword(creds[role])

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ success: true })
}

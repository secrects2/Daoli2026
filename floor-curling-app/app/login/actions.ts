'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function loginWithRole(role: string) {
    const cookieStore = await cookies()

    const creds: Record<string, any> = {
        admin: { email: 'admin@daoli.com', password: 'daoli_admin_2026' },
        pharmacist: { email: 'pharmacist@daoli.com', password: 'password123' },
        family: { email: 'family@daoli.com', password: 'password123' },
        family_bound: { email: 'family_bound@daoli.com', password: 'password123' },
        elder: { email: 'elder@daoli.com', password: 'password123' }
    }

    if (!creds[role]) {
        return { error: 'Invalid role' }
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
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.signInWithPassword(creds[role])

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

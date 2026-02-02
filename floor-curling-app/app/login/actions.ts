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
        // DEBUG: Check if user exists using Admin Client
        let debugMsg = ''
        try {
            const adminSupabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                { cookies: { get: () => undefined, set: () => { }, remove: () => { } } }
            )
            const { data: { users } } = await adminSupabase.auth.admin.listUsers()
            const found = users.find(u => u.email === creds[role].email)
            debugMsg = found ? `(User Found: ${found.id.slice(0, 4)}...)` : '(User NOT Found in DB)'
        } catch (e) {
            debugMsg = '(Admin Check Failed)'
        }

        return { error: `${error.message} ${debugMsg}` }
    }

    return { success: true }
}

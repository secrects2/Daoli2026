'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Admin Action: Toggle Store Status
export async function toggleStoreStatus(storeId: string, currentStatus: string) {
    const cookieStore = await cookies()

    // 1. Verify User Session (Standard Client)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignored
                    }
                },
            },
        }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('Unauthorized')
    }

    // 2. Init Admin Client (Service Role)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Verify Role is strictly 'admin'
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: You do not have permission to perform this action.')
    }

    // 4. Perform Update
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

    const { error: updateError } = await supabaseAdmin
        .from('stores')
        .update({ status: newStatus })
        .eq('id', storeId)

    if (updateError) {
        throw new Error(`Failed to update store: ${updateError.message}`)
    }

    // 5. Revalidate
    revalidatePath('/admin/stores')
    return { success: true, status: newStatus }
}

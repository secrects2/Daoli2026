import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    // Service Role Client for User Creation
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    try {
        const { full_name, nickname, notes } = await request.json()
        const cookieStore = await cookies()

        // 1. Authenticate Pharmacist
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) { }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get Manager's Store ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, store_id')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'pharmacist' && profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const storeId = profile.store_id
        if (!storeId) {
            return NextResponse.json({ error: 'Manager has no store assigned' }, { status: 400 })
        }

        // 2. Create Auth User (Dummy Email)
        // Format: elder_[timestamp]_[random]@daoli.local
        const randomStr = Math.random().toString(36).substring(7)
        const email = `elder_${Date.now()}_${randomStr}@daoli.local`
        const password = `Elder${Math.random().toString(36).slice(-8)}!` // Random password

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name,
                nickname: nickname || full_name
            }
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('Failed to create user')

        const userId = newUser.user.id

        // 3. Upsert Profile (Ensure role and store_id are set)
        // Note: Trigger might have created it, but we force update to be sure
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                full_name: full_name,
                nickname: nickname,
                role: 'elder',
                store_id: storeId,
                notes: notes // Assuming you add a 'notes' column or use metadata
            })

        if (profileError) {
            console.error('Profile Upsert Error:', profileError)
            // Rollback auth user? For now just log
        }

        // 4. Initialize Wallet
        await supabaseAdmin.from('wallets').insert({
            user_id: userId,
            global_points: 0,
            local_points: 0
        })

        return NextResponse.json({ success: true, elderId: userId })

    } catch (error: any) {
        console.error('Create Elder Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

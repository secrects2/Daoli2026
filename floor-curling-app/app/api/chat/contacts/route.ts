import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// Use Service Role for searching users across the store
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) { console.log('cookiesToSet', cookiesToSet) }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get User Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

        const { role, store_id, linked_elder_id } = profile
        let contacts: any[] = []

        if (role === 'pharmacist' || role === 'admin') {
            // Manager: View ALL profiles in the store
            if (store_id) {
                const { data: storeMembers } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, avatar_url, role')
                    .eq('store_id', store_id)
                    .neq('id', user.id) // Exclude self
                contacts = storeMembers || []
            } else {
                // Admin (No store): View All? Or just test data
                // For now, let's limit to recent created for demo
                const { data: allUsers } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, avatar_url, role')
                    .limit(50)
                    .neq('id', user.id)
                contacts = allUsers || []
            }

        } else if (role === 'family') {
            // Family: View Linked Elder + Manager of that store

            // 1. Linked Elder
            if (linked_elder_id) {
                const { data: elder } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, avatar_url, role, store_id')
                    .eq('id', linked_elder_id)
                    .single()

                if (elder) {
                    contacts.push(elder)

                    // 2. Manager of Elder's Store
                    if (elder.store_id) {
                        const { data: managers } = await supabaseAdmin
                            .from('profiles')
                            .select('id, full_name, avatar_url, role')
                            .eq('store_id', elder.store_id)
                            .in('role', ['pharmacist', 'admin'])

                        if (managers) contacts.push(...managers)
                    }
                }
            }

        } else if (role === 'elder') {
            // Elder: View Linked Families + Manager

            // 1. Linked Families
            const { data: families } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('linked_elder_id', user.id)

            if (families) contacts.push(...families)

            // 2. Manager of Own Store
            if (store_id) {
                const { data: managers } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, avatar_url, role')
                    .eq('store_id', store_id)
                    .in('role', ['pharmacist', 'admin'])

                if (managers) contacts.push(...managers)
            }
        }

        return NextResponse.json({ success: true, contacts })

    } catch (error: any) {
        console.error('Contacts API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

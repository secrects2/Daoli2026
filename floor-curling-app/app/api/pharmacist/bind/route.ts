import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseElderQRCode } from '@/components/QRCode'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const { qrContent } = await request.json()
        const cookieStore = await cookies()

        // 1. Authenticate Pharmacist / Admin
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

        // Check Role & Get Store ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, store_id')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'pharmacist' && profile.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden: Only Store Managers can perform this action' }, { status: 403 })
        }

        const managerStoreId = profile.store_id
        if (!managerStoreId) {
            return NextResponse.json({ error: 'Manager is not assigned to a store' }, { status: 400 })
        }

        // 2. Parse QR Code
        const result = parseElderQRCode(qrContent)
        if (!result) return NextResponse.json({ error: 'Invalid QR Code' }, { status: 400 })
        const elderId = result.elderId

        // 3. Admin Client for Privileged Updates
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // 4. Update Elder's Store ID
        const { data: elder, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ store_id: managerStoreId })
            .eq('id', elderId)
            .select()
            .single()

        if (updateError) {
            console.error('Bind Error:', updateError)
            return NextResponse.json({ error: 'Failed to bind elder' }, { status: 500 })
        }

        return NextResponse.json({ success: true, elder })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

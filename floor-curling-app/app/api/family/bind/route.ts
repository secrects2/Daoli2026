import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseElderQRCode } from '@/components/QRCode'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
    try {
        const { qrContent } = await request.json()
        const cookieStore = await cookies()

        // 1. Authenticate Family User (Standard Client)
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) {
                        // No-op for route handlers generally unless setting cookies
                    }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('Auth Error:', authError)
            return NextResponse.json({ error: 'Unauthorized: 請重新登入' }, { status: 401 })
        }

        // 2. Parse QR Code
        const result = parseElderQRCode(qrContent)
        if (!result) return NextResponse.json({ error: '無效的條碼' }, { status: 400 })
        const elderId = result.elderId

        // 3. Admin Client for Privileged Operations (Bypass RLS)
        // Needed to look up the Elder (who isn't me) and update my profile (if RLS is strict)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )

        // Verify Elder Exists
        const { data: elder, error: elderLookupError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', elderId)
            .single()

        if (elderLookupError || !elder) {
            return NextResponse.json({ error: '找不到該長輩帳號' }, { status: 404 })
        }

        // 4. Update Family Profile Link
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ linked_elder_id: elderId })
            .eq('id', user.id)

        if (updateError) {
            console.error('Bind Error:', updateError)
            throw new Error('綁定失敗')
        }

        return NextResponse.json({ success: true, elderId })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

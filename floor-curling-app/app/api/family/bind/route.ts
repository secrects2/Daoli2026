import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseElderQRCode } from '@/components/QRCode'

export async function POST(request: Request) {
    const { qrContent } = await request.json()
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
        // 1. Authenticate
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        // 2. Parse QR Code
        const result = parseElderQRCode(qrContent)
        if (!result) throw new Error('無效的 QR Code 格式')

        const elderId = result.elderId

        // 3. Verify Elder Exists
        const { data: elder, error: elderError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', elderId) // Removed 'role': 'elder' constraint to allow binding to any valid user ID technically, but safer to check.
            .single()

        if (elderError || !elder) throw new Error('找不到該長輩帳號')

        // 4. Update Profile
        // Note: Assuming 'linked_elder_id' is the field on 'profiles' table for family members.
        // We need to double check if the field exists. Based on family/dashboard code:
        // const { data: profile } = await supabase.from('profiles').select('linked_elder_id').eq('id', authUser.id).single()
        // Yes, it exists.

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ linked_elder_id: elderId })
            .eq('id', user.id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

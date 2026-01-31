import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    // Admin client to bypass RLS and find any elder
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: elder } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'elder')
            .limit(1)
            .single()

        if (!elder) {
            // If no elder exists, create a dummy one for testing
            const dummyId = '00000000-0000-0000-0000-000000000000' // Won't work for real binding if constraints exist, but...
            // Let's actually create one if possible? No, too risky.
            return NextResponse.json({ error: 'No elders found in DB' }, { status: 404 })
        }

        return NextResponse.json({ elder })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

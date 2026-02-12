import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Use Service Role for Admin
export async function GET(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    try {
        console.log('🛡️ Fetching Admin Location Stats...')

        // 1. Get All Stores
        const { data: stores, error: storeError } = await supabaseAdmin
            .from('stores')
            .select('*')

        if (storeError) throw storeError

        // 2. Get Match Counts per Store
        // Efficient way: Group by store_id and count. 
        // Supabase select count with group by is tricky without RPC.
        // We'll fetch store_ids of all completed matches and aggregate in JS (lightweight enough for <10k matches)
        const { data: matches, error: matchError } = await supabaseAdmin
            .from('matches')
            .select('store_id')
            .eq('status', 'completed')

        if (matchError) throw matchError

        // 3. Aggregate
        const counts: Record<string, number> = {}
        matches?.forEach(m => {
            if (m.store_id) {
                counts[m.store_id] = (counts[m.store_id] || 0) + 1
            }
        })

        // 4. Merge
        const storeStats = stores.map(store => ({
            ...store,
            match_count: counts[store.id] || 0
        })).sort((a, b) => b.match_count - a.match_count)

        return NextResponse.json({ success: true, stores: storeStats })

    } catch (error: any) {
        console.error('❌ Admin locations API error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch location stats' },
            { status: 500 }
        )
    }
}

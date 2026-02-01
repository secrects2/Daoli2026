import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Use Service Role for Admin to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
    try {
        console.log('🛡️ Fetching Admin Matches (Manual Join)...')

        // 1. Fetch Matches
        const { data: matches, error: matchError } = await supabaseAdmin
            .from('matches')
            .select(`
                id, created_at, completed_at, status, winner_color,
                store_id, red_team_elder_id, yellow_team_elder_id
            `)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(100)

        if (matchError) throw matchError
        if (!matches || matches.length === 0) return NextResponse.json({ success: true, matches: [] })

        // 2. Collect IDs
        const storeIds = Array.from(new Set(matches.map(m => m.store_id).filter(Boolean)))
        const elderIds = Array.from(new Set([
            ...matches.map(m => m.red_team_elder_id),
            ...matches.map(m => m.yellow_team_elder_id)
        ].filter(Boolean)))

        // 3. Fetch Related Data
        const [storesRes, profilesRes] = await Promise.all([
            supabaseAdmin.from('stores').select('id, name').in('id', storeIds),
            supabaseAdmin.from('profiles').select('id, full_name, nickname').in('id', elderIds)
        ])

        const storesMap = new Map(storesRes.data?.map(s => [s.id, s]) || [])
        const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || [])

        // 4. Merge Data
        const enrichedMatches = matches.map(m => ({
            ...m,
            store: storesMap.get(m.store_id) || { name: '未知據點' },
            red_elder: profilesMap.get(m.red_team_elder_id) || { full_name: '未知', nickname: '' },
            yellow_elder: profilesMap.get(m.yellow_team_elder_id) || { full_name: '未知', nickname: '' },
            match_ends: [] // Skip details for list view performance if not strictly needed
        }))

        return NextResponse.json({ success: true, matches: enrichedMatches })

    } catch (error: any) {
        console.error('❌ Admin matches API error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch matches' },
            { status: 500 }
        )
    }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensure this route is never cached

// Use Service Role for Admin Stats to bypass RLS/ensure access to all data
export async function GET(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    try {
        console.log('📊 Fetching Global Stats (Direct Query)...')

        // 1. Total Matches (Completed)
        const { count: totalMatches, error: matchesError } = await supabaseAdmin
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')

        if (matchesError) throw matchesError

        // 2. Today's Matches
        // Get start of today in UTC (simplified, ideally timezone aware)
        const startOfDay = new Date().toISOString().split('T')[0]
        const { count: todayMatches } = await supabaseAdmin
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('completed_at', startOfDay)

        // 3. Active Elders (Weekly)
        // Harder to distinct count with simple API, will approximate or query recent matches
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentMatches } = await supabaseAdmin
            .from('matches')
            .select('red_team_elder_id, yellow_team_elder_id')
            .gte('created_at', oneWeekAgo)
            .limit(1000)

        const activeElderIds = new Set()
        recentMatches?.forEach(m => {
            if (m.red_team_elder_id) activeElderIds.add(m.red_team_elder_id)
            if (m.yellow_team_elder_id) activeElderIds.add(m.yellow_team_elder_id)
        })
        const activeEldersWeekly = activeElderIds.size

        // 4. Total Points (Sum from Wallets)
        // Summing requires .select() and reduce, or RPC. 
        // Let's try to fetch wallets. If too many, this is slow, but for <1000 users ok.
        const { data: wallets } = await supabaseAdmin.from('wallets').select('global_points')
        const totalPointsDistributed = wallets?.reduce((sum, w) => sum + (w.global_points || 0), 0) || 0

        // 5. Top Stores (Manual Join to avoid FK issues)
        const { data: matchesForStores, error: storeMatchError } = await supabaseAdmin
            .from('matches')
            .select('id, store_id')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1000)

        if (storeMatchError) {
            console.error('Error fetching matches for stores:', storeMatchError)
        }

        const storeCounts: Record<string, number> = {}
        matchesForStores?.forEach((m: any) => {
            if (m.store_id) {
                storeCounts[m.store_id] = (storeCounts[m.store_id] || 0) + 1
            }
        })

        const topStoreIds = Object.keys(storeCounts)
            .sort((a, b) => storeCounts[b] - storeCounts[a])
            .slice(0, 5)

        let topStores: any[] = []
        if (topStoreIds.length > 0) {
            const { data: storeDetails } = await supabaseAdmin
                .from('stores')
                .select('id, name')
                .in('id', topStoreIds)

            topStores = topStoreIds.map(id => {
                const store = storeDetails?.find(s => s.id === id)
                return {
                    name: store?.name || '未知據點',
                    match_count: storeCounts[id]
                }
            })
        }

        const stats = {
            total_matches: totalMatches || 0,
            today_matches: todayMatches || 0,
            active_elders_weekly: activeEldersWeekly,
            total_points_distributed: totalPointsDistributed,
            top_stores: topStores
        }

        console.log('✅ Global Stats:', stats)

        return NextResponse.json({ success: true, stats })

    } catch (error: any) {
        console.error('❌ Admin stats error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch admin stats' },
            { status: 500 }
        )
    }
}

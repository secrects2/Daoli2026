import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensure this route is never cached

// Use Service Role for Admin Stats to bypass RLS/ensure access to all data
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables!')
}

export async function GET(request: Request) {
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

        // 5. Top Stores
        // GroupBy is hard without RPC. We will fetch matches and aggregate manually (OK for small scale)
        // Or fetch stores and count their matches?
        // Let's query ALL completed matches (assuming volume is manageable for this MVP)
        // Better: Query stores, then for each store count matches? N+1 problem but safe.
        // OR: Just fetch the matches with store_id.
        const { data: matchStores } = await supabaseAdmin
            .from('matches')
            .select('store_id, stores(name)')
            .eq('status', 'completed')
            .limit(500) // Sample size limit for performance

        const storeCounts: Record<string, { name: string, count: number }> = {}

        matchStores?.forEach((m: any) => {
            if (!m.store_id || !m.stores) return
            const name = m.stores.name
            if (!storeCounts[name]) storeCounts[name] = { name, count: 0 }
            storeCounts[name].count++
        })

        const topStores = Object.values(storeCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(s => ({ name: s.name, match_count: s.count }))

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

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PharmacistDashboardClient from './components/PharmacistDashboardClient'

export default async function PharmacistDashboard() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const storeId = profile?.store_id || null

    // Parallel Server Fetching
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date()
    startDate.setDate(today.getDate() - 6)

    // Build Queries
    let matchQuery = supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
    if (storeId) matchQuery = matchQuery.eq('store_id', storeId)

    let elderQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'elder')
    if (storeId) elderQuery = elderQuery.eq('store_id', storeId)

    const equipmentQuery = supabase.from('equipment').select('*', { count: 'exact', head: true }) // Assuming all eq for now or need filter

    // Chart Data Query
    let chartQuery = supabase.from('matches')
        .select('created_at, winner_color')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
    if (storeId) chartQuery = chartQuery.eq('store_id', storeId)

    // Await All
    const [matchRes, elderRes, eqRes, chartRes] = await Promise.all([
        matchQuery,
        elderQuery,
        equipmentQuery,
        chartQuery
    ])

    // Fetch Total Points (Simplified aggregation)
    const { data: walletsData } = await supabase.from('wallets').select('global_points, local_points')
    const totalGlobalPoints = walletsData?.reduce((sum, w) => sum + (w.global_points || 0), 0) || 0
    const totalLocalPoints = walletsData?.reduce((sum, w) => sum + (w.local_points || 0), 0) || 0

    // Process Chart Data
    const matches = chartRes.data || []
    const trendMap = new Map<string, number>()
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        const dateStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
        trendMap.set(dateStr, 0)
    }

    let redWins = 0, yellowWins = 0
    matches.forEach(m => {
        const d = new Date(m.created_at)
        const dateStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
        if (trendMap.has(dateStr)) trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1)
        if (m.winner_color === 'red') redWins++
        if (m.winner_color === 'yellow') yellowWins++
    })

    const chartData = {
        matchesTrend: Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })),
        winDistribution: [
            { name: 'Red Team', value: redWins }, // Will be localized in client if needed, or send keys
            { name: 'Yellow Team', value: yellowWins }
        ]
    }

    const stats = {
        todayMatches: matchRes.count || 0,
        activeElders: elderRes.count || 0,
        totalGlobalPoints: totalGlobalPoints,
        totalLocalPoints: totalLocalPoints,
        totalEquipment: eqRes.count || 0
    }

    return (
        <PharmacistDashboardClient
            profile={profile}
            stats={stats}
            chartData={chartData}
        />
    )
}

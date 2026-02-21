import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch wallet data (dual points)
    const { data: wallet } = await supabase
        .from('wallets')
        .select('global_points, local_points')
        .eq('user_id', id)
        .single()

    // Fetch recent matches for this elder
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

    const { count: weeklyMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString())
        .or(`red_team_elder_id.eq.${id},yellow_team_elder_id.eq.${id}`)

    // Generate chart history (still mock for now as we don't have daily snapshots)
    const history = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return {
            date: d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
            points: Math.floor(Math.random() * 500) + 100
        }
    })

    // Fetch recent matches with results
    const { data: recentMatchesData } = await supabase
        .from('matches')
        .select('created_at, winner_color, red_team_elder_id, yellow_team_elder_id')
        .or(`red_team_elder_id.eq.${id},yellow_team_elder_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(5)

    const recentMatches = (recentMatchesData || []).map(m => {
        const isRed = m.red_team_elder_id === id
        let result: string
        if (!m.winner_color) {
            result = 'draw'
        } else if ((isRed && m.winner_color === 'red') || (!isRed && m.winner_color === 'yellow')) {
            result = 'win'
        } else {
            result = 'loss'
        }
        return {
            date: new Date(m.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
            result,
            points: result === 'win' ? 100 : result === 'draw' ? 50 : 10
        }
    })

    return NextResponse.json({
        weeklyMatches: weeklyMatches || 0,
        globalPoints: wallet?.global_points || 0,
        localPoints: wallet?.local_points || 0,
        history,
        recentMatches
    })
}

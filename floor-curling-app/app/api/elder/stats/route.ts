import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const elderId = requestUrl.searchParams.get('id')

    if (!elderId) {
        return NextResponse.json({ error: 'Elder ID required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
        // 1. Calculate Start of Week (Sunday)
        const now = new Date()
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        startOfWeek.setHours(0, 0, 0, 0)

        // 2. Query Matches for this week
        const { count, error } = await supabase
            .from('matches')
            .select('*', { count: 'exact', head: true })
            .or(`red_team_elder_id.eq.${elderId},yellow_team_elder_id.eq.${elderId}`)
            .gte('created_at', startOfWeek.toISOString())
            .eq('status', 'completed')

        if (error) throw error

        // 3. Get total points (Wallet)
        const { data: wallet } = await supabase
            .from('wallets')
            .select('global_points')
            .eq('user_id', elderId)
            .single()

        return NextResponse.json({
            weeklyMatches: count || 0,
            totalPoints: wallet?.global_points || 0
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

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
        console.log('🛡️ Fetching Admin Matches...')

        const { data: matches, error } = await supabaseAdmin
            .from('matches')
            .select(`
                id, 
                created_at, 
                completed_at,
                status,
                winner_color,
                store:stores(name),
                red_elder:profiles!red_team_elder_id(full_name, nickname),
                yellow_elder:profiles!yellow_team_elder_id(full_name, nickname),
                match_ends(red_score, yellow_score)
            `)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(100)

        if (error) {
            console.error('Database Error:', error)
            throw error
        }

        // Process data for chart (Client needs this, or we process here)
        // Let's return raw matches and let client process chart for flexibility

        return NextResponse.json({ success: true, matches })

    } catch (error: any) {
        console.error('❌ Admin matches API error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch matches' },
            { status: 500 }
        )
    }
}

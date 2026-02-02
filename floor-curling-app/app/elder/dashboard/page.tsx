import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ElderDashboardClient from './components/ElderDashboardClient'

export default async function ElderDashboard() {
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

    if (!user) {
        redirect('/login')
    }

    // Parallel Fetching
    const [familyRes, inventoryRes, walletRes, matchesRes] = await Promise.all([
        // 1. Family
        supabase.from('profiles').select('*').eq('linked_elder_id', user.id),
        // 2. Inventory
        supabase.from('inventory').select('*, products(*)').eq('user_id', user.id).eq('status', 'active'),
        // 3. Wallet (Total Points)
        supabase.from('wallets').select('global_points').eq('user_id', user.id).single(),
        // 4. Matches (Weekly Count)
        supabase.from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', 'store_123') // Should be dynamic but for now approximate? 
            .or(`red_team_id.eq.${user.id},yellow_team_id.eq.${user.id}`) // Assuming simplifying query for now
        // Actually, let's use a simpler query for weekly stats:
        // Since we can't easily do complex date math in simple SELECT count w/ supabase-js in one go without params
        // We will fetch simple count for now or better yet:
        // Let's just fetch the data we can reliable get.
        // For weekly matches, we might need a function or range query.
    ]);

    // Fix matches query properly
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const { count: weeklyMatches } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString())
        .or(`red_team_id.eq.${user.id},yellow_team_id.eq.${user.id}`)

    // Cheers (Interactions)
    // Limited to last 3
    const { data: cheers } = await supabase
        .from('interactions')
        .select('*, sender:profiles!sender_id(*)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

    const stats = {
        weeklyMatches: weeklyMatches || 0,
        totalPoints: walletRes.data?.global_points || 0
    }

    return (
        <ElderDashboardClient
            user={user}
            familyMembers={familyRes.data || []}
            inventory={inventoryRes.data || []}
            stats={stats}
            cheers={cheers || []}
        />
    )
}

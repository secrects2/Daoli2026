import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============ 確定性偽隨機 (Deterministic Pseudo-Random) ============
// 使用 elder UUID 作為種子，確保同一位長輩每天都會看到一致的健康數據

function hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0
    }
    return Math.abs(hash)
}

function seededRandom(seed: number): () => number {
    let s = seed
    return () => {
        s = (s * 16807 + 0) % 2147483647
        return (s - 1) / 2147483646
    }
}

function generateHealthMetrics(elderId: string) {
    const baseSeed = hashCode(elderId)
    const today = new Date()
    const history: Array<{
        date: string
        steps: number
        heartRate: number
        calories: number
        activeMinutes: number
    }> = []

    // 為過去 30 天的每一天生成數據
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const daySeed = baseSeed + i * 137 + d.getDate() * 31
        const rand = seededRandom(daySeed)

        // 步數：基底 4000-9000，帶有波動
        const steps = Math.floor(4000 + rand() * 5000 + Math.sin(i * 0.5) * 1000)
        // 活動分鐘：與步數成正比
        const activeMinutes = Math.floor((steps / 100) * (0.6 + rand() * 0.5))
        // 心率：60-90 bpm
        const heartRate = Math.floor(62 + rand() * 22 + (activeMinutes > 50 ? 5 : 0))
        // 熱量：基底代謝 + 活動消耗
        const calories = Math.floor(200 + activeMinutes * 4.2 + rand() * 80)

        history.push({
            date: d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
            steps,
            heartRate,
            calories,
            activeMinutes,
        })
    }

    const todayData = history[history.length - 1]
    const yesterdayData = history[history.length - 2]

    // 計算趨勢百分比
    const stepsTrend = yesterdayData.steps > 0
        ? Math.round(((todayData.steps - yesterdayData.steps) / yesterdayData.steps) * 100)
        : 0
    const caloriesTrend = yesterdayData.calories > 0
        ? Math.round(((todayData.calories - yesterdayData.calories) / yesterdayData.calories) * 100)
        : 0

    // 全國排名用一個偽隨機固定值
    const rankRand = seededRandom(baseSeed + 9999)
    const ranking = Math.floor(50 + rankRand() * 200)
    const rankChange = Math.floor(rankRand() * 10) - 2 // -2 ~ +8

    // 連續運動天數 (從最近往回推算步數 > 3000 的連續天數)
    let consecutiveDays = 0
    for (let j = history.length - 1; j >= 0; j--) {
        if (history[j].steps >= 3000) {
            consecutiveDays++
        } else {
            break
        }
    }

    return {
        today: {
            steps: todayData.steps,
            heartRate: todayData.heartRate,
            calories: todayData.calories,
            activeMinutes: todayData.activeMinutes,
            stepsTrend,
            caloriesTrend,
            ranking,
            rankChange,
            consecutiveDays,
        },
        history,
    }
}

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

    // Fetch wallet data (dual points - 兩種運動積分合併)
    const { data: wallet } = await supabase
        .from('wallets')
        .select('global_points, local_points')
        .eq('user_id', id)
        .single()

    // Fetch recent matches for this elder (ALL sports combined)
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

    // ============ 地壺球 (Curling) 比賽 ============
    const { data: curlingMatchesData } = await supabase
        .from('matches')
        .select('created_at, winner_color, red_team_elder_id, yellow_team_elder_id, sport_type')
        .or(`red_team_elder_id.eq.${id},yellow_team_elder_id.eq.${id}`)
        .or('sport_type.eq.curling,sport_type.is.null')
        .order('created_at', { ascending: false })
        .limit(5)

    // Filter to curling only (sport_type is null or 'curling')
    const curlingOnly = (curlingMatchesData || []).filter(m => !m.sport_type || m.sport_type === 'curling')

    const recentMatches = curlingOnly.map(m => {
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

    // ============ 地板滾球 (Boccia) 比賽 ============
    const { data: bocciaMatchesData } = await supabase
        .from('matches')
        .select('created_at, winner_color, red_team_elder_id, yellow_team_elder_id, sport_type')
        .eq('sport_type', 'boccia')
        .or(`red_team_elder_id.eq.${id},yellow_team_elder_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(5)

    const recentBocciaMatches = (bocciaMatchesData || []).map(m => {
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

    // 生成健康數據 (deterministic based on elder ID)
    const healthMetrics = generateHealthMetrics(id)

    return NextResponse.json({
        weeklyMatches: weeklyMatches || 0,
        globalPoints: wallet?.global_points || 0,
        localPoints: wallet?.local_points || 0,
        history,
        recentMatches,        // 地壺球
        recentBocciaMatches,  // 地板滾球
        healthMetrics,
    })
}

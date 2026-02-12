import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// remove top-level init
// const supabaseAdmin = ...

// 驗證管理員身份
async function verifyAdmin() {
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
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return null
    return user
}

// GET: 匯出報表資料
export async function GET(request: NextRequest) {
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const storeId = searchParams.get('store')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const format = searchParams.get('format') || 'json'

    // Initialize inside handler
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    try {
        let data: any = {}

        switch (type) {
            case 'overview':
                data = await getOverviewReport(supabaseAdmin, startDate, endDate, storeId)
                break
            case 'matches':
                data = await getMatchesReport(supabaseAdmin, startDate, endDate, storeId)
                break
            case 'users':
                data = await getUsersReport(supabaseAdmin, storeId, startDate, endDate, role)
                break
            case 'transactions':
                data = await getTransactionsReport(supabaseAdmin, startDate, endDate)
                break
            case 'orders':
                data = await getOrdersReport(supabaseAdmin, startDate, endDate, status)
                break
            default:
                data = await getOverviewReport(supabaseAdmin, startDate, endDate, storeId)
        }

        // 如果是 CSV 格式，轉換並返回
        if (format === 'csv') {
            const csv = convertToCSV(data, type)
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="report_${type}_${new Date().toISOString().slice(0, 10)}.csv"`
                }
            })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('報表匯出錯誤:', error)
        return NextResponse.json({ error: '匯出失敗' }, { status: 500 })
    }
}

// 概覽報表
async function getOverviewReport(supabaseAdmin: any, startDate: string | null, endDate: string | null, storeId: string | null) {
    let matchQuery = supabaseAdmin.from('matches').select('id', { count: 'exact' })
    let userQuery = supabaseAdmin.from('profiles').select('id', { count: 'exact' })
    let transactionQuery = supabaseAdmin.from('point_transactions').select('amount')

    if (storeId) {
        matchQuery = matchQuery.eq('store_id', storeId)
    }
    if (startDate) {
        matchQuery = matchQuery.gte('created_at', startDate)
        transactionQuery = transactionQuery.gte('created_at', startDate)
    }
    if (endDate) {
        matchQuery = matchQuery.lte('created_at', endDate)
        transactionQuery = transactionQuery.lte('created_at', endDate)
    }

    const [matches, users, transactions] = await Promise.all([
        matchQuery,
        userQuery,
        transactionQuery
    ])

    const totalPoints = transactions.data?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

    // 按角色統計用戶
    const { data: roleStats } = await supabaseAdmin
        .from('profiles')
        .select('role')

    const roleCount: Record<string, number> = {}
    roleStats?.forEach((p: any) => {
        roleCount[p.role] = (roleCount[p.role] || 0) + 1
    })

    return {
        summary: {
            totalMatches: matches.count || 0,
            totalUsers: users.count || 0,
            totalPointsDistributed: totalPoints,
            generatedAt: new Date().toISOString()
        },
        usersByRole: roleCount,
        period: { startDate, endDate }
    }
}

// 比賽報表
async function getMatchesReport(supabaseAdmin: any, startDate: string | null, endDate: string | null, storeId: string | null) {
    let query = supabaseAdmin
        .from('matches')
        .select(`
            id,
            created_at,
            winner_color,
            status,
            store_id,
            stores(name)
        `)
        .order('created_at', { ascending: false })
        .limit(500)

    if (storeId) query = query.eq('store_id', storeId)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: matches } = await query

    return {
        matches: matches || [],
        total: matches?.length || 0,
        generatedAt: new Date().toISOString()
    }
}

// 用戶報表
async function getUsersReport(supabaseAdmin: any, storeId: string | null, startDate: string | null, endDate: string | null, role: string | null) {
    let query = supabaseAdmin
        .from('profiles')
        .select(`
            id,
            full_name,
            nickname,
            role,
            store_id,
            created_at,
            is_active,
            stores(name)
        `)
        .order('created_at', { ascending: false })

    if (storeId) query = query.eq('store_id', storeId)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: users } = await query

    return {
        users: users || [],
        total: users?.length || 0,
        generatedAt: new Date().toISOString()
    }
}

// 積分交易報表
async function getTransactionsReport(supabaseAdmin: any, startDate: string | null, endDate: string | null) {
    let query = supabaseAdmin
        .from('point_transactions')
        .select(`
            id,
            amount,
            type,
            description,
            created_at,
            wallet_id,
            wallets(user_id, profiles(full_name, nickname))
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: transactions } = await query

    const totalEarned = transactions?.filter((t: any) => t.type === 'earned').reduce((sum: number, t: any) => sum + t.amount, 0) || 0
    const totalSpent = transactions?.filter((t: any) => t.type === 'spent').reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0

    return {
        transactions: transactions || [],
        total: transactions?.length || 0,
        summary: { totalEarned, totalSpent },
        generatedAt: new Date().toISOString()
    }
}

// 訂單報表
async function getOrdersReport(supabaseAdmin: any, startDate: string | null, endDate: string | null, status: string | null) {
    let query = supabaseAdmin
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            total_amount,
            created_at,
            buyer:buyer_id(full_name, nickname),
            recipient:recipient_id(full_name, nickname)
        `)
        .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    if (status && status !== 'all') query = query.eq('status', status)

    const { data: orders } = await query

    return {
        orders: orders || [],
        total: orders?.length || 0,
        generatedAt: new Date().toISOString()
    }
}

// 轉換為 CSV
function convertToCSV(data: any, type: string): string {
    let rows: string[] = []
    let headers: string[] = []

    switch (type) {
        case 'matches':
            headers = ['ID', '日期', '勝方', '狀態', '門店']
            rows = [headers.join(',')]
            data.matches?.forEach((m: any) => {
                rows.push([
                    m.id,
                    m.created_at,
                    m.winner_color || '平局',
                    m.status,
                    m.stores?.name || ''
                ].join(','))
            })
            break

        case 'users':
            headers = ['ID', '姓名', '暱稱', '角色', '門店', '建立時間', '活躍']
            rows = [headers.join(',')]
            data.users?.forEach((u: any) => {
                rows.push([
                    u.id,
                    u.full_name || '',
                    u.nickname || '',
                    u.role,
                    u.stores?.name || u.store_id || '',
                    u.created_at,
                    u.is_active ? '是' : '否'
                ].join(','))
            })
            break

        case 'transactions':
            headers = ['ID', '用戶', '金額', '類型', '描述', '時間']
            rows = [headers.join(',')]
            data.transactions?.forEach((t: any) => {
                const userName = t.wallets?.profiles?.nickname || t.wallets?.profiles?.full_name || '未知'
                rows.push([
                    t.id,
                    userName,
                    t.amount,
                    t.type,
                    `"${(t.description || '').replace(/"/g, '""')}"`,
                    t.created_at
                ].join(','))
            })
            break

        case 'orders':
            headers = ['訂單編號', '購買者', '收禮者', '金額', '狀態', '時間']
            rows = [headers.join(',')]
            data.orders?.forEach((o: any) => {
                const buyerName = o.buyer?.full_name || o.buyer?.nickname || '未知'
                const recipientName = o.recipient?.full_name || o.recipient?.nickname || '同購買者'
                rows.push([
                    o.order_number,
                    buyerName,
                    recipientName,
                    o.total_amount,
                    o.status,
                    o.created_at
                ].join(','))
            })
            break

        default:
            headers = ['指標', '數值']
            rows = [headers.join(',')]
            if (data.summary) {
                Object.entries(data.summary).forEach(([key, value]) => {
                    rows.push([key, String(value)].join(','))
                })
            }
    }

    return '\uFEFF' + rows.join('\n') // BOM for Excel UTF-8
}

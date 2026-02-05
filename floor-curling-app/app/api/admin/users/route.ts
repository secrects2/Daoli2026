import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin-only API for user management
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// Helper to verify admin role
async function verifyAdmin(request: NextRequest) {
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

// GET: 獲取用戶列表
export async function GET(request: NextRequest) {
    const admin = await verifyAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
        .from('profiles')
        .select('*, stores!store_id(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (role) {
        query = query.eq('role', role)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({
        users: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    })
}

// POST: 創建新用戶
export async function POST(request: NextRequest) {
    const admin = await verifyAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, full_name, role, store_id, nickname, phone } = body

    if (!email || !password || !role) {
        return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    })

    if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // 2. Update profile
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name,
            role,
            store_id: store_id || null,
            nickname: nickname || null,
            phone: phone || null
        })
        .eq('id', authData.user.id)

    if (profileError) {
        console.error('Error updating profile:', profileError)
        // Cleanup: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // 3. Create wallet for elder
    if (role === 'elder') {
        await supabaseAdmin
            .from('wallets')
            .insert({
                user_id: authData.user.id,
                global_points: 0,
                local_points: 0
            })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
}

// PUT: 更新用戶
export async function PUT(request: NextRequest) {
    const admin = await verifyAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, full_name, role, store_id, nickname, phone, is_active } = body

    if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (role !== undefined) updateData.role = role
    if (store_id !== undefined) updateData.store_id = store_id
    if (nickname !== undefined) updateData.nickname = nickname
    if (phone !== undefined) updateData.phone = phone
    if (is_active !== undefined) updateData.is_active = is_active

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)

    if (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

// DELETE: 刪除用戶（軟刪除 - 設為非活躍）
export async function DELETE(request: NextRequest) {
    const admin = await verifyAdmin(request)
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Soft delete - set is_active to false
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)

    if (error) {
        console.error('Error deactivating user:', error)
        return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

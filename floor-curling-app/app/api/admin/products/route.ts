import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 Admin 權限操作
// 使用 Admin 權限操作
// const supabaseAdmin = ... removed top level init

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

// GET: 獲取商品列表
export async function GET(request: NextRequest) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (category) {
        query = query.eq('category', category)
    }
    if (isActive === 'true') {
        query = query.eq('is_active', true)
    } else if (isActive === 'false') {
        query = query.eq('is_active', false)
    }

    const { data, error, count } = await query

    if (error) {
        console.error('獲取商品列表錯誤:', error)
        return NextResponse.json({ error: '獲取商品失敗' }, { status: 500 })
    }

    return NextResponse.json({
        products: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
    })
}

// POST: 新增商品
export async function POST(request: NextRequest) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const {
        name,
        description,
        category,
        price_global,
        price_local,
        stock_quantity,
        image_url,
        is_active = true
    } = body

    if (!name || !category) {
        return NextResponse.json({ error: '名稱和分類為必填' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
        .from('products')
        .insert({
            name,
            description: description || null,
            category,
            price_global: price_global || 0,
            price_local: price_local || 0,
            stock_quantity: stock_quantity || 0,
            image_url: image_url || null,
            is_active
        })
        .select()
        .single()

    if (error) {
        console.error('新增商品錯誤:', error)
        return NextResponse.json({ error: '新增商品失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, product: data })
}

// PUT: 更新商品
export async function PUT(request: NextRequest) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
        return NextResponse.json({ error: '商品 ID 為必填' }, { status: 400 })
    }

    // 過濾掉 undefined 值
    const cleanData: any = {}
    Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
            cleanData[key] = updateData[key]
        }
    })

    const { error } = await supabaseAdmin
        .from('products')
        .update(cleanData)
        .eq('id', id)

    if (error) {
        console.error('更新商品錯誤:', error)
        return NextResponse.json({ error: '更新商品失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

// DELETE: 刪除商品（軟刪除 - 設為非上架）
export async function DELETE(request: NextRequest) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const admin = await verifyAdmin()
    if (!admin) {
        return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId) {
        return NextResponse.json({ error: '商品 ID 為必填' }, { status: 400 })
    }

    // 軟刪除 - 設為非上架
    const { error } = await supabaseAdmin
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)

    if (error) {
        console.error('刪除商品錯誤:', error)
        return NextResponse.json({ error: '刪除商品失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

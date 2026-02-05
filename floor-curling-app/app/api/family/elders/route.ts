import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET: 獲取家屬綁定的所有長輩
export async function GET() {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 嘗試從新表讀取
    const { data: links, error: linksError } = await supabase
        .from('family_elder_links')
        .select(`
            id,
            elder_id,
            is_primary,
            nickname,
            created_at,
            elder:profiles!elder_id (
                id,
                full_name,
                nickname,
                avatar_url,
                store_id
            )
        `)
        .eq('family_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

    if (linksError) {
        // 如果表不存在，回退到舊的 linked_elder_id 欄位
        console.log('family_elder_links table may not exist, falling back to profiles.linked_elder_id')

        const { data: profile } = await supabase
            .from('profiles')
            .select('linked_elder_id')
            .eq('id', user.id)
            .single()

        if (profile?.linked_elder_id) {
            const { data: elder } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, avatar_url, store_id')
                .eq('id', profile.linked_elder_id)
                .single()

            if (elder) {
                return NextResponse.json({
                    elders: [{
                        id: 'legacy',
                        elder_id: elder.id,
                        is_primary: true,
                        nickname: null,
                        elder
                    }]
                })
            }
        }

        return NextResponse.json({ elders: [] })
    }

    return NextResponse.json({ elders: links || [] })
}

// POST: 新增綁定長輩
export async function POST(request: NextRequest) {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { elderId, nickname } = body

    if (!elderId) {
        return NextResponse.json({ error: 'Elder ID is required' }, { status: 400 })
    }

    // 驗證長輩存在
    const { data: elder } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', elderId)
        .single()

    if (!elder) {
        return NextResponse.json({ error: 'Elder not found' }, { status: 404 })
    }

    // 檢查是否已有綁定
    const { data: existingLinks } = await supabase
        .from('family_elder_links')
        .select('id')
        .eq('family_id', user.id)

    const isFirst = !existingLinks || existingLinks.length === 0

    // 創建綁定
    const { data: link, error } = await supabase
        .from('family_elder_links')
        .insert({
            family_id: user.id,
            elder_id: elderId,
            is_primary: isFirst,
            nickname: nickname || null
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Already linked to this elder' }, { status: 409 })
        }
        console.error('Error creating link:', error)
        return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
    }

    // 同時更新舊的 linked_elder_id 欄位（保持向後兼容）
    if (isFirst) {
        await supabase
            .from('profiles')
            .update({ linked_elder_id: elderId })
            .eq('id', user.id)
    }

    return NextResponse.json({ success: true, link })
}

// DELETE: 解除綁定
export async function DELETE(request: NextRequest) {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const elderId = searchParams.get('elderId')

    if (!elderId) {
        return NextResponse.json({ error: 'Elder ID is required' }, { status: 400 })
    }

    const { error } = await supabase
        .from('family_elder_links')
        .delete()
        .eq('family_id', user.id)
        .eq('elder_id', elderId)

    if (error) {
        console.error('Error deleting link:', error)
        return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
    }

    // 更新舊欄位
    const { data: profile } = await supabase
        .from('profiles')
        .select('linked_elder_id')
        .eq('id', user.id)
        .single()

    if (profile?.linked_elder_id === elderId) {
        // 如果刪除的是主要長輩，設置下一個為主要
        const { data: remainingLinks } = await supabase
            .from('family_elder_links')
            .select('elder_id')
            .eq('family_id', user.id)
            .order('created_at')
            .limit(1)

        await supabase
            .from('profiles')
            .update({ linked_elder_id: remainingLinks?.[0]?.elder_id || null })
            .eq('id', user.id)
    }

    return NextResponse.json({ success: true })
}

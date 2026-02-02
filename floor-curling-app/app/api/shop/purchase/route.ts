import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { productId, buyerId, targetUserId } = await request.json()
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use Service Role to bypass RLS for cross-user operations (Family buying for Elder)
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll(cookiesToSet) { }
                }
            }
        )

        // 1. Validate Product & Price
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single()

        if (productError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // 2. Check Target User Points (Elder's points)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('points, full_name')
            .eq('id', targetUserId)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        if ((profile.points || 0) < product.price) {
            return NextResponse.json({ error: `積分不足！還差 ${product.price - (profile.points || 0)} 分` }, { status: 400 })
        }

        // 3. Deduct Points
        const { error: deductError } = await supabase
            .from('profiles')
            .update({ points: (profile.points || 0) - product.price })
            .eq('id', targetUserId)

        if (deductError) {
            return NextResponse.json({ error: '扣款失敗' }, { status: 500 })
        }

        // 4. Add to Inventory
        const { error: inventoryError } = await supabase
            .from('inventory')
            .insert({
                user_id: targetUserId,
                product_id: productId,
                status: 'active'
            })

        if (inventoryError) {
            // Rollback: Refund points
            await supabase.from('profiles').update({ points: profile.points }).eq('id', targetUserId)
            return NextResponse.json({ error: '交易失敗 (Inventory Error)' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `成功購買 ${product.name}`,
            remainingPoints: (profile.points || 0) - product.price
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

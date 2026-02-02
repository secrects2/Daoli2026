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

        // 2. Check Target User Wallet (Elder's Local Points)
        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('id, local_points')
            .eq('user_id', targetUserId)
            .single()

        if (walletError || !wallet) {
            // Auto-create wallet if missing (Unlikely for elders seeded correctly, but good for robustness)
            // For now, just error
            return NextResponse.json({ error: '找不到錢包 (Wallet not found)' }, { status: 404 })
        }

        const currentPoints = wallet.local_points || 0

        if (currentPoints < product.price) {
            return NextResponse.json({ error: `積分不足！還差 ${product.price - currentPoints} 分` }, { status: 400 })
        }

        // 3. Deduct Points (Local Only)
        const { error: deductError } = await supabase
            .from('wallets')
            .update({ local_points: currentPoints - product.price })
            .eq('id', wallet.id)

        if (deductError) {
            return NextResponse.json({ error: '扣款失敗' }, { status: 500 })
        }

        // Record Transaction
        await supabase.from('point_transactions').insert({
            wallet_id: wallet.id,
            amount: -product.price,
            type: 'spent',
            description: `購買: ${product.name}`
        })

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
            await supabase.from('wallets').update({ local_points: currentPoints }).eq('id', wallet.id)
            return NextResponse.json({ error: '交易失敗 (Inventory Error)' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `成功購買 ${product.name}`,
            remainingPoints: currentPoints - product.price
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

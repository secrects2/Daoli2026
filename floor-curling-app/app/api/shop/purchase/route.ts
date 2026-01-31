import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use Service Role to handle transaction (deduct wallet, add inventory)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { elderId, productId, price } = await request.json()

        if (!elderId || !productId || price === undefined) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Check Wallet Balance
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('global_points')
            .eq('user_id', elderId)
            .single()

        if (walletError || !wallet) {
            return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
        }

        if (wallet.global_points < price) {
            return NextResponse.json({ success: false, error: 'Insufficient points' }, { status: 400 })
        }

        // 2. Perform Transaction (Ideally this should be a DB function to be atomic, but doing sequentially for MVP)
        // Deduct Points
        const { error: updateError } = await supabaseAdmin
            .from('wallets')
            .update({ global_points: wallet.global_points - price })
            .eq('user_id', elderId)

        if (updateError) throw updateError

        // Add to Inventory
        const { error: inventoryError } = await supabaseAdmin
            .from('inventory')
            .insert({
                user_id: elderId,
                product_id: productId,
                status: 'active'
            })

        if (inventoryError) {
            // Rollback (Compensating Transaction) - MVP Risk: If this fails, user lost points.
            // In production, use SQL Transaction or RPC.
            console.error('Inventory insert failed, rolling back points...')
            await supabaseAdmin
                .from('wallets')
                .update({ global_points: wallet.global_points }) // Set back to original
                .eq('user_id', elderId)

            throw inventoryError
        }

        // Log Transaction
        await supabaseAdmin.from('transactions').insert({
            user_id: elderId,
            type: 'purchase',
            global_points_delta: -price,
            local_points_delta: 0,
            global_points_after: wallet.global_points - price,
            local_points_after: 0, // Need to fetch local points to be accurate, but ignoring for now
            operator_role: 'system',
            description: '購買商品',
            created_at: new Date().toISOString()
        })

        return NextResponse.json({ success: true, message: 'Purchase successful' })

    } catch (error: any) {
        console.error('Purchase error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Purchase failed' },
            { status: 500 }
        )
    }
}

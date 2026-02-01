import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { elderId, productId, price } = await request.json()
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Check wallet
        const { data: wallet } = await supabase.from('wallets').select('id, global_points').eq('user_id', elderId).single()
        if (!wallet || wallet.global_points < price) {
            return NextResponse.json({ error: '積分不足' }, { status: 400 })
        }

        // Deduct points
        const { error: updateError } = await supabase
            .from('wallets')
            .update({ global_points: wallet.global_points - price })
            .eq('id', wallet.id)

        if (updateError) throw updateError

        // Log transaction
        await supabase.from('point_transactions').insert({
            wallet_id: wallet.id,
            amount: -price,
            type: 'spent',
            description: `兌換商品 #${productId}`
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

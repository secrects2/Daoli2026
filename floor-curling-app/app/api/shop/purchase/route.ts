import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { elderId, productId, price } = await request.json()
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
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

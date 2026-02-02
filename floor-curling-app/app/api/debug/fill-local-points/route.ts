import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { get: () => undefined, set: () => { }, remove: () => { } } }
        )

        // 1. Get all wallets
        const { data: wallets, error: fetchError } = await supabase
            .from('wallets')
            .select('id, user_id, local_points')

        if (fetchError) throw fetchError

        if (!wallets || wallets.length === 0) {
            return NextResponse.json({ message: 'No wallets found' })
        }

        const updates = []
        for (const wallet of wallets) {
            // Only top up if less than 1000 (to avoid overwriting rich users if run multiple times, 
            // but for now "fill" implies ensuring they have points)
            if ((wallet.local_points || 0) < 1000) {
                const { error } = await supabase
                    .from('wallets')
                    .update({ local_points: 1000 })
                    .eq('id', wallet.id)

                if (error) console.error(`Failed to update wallet ${wallet.id}`, error)
                else updates.push(wallet.user_id)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updates.length} wallets to 1000 local_points`,
            updatedUsers: updates
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

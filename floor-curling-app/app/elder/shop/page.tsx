import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ElderShopClient from './components/ElderShopClient'

export default async function ElderShop() {
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
    if (!user) redirect('/login')

    // Parallel Fetching
    const [walletRes, productsRes] = await Promise.all([
        supabase.from('wallets').select('local_points').eq('user_id', user.id).single(),
        supabase.from('products').select('*').eq('is_active', true).order('price_points', { ascending: true })
    ])

    const points = walletRes.data?.local_points || 0
    const products = productsRes.data || []

    return (
        <ElderShopClient
            user={user}
            points={points}
            products={products}
        />
    )
}

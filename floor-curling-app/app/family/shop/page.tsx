import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import FamilyShopClient from './components/FamilyShopClient'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FamilyShop() {
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

    // 1. Get Family Profile to find Elder ID
    const { data: familyProfile } = await supabase.from('profiles').select('linked_elder_id').eq('id', user.id).single()

    let elder = null
    let points = 0

    const productQuery = supabase.from('products').select('*').eq('is_active', true).order('price_points', { ascending: true })

    if (familyProfile?.linked_elder_id) {
        // Parallel fetch Elder Profile and Wallet and Products
        const [elderRes, walletRes, productsRes] = await Promise.all([
            supabase.from('profiles').select('id, full_name').eq('id', familyProfile.linked_elder_id).single(),
            supabase.from('wallets').select('local_points').eq('user_id', familyProfile.linked_elder_id).single(),
            productQuery
        ])

        if (elderRes.data) elder = elderRes.data
        if (walletRes.data) points = walletRes.data.local_points || 0

        return (
            <FamilyShopClient
                user={user}
                elder={elder}
                points={points}
                products={productsRes.data || []}
            />
        )
    }

    // Fallback if no elder
    const { data: products } = await productQuery

    return (
        <FamilyShopClient
            user={user}
            elder={null}
            points={0}
            products={products || []}
        />
    )
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PortalClient from './components/PortalClient'

export default async function FamilyPortal() {
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
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Parallel Fetching for Profile and potential Elder/Wallet data
    // 1. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    let elderProfile = null
    let wallet = null

    // 2. Fetch Elder Data if linked
    if (profile?.linked_elder_id) {
        const { data: elder } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profile.linked_elder_id)
            .single()

        if (elder) {
            elderProfile = elder

            // 3. Fetch Elder Wallet for Points (Only needed if elder exists)
            const { data: w } = await supabase
                .from('wallets')
                .select('local_points')
                .eq('user_id', elder.id)
                .single()

            if (w) wallet = w
        }
    }

    return (
        <PortalClient
            user={user}
            profile={profile}
            elderProfile={elderProfile}
            wallet={wallet}
        />
    )
}

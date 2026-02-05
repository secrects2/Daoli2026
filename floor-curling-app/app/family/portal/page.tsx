import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PortalClient from './components/PortalClient'

interface ElderData {
    id: string
    elder_id: string
    is_primary: boolean
    nickname: string | null
    elder: {
        id: string
        full_name: string
        nickname: string
        avatar_url: string
        store_id: string
    }
}

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
                        // Ignore
                    }
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // 2. Try to fetch elders from new multi-elder table
    let elders: ElderData[] = []
    const { data: elderLinks, error: linksError } = await supabase
        .from('family_elder_links')
        .select(`
            id,
            elder_id,
            is_primary,
            nickname,
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

    if (!linksError && elderLinks && elderLinks.length > 0) {
        elders = elderLinks as any
    } else if (profile?.linked_elder_id) {
        // Fallback to legacy linked_elder_id
        const { data: elder } = await supabase
            .from('profiles')
            .select('id, full_name, nickname, avatar_url, store_id')
            .eq('id', profile.linked_elder_id)
            .single()

        if (elder) {
            elders = [{
                id: 'legacy',
                elder_id: elder.id,
                is_primary: true,
                nickname: null,
                elder: elder as any
            }]
        }
    }

    // 3. Get primary elder for wallet
    const primaryElder = elders.find(e => e.is_primary) || elders[0]
    let wallet = null

    if (primaryElder?.elder?.id) {
        const { data: w } = await supabase
            .from('wallets')
            .select('local_points')
            .eq('user_id', primaryElder.elder.id)
            .single()

        if (w) wallet = w
    }

    return (
        <PortalClient
            user={user}
            profile={profile}
            elders={elders}
            wallet={wallet}
        />
    )
}


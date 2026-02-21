import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import HealthClient from './components/HealthClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FamilyHealthPassbook() {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { /* readonly in server component */ }
            }
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Find linked primary elder
    let elderId = null
    let elderName = '長輩'

    const { data: elderLinks } = await supabase
        .from('family_elder_links')
        .select(`elder_id, is_primary, elder:profiles!elder_id(full_name, nickname)`)
        .eq('family_id', user.id)
        .order('is_primary', { ascending: false })
        .limit(1)

    if (elderLinks && elderLinks.length > 0) {
        elderId = elderLinks[0].elder_id
        elderName = (elderLinks[0] as any).elder?.nickname || (elderLinks[0] as any).elder?.full_name || '長輩'
    } else {
        // Fallback to old linked_elder_id
        const { data: profile } = await supabase.from('profiles').select('linked_elder_id').eq('id', user.id).single()
        if (profile?.linked_elder_id) {
            elderId = profile.linked_elder_id
            const { data: elderProfile } = await supabase.from('profiles').select('full_name, nickname').eq('id', elderId).single()
            if (elderProfile) elderName = elderProfile.nickname || elderProfile.full_name || '長輩'
        }
    }

    return (
        <HealthClient elderId={elderId} elderName={elderName} />
    )
}

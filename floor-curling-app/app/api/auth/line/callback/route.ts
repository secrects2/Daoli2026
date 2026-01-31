import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getLineToken, getLineProfile } from '@/lib/line'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')

    if (!code) {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    try {
        // 1. Exchange Code for Token
        // Must match exactly what was sent in login step
        const callbackUrl = `https://daoli2026.vercel.app/api/auth/line/callback`
        const tokenData = await getLineToken(code, callbackUrl)

        // 2. Get LINE Profile
        const lineProfile = await getLineProfile(tokenData.access_token)
        const lineUserId = lineProfile.userId
        const displayName = lineProfile.displayName
        const pictureUrl = lineProfile.pictureUrl

        // 3. Admin Client (Bypass RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 4. Find or Create User
        // Strategy: Profile -> Auth (Paginated) -> Create
        const dummyEmail = `line_${lineUserId}@daoli.local`
        let userId: string

        // A. Try finding via Profile (Most reliable for existing users)
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single()

        if (existingProfile) {
            userId = existingProfile.id
            console.log('✅ Found existing LINE user via Profile:', userId)

            // Update latest info
            await supabaseAdmin.from('profiles').update({
                full_name: displayName,
                avatar_url: pictureUrl
            }).eq('id', userId)
        } else {
            // B. Profile missing? Check Auth System (Handle Pagination)
            // Previous error "User already registered" meant listUsers failed to find it (default limit 50)
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
            const existingAuthUser = users.find(u => u.email === dummyEmail)

            if (existingAuthUser) {
                userId = existingAuthUser.id
                console.log('⚠️ Found Auth User but missing Profile, verifying profile...', userId)
            } else {
                console.log('📝 Creating NEW LINE user:', dummyEmail)
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: dummyEmail,
                    email_confirm: true,
                    user_metadata: {
                        line_user_id: lineUserId,
                        full_name: displayName,
                        avatar_url: pictureUrl,
                        iss: 'https://access.line.me'
                    }
                })

                if (createError) {
                    // Double safety catch
                    if (createError.message.includes('already registered')) {
                        console.log('⚠️ Race condition collision, retrying fetch...')
                        const { data: { users: retryUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
                        const racedUser = retryUsers.find(u => u.email === dummyEmail)
                        if (!racedUser) throw createError
                        userId = racedUser.id
                    } else {
                        throw createError
                    }
                } else {
                    userId = newUser.user!.id
                    // Init Wallet for BRAND NEW users only
                    await supabaseAdmin.from('wallets').insert({
                        user_id: userId,
                        global_points: 0,
                        local_points: 0
                    })
                }
            }

            // Ensure Profile Exists (Upsert handles both New and "Auth-only" cases)
            await supabaseAdmin.from('profiles').upsert({
                id: userId,
                role: 'family',
                store_id: null,
                line_user_id: lineUserId,
                full_name: displayName,
                avatar_url: pictureUrl
            })
        }

        // 5. Create Session via Magic Link (Fallback strategy since createSession is flaky)
        // This generates a link that logs the user in and redirects them
        console.log('🔄 Generating Magic Link for passwordless login...')

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: dummyEmail,
            options: {
                redirectTo: `https://daoli2026.vercel.app/auth/callback`
            }
        })

        if (linkError) {
            console.error('❌ Generate Link Error:', linkError)
            throw linkError
        }

        console.log('✅ Magic Link Generated. Redirecting user...')

        // 6. Redirect User to Magic Link (Supabase will set cookies and redirect back)
        if (!linkData.properties?.action_link) throw new Error('No action link returned')
        return NextResponse.redirect(linkData.properties.action_link)

    } catch (error: any) {
        console.error('LINE Login Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

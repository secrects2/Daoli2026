import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getLineToken, getLineProfile } from '@/lib/line'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

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
                    await supabaseAdmin.from('wallets').insert({
                        user_id: userId,
                        global_points: 0,
                        local_points: 0
                    })
                }
            }

            await supabaseAdmin.from('profiles').upsert({
                id: userId,
                role: 'family',
                store_id: null,
                line_user_id: lineUserId,
                full_name: displayName,
                avatar_url: pictureUrl
            })
        }

        // 5. Create Session via Password Swap Strategy
        // (Bypasses PKCE/Verifier issues and createSession missing issues)
        console.log('🔄 Performing Password Swap for seamless login...')

        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + "Aa1!"

        // A. Set Temp Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: tempPassword
        })

        if (updateError) {
            console.error('❌ Failed to set temp password:', updateError)
            throw updateError
        }

        // B. Sign In with Temp Password (Sets Cookies using SSR client)
        // This ensures the cookies are compatible with middleware
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
                            // Ignored in route handler usually
                        }
                    },
                },
            }
        )

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password: tempPassword
        })

        if (signInError) {
            console.error('❌ Sign In Failed:', signInError)
            throw signInError
        }

        console.log('✅ Logged in via Password Swap. Redirecting to Family Dashboard...')

        // 7. Redirect
        return NextResponse.redirect(new URL('/family/dashboard', request.url))

    } catch (error: any) {
        console.error('LINE Login Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

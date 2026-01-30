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
        const tokenData = await getLineToken(code, `${requestUrl.origin}/api/auth/line/callback`)

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
        // Check if user exists by querying profiles table directly via admin (or checking auth users)
        // We use the dummy email strategy from the prompt
        const dummyEmail = `line_${lineUserId}@daoli.local`

        // Check if user already exists in Auth
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        // Simple search (in production maybe use more efficient lookup)
        let user = users.find(u => u.email === dummyEmail)

        if (!user) {
            console.log('📝 Creating new LINE user:', dummyEmail)
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
            if (createError) throw createError
            user = newUser.user!

            // Create Profile entry manually if trigger doesn't exist
            // (Assuming triggers might fail or we want to be sure)
            await supabaseAdmin.from('profiles').upsert({
                id: user.id,
                role: 'family',
                store_id: null,
                line_user_id: lineUserId, // Store real LINE ID in profile
                full_name: displayName,
                avatar_url: pictureUrl
            })

            // Init wallet
            await supabaseAdmin.from('wallets').insert({
                user_id: user.id,
                global_points: 0,
                local_points: 0
            })
        } else {
            // Update profile with latest LINE info
            await supabaseAdmin.from('profiles').update({
                line_user_id: lineUserId,
                full_name: displayName,
                avatar_url: pictureUrl
            }).eq('id', user.id)
        }

        // 5. Create Session
        const { data: sessionData, error: sessionError } = await (supabaseAdmin.auth.admin as any).createSession({
            user_id: user.id
        })

        if (sessionError) throw sessionError

        // 6. Set Cookies (The Bridge)
        // We use auth-helpers to set the session on the response
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        await supabase.auth.setSession({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token
        })

        // 7. Redirect
        return NextResponse.redirect(new URL('/family/dashboard', request.url))

    } catch (error: any) {
        console.error('LINE Login Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

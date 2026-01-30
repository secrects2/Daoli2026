import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Exchange the code for a session
        // This automatically sets the session cookie via the route handler
        await supabase.auth.exchangeCodeForSession(code)

        // Get the user to determine where to redirect
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Fetch profile to verify role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            // Create profile if missing (auto-register flow for magic link)
            if (!profile) {
                console.log('📝 Creating profile for new user:', user.email)

                // Use service role client ONLY for creation to bypass RLS if needed, 
                // but ideally standard client should work if policies allow 'insert for authenticated'
                // For safety in this callback, we stick to the authenticated user's client if possible, 
                // but here we might need admin rights if RLS is strict. 
                // Stick to standard flow first.

                await supabase.from('profiles').insert({
                    id: user.id,
                    role: 'family',
                    store_id: null
                })

                await supabase.from('wallets').insert({
                    user_id: user.id,
                    local_points: 0,
                    global_points: 0
                })

                // Default to family dashboard for new users
                return NextResponse.redirect(new URL('/family/dashboard', request.url))
            }

            // Redirect based on role
            if (profile.role === 'family') {
                return NextResponse.redirect(new URL('/family/dashboard', request.url))
            } else if (profile.role === 'pharmacist') {
                return NextResponse.redirect(new URL('/pharmacist/dashboard', request.url))
            }
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL('/family/dashboard', request.url))
}


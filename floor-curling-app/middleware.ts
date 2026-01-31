import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 刷新 session（重要！）
    const { data: { user } } = await supabase.auth.getUser()

    // 如果未登錄，重定向到登錄頁
    if (!user) {
        console.log('❌ 中間件：用戶未登錄，重定向到 /login')
        return NextResponse.redirect(new URL('/login', request.url))
    }

    console.log('✅ 中間件：用戶已登錄:', user.email)

    // Fetach user role (Use Service Role Key to bypass RLS and Network Protection)
    let userRole: string | undefined = undefined

    try {
        // Create a temporary admin client just for this check
        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { }
                }
            }
        )

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile && !error) {
            userRole = profile.role
            console.log('📋 用戶角色:', userRole)
        } else {
            console.error('❌ 無法讀取用戶角色:', error)
        }
    } catch (error) {
        console.error('❌ 中間件錯誤:', error)
    }

    // 保護 /pharmacist 路由
    if (request.nextUrl.pathname.startsWith('/pharmacist')) {
        if (userRole !== 'pharmacist' && userRole !== 'admin') {
            console.log('⛔ 無權訪問藥師頁面，角色:', userRole)
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // 保護 /admin 路由
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (userRole !== 'admin') {
            console.log('⛔ 無權訪問管理員頁面，角色:', userRole)
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // 保護 /family 路由
    if (request.nextUrl.pathname.startsWith('/family')) {
        if (userRole !== 'family') {
            console.log('⛔ 無權訪問家屬頁面，角色:', userRole)
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return supabaseResponse
}

// 配置需要保護的路由
export const config = {
    matcher: [
        '/pharmacist/:path*',
        '/family/:path*',
        '/admin/:path*',
        '/onboarding/:path*',
        '/elder/:path*',
    ],
}

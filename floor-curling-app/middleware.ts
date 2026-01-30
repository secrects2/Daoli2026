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

    // 使用內部 API 端點獲取用戶角色（使用 service role 繞過 RLS）
    let userRole: string | undefined = undefined

    try {
        const profileRes = await fetch(
            `${request.nextUrl.origin}/api/profile?userId=${user.id}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )

        if (profileRes.ok) {
            const profile = await profileRes.json()
            userRole = profile?.role
            console.log('📋 用戶角色:', userRole, '| Profile:', JSON.stringify(profile))
        } else {
            console.log('❌ Profile API 請求失敗:', profileRes.status)
        }
    } catch (error) {
        console.error('❌ 獲取用戶角色時出錯:', error)
    }

    // 保護 /pharmacist 路由
    if (request.nextUrl.pathname.startsWith('/pharmacist')) {
        if (userRole !== 'pharmacist' && userRole !== 'admin') {
            console.log('⛔ 無權訪問藥師頁面，角色:', userRole)
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
    ],
}

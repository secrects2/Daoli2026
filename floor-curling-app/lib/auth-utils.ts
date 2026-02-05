import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * 驗證當前用戶是否為管理員
 * 用於保護 Admin API 端點
 */
export async function verifyAdmin(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
    try {
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
        if (!user) {
            return { isAdmin: false, error: '未登入' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return { isAdmin: false, userId: user.id, error: '權限不足' }
        }

        return { isAdmin: true, userId: user.id }
    } catch (error) {
        return { isAdmin: false, error: '驗證失敗' }
    }
}

/**
 * 驗證當前用戶是否為店長或管理員
 */
export async function verifyPharmacistOrAdmin(): Promise<{
    isAuthorized: boolean;
    userId?: string;
    role?: string;
    storeId?: string;
    error?: string
}> {
    try {
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
        if (!user) {
            return { isAuthorized: false, error: '未登入' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, store_id')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'pharmacist'].includes(profile.role)) {
            return { isAuthorized: false, userId: user.id, error: '權限不足' }
        }

        return {
            isAuthorized: true,
            userId: user.id,
            role: profile.role,
            storeId: profile.store_id
        }
    } catch (error) {
        return { isAuthorized: false, error: '驗證失敗' }
    }
}

/**
 * 快速返回未授權響應
 */
export function unauthorizedResponse(message: string = '未授權') {
    return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * 檢查是否為開發環境
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
}

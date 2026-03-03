'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LogoutPage() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const performLogout = async () => {
            console.log('🔄 Performing Force Logout...')

            // 1. Supabase SignOut
            try {
                await supabase.auth.signOut()
            } catch (e) {
                console.error('SignOut error:', e)
            }

            // 2. Clear Local/Session Storage
            localStorage.clear()
            sessionStorage.clear()

            // 3. Manually expire cookies (nuclear option)
            const cookies = document.cookie.split(";")
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i]
                const eqPos = cookie.indexOf("=")
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
            }

            // 4. Hard Redirect
            console.log('✅ Done. Redirecting...')
            window.location.href = '/login'
        }

        performLogout()
    }, [router, supabase])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600 font-medium">正如您所願，正在強制登出與清除資料...</p>
        </div>
    )
}

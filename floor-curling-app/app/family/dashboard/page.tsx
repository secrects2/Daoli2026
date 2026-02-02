'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyDashboardRedirect() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/family/portal')
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>正在轉導至新版家屬入口...</p>
        </div>
    )
}

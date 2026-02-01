'use client'

import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function SettingsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-[#F2F2F7]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-safe-top pb-2 px-4 border-b border-black/5 flex justify-between items-center h-[44px] box-content">
                <button
                    onClick={() => router.back()}
                    className="text-blue-600 flex items-center gap-1 text-[17px]"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回
                </button>
                <h1 className="font-semibold text-[17px]">設定</h1>
                <div className="w-[60px]" /> {/* Spacer for centering */}
            </div>

            <main className="p-4 space-y-6">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-4 text-red-600 active:bg-gray-50 transition-colors"
                    >
                        <span className="font-medium">登出帳戶</span>
                        <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-4">
                    Floor Curling App v0.1.0
                </p>
            </main>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FamilyPortal() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [elderProfile, setElderProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                setUser(user)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                setProfile(profile)

                // 如果有关联的长者，获取长者信息
                if (profile?.linked_elder_id) {
                    const { data: elder } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', profile.linked_elder_id)
                        .single()

                    setElderProfile(elder)
                }
            }
            setLoading(false)
        }

        getUser()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">載入中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 導航欄 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-blue-600">家屬入口</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600 text-right">
                                <p className="font-medium text-gray-900">
                                    {profile?.full_name || profile?.nickname || user?.user_metadata?.full_name || '家屬'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {profile?.phone || user?.phone || user?.email}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                登出
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">歡迎！</h2>
                    {elderProfile ? (
                        <p className="mt-2 text-gray-600">關聯長輩 ID: {elderProfile.id}</p>
                    ) : (
                        <p className="mt-2 text-yellow-600">⚠️ 您還未綁定長輩帳戶</p>
                    )}
                </div>

                {/* 功能卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 比賽紀錄 */}
                    <Link href="/family/matches" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group-hover:border-blue-200 border border-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">比賽紀錄</h3>
                            <p className="text-sm text-gray-600">查看長輩的比賽歷程</p>
                        </div>
                    </Link>

                    {/* 照片與影片 */}
                    <Link href="/family/photos" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group-hover:border-green-200 border border-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">照片與影片</h3>
                            <p className="text-sm text-gray-600">查看精彩瞬間</p>
                        </div>
                    </Link>

                    {/* 積分查詢 */}
                    <Link href="/family/points" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group-hover:border-yellow-200 border border-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">積分查詢</h3>
                            <p className="text-sm text-gray-600">查看榮譽與兌換積分</p>
                        </div>
                    </Link>

                    {/* 聊天室 */}
                    <Link href="/family/messages" className="block group">
                        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group-hover:border-purple-200 border border-transparent">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">聊天室</h3>
                            <p className="text-sm text-gray-600">與長輩保持聯繫</p>
                        </div>
                    </Link>
                </div>

                {/* 如果未關聯長輩，顯示提示 */}
                {!elderProfile && (
                    <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-yellow-600 mt-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">需要綁定長輩帳戶</h4>
                                <p className="text-gray-700">請聯繫藥師協助綁定長輩帳戶，以便查看長輩的比賽紀錄與照片。</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

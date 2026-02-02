'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FamilyPortal() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [elderProfile, setElderProfile] = useState<any>(null)
    const [wallet, setWallet] = useState<any>(null)
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
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="font-medium text-gray-900 truncate max-w-[120px]">
                                    {profile?.full_name || profile?.nickname || user?.user_metadata?.full_name || '家屬'}
                                </p>
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {profile?.role === 'family' ? '家屬會員' : '會員'}
                                    </span>
                                    <button
                                        onClick={() => alert(`會員 ID: ${user?.id}\n帳號: ${user?.email}`)}
                                        className="text-gray-400 hover:text-blue-600"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="登出"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">歡迎！</h2>
                    {elderProfile ? (
                        <p className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                            已連結長輩: <span className="font-bold">{elderProfile.full_name || elderProfile.nickname}</span>
                        </p>
                    ) : (
                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
                            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-yellow-800">您還未綁定長輩帳戶</span>
                        </div>
                    )}
                </div>

                {/* Weekly Summary Card (Updated Layout) */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden mb-8">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium mb-2">本週活動摘要</p>
                            <div className="flex items-baseline gap-2 mb-3">
                                <h3 className="text-4xl font-bold">{0}</h3>
                                <span className="opacity-80">場比賽</span>
                            </div>
                            <p className="text-blue-100 text-xs leading-relaxed max-w-md">
                                長輩本週表現活躍！建議您可以傳送訊息給予鼓勵。
                            </p>
                        </div>
                        <Link href="/family/messages" className="self-start md:self-end bg-white/20 hover:bg-white/30 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-2">
                            <span>💬</span> 發送鼓勵
                        </Link>
                    </div>
                </div>

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

                {/* 裝備商店 (送禮) - S2B2C 核心 */}
                <Link href="/family/shop" className="block group">
                    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group-hover:border-pink-200 border border-transparent">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
                                <span className="text-2xl">🎁</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">數位市集</h3>
                        <p className="text-sm text-gray-600">
                            為長輩添購裝備，目前擁有 <span className="font-bold text-amber-500">{wallet?.local_points || 0}</span> 購物金
                        </p>
                    </div>
                </Link>
        </div>

                {/* 如果未關聯長輩，顯示提示 */ }
    {
        !elderProfile && (
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
        )
    }
            </main >
        </div >
    )
}

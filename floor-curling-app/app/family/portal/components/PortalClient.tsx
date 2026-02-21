'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRScanModal } from '@/components/QRScanModal'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface ElderData {
    id: string
    elder_id: string
    is_primary: boolean
    nickname: string | null
    elder: {
        id: string
        full_name: string
        nickname: string
        avatar_url: string
        store_id: string
    }
}

interface PortalClientProps {
    user: any
    profile: any
    elders: ElderData[]
    wallet: any
}

export default function PortalClient({ user, profile, elders, wallet }: PortalClientProps) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Scanner State
    const [showScanner, setShowScanner] = useState(false)
    const [isBinding, setIsBinding] = useState(false)
    const [selectedElderIndex, setSelectedElderIndex] = useState(0)

    // Get current elder
    const currentElder = elders[selectedElderIndex]?.elder
    const hasElders = elders.length > 0

    const handleLogout = async () => {
        if (await confirm({ message: '確定要登出嗎？', confirmLabel: '登出', variant: 'danger' })) {
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
        }
    }

    const handleScan = async (elderId: string) => {
        setIsBinding(true)
        setShowScanner(false)
        try {
            // Use new multi-elder API
            const response = await fetch('/api/family/elders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ elderId })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || '綁定失敗')
            }

            toast.success('綁定成功！')
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsBinding(false)
        }
    }

    const handleUnbind = async (elderId: string) => {
        if (!await confirm({ message: '確定要解除與此長輩的綁定嗎？', confirmLabel: '解除綁定', variant: 'danger' })) return

        try {
            const response = await fetch(`/api/family/elders?elderId=${elderId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || '解除綁定失敗')
            }

            toast.success('已解除綁定')
            router.refresh()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        <div className="min-h-screen pb-20 space-y-6">
            {/* Glass Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-white/50 px-5 pt-12 pb-4 shadow-glass transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">家屬入口</h1>
                        <p className="text-sm font-medium text-gray-500">
                            {profile?.full_name || user?.user_metadata?.full_name || '家屬會員'}，您好
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            title="登出"
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            登出
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-sm">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="用戶頭像" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-5 space-y-6 animate-fade-in-up">

                {hasElders ? (
                    <>
                        {/* Elder Selector (if multiple) */}
                        {elders.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
                                {elders.map((e, idx) => (
                                    <button
                                        key={e.id}
                                        onClick={() => setSelectedElderIndex(idx)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${idx === selectedElderIndex
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {e.nickname || e.elder?.nickname || e.elder?.full_name || `長輩 ${idx + 1}`}
                                        {e.is_primary && <span className="ml-1 text-xs opacity-70">★</span>}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all"
                                >
                                    + 新增長輩
                                </button>
                            </div>
                        )}

                        {/* Linked Elder Card - Premium Gradient */}
                        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 shadow-lg shadow-indigo-500/25 overflow-hidden text-white">
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner flex items-center justify-center border border-white/10 overflow-hidden">
                                        {currentElder?.avatar_url ? (
                                            <img src={currentElder.avatar_url} alt={currentElder.full_name || '長輩頭像'} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl">👴</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-indigo-100 text-sm font-medium mb-1">
                                            已連結長輩 {elders.length > 1 ? `(${selectedElderIndex + 1}/${elders.length})` : ''}
                                        </p>
                                        <h2 className="text-2xl font-bold tracking-tight">{currentElder?.full_name || currentElder?.nickname}</h2>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-baseline gap-2 bg-black/10 rounded-xl px-4 py-2 backdrop-blur-sm self-start md:self-auto">
                                        <span className="text-xs text-white/70 font-medium uppercase tracking-wider">本週比賽</span>
                                        <span className="text-xl font-bold">0 場</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-indigo-100 text-xs font-medium">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                        狀態良好
                                    </div>
                                </div>
                            </div>

                            {/* Unbind Button */}
                            <button
                                onClick={() => handleUnbind(currentElder?.id)}
                                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                title="解除綁定"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Background Decor */}
                            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 bg-purple-400/20 rounded-full blur-xl"></div>
                        </div>

                        {/* Add More Button (if only 1 elder) */}
                        {elders.length === 1 && (
                            <button
                                onClick={() => setShowScanner(true)}
                                disabled={isBinding}
                                className="w-full py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all"
                            >
                                {isBinding ? '綁定中...' : '+ 新增另一位長輩'}
                            </button>
                        )}
                    </>
                ) : (
                    /* Not Linked Alert */
                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 flex flex-col items-center text-center gap-4 animate-pulse-slow">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl">
                            🔗
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">尚未綁定長輩</h3>
                            <p className="text-gray-500 text-sm mt-1 mb-4">
                                請掃描長輩手機上的 QR Code 進行綁定，<br />以便隨時關心長輩動態。
                            </p>
                            <button
                                onClick={() => setShowScanner(true)}
                                disabled={isBinding}
                                className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isBinding ? '綁定中...' : '掃描 QR Code'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Dashboard Grid */}
                <div>
                    <h3 className="ml-1 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">功能選單</h3>
                    <div className="grid grid-cols-2 gap-4">

                        {/* Health Passbook */}
                        <Link href="/family/health" className="col-span-2 group bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-200 transition-all flex items-center gap-4">
                            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">健康 / 運動存摺</h4>
                                <p className="text-xs text-gray-500">追蹤長輩的活躍指標與健康趨勢</p>
                            </div>
                            <div className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </Link>

                        {/* Matches */}
                        <Link href="/family/matches" className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between h-40">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">比賽紀錄</h4>
                                <p className="text-xs text-gray-500 mt-1">查看詳細數據</p>
                            </div>
                        </Link>

                        {/* Photos */}
                        <Link href="/family/photos" className="group bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all flex flex-col justify-between h-40">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">精彩相簿</h4>
                                <p className="text-xs text-gray-500 mt-1">活動照片影片</p>
                            </div>
                        </Link>

                        {/* Shop - Featured */}
                        <Link href="/family/shop" className="col-span-2 group relative overflow-hidden bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl p-6 shadow-lg shadow-pink-500/20 text-white hover:shadow-pink-500/30 transition-all active:scale-[0.98]">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3">
                                        <span>🛍️</span>
                                        <span>兌換積分: {wallet?.local_points || 0} ｜ 榮譽積分: {wallet?.global_points || 0}</span>
                                    </div>
                                    <h4 className="text-2xl font-black">送禮給長輩</h4>
                                    <p className="text-pink-100 text-sm mt-1 max-w-[200px]">
                                        為 {currentElder?.nickname || currentElder?.full_name || '長輩'} 添購裝備，讓他在場上更神氣！
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl shadow-inner backdrop-blur-md">
                                    🎁
                                </div>
                            </div>
                            {/* Decor */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        </Link>

                        {/* Chat */}
                        <Link href="/family/messages" className="col-span-2 group bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">聊天室與通知</h4>
                                <p className="text-xs text-gray-500">查看最新消息</p>
                            </div>
                            <div className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </Link>
                    </div>
                </div>
            </main>

            {/* QR Scanner Modal */}
            <QRScanModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
                title="掃描長輩 QR Code 進行綁定"
            />
        </div>
    )
}

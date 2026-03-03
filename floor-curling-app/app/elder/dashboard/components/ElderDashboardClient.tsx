'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { QRCodeGenerator, generateElderQRContent } from '@/components/QRCode'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'
import AiAnalysisSection from '@/components/AiAnalysisSection'

interface ElderDashboardClientProps {
    user: any
    stats: any
    familyMembers: any[]
    inventory: any[]
    cheers: any[]
}

export default function ElderDashboardClient({
    user,
    stats,
    familyMembers,
    inventory,
}: ElderDashboardClientProps) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleCheckIn = async () => {
        if (!await confirm({ message: '發送「我已安全抵達」給家屬嗎？', confirmLabel: '發送' })) return

        try {
            const res = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'checkin',
                    content: '📍 我已安全抵達'
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '發送失敗')

            toast.success(`已通知 ${data.notified?.length || 0} 位家屬！`)
        } catch (error: any) {
            console.error(error)
            toast.error('報平安失敗，請稍後再試')
        }
    }

    const handleLogout = async () => {
        if (await confirm({ message: '確定要登出嗎？', confirmLabel: '登出', variant: 'danger' })) {
            await supabase.auth.signOut()
            router.push('/login')
        }
    }

    return (
        <div className="min-h-screen pb-24 space-y-6">
            {/* Glass Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-5 pt-12 pb-4 shadow-soft transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">長輩主頁</h1>
                        <p className="text-sm font-medium text-muted-foreground">歡迎回來，{user.user_metadata?.full_name}</p>
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
                                <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-5 space-y-6 animate-fade-in-up">

                {/* QR Code Card */}
                <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10"></div>
                    <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-card rounded-2xl shadow-soft border border-border/50 group-hover:scale-105 transition-transform duration-300">
                                <QRCodeGenerator
                                    value={generateElderQRContent(user.id)}
                                    size={200}
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">{user.user_metadata?.full_name || '長輩'}</h2>
                        <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                            請讓家屬掃描綁定
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <Link href="/elder/stats" className="block transform transition hover:scale-[1.02] active:scale-[0.98]">
                    <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 shadow-lg shadow-teal-500/20 overflow-hidden text-white">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <p className="text-teal-100 font-medium mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse"></span>
                                    本週健康存摺
                                </p>
                                <h3 className="text-4xl font-black tracking-tight mb-2">
                                    {stats?.weeklyMatches || 0}
                                    <span className="text-xl font-medium opacity-80 ml-1">場</span>
                                </h3>
                                <div className="inline-flex items-center gap-3 flex-wrap">
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold">
                                        🏅 榮譽積分 {stats?.globalPoints || 0}
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold">
                                        💰 兌換積分 {stats?.localPoints || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner text-3xl">
                                🏃
                            </div>
                        </div>
                        {/* Decor */}
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    </div>
                </Link>

                {/* AI 動作分析與處方 */}
                <AiAnalysisSection elderId={user.id} />

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleCheckIn}
                        className="bg-gradient-to-br from-[#34C759] to-[#2DB34C] hover:from-[#3eda65] hover:to-[#33cc55] active:scale-95 transition-all rounded-3xl p-5 shadow-lg shadow-green-500/20 text-white text-left group"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                            📍
                        </div>
                        <h3 className="font-bold text-lg leading-tight">報平安</h3>
                        <p className="text-green-100 text-xs mt-1 font-medium">通知家屬已抵達</p>
                    </button>

                    <Link
                        href="/elder/messages"
                        className="bg-gradient-to-br from-[#FF9500] to-[#FF8000] hover:from-[#ff9f1a] hover:to-[#ff8c1a] active:scale-95 transition-all rounded-3xl p-5 shadow-lg shadow-orange-500/20 text-white text-left group"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                            💬
                        </div>
                        <h3 className="font-bold text-lg leading-tight">聊天室</h3>
                        <p className="text-orange-100 text-xs mt-1 font-medium">查看最新訊息</p>
                    </Link>

                    <Link
                        href="/elder/matches"
                        className="bg-gradient-to-br from-[#AF52DE] to-[#9930D0] hover:from-[#b86ce0] hover:to-[#a340d8] active:scale-95 transition-all rounded-3xl p-5 shadow-lg shadow-purple-500/20 text-white text-left group"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                            🏆
                        </div>
                        <h3 className="font-bold text-lg leading-tight">比賽記錄</h3>
                        <p className="text-purple-100 text-xs mt-1 font-medium">查看歷史比賽</p>
                    </Link>

                    <Link
                        href="/elder/shop"
                        className="bg-gradient-to-br from-[#FF2D55] to-[#E0194E] hover:from-[#ff4368] hover:to-[#e82d5a] active:scale-95 transition-all rounded-3xl p-5 shadow-lg shadow-pink-500/20 text-white text-left group"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                            🛍️
                        </div>
                        <h3 className="font-bold text-lg leading-tight">積分商店</h3>
                        <p className="text-pink-100 text-xs mt-1 font-medium">兌換獎勵商品</p>
                    </Link>
                </div>

                {/* Inventory */}
                <div className="bg-card/80 backdrop-blur-md rounded-2xl p-6 shadow-card border border-border/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                            🎒 我的裝備
                        </h3>
                        <Link href="/elder/shop" className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors">
                            + 購買
                        </Link>
                    </div>

                    {inventory.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                            {inventory.map((item: any) => (
                                <div key={item.id} className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm p-2">
                                        {item.products?.image_url ? (
                                            <img src={item.products.image_url} alt={item.products.name || "Product Image"} className="w-full h-full object-contain drop-shadow-sm" />
                                        ) : (
                                            <span className="text-3xl">🛡️</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 text-center w-full truncate px-1">{item.products?.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm mb-2">尚無裝備</p>
                            <Link href="/elder/shop" className="text-blue-600 text-sm font-bold underline decoration-2 underline-offset-2">
                                去商店逛逛
                            </Link>
                        </div>
                    )}
                </div>

                {/* Family List */}
                <div className="bg-card/80 backdrop-blur-md rounded-2xl p-6 shadow-card border border-border/50">
                    <h3 className="font-bold text-foreground text-lg mb-4">已連結家屬</h3>
                    {familyMembers.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-gray-400 text-sm">還沒有家屬連結</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {familyMembers.map((member) => (
                                <div key={member.id} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm overflow-hidden p-0.5">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.full_name || "Family Member"} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">👤</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{member.full_name}</p>
                                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            連結中
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center text-xs text-muted-foreground pb-4 pt-2">
                    ID: {user.id.slice(0, 8)} • v2.0.0
                </div>
            </main>
        </div>
    )
}

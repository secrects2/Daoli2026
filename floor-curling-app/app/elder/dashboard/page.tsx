'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { QRCodeGenerator, generateElderQRContent } from '@/components/QRCode'

export default function ElderDashboard() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [user, setUser] = useState<any>(null)
    const [familyMembers, setFamilyMembers] = useState<any[]>([])
    const [cheers, setCheers] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [inventory, setInventory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)
            setLoading(false)
            // Fetch linked family members
            const { data: family } = await supabase.from('profiles').select('*').eq('linked_elder_id', user.id)
            if (family) setFamilyMembers(family)

            // Fetch recent cheers
            const { data: interactionData } = await fetch(`/api/interactions?userId=${user.id}`).then(res => res.json())
            if (interactionData?.interactions) setCheers(interactionData.interactions)

            // Fetch weekly stats
            const statsData = await fetch(`/api/elder/stats?id=${user.id}`).then(res => res.json())
            setStats(statsData)

            // Fetch inventory
            // Need a new API or just join via Supabase client directly
            const { data: inventoryData } = await supabase
                .from('inventory')
                .select('*, products(*)')
                .eq('user_id', user.id)
                .eq('status', 'active')

            if (inventoryData) setInventory(inventoryData)

            setLoading(false)
        }
        fetchUser()
    }, [router, supabase])

    const handleCheckIn = async () => {
        if (!confirm('發送「我已安全抵達」給家屬嗎？')) return

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

            alert(`已通知 ${data.notified?.length || 0} 位家屬！`)
        } catch (error: any) {
            console.error(error)
            alert('報平安失敗，請稍後再試')
        }
    }

    const handleLogout = async () => {
        if (confirm('確定要登出嗎？')) {
            await supabase.auth.signOut()
            router.push('/login')
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5">
                <div className="flex justify-between items-center">
                    <h1 className="ios-large-title">我的條碼</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogout}
                            className="text-sm text-red-500 font-medium bg-white/50 px-3 py-1 rounded-full border border-red-100"
                        >
                            登出
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-6">
                    <div className="flex justify-center">
                        <QRCodeGenerator
                            value={generateElderQRContent(user.id)}
                            size={250}
                            className="rounded-xl border-4 border-gray-100"
                        />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">{user.user_metadata?.full_name || '長輩'}</h2>
                        <p className="text-gray-500 text-sm mt-1">請家屬掃描此條碼進行綁定</p>
                    </div>
                </div>
            </div>

            {/* Weekly Activity Stat Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">本週健康存摺</p>
                        <h3 className="text-3xl font-bold flex items-baseline gap-2">
                            {stats?.weeklyMatches || 0}
                            <span className="text-lg font-normal opacity-80">場比賽</span>
                        </h3>
                        <p className="text-blue-100 text-xs mt-2">
                            累積榮譽積分: {stats?.totalPoints || 0}
                        </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                        <span className="text-3xl">🏃‍♂️</span>
                    </div>
                </div>
            </div>


            {/* My Equipment */}
            {
                inventory.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span>🎒</span> 我的裝備
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {inventory.map((item: any) => (
                                <div key={item.id} className="flex-shrink-0 w-24 flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-12 h-12 flex items-center justify-center">
                                        {item.products?.image_url ? (
                                            <img src={item.products.image_url} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-2xl">🛡️</span>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-center line-clamp-1">{item.products?.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Chat Link Action */}
            <Link
                href="/elder/messages"
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl p-4 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-3 mb-4"
            >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    💬
                </div>
                <div>
                    <h3 className="text-xl font-bold">聊天室</h3>
                    <p className="text-white/80 text-sm">與家人和店長聯絡</p>
                </div>
            </Link>

            {/* Safety Check-in Action */}
            <button
                onClick={handleCheckIn}
                className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-2xl p-4 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-3"
            >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    📍
                </div>
                <div>
                    <h3 className="text-xl font-bold">向家屬報平安</h3>
                    <p className="text-white/80 text-sm">我已安全抵達</p>
                </div>
            </button>

            {/* Latest Cheers */}
            {
                cheers.length > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 shadow-sm border border-orange-100">
                        <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                            <span>💌</span> 來自家人的鼓勵
                        </h3>
                        <div className="space-y-3">
                            {cheers.slice(0, 3).map((cheer: any) => (
                                <div key={cheer.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl">
                                        {cheer.content.split(' ')[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{cheer.content.split(' ')[1] || cheer.content}</p>
                                        <p className="text-xs text-gray-500">
                                            {cheer.sender?.full_name || '家人'} • {new Date(cheer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Linked Family Members */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">已綁定的家屬</h3>
                </div>
                {familyMembers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        尚無家屬綁定
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {familyMembers.map((member) => (
                            <div key={member.id} className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                                    {member.avatar_url ? (
                                        <img src={member.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{member.full_name || '家屬'}</p>
                                    <p className="text-xs text-gray-500">已綁定</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">我的資料</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">ID</span>
                            <span className="font-mono">{user.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">狀態</span>
                            <span className="text-green-600 font-medium">已登入 (LINE)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div >

    )
}

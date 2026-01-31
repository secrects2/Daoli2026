'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { QRCodeGenerator, generateElderQRContent } from '@/components/QRCode'

export default function ElderDashboard() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [user, setUser] = useState<any>(null)
    const [familyMembers, setFamilyMembers] = useState<any[]>([])
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
        }
        fetchUser()
    }, [router, supabase])

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5">
                <div className="flex justify-between items-end">
                    <h1 className="ios-large-title">我的條碼</h1>
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                        {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />}
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
            </div>
        </div>
    )
}

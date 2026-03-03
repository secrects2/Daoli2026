'use client'

import { createClientComponentClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface StoreInfo {
    id: string
    name: string
    address: string
    phone: string
    contact_name: string
}

export default function SettingsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)

    useEffect(() => {
        const fetchStoreInfo = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            // Get store_id from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('store_id')
                .eq('id', user.id)
                .single()

            if (profile?.store_id) {
                // Get store info
                const { data: store, error } = await supabase
                    .from('stores')
                    .select('id, name, address, phone, contact_name')
                    .eq('id', profile.store_id)
                    .single()

                if (store) {
                    setStoreInfo({
                        id: store.id,
                        name: store.name || '',
                        address: store.address || '',
                        phone: store.phone || '',
                        contact_name: store.contact_name || ''
                    })
                }
            } else {
                // Create a placeholder if no store id is linked (useful for admins/pharmacists without an assigned store yet)
                setStoreInfo({
                    id: '',
                    name: '',
                    address: '',
                    phone: '',
                    contact_name: ''
                })
            }
            setLoading(false)
        }
        fetchStoreInfo()
    }, [supabase])

    const handleSaveStoreInfo = async () => {
        if (!storeInfo) return
        setSaving(true)

        try {
            const { error } = await supabase
                .from('stores')
                .update({
                    address: storeInfo.address,
                    phone: storeInfo.phone,
                    contact_name: storeInfo.contact_name
                })
                .eq('id', storeInfo.id)

            if (error) throw error
            toast.success('店舖資料已更新！')
        } catch (error: any) {
            console.error('Update error:', error)
            toast.error('儲存失敗：' + error.message)
        } finally {
            setSaving(false)
        }
    }

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
                    className="text-primary flex items-center gap-1 text-[17px]"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回
                </button>
                <h1 className="font-semibold text-[17px]">設定</h1>
                <div className="w-[60px]" /> {/* Spacer for centering */}
            </div>

            <main className="p-4 space-y-6 max-w-lg mx-auto">
                {/* 店舖基本資料卡片 */}
                {loading ? (
                    <div className="bg-card rounded-xl p-6 text-center text-muted-foreground">載入中...</div>
                ) : storeInfo ? (
                    <div className="bg-card rounded-xl shadow-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <span>🏪</span> 店舖基本資料
                            </h2>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-mono">{storeInfo.id}</span>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">店舖名稱</label>
                                <input
                                    type="text"
                                    value={storeInfo.name}
                                    readOnly={!!storeInfo.id}
                                    onChange={(e) => !storeInfo.id && setStoreInfo({ ...storeInfo, name: e.target.value })}
                                    placeholder={!storeInfo.id ? "尚未綁定店舖" : ""}
                                    className={`w-full border rounded-lg px-3 py-2 ${storeInfo.id ? 'bg-background border-border text-gray-600 focus:outline-none' : 'bg-card border-gray-300 text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                                />
                                {storeInfo.id ? (
                                    <p className="text-[10px] text-muted-foreground mt-1">店名已固定，若需修改請聯繫總部</p>
                                ) : (
                                    <p className="text-[10px] text-orange-500 mt-1">目前為自由身份，尚未綁定店舖資訊</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">聯絡人</label>
                                <input
                                    type="text"
                                    value={storeInfo.contact_name}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, contact_name: e.target.value })}
                                    placeholder="例如：王小明 店長"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">連絡電話</label>
                                <input
                                    type="tel"
                                    value={storeInfo.phone}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                                    placeholder="02-23456789 或 0912-345678"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">地址</label>
                                <textarea
                                    value={storeInfo.address}
                                    onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                                    placeholder="完整地址"
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSaveStoreInfo}
                                disabled={saving || !storeInfo.id}
                                className="w-full bg-primary hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition-colors mt-2"
                            >
                                {saving ? "儲存中..." : "儲存資料"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-orange-50 rounded-xl p-6 text-center border-l-4 border-orange-400">
                        <p className="font-bold text-orange-800">未找到店舖資訊</p>
                        <p className="text-sm text-orange-600 mt-1">此帳號可能尚未綁定任何有效門市。</p>
                    </div>
                )}

                {/* 登出區塊 */}
                <div className="bg-red-50 rounded-xl overflow-hidden shadow-card mt-8">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 p-4 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-bold">登出帳戶</span>
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-4">
                    Floor Curling App v0.1.0
                </p>
            </main>
        </div>
    )
}


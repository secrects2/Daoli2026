'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { QRCodeGenerator } from '@/components/QRCode'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

export default function GenericElderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { confirm } = useConfirm()
    const [elder, setElder] = useState<any>(null)
    const [family, setFamily] = useState<any[]>([])
    const [equipment, setEquipment] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ totalMatches: 0, winRate: 0, globalPoints: 0, localPoints: 0 })
    const [mediaList, setMediaList] = useState<any[]>([])
    const [uploadingMedia, setUploadingMedia] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // UI States
    const [isEditing, setIsEditing] = useState(false)
    const [showBindingQR, setShowBindingQR] = useState(false)
    const [editData, setEditData] = useState({ nickname: '', notes: '' })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchElderData = async () => {
            if (!params.id) return

            // 1. Fetch Profile & Wallet
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', params.id)
                .single()

            if (!profile) {
                toast.error('查無此長輩')
                router.push('/pharmacist/elders')
                return
            }

            const { data: wallet } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', params.id)
                .single()

            setElder({ ...profile, globalPoints: wallet?.global_points || 0, localPoints: wallet?.local_points || 0 })

            // 2. Fetch Linked Family
            const { data: familyMembers } = await supabase
                .from('profiles')
                .select('*')
                .eq('linked_elder_id', params.id)

            setFamily(familyMembers || [])

            // 3. Fetch Stats (Matches)
            const { count: matchCount } = await supabase
                .from('user_interactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', params.id)
                .eq('interaction_type', 'match_result')

            const { count: winCount } = await supabase
                .from('user_interactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', params.id)
                .eq('interaction_type', 'match_result')
                .eq('data->>result', 'win')

            setStats({
                totalMatches: matchCount || 0,
                winRate: matchCount ? Math.round((winCount || 0) / matchCount * 100) : 0,
                globalPoints: wallet?.global_points || 0,
                localPoints: wallet?.local_points || 0
            })

            // 4. Fetch Equipment (Simulated via Point Transactions)
            const allProducts = [
                { id: 1, name: '專業冰壺推桿', icon: '🏑', price: 500 },
                { id: 2, name: '防滑運動手套', icon: '🧤', price: 200 },
                { id: 3, name: '能量營養棒', icon: '🍫', price: 150 },
                { id: 4, name: '紀念毛巾', icon: '🧣', price: 300 },
            ]

            const { data: transactions } = await supabase
                .from('point_transactions')
                .select('description')
                .eq('wallet_id', wallet?.id)
                .eq('type', 'spent')

            const ownedProductIds = new Set()
            transactions?.forEach(t => {
                allProducts.forEach(p => {
                    if (t.description?.includes(p.name)) {
                        ownedProductIds.add(p.id)
                    }
                })
            })

            setEquipment(allProducts.map(p => ({
                ...p,
                owned: ownedProductIds.has(p.id)
            })))


            // 5. Fetch Media Library
            const { data: media } = await supabase
                .from('media_library')
                .select('*')
                .eq('elder_id', params.id)
                .order('created_at', { ascending: false })

            setMediaList(media || [])

            setLoading(false)
        }
        fetchElderData()
    }, [params.id, supabase, router])

    if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">載入中...</div>
    if (!elder) return null

    // Media Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]

        // 1. Validate
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            toast.error('檔案太大，請小於 50MB')
            return
        }

        setUploadingMedia(true)
        try {
            // 2. Upload to Storage
            // Path: {store_id}/{elder_id}/{date}/{filename}
            const dateStr = new Date().toISOString().split('T')[0]
            const storeId = elder.store_id || 'unknown_store'
            const storagePath = `${storeId}/${elder.id}/${dateStr}/${Date.now()}_${file.name}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('media')
                .upload(storagePath, file)

            if (uploadError) throw uploadError

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(storagePath)

            // 4. Insert into DB
            const isVideo = file.type.startsWith('video')
            const { data: newMedia, error: dbError } = await supabase
                .from('media_library')
                .insert({
                    elder_id: elder.id,
                    storage_path: storagePath,
                    public_url: publicUrl,
                    title: file.name,
                    type: isVideo ? 'video' : 'photo',
                    created_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select()
                .single()

            if (dbError) throw dbError

            // 5. Update UI
            setMediaList(prev => [newMedia, ...prev])
            toast.success('上傳成功！')
        } catch (err: any) {
            console.error('Upload failed:', err)
            toast.error('上傳失敗: ' + err.message)
        } finally {
            setUploadingMedia(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Unbind Handler
    const handleUnbind = async () => {
        if (!await confirm({ message: '確定要將此長輩從您的店鋪移除嗎？\n此操作無法復原。', confirmLabel: '移除', variant: 'danger' })) return

        try {
            const res = await fetch(`/api/pharmacist/elders/${params.id}`, {
                method: 'DELETE',
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            toast.success('移除成功')
            router.push('/pharmacist/elders')
        } catch (err: any) {
            toast.error('移除失敗: ' + err.message)
        }
    }

    // Update Handler
    const handleUpdate = async () => {
        try {
            const res = await fetch(`/api/pharmacist/elders/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            // Update local state
            setElder((prev: any) => ({ ...prev, nickname: editData.nickname, notes: editData.notes })) // notes might be missing in schema but let's assume
            setIsEditing(false)
            toast.success('更新成功')
        } catch (err: any) {
            toast.error('更新失敗: ' + err.message)
        }
    }

    if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">載入中...</div>
    if (!elder) return null

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Nav */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/pharmacist/elders" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        &larr; 返回長輩名單
                    </Link>
                    <div className="flex gap-2">
                        {/* Binding QR Modal */}
                        {showBindingQR && (
                            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowBindingQR(false)}>
                                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-6" onClick={e => e.stopPropagation()}>
                                    <h3 className="text-xl font-bold text-gray-900">家屬綁定 QR Code</h3>
                                    <div className="flex justify-center">
                                        <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50">
                                            {/* Import QRCodeGenerator at top if not present, but it's not imported yet. I need to add import. */}
                                            {/* Assuming QRCodeGenerator is available or I might need to add import in a separate step or just assume dynamic import. 
                                                Wait, looking at my previous view_file, QRCodeGenerator was NOT imported in this file. 
                                                I need to add the import first or use a robust way. 
                                                I will add the import in a separate edit or try to do it all here if I can match the top of file.
                                                Multi-edit is risky if I don't see the top lines. 
                                                I'll finish this edit then add import.
                                            */}
                                            <QRCodeGenerator value={JSON.stringify({ type: 'bind_elder', elderId: elder.id })} size={200} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{elder.nickname || elder.full_name}</p>
                                        <p className="text-sm text-gray-500 mt-2">請家屬開啟「家屬入口」掃描此條碼</p>
                                    </div>
                                    <button
                                        onClick={() => setShowBindingQR(false)}
                                        className="w-full py-3 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200"
                                    >
                                        關閉
                                    </button>

                                    <div className="border-t border-gray-100 pt-4 mt-2">
                                        <p className="text-xs text-gray-500 mb-2">或是分享連結給不在現場的家屬：</p>
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/family/bind?elderId=${elder.id}`
                                                navigator.clipboard.writeText(link)
                                                toast.success('連結已複製！請傳送給家屬')
                                            }}
                                            className="w-full py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex items-center justify-center gap-2"
                                        >
                                            <span>📋</span> 複製線上綁定連結
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setShowBindingQR(true)}
                            className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                            <span>🔗</span> 綁定家屬
                        </button>
                        <button
                            onClick={() => {
                                setEditData({ nickname: elder.nickname || '', notes: elder.notes || '' })
                                setIsEditing(true)
                            }}
                            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                            ✏️ 編輯
                        </button>
                        <button
                            onClick={handleUnbind}
                            className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                            🗑️ 移除
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center md:items-start relative">
                    {/* Edit Modal / Overlay */}
                    {isEditing && (
                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col justify-center items-center">
                            <h3 className="font-bold text-lg mb-4">編輯資料</h3>
                            <div className="w-full max-w-sm space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">暱稱</label>
                                    <input
                                        type="text"
                                        value={editData.nickname}
                                        onChange={e => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end mt-4">
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                                    <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-lg">儲存</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <img
                        src={elder.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + elder.id}
                        className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg"
                        alt="Avatar"
                    />
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {elder.nickname ? `${elder.nickname} (${elder.full_name})` : elder.full_name}
                            </h1>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Active</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            ID: <span className="font-mono">{elder.id.slice(0, 8)}</span>
                        </p>
                        <p className="text-gray-500 text-sm">
                            加入時間：{new Date(elder.created_at).toLocaleDateString('zh-TW')}
                        </p>
                    </div>
                    {/* Key Stat Big Number */}
                    <div className="flex gap-3">
                        <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100 min-w-[100px]">
                            <p className="text-amber-600 text-xs font-bold uppercase mb-1">🏅 榮譽積分</p>
                            <p className="text-3xl font-mono font-black text-amber-600">{stats.globalPoints}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100 min-w-[100px]">
                            <p className="text-green-600 text-xs font-bold uppercase mb-1">💰 兌換積分</p>
                            <p className="text-3xl font-mono font-black text-green-600">{stats.localPoints}</p>
                        </div>
                    </div>
                </div>

                {/* Additional Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Health/Notes */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span>📋</span> 健康與備註
                        </h3>
                        <div className="space-y-4">
                            {/* Static health info (mocked for now) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">緊急聯絡人</p>
                                    <p className="font-medium">王曉明 (兒子)</p>
                                    <p className="text-sm text-blue-600">0988-888-888</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">健康注意事項</p>
                                    <p className="font-medium text-red-600">高血壓、膝蓋舊傷</p>
                                </div>
                            </div>
                            {/* Notes from Profile or Mocked */}
                            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg">
                                💡 備註：{elder.notes || '尚無備註'}
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">生涯戰績</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                <span className="text-gray-500">總場次</span>
                                <span className="font-bold text-xl">{stats.totalMatches}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                <span className="text-gray-500">勝率</span>
                                <span className={`font-bold text-xl ${stats.winRate > 50 ? 'text-red-500' : 'text-gray-700'}`}>
                                    {stats.winRate}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">排名</span>
                                <span className="font-bold text-xl text-yellow-600">Top 10%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Equipment Inventory */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🎒</span> 裝備庫與成就
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {equipment.map(item => (
                            <div
                                key={item.id}
                                className={`
                                    relative p-4 rounded-xl border text-center transition-all
                                    ${item.owned
                                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200 shadow-sm'
                                        : 'bg-gray-50 border-gray-100 opacity-60 grayscale'
                                    }
                                `}
                            >
                                <div className="text-4xl mb-2">{item.icon}</div>
                                <p className={`text-sm font-bold ${item.owned ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {item.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {item.owned ? '已擁有' : '未解鎖'}
                                </p>
                                {item.owned && (
                                    <div className="absolute top-2 right-2 text-green-500">
                                        ✓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Media Gallery */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span>�</span> 此長輩的比賽影片與照片
                        </h3>
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,video/*"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingMedia}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {uploadingMedia ? '上傳中...' : (
                                    <>
                                        <span>📤</span> 上傳影像
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {mediaList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">尚無上傳紀錄</p>
                            <p className="text-xs text-gray-400 mt-1">點擊右上角按鈕上傳比賽影片或照片</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {mediaList.map((media) => (
                                <div key={media.id} className="group relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-200">
                                    {media.type === 'video' ? (
                                        <video
                                            src={media.public_url}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            controls
                                        />
                                    ) : (
                                        <img src={media.public_url} className="w-full h-full object-cover" />
                                    )}

                                    {/* Type Badge */}
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
                                        {media.type === 'video' ? 'VIDEO' : 'PHOTO'}
                                    </div>

                                    {/* Date Overlay */}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pointer-events-none">
                                        <p className="text-white text-xs truncate">{media.title}</p>
                                        <p className="text-gray-300 text-[10px]">{new Date(media.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>
        </div>
    )
}

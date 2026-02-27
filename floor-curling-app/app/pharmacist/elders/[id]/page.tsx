'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { QRCodeGenerator } from '@/components/QRCode'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'
import MetricDetailModal from '@/components/MetricDetailModal'

import { getAiPrescription } from '@/lib/ai-diagnosis'

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
    const [aiSessions, setAiSessions] = useState<any[]>([])
    const [uploadingMedia, setUploadingMedia] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeModal, setActiveModal] = useState<string | null>(null)
    const [healthData, setHealthData] = useState<any>(null)

    // UI States
    const [isEditing, setIsEditing] = useState(false)
    const [showBindingQR, setShowBindingQR] = useState(false)
    const [editData, setEditData] = useState({ nickname: '', notes: '', emergency_contact_name: '', emergency_contact_phone: '', health_notes: '' })

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

            // 3. Fetch Stats (Matches) - 從 matches 表查詢
            const { data: matchesData } = await supabase
                .from('matches')
                .select('id, winner_color, red_team_elder_id, yellow_team_elder_id')
                .or(`red_team_elder_id.eq.${params.id},yellow_team_elder_id.eq.${params.id}`)

            const totalMatches = matchesData?.length || 0
            const winCount = (matchesData || []).filter(m => {
                const isRed = m.red_team_elder_id === params.id
                return (isRed && m.winner_color === 'red') || (!isRed && m.winner_color === 'yellow')
            }).length

            setStats({
                totalMatches,
                winRate: totalMatches ? Math.round(winCount / totalMatches * 100) : 0,
                globalPoints: wallet?.global_points || 0,
                localPoints: wallet?.local_points || 0
            })

            // 4. Fetch Equipment (Simulated via Point Transactions)
            const allProducts = [
                { id: 1, name: '專業滾球輔具', icon: '🎯', price: 500 },
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

            // 6. Fetch AI Training Sessions
            const { data: sessions } = await supabase
                .from('training_sessions')
                .select('*')
                .eq('elder_id', params.id)
                .order('created_at', { ascending: false })

            setAiSessions(sessions || [])

            // 7. Fetch health metrics
            try {
                const healthRes = await fetch(`/api/elder/stats?id=${params.id}`)
                const healthJson = await healthRes.json()
                setHealthData(healthJson)
            } catch (e) { console.error('Health metrics fetch failed', e) }

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

    // Unbind Handler — 需二次輸入長者姓名確認
    const handleUnbind = async () => {
        const elderName = elder.nickname || elder.full_name || ''
        const input = window.prompt(`⚠️ 危險操作！此操作無法復原。\n\n請輸入此長輩的姓名「${elderName}」以確認移除：`)
        if (input === null) return // 使用者按取消
        if (input.trim() !== elderName.trim()) {
            toast.error('姓名不符，取消移除')
            return
        }

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
            setElder((prev: any) => ({ ...prev, ...editData }))
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
                            <div className="fixed inset-0 z-[100] bg-black/80 flex items-start justify-center pt-20 px-4 pb-10 overflow-y-auto" onClick={() => setShowBindingQR(false)}>
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
                                setEditData({
                                    nickname: elder.nickname || '',
                                    notes: elder.notes || '',
                                    emergency_contact_name: elder.emergency_contact_name || '',
                                    emergency_contact_phone: elder.emergency_contact_phone || '',
                                    health_notes: elder.health_notes || ''
                                })
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
                        <div className="absolute inset-x-0 inset-y-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 flex flex-col justify-start items-center overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4 mt-2">編輯資料</h3>
                            <div className="w-full md:w-[400px] space-y-4 pb-16 text-left">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">暱稱</label>
                                    <input
                                        type="text"
                                        value={editData.nickname}
                                        onChange={e => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">緊急聯絡人姓名</label>
                                    <input
                                        type="text"
                                        value={editData.emergency_contact_name}
                                        onChange={e => setEditData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="例如：王曉明 (兒子)"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">緊急聯絡人電話</label>
                                    <input
                                        type="text"
                                        value={editData.emergency_contact_phone}
                                        onChange={e => setEditData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="例如：0912-345-678"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">健康注意事項</label>
                                    <input
                                        type="text"
                                        value={editData.health_notes}
                                        onChange={e => setEditData(prev => ({ ...prev, health_notes: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="例如：高血壓、糖尿病"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">一般備註</label>
                                    <input
                                        type="text"
                                        value={editData.notes}
                                        onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
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
                            {/* Dynamic health info from database */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">緊急聯絡人</p>
                                    <p className="font-medium">{elder.emergency_contact_name || '無'}</p>
                                    <p className="text-sm text-blue-600">{elder.emergency_contact_phone || '無電話資料'}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">健康注意事項</p>
                                    <p className="font-medium text-red-600">{elder.health_notes || '無'}</p>
                                </div>
                            </div>
                            {/* Notes from Profile */}
                            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg">
                                💡 備註：{elder.notes || '尚無備註'}
                            </div>
                        </div>
                    </div>

                    {/* 暫時隱藏地壺球生涯戰績
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
                    */}
                </div>

                {/* Health Metrics Dashboard */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>❤️</span> 健康存摺
                    </h3>
                    {healthData?.healthMetrics ? (() => {
                        const hm = healthData.healthMetrics
                        const today = hm.today || {}
                        const getModalData = (key: string) => hm.history?.map((h: any) => ({ date: h.date, value: h[key] })) || []
                        return (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <button onClick={() => setActiveModal('steps')} className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-left hover:shadow-md transition-all active:scale-[0.97]">
                                        <p className="text-xs font-bold text-gray-500 mb-1">今日步數</p>
                                        <p className="text-2xl font-black text-gray-900">{(today.steps || 0).toLocaleString()} <span className="text-xs text-gray-400">步</span></p>
                                        {today.stepsTrend !== undefined && <p className={`text-[10px] font-bold mt-1 ${today.stepsTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>{today.stepsTrend >= 0 ? '↑' : '↓'} {Math.abs(today.stepsTrend)}%</p>}
                                    </button>
                                    <button onClick={() => setActiveModal('heartRate')} className="p-4 bg-red-50 rounded-xl border border-red-100 text-left hover:shadow-md transition-all active:scale-[0.97]">
                                        <p className="text-xs font-bold text-gray-500 mb-1">平均心率</p>
                                        <p className="text-2xl font-black text-gray-900">{today.heartRate || 0} <span className="text-xs text-gray-400">bpm</span></p>
                                    </button>
                                    <button onClick={() => setActiveModal('ranking')} className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-left hover:shadow-md transition-all active:scale-[0.97]">
                                        <p className="text-xs font-bold text-gray-500 mb-1">全國排名</p>
                                        <p className="text-2xl font-black text-gray-900">{today.ranking || 0} <span className="text-xs text-gray-400">名</span></p>
                                        {today.rankChange > 0 && <p className="text-[10px] font-bold text-green-500 mt-1">↑ 上升{today.rankChange}名</p>}
                                    </button>
                                    <button onClick={() => setActiveModal('calories')} className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-left hover:shadow-md transition-all active:scale-[0.97]">
                                        <p className="text-xs font-bold text-gray-500 mb-1">消耗熱量</p>
                                        <p className="text-2xl font-black text-gray-900">{today.calories || 0} <span className="text-xs text-gray-400">kcal</span></p>
                                        {today.caloriesTrend !== undefined && <p className={`text-[10px] font-bold mt-1 ${today.caloriesTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>{today.caloriesTrend >= 0 ? '↑' : '↓'} {Math.abs(today.caloriesTrend)}%</p>}
                                    </button>
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <p className="text-xs font-bold text-gray-500 mb-1">連續運動</p>
                                        <p className="text-2xl font-black text-gray-900">{today.consecutiveDays || 0} <span className="text-xs text-gray-400">天</span></p>
                                        {(today.consecutiveDays || 0) >= 7 && <p className="text-[10px] font-bold text-green-500 mt-1">達標！</p>}
                                    </div>
                                </div>

                                {/* Modals */}
                                <MetricDetailModal isOpen={activeModal === 'steps'} onClose={() => setActiveModal(null)} title="今日步數" unit="步" color="#3B82F6" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>} data={getModalData('steps')} chartType="bar" />
                                <MetricDetailModal isOpen={activeModal === 'heartRate'} onClose={() => setActiveModal(null)} title="平均心率" unit="bpm" color="#EF4444" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>} data={getModalData('heartRate')} chartType="line" />
                                <MetricDetailModal isOpen={activeModal === 'calories'} onClose={() => setActiveModal(null)} title="消耗熱量" unit="kcal" color="#F97316" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>} data={getModalData('calories')} chartType="bar" />
                                <MetricDetailModal isOpen={activeModal === 'ranking'} onClose={() => setActiveModal(null)} title="全國排名" unit="名" color="#EAB308" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>} data={getModalData('steps')} chartType="line" />
                            </>
                        )
                    })() : (
                        <p className="text-gray-400 text-sm text-center py-4">載入中...</p>
                    )}
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

                {/* AI Analysis & Prescription Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🤖</span> AI 動作分析與處方
                    </h3>

                    {aiSessions.length > 0 ? (
                        <div className="space-y-6">
                            {/* Latest Prescription Card */}
                            <div className={`p-5 rounded-xl border-l-4 shadow-sm ${getAiPrescription(aiSessions[0].metrics || {}).color}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg">{getAiPrescription(aiSessions[0].metrics || {}).title}</h4>
                                    <span className="text-xs opacity-75">{new Date(aiSessions[0].created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm opacity-90">{getAiPrescription(aiSessions[0].metrics || {}).content}</p>

                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-black/5">
                                    <div className="text-center">
                                        <p className="text-xs opacity-70">手肘 ROM</p>
                                        <p className="font-black text-xl">{aiSessions[0].metrics?.avg_rom || '--'}°</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs opacity-70">軀幹穩定</p>
                                        <p className="font-black text-xl">{aiSessions[0].metrics?.avg_trunk_tilt || '--'}°</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs opacity-70">穩定率</p>
                                        <p className="font-black text-xl">{aiSessions[0].metrics?.stable_ratio || 0}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* AI Smart Recommendation */}
                            <div className="p-5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 text-7xl opacity-5">💡</div>
                                <h4 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2 relative z-10">
                                    <span>✨</span> AI 智能推薦
                                </h4>
                                <p className="text-sm text-indigo-800 mb-4 relative z-10 font-medium tracking-wide">
                                    根據您的AI處方分析結果，我們為您推薦最適合的產品組合：
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                    {getAiPrescription(aiSessions[0].metrics || {}).recommendedProducts?.map((product, idx) => (
                                        <div key={idx} className="bg-white/90 backdrop-blur-sm p-3 rounded-xl flex items-center gap-3 shadow-sm border border-indigo-50 hover:border-indigo-200 transition-all cursor-pointer group">
                                            <div className="text-3xl bg-indigo-50/50 w-12 h-12 flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform">{product.icon}</div>
                                            <div>
                                                <p className="font-bold text-gray-900">{product.name}</p>
                                                <p className="text-xs text-gray-600 mt-0.5">{product.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* History List */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <h5 className="text-sm font-bold text-gray-500">歷史檢測紀錄</h5>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => {
                                                // 學術級 CSV：受試者 + 後設 + 生物力學 + 神經學 + AI 診斷
                                                const headers = [
                                                    '受試者代碼(ID)', '受試者姓名', '據點/店家',
                                                    '檢測日期時間', '訓練時長(秒)', '投擲次數(次)',
                                                    '手肘ROM平均(°)', '手肘ROM最大(°)', '手肘ROM最小(°)',
                                                    '軀幹穩定度平均(°)', '出手速度平均(歸一化)', '動作穩定率(%)',
                                                    '中軸穩定度(°)', '肩角速度平均(°/s)', '肘角速度平均(°/s)', '腕角速度平均(°/s)',
                                                    '震顫檢出率(%)', '震顫頻率平均(Hz)', '代償動作檢出率(%)', '代償類型',
                                                    '坐姿修正量平均(°)', 'AI處方等級',
                                                ]
                                                const elderName = elder.nickname || elder.full_name || '未知'
                                                const storeName = elder.store_id || '未知'
                                                const elderId = (params.id as string).slice(0, 8)
                                                const rows = aiSessions.map((s: any) => {
                                                    const m = s.metrics || {}
                                                    const dt = new Date(s.created_at)
                                                    const dateStr = `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`
                                                    const px = getAiPrescription(m)
                                                    return [
                                                        elderId, elderName, storeName, dateStr,
                                                        s.duration_seconds ?? '',
                                                        m.throw_count ?? '',
                                                        m.avg_rom ?? m.elbow_rom ?? '',
                                                        m.max_rom ?? '',
                                                        m.min_rom ?? '',
                                                        m.avg_trunk_tilt ?? m.trunk_stability ?? '',
                                                        m.avg_velocity ?? '',
                                                        m.stable_ratio ?? '',
                                                        m.core_stability_angle ?? '',
                                                        m.avg_shoulder_angular_vel ?? '',
                                                        m.avg_elbow_angular_vel ?? '',
                                                        m.avg_wrist_angular_vel ?? '',
                                                        m.tremor_detected_ratio ?? '',
                                                        m.tremor_avg_frequency ?? '',
                                                        m.compensation_detected_ratio ?? '',
                                                        Array.isArray(m.compensation_types) ? m.compensation_types.join(';') : '',
                                                        m.posture_correction_avg ?? '',
                                                        px.title || '',
                                                    ].map(v => `"${v}"`).join(',')
                                                })
                                                const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n')
                                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                                const url = URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `boccia_batch_${(params.id as string).slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`
                                                a.click()
                                                URL.revokeObjectURL(url)
                                                toast.success('CSV 下載成功')
                                            }}
                                            className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                        >
                                            📄 批次下載 CSV
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!await confirm({ message: `確定要清除此長輩的所有 ${aiSessions.length} 筆 AI 檢測紀錄嗎？\n此操作無法復原。`, confirmLabel: '清除', variant: 'danger' })) return
                                                try {
                                                    // 逐一刪除
                                                    for (const s of aiSessions) {
                                                        await supabase.from('training_sessions').delete().eq('id', s.id)
                                                    }
                                                    setAiSessions([])
                                                    toast.success('已清除所有檢測紀錄')
                                                } catch (err: any) {
                                                    toast.error('清除失敗: ' + err.message)
                                                }
                                            }}
                                            className="text-xs bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                        >
                                            🗑️ 清除紀錄
                                        </button>
                                    </div>
                                </div>
                                {aiSessions.slice(1, 4).map(session => (
                                    <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div>
                                            <p className="font-bold text-sm">{new Date(session.created_at).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">
                                                ROM: {session.metrics?.avg_rom}° | 穩定: {session.metrics?.avg_trunk_tilt}°
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getAiPrescription(session.metrics).color.includes('green') ? 'bg-green-100 text-green-700' :
                                                getAiPrescription(session.metrics).color.includes('red') ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {getAiPrescription(session.metrics).title.split(' ')[1]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">尚無 AI 檢測紀錄</p>
                            <Link href="/pharmacist/ai-test" className="text-blue-600 font-bold text-sm mt-2 inline-block hover:underline">
                                前往進行檢測 &rarr;
                            </Link>
                        </div>
                    )}
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

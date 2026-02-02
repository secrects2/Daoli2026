'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function FamilyPhotosPage() {
    const router = useRouter()
    const [viewingPhoto, setViewingPhoto] = useState<any>(null)
    const [mediaList, setMediaList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchData = async () => {
            // 1. Get Current User
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // 2. Get Profile to find linked elder
            const { data: profile } = await supabase
                .from('profiles')
                .select('linked_elder_id')
                .eq('id', user.id)
                .single()

            if (!profile?.linked_elder_id) {
                setLoading(false)
                return
            }

            // 3. Fetch Media
            const { data: media } = await supabase
                .from('media_library')
                .select('*')
                .eq('elder_id', profile.linked_elder_id)
                .order('created_at', { ascending: false })

            setMediaList(media || [])
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    // Group by Date
    const groupedMedia = mediaList.reduce((acc, item) => {
        const date = new Date(item.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
        if (!acc[date]) acc[date] = []
        acc[date].push(item)
        return acc
    }, {} as Record<string, any[]>)

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
                    <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold">比賽精彩時刻</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-8">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">載入中...</div>
                ) : mediaList.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-4xl mb-2">📷</p>
                        尚未有比賽紀錄
                    </div>
                ) : (
                    Object.entries(groupedMedia).map(([date, items]) => (
                        <div key={date}>
                            <h3 className="sticky top-16 z-0 bg-gray-50/90 backdrop-blur-sm py-2 px-1 text-sm font-bold text-gray-500 mb-2">
                                {date}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {(items as any[]).map((p: any) => (
                                    <div
                                        key={p.id}
                                        className="aspect-square bg-black rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group shadow-sm border border-gray-200"
                                        onClick={() => p.type === 'photo' ? setViewingPhoto(p) : null}
                                    >
                                        {p.type === 'video' ? (
                                            <video src={p.public_url} className="w-full h-full object-cover" controls />
                                        ) : (
                                            <img src={p.public_url} className="w-full h-full object-cover" />
                                        )}

                                        {p.type === 'video' && (
                                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                                                PLAY
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox for Photos */}
            {viewingPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setViewingPhoto(null)}
                >
                    <button className="absolute top-4 right-4 text-white p-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={viewingPhoto.public_url}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                    <div className="absolute bottom-10 text-white text-center">
                        <p className="font-bold">{viewingPhoto.title}</p>
                        <p className="text-sm opacity-80">{new Date(viewingPhoto.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

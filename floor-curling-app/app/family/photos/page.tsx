'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FamilyPhotosPage() {
    const router = useRouter()
    const [viewingPhoto, setViewingPhoto] = useState<number | null>(null)

    // Fake photos
    const photos = [1, 2, 3, 4, 5, 6].map(i => ({
        id: i,
        url: `https://picsum.photos/seed/${i + 100}/800/800`,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('zh-TW')
    }))

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
                    <h1 className="text-lg font-bold">照片與影片</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4">
                {photos.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        尚無照片
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map(p => (
                            <div
                                key={p.id}
                                className="aspect-square bg-gray-200 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                                onClick={() => setViewingPhoto(p.id)}
                            >
                                <img src={p.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                    {p.date}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {viewingPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                    onClick={() => setViewingPhoto(null)}
                >
                    <button className="absolute top-4 right-4 text-white p-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img
                        src={photos.find(p => p.id === viewingPhoto)?.url}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    )
}

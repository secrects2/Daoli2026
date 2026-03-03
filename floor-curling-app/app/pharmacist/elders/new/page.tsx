'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateElderPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const data = {
            full_name: formData.get('full_name'),
            nickname: formData.get('nickname'),
            notes: formData.get('notes'),
        }

        try {
            const res = await fetch('/api/pharmacist/elders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            // Success! Redirect to the new elder's detail page
            router.push(`/pharmacist/elders/${result.elderId}`)
        } catch (err: any) {
            setError(err.message || '新增失敗')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="bg-card border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
                    <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground mr-4">
                        &larr; 返回
                    </button>
                    <h1 className="text-xl font-bold text-foreground">新增長輩 (手動註冊)</h1>
                </div>
            </div>

            <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
                <div className="bg-card rounded-2xl shadow-card border border-border/50 p-8">
                    <div className="mb-8 text-center">
                        <span className="text-4xl mb-2 block">👴</span>
                        <h2 className="text-2xl font-bold text-foreground">建立新長輩帳號</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            此功能適用於**沒有手機**的長輩。<br />
                            系統將自動建立帳號，請您隨後協助列印 QR Code 給長輩。
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium">
                                ❌ {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                                真實姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="full_name"
                                name="full_name"
                                required
                                placeholder="例如：王大明"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                                暱稱 (選填)
                            </label>
                            <input
                                type="text"
                                id="nickname"
                                name="nickname"
                                placeholder="例如：大明伯"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                                備註 / 健康狀況 (選填)
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                placeholder="例如：行動不便，需要攙扶..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-1/3 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-background transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-2/3 py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        建立中...
                                    </>
                                ) : (
                                    '確認新增'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}

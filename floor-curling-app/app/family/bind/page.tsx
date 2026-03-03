'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

function BindingContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const elderId = searchParams.get('elderId')
    const [elder, setElder] = useState<any>(null)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [binding, setBinding] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            if (!elderId) {
                setError('無效的連結：缺少 Elder ID')
                setLoading(false)
                return
            }

            // 1. Check User Auth
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                // If not logged in, redirect to login with return URL
                // Encode the current URL as returnTo
                const returnUrl = encodeURIComponent(`/family/bind?elderId=${elderId}`)
                router.push(`/login?returnTo=${returnUrl}`)
                return
            }
            setUser(user)

            // 2. Fetch Elder Info (Public or minimal info for confirmation)
            // We might need a specific API for this if RLS blocks reading profiles directly
            // But let's try reading profile first. If RLS blocks, we might need a dedicated endpoint.
            const { data: elderProfile, error: elderError } = await supabase
                .from('profiles')
                .select('nickname, full_name, id')
                .eq('id', elderId)
                .single()

            if (elderError || !elderProfile) {
                // Try fetching via API if RLS fails (likely due to strict RLS)
                // For now, let's assume we might fail and handle it or implementation a simple API lookup
                console.error('Fetch Elder Error:', elderError)
                setError('找不到該長輩資料或連結已失效')
            } else {
                setElder(elderProfile)
            }
            setLoading(false)
        }
        init()
    }, [elderId, router, supabase])

    const handleBind = async () => {
        if (!elderId || !user) return

        setBinding(true)
        try {
            // Re-use the existing POST API but adapt it or creating a new server action/endpoint
            // The existing API expects { qrContent } which is JSON stringified.
            // We can construct a fake QR content or update the API to verify elderId directly.
            // Let's just construct the QR content structure since the API parses it:
            // qrContent = JSON.stringify({ type: 'bind_elder', elderId: elderId })

            const fakeQrContent = JSON.stringify({ type: 'bind_elder', elderId: elderId })

            const res = await fetch('/api/family/bind', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrContent: fakeQrContent })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error)

            toast.success('綁定成功！')
            router.push('/family/portal')
        } catch (err: any) {
            toast.error('綁定失敗: ' + err.message)
            setBinding(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-card p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h1 className="text-xl font-bold text-foreground mb-2">無法進行綁定</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button onClick={() => router.push('/')} className="w-full py-3 bg-muted rounded-xl font-bold text-gray-700">回首頁</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-card p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-4xl">
                    🔗
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-foreground">確認綁定長輩</h1>
                    <p className="text-muted-foreground mt-2">您即將綁定以下長輩帳號：</p>
                </div>

                <div className="bg-primary/10 p-6 rounded-xl border border-blue-100">
                    <p className="text-3xl font-bold text-blue-800 mb-1">
                        {elder?.nickname || elder?.full_name}
                    </p>
                    <p className="text-sm text-primary font-mono">ID: {elder?.id?.slice(0, 8)}</p>
                </div>

                <p className="text-sm text-muted-foreground">
                    綁定後，您將可以查看長輩的健康數據、比賽照片與積分紀錄。
                </p>

                <div className="space-y-3 pt-2">
                    <button
                        onClick={handleBind}
                        disabled={binding}
                        className="w-full py-3 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {binding ? '綁定中...' : '確認綁定'}
                    </button>
                    <button
                        onClick={() => router.push('/family/portal')}
                        className="w-full py-3 bg-card border border-border text-gray-600 hover:bg-background rounded-xl font-medium"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function FamilyBindPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BindingContent />
        </Suspense>
    )
}

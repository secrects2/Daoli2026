'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

export default function AdminDashboard() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Add timestamp to prevent browser caching
                const res = await fetch(`/api/admin/stats/global?t=${Date.now()}`)
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

                const data = await res.json()
                if (data.success) {
                    setStats(data.stats)
                    console.log('✅ Stats loaded:', data.stats)
                } else {
                    console.error('Stats API returned error:', data.error)
                    // Optional: alert('無法載入數據: ' + data.error)
                }
            } catch (error) {
                console.error('Failed to load stats', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🛡️</span>
                            <h1 className="text-xl font-bold text-foreground">VOVOBALL 總部</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleLogout}
                                title="登出"
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                登出
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Global Pulse Cards */}
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-4 px-1">全域戰情 (Global Pulse)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Link href="/admin/matches" className="block group">
                            <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50 group-hover:shadow-md transition-all group-hover:-translate-y-1">
                                <p className="text-sm text-muted-foreground font-medium">總比賽場次</p>
                                <h3 className="text-3xl font-bold text-primary mt-2">{stats?.total_matches || 0}</h3>
                                <p className="text-xs text-green-600 mt-2 flex items-center">
                                    <span className="mr-1">▲</span> 歷史累計
                                </p>
                            </div>
                        </Link>

                        <Link href="/admin/matches" className="block group">
                            <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50 group-hover:shadow-md transition-all group-hover:-translate-y-1">
                                <p className="text-sm text-muted-foreground font-medium">今日比賽</p>
                                <h3 className="text-3xl font-bold text-indigo-600 mt-2">{stats?.today_matches || 0}</h3>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {(stats?.today_matches || 0) > 0 ? '今日戰況激烈' : '尚無賽事'}
                                </p>
                            </div>
                        </Link>

                        <Link href="/admin/elders" className="block group">
                            <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50 group-hover:shadow-md transition-all group-hover:-translate-y-1">
                                <p className="text-sm text-muted-foreground font-medium">本週活躍長輩</p>
                                <h3 className="text-3xl font-bold text-purple-600 mt-2">{stats?.active_elders_weekly || 0}</h3>
                                <p className="text-xs text-muted-foreground mt-2">
                                    7日內參與過比賽
                                </p>
                            </div>
                        </Link>

                        <Link href="/admin/points" className="block group">
                            <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50 group-hover:shadow-md transition-all group-hover:-translate-y-1">
                                <p className="text-sm text-muted-foreground font-medium">全域總積分</p>
                                <h3 className="text-3xl font-bold text-amber-500 mt-2">
                                    {stats?.total_points_distributed ? (stats.total_points_distributed / 1000).toFixed(1) + 'k' : '0'}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-2">
                                    已發放榮譽積分
                                </p>
                            </div>
                        </Link>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Management Tools */}
                    <section className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <span>🔧</span> 管理工具
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/admin/stores" className="block p-4 bg-background rounded-xl hover:bg-muted transition-colors group">
                                <div className="w-10 h-10 bg-blue-100 text-primary rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                                    🏢
                                </div>
                                <h4 className="font-bold text-foreground">加盟店管理</h4>
                                <p className="text-xs text-muted-foreground mt-1">審核、暫停、終止店家權限</p>
                            </Link>

                            <div className="p-4 bg-background rounded-xl opacity-50 cursor-not-allowed">
                                <div className="w-10 h-10 bg-gray-200 text-muted-foreground rounded-lg flex items-center justify-center mb-3">
                                    🤖
                                </div>
                                <h4 className="font-bold text-foreground">AI 訓練場</h4>
                                <p className="text-xs text-muted-foreground mt-1">標記照片 (Coming Soon)</p>
                            </div>
                        </div>
                    </section>

                    {/* Top Stores */}
                    <section className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                                <span>🏆</span> 熱門據點排行
                            </h3>
                            <Link href="/admin/locations" className="text-xs text-primary font-bold hover:underline">
                                查看完整報表 &rarr;
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {stats?.top_stores && stats.top_stores.length > 0 ? (
                                stats.top_stores.map((store: any, index: number) => (
                                    <Link href="/admin/locations" key={index} className="flex items-center justify-between p-3 bg-background rounded-xl hover:bg-muted transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-card text-muted-foreground border border-border/50'}
                                            `}>
                                                {index + 1}
                                            </div>
                                            <span className="font-medium text-foreground">{store.name}</span>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-primary">{store.match_count} 場</span>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    尚無數據
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

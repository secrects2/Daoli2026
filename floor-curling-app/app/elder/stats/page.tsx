'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import MetricDetailModal from '@/components/MetricDetailModal'
import AiAnalysisSection from '@/components/AiAnalysisSection'

// SVG Icons
const StepsIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
const HeartIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
const BadgeIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
const FireIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
const CalendarIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const TrendUpIcon = () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>

export default function ElderStatsPage() {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeModal, setActiveModal] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserId(user.id)
            const res = await fetch(`/api/elder/stats?id=${user.id}`)
            const data = await res.json()
            setStats(data)
            setLoading(false)
        }
        fetchStats()
    }, [router, supabase])

    if (loading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>

    const health = stats?.healthMetrics
    const today = health?.today || {}
    const getModalData = (key: string) => health?.history?.map((h: any) => ({ date: h.date, value: h[key] })) || []

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 backdrop-blur-md pt-5 pb-2 px-4 border-b border-black/5 flex items-center gap-3">
                <Link href="/elder/dashboard" className="text-blue-500 font-medium">
                    ← 返回
                </Link>
                <h1 className="text-xl font-bold flex-1 text-center pr-10">健康存摺詳情</h1>
            </div>

            <div className="p-4 space-y-6 max-w-lg mx-auto">
                {/* 即時健康數據 Dashboard */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="text-orange-500 font-bold text-sm">即時健康數據</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">隨時掌握</h2>
                        <h2 className="text-2xl font-black text-orange-400 mb-3">您的健康狀況</h2>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            透過我們的智慧系統，即時追蹤您的運動表現和健康數據。
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveModal('steps')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.97]">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20"><StepsIcon /></div>
                            <p className="text-xs font-bold text-gray-500 mb-1">今日步數</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-gray-900">{(today.steps || 0).toLocaleString()}</span>
                                <span className="text-xs font-bold text-gray-400">步</span>
                            </div>
                            {today.stepsTrend !== undefined && (
                                <p className={`text-[10px] font-bold mt-2 flex items-center gap-0.5 ${today.stepsTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <TrendUpIcon />{today.stepsTrend >= 0 ? '+' : ''}{today.stepsTrend}% 較昨日
                                </p>
                            )}
                        </button>

                        <button onClick={() => setActiveModal('heartRate')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left hover:shadow-md hover:border-red-200 transition-all active:scale-[0.97]">
                            <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center mb-3 shadow-md shadow-red-500/20 relative">
                                <HeartIcon />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 border border-white rounded-full animate-ping"></span>
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></span>
                            </div>
                            <p className="text-xs font-bold text-gray-500 mb-1">平均心率</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-gray-900">{today.heartRate || 0}</span>
                                <span className="text-xs font-bold text-gray-400">bpm</span>
                            </div>
                        </button>

                        <button onClick={() => setActiveModal('ranking')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left hover:shadow-md hover:border-yellow-200 transition-all active:scale-[0.97]">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500 text-white flex items-center justify-center mb-3 shadow-md shadow-yellow-500/20"><BadgeIcon /></div>
                            <p className="text-xs font-bold text-gray-500 mb-1">全國排名</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-gray-900">{today.ranking || 0}</span>
                                <span className="text-xs font-bold text-gray-400">名</span>
                            </div>
                            {today.rankChange > 0 && (
                                <p className="text-[10px] font-bold text-green-500 mt-2 flex items-center gap-0.5"><TrendUpIcon />上升{today.rankChange}名</p>
                            )}
                        </button>

                        <button onClick={() => setActiveModal('calories')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col text-left hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.97]">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-3 shadow-md shadow-orange-500/20"><FireIcon /></div>
                            <p className="text-xs font-bold text-gray-500 mb-1">消耗熱量</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-gray-900">{today.calories || 0}</span>
                                <span className="text-xs font-bold text-gray-400">kcal</span>
                            </div>
                            {today.caloriesTrend !== undefined && (
                                <p className={`text-[10px] font-bold mt-2 flex items-center gap-0.5 ${today.caloriesTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <TrendUpIcon />{today.caloriesTrend >= 0 ? '+' : ''}{today.caloriesTrend}% 較昨日
                                </p>
                            )}
                        </button>

                        <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mt-1">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-md shadow-green-500/20"><CalendarIcon /></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-1">連續運動</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-gray-900">{today.consecutiveDays || 0}</span>
                                        <span className="text-xs font-bold text-gray-400">天</span>
                                    </div>
                                </div>
                            </div>
                            {(today.consecutiveDays || 0) >= 7 && (
                                <div className="text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">達標！</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI 動作分析與處方 */}
                {userId && <AiAnalysisSection elderId={userId} />}

                {/* Section Divider */}
                <div className="flex items-center gap-2 px-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    <h3 className="font-bold text-gray-900 text-lg">地壺球賽事表現</h3>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 text-sm mb-1">本週場次</p>
                        <p className="text-3xl font-bold text-blue-600">{stats?.weeklyMatches || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 text-sm mb-1">🏅 榮譽積分</p>
                        <p className="text-3xl font-bold text-orange-500">{stats?.globalPoints || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 text-sm mb-1">💰 兌換積分</p>
                        <p className="text-3xl font-bold text-green-500">{stats?.localPoints || 0}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">近期表現 (積分趨勢)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.history || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="points" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">詳細紀錄</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats?.recentMatches?.map((match: any, index: number) => (
                            <div key={index} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${match.result === 'win' ? 'bg-yellow-100 text-yellow-600' : match.result === 'loss' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-500'}`}>
                                        {match.result === 'win' ? '🏆' : match.result === 'loss' ? '💪' : '🤝'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{match.date}</p>
                                        <p className="text-xs text-gray-500">{match.result === 'win' ? '勝利' : match.result === 'loss' ? '完賽' : '平局'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">+{match.points}</p>
                                    <p className="text-xs text-gray-500">積分</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metric Detail Modals */}
            <MetricDetailModal isOpen={activeModal === 'steps'} onClose={() => setActiveModal(null)} title="今日步數" unit="步" color="#3B82F6" icon={<StepsIcon />} data={getModalData('steps')} chartType="bar" />
            <MetricDetailModal isOpen={activeModal === 'heartRate'} onClose={() => setActiveModal(null)} title="平均心率" unit="bpm" color="#EF4444" icon={<HeartIcon />} data={getModalData('heartRate')} chartType="line" />
            <MetricDetailModal isOpen={activeModal === 'calories'} onClose={() => setActiveModal(null)} title="消耗熱量" unit="kcal" color="#F97316" icon={<FireIcon />} data={getModalData('calories')} chartType="bar" />
            <MetricDetailModal isOpen={activeModal === 'ranking'} onClose={() => setActiveModal(null)} title="全國排名" unit="名" color="#EAB308" icon={<BadgeIcon />} data={getModalData('steps')} chartType="line" />
        </div>
    )
}

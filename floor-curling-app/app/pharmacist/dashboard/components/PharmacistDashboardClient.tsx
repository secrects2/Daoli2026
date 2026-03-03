'use client'

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'

interface PharmacistDashboardClientProps {
    profile: any
    stats: any
    chartData: any
}

export default function PharmacistDashboardClient({ profile, stats, chartData }: PharmacistDashboardClientProps) {
    const { t } = useLanguage()
    const COLORS = ['#EF4444', '#F59E0B']

    return (
        <div className="min-h-screen pb-24 space-y-6">
            {/* Glass Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-5 pt-12 pb-4 shadow-soft transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">管理後台</h1>
                        <p className="text-sm font-medium text-muted-foreground">
                            {profile?.store_id || '總部'} • {profile?.full_name || '店長'}
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <LanguageSwitcher />
                        <Link href="/pharmacist/settings" className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center hover:bg-accent transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="px-5 space-y-8 animate-fade-in-up">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex flex-col justify-between h-28 hover:shadow-card-hover hover:border-primary/20 transition-all">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground tracking-tight">{stats.todayMatches}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">{t('dashboard.stats.todayMatches')}</p>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex flex-col justify-between h-28 hover:shadow-card-hover hover:border-primary/20 transition-all">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground tracking-tight">{stats.activeElders}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">{t('dashboard.stats.activeElders')}</p>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex flex-col justify-between h-28 hover:shadow-card-hover hover:border-amber-200 transition-all">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="text-lg">🏅</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground tracking-tight">{stats.totalGlobalPoints.toLocaleString()}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">榮譽積分</p>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-4 shadow-card border border-border/50 flex flex-col justify-between h-28 hover:shadow-card-hover hover:border-emerald-200 transition-all">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span className="text-lg">💰</span>
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground tracking-tight">{stats.totalLocalPoints.toLocaleString()}</p>
                            <p className="text-[11px] font-semibold text-muted-foreground">兌換積分</p>
                        </div>
                    </div>
                </div>

                {/* Sport Selection */}
                <div>
                    <h3 className="ml-1 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">選擇運動項目</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* 暫時隱藏地壺球
                        <Link href="/pharmacist/match/new" className="group relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                            <div className="relative z-10">
                                <span className="text-4xl mb-3 block">🥌</span>
                                <h4 className="font-black text-white text-xl mb-1">地壺球</h4>
                                <p className="text-blue-100 text-xs">Floor Curling</p>
                                <div className="mt-3 inline-flex items-center gap-1 text-white/80 text-xs font-medium bg-white/20 rounded-full px-3 py-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    開始比賽
                                </div>
                            </div>
                        </Link>
                        */}
                        <Link href="/pharmacist/match/boccia" className="group relative bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                            <div className="relative z-10">
                                <span className="text-4xl mb-3 block">🎯</span>
                                <h4 className="font-black text-white text-xl mb-1">地板滾球</h4>
                                <p className="text-orange-100 text-xs">Boccia</p>
                                <div className="mt-3 inline-flex items-center gap-1 text-white/80 text-xs font-medium bg-white/20 rounded-full px-3 py-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    開始比賽
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* AI Smart Services */}
                <div>
                    <h3 className="ml-1 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">AI 智能服務</h3>
                    <Link href="/pharmacist/ai-test" className="group relative bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all hover:scale-[1.01] overflow-hidden block">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-8" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <span className="text-4xl mb-3 block">🧬</span>
                                <h4 className="font-extrabold text-white text-xl mb-1">AI 動作檢測(地板滾球)</h4>
                                <p className="text-teal-100 text-xs">AI Motion Analysis Test</p>
                                <div className="mt-3 inline-flex items-center gap-1 text-white/80 text-xs font-medium bg-white/20 rounded-full px-3 py-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    啟動檢測
                                </div>
                            </div>
                            <div className="hidden sm:block opacity-80 rotate-12 transform group-hover:rotate-6 transition-transform">
                                <span className="text-6xl">🤖</span>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Operations Menu */}
                <div>
                    <h3 className="ml-1 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">快速操作</h3>
                    <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 divide-y divide-border/50">
                        {/* 暫時隱藏創建地壺球比賽
                        <Link href="/pharmacist/match/new" className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg">{t('dashboard.cards.newMatch.title')}</h4>
                                <p className="text-xs text-gray-500">創建新的地壺球比賽</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>
                        */}

                        <Link href="/pharmacist/match/history" className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg">{t('dashboard.nav.matchHistory')}</h4>
                                <p className="text-xs text-gray-500">查看歷史比賽紀錄</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>

                        <Link href="/pharmacist/elders" className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg">{t('dashboard.cards.elderManage.title')}</h4>
                                <p className="text-xs text-gray-500">管理長輩與家屬綁定</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </Link>
                    </div>
                </div>

                {/* Charts */}
                <div className="pb-4">
                    <h3 className="ml-1 mb-3 text-xs font-bold text-gray-400 uppercase tracking-widest">數據分析</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
                            <h4 className="text-base font-bold mb-6 text-foreground">近七日場次</h4>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.matchesTrend}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2ba89d" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#2ba89d" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                            cursor={{ stroke: '#E5E7EB' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#2ba89d" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
                            <h4 className="text-lg font-bold mb-6 text-gray-900">勝率分佈</h4>
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.winDistribution}
                                            cx="50%" cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                            cornerRadius={6}
                                        >
                                            {chartData.winDistribution.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '13px', fontWeight: 600 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}

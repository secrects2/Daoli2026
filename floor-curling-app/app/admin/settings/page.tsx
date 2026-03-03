'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface SystemStats {
    totalMatches: number
    totalUsers: number
    totalPointsDistributed: number
}

export default function AdminSettingsPage() {
    const [stats, setStats] = useState<SystemStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [exportType, setExportType] = useState('overview')
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/stats')
                const data = await res.json()
                if (data.success) {
                    setStats(data.stats)
                }
            } catch (error) {
                console.error('Fetch stats error:', error)
                toast.error('無法載入系統數據')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const handleExport = async (format: 'json' | 'csv') => {
        setExporting(true)
        try {
            const url = `/api/admin/export?type=${exportType}&start=${dateRange.start}&end=${dateRange.end}&format=${format}`
            const response = await fetch(url)

            if (format === 'csv') {
                const blob = await response.blob()
                const downloadUrl = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = `report_${exportType}_${dateRange.start}_${dateRange.end}.csv`
                a.click()
                URL.revokeObjectURL(downloadUrl)
            } else {
                const data = await response.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const downloadUrl = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = `report_${exportType}_${dateRange.start}_${dateRange.end}.json`
                a.click()
                URL.revokeObjectURL(downloadUrl)
            }

            toast.success('匯出成功！')
        } catch (error) {
            console.error('匯出錯誤:', error)
            toast.error('匯出失敗')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-card/80 border-b border-border/50 px-5 pt-12 pb-4">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-gray-600 hover:bg-accent transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold text-foreground">系統設定</h1>
                        <p className="text-sm text-muted-foreground">管理系統配置與匯出報表</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
                {/* System Overview */}
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        📊 系統概覽
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-primary/10 rounded-xl p-4 text-center">
                                <p className="text-3xl font-extrabold text-primary">{stats?.totalMatches || 0}</p>
                                <p className="text-sm text-blue-700 font-medium mt-1">總比賽數</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-extrabold text-green-600">{stats?.totalUsers || 0}</p>
                                <p className="text-sm text-green-700 font-medium mt-1">總用戶數</p>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-extrabold text-purple-600">{stats?.totalPointsDistributed || 0}</p>
                                <p className="text-sm text-purple-700 font-medium mt-1">已發放積分</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Export Reports */}
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        📥 匯出報表
                    </h3>

                    <div className="space-y-4">
                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">報表類型</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                    { value: 'overview', label: '系統概覽', emoji: '📊' },
                                    { value: 'matches', label: '比賽記錄', emoji: '🏆' },
                                    { value: 'users', label: '用戶列表', emoji: '👥' },
                                    { value: 'transactions', label: '積分交易', emoji: '💰' }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setExportType(opt.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-sm font-bold ${exportType === opt.value
                                            ? 'border-blue-500 bg-primary/10 text-blue-700'
                                            : 'border-border hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <span className="mr-1">{opt.emoji}</span>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">開始日期</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">結束日期</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => handleExport('csv')}
                                disabled={exporting}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <span>📄</span>
                                {exporting ? '匯出中...' : '匯出 CSV'}
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                disabled={exporting}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <span>📋</span>
                                {exporting ? '匯出中...' : '匯出 JSON'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        ⚡ 快速操作
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/admin/users"
                            className="p-4 bg-background rounded-xl hover:bg-muted transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">👥</span>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">用戶管理</p>
                                <p className="text-xs text-muted-foreground">管理所有用戶</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/products"
                            className="p-4 bg-background rounded-xl hover:bg-muted transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">📦</span>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">商品管理</p>
                                <p className="text-xs text-muted-foreground">管理商品庫存</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/stores"
                            className="p-4 bg-background rounded-xl hover:bg-muted transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🏪</span>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">門店管理</p>
                                <p className="text-xs text-muted-foreground">管理所有門店</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin"
                            className="p-4 bg-background rounded-xl hover:bg-muted transition-colors flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🏠</span>
                            </div>
                            <div>
                                <p className="font-bold text-foreground">管理後台</p>
                                <p className="text-xs text-muted-foreground">返回主頁</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        地壺球活動管理系統 v1.0 |
                        最後更新: {new Date().toLocaleDateString('zh-TW')}
                    </p>
                </div>
            </div>
        </div>
    )
}

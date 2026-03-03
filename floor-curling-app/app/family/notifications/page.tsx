'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface Notification {
    id: string
    title: string
    message: string
    type: 'match_result' | 'points_update' | 'system' | 'info'
    read: boolean
    created_at: string
    metadata?: {
        match_id?: string
        elder_name?: string
        result?: string
        points?: number
    }
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
    match_result: { icon: '🏆', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    points_update: { icon: '💰', color: 'text-green-600', bg: 'bg-green-100' },
    system: { icon: '⚙️', color: 'text-gray-600', bg: 'bg-muted' },
    info: { icon: 'ℹ️', color: 'text-primary', bg: 'bg-blue-100' }
}

export default function NotificationsPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const supabase = createClientComponentClient()

    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (!error && data) {
                setNotifications(data)
            }
        } catch (err) {
            console.error('獲取通知失敗:', err)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id)

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            )
        } catch (err) {
            console.error('標記已讀失敗:', err)
        }
    }

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false)

            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        } catch (err) {
            console.error('標記全部已讀失敗:', err)
        }
    }

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications

    const unreadCount = notifications.filter(n => !n.read).length

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
            {/* 導航欄 */}
            <nav className="bg-card/80 backdrop-blur-sm shadow-card sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 text-gray-600 hover:text-foreground"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-bold text-purple-600">通知中心</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 過濾和操作 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-card text-gray-700 hover:bg-muted'
                                }`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${filter === 'unread'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-card text-gray-700 hover:bg-muted'
                                }`}
                        >
                            未讀
                            {unreadCount > 0 && (
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${filter === 'unread' ? 'bg-card text-purple-600' : 'bg-red-500 text-white'
                                    }`}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            全部標為已讀
                        </button>
                    )}
                </div>

                {/* 通知列表 */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 text-center">
                        <span className="text-6xl mb-4 block">🔔</span>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {filter === 'unread' ? '沒有未讀通知' : '暫無通知'}
                        </h3>
                        <p className="text-muted-foreground">
                            {filter === 'unread'
                                ? '所有通知都已讀取'
                                : '當長輩完成比賽時，您會在這裡收到通知'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map(notification => {
                            const config = typeConfig[notification.type] || typeConfig.info
                            return (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                    className={`bg-card rounded-xl p-4 transition-all cursor-pointer ${!notification.read
                                            ? 'shadow-md border-l-4 border-purple-500'
                                            : 'shadow-card opacity-80'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${config.bg}`}>
                                            <span className="text-xl">{config.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-gray-600'}`}>
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 text-sm mb-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(notification.created_at).toLocaleString('zh-TW', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithRole } from './actions'
import clsx from 'clsx'

type LoginMode = 'family' | 'pharmacist'

export default function LoginForm() {
    const router = useRouter()
    const [loginMode, setLoginMode] = useState<LoginMode>('family')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const searchParams = useSearchParams()
    const returnTo = searchParams.get('returnTo')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            await supabase.auth.signOut()

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            router.refresh()

            if (returnTo) {
                router.push(returnTo)
            } else {
                router.push('/pharmacist/dashboard')
            }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleLineLogin = (role: 'family' | 'elder') => {
        window.location.href = `/api/auth/line/login?role=${role}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
    }

    const handleQuickLogin = async (role: 'admin' | 'pharmacist' | 'family' | 'elder' | 'family_bound') => {
        setLoading(true)
        setError(null)

        try {
            const result = await loginWithRole(role)
            if (result.error) throw new Error(result.error)

            router.refresh()
            await new Promise(resolve => setTimeout(resolve, 500))

            if (returnTo) {
                router.push(returnTo)
                return
            }

            switch (role) {
                case 'admin': router.push('/admin'); break;
                case 'pharmacist': router.push('/pharmacist/dashboard'); break;
                case 'family':
                case 'family_bound': router.push('/family/portal'); break;
                case 'elder': router.push('/elder/dashboard'); break;
                default: router.push('/');
            }
        } catch (err: any) {
            console.error('Login Error:', err)
            setError(err.message)
            setLoading(false)
        }
    }

    const devButtons = [
        { role: 'admin', label: '後台', color: 'bg-red-500 hover:bg-red-600 text-white' },
        { role: 'pharmacist', label: '店長', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
        { role: 'family', label: '家屬', color: 'bg-green-500 hover:bg-green-600 text-white' },
        { role: 'family_bound', label: '林伯伯', color: 'bg-purple-500 hover:bg-purple-600 text-white' },
        { role: 'elder', label: '林伯伯', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200' },
    ]

    const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)

    useEffect(() => {
        // 檢測是否為 LINE 內建瀏覽器
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera
        const isLine = /Line/i.test(ua)

        // 如果是 LINE 瀏覽器，且沒有錯誤訊息 (避免無限迴圈)，則自動執行 LINE 登入
        // [DEV] 用戶要求暫時關閉自動登入以測試店長身份
        /* 
        if (isLine && !searchParams.get('error') && !searchParams.get('disable_auto_login')) {
            setIsAutoLoggingIn(true)
            handleLineLogin('family')
        }
        */
    }, [searchParams])

    if (isAutoLoggingIn) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
                <div className="w-12 h-12 border-4 border-[#06C755]/30 border-t-[#06C755] rounded-full animate-spin"></div>
                <div className="text-center">
                    <p className="text-gray-900 font-bold text-lg">正在使用 LINE 帳號登入...</p>
                    <p className="text-gray-500 text-sm mt-1">請稍候，正在為您跳轉</p>
                </div>
                <button
                    onClick={() => setIsAutoLoggingIn(false)}
                    className="text-sm text-gray-400 hover:text-gray-600 underline mt-4"
                >
                    取消自動登入
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 relative">
            {/* 全屏加載覆蓋層 - 快速登入時顯示 */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-fade-in">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-lg font-bold text-gray-900">登入中...</p>
                        <p className="text-sm text-gray-500">請稍候</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100 animate-fade-in text-center">
                    <p className="text-sm font-bold text-red-600">{error}</p>
                </div>
            )}

            {/* Mode Toggle Tabs */}
            <div className="flex p-1 bg-gray-100/80 rounded-2xl relative mb-6">
                <button
                    onClick={() => setLoginMode('family')}
                    className={clsx(
                        "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative z-10",
                        loginMode === 'family' ? "bg-white text-gray-900 shadow-sm transform scale-100" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    家屬登入
                </button>
                <button
                    onClick={() => setLoginMode('pharmacist')}
                    className={clsx(
                        "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 relative z-10",
                        loginMode === 'pharmacist' ? "bg-white text-gray-900 shadow-sm transform scale-100" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    加盟店登入
                </button>
            </div>

            {/* Family Login Mode */}
            {loginMode === 'family' && (
                <div className="space-y-5 animate-slide-in-right">
                    <button
                        type="button"
                        onClick={() => handleLineLogin('family')}
                        className="w-full py-4 rounded-2xl bg-[#06C755] hover:bg-[#05b84d] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group"
                    >
                        <svg className="h-6 w-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.5 10c0-4.8-4.5-8.7-10-8.7S.5 5.2.5 10c0 4.3 3.6 7.9 8.5 8.6.3.1.5.2.5.5v2.2c0 .2.1.4.3.4.1 0 .2 0 .3-.1.9-.5 4.1-2.4 5.7-4.1 3-2.6 4.7-5.3 4.7-8.5z" />
                        </svg>
                        <span className="relative z-10">家屬登入 (LINE)</span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium tracking-wider">或是</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleLineLogin('elder')}
                        className="w-full py-4 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-[#06C755] font-bold text-lg shadow-sm hover:shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.5 10c0-4.8-4.5-8.7-10-8.7S.5 5.2.5 10c0 4.3 3.6 7.9 8.5 8.6.3.1.5.2.5.5v2.2c0 .2.1.4.3.4.1 0 .2 0 .3-.1.9-.5 4.1-2.4 5.7-4.1 3-2.6 4.7-5.3 4.7-8.5z" />
                        </svg>
                        長輩登入 (LINE)
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
                        綁定長輩帳號後，您將可以即時查看長輩的<br />比賽成績與健康數據。
                    </p>
                </div>
            )}

            {/* Pharmacist Login Mode */}
            {loginMode === 'pharmacist' && (
                <div className="space-y-4 animate-slide-in-right">
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                placeholder="店長信箱"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    登入中...
                                </span>
                            ) : '登入管理後台'}
                        </button>
                    </form>
                </div>
            )}

            {/* Dev Tools - With 5 Distinct Colors */}
            <div className="pt-8 mt-6">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <span className="relative bg-white px-2 py-0.5 rounded text-[10px] uppercase font-bold text-gray-300">Development Mode</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {devButtons.map(btn => (
                        <button
                            key={btn.role}
                            onClick={() => handleQuickLogin(btn.role as any)}
                            className={clsx(
                                "py-2 rounded-lg text-[10px] font-bold transition-transform active:scale-95 uppercase tracking-tight shadow-sm",
                                btn.color
                            )}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
                <div className="text-center mt-3">
                    <a href="/logout" className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors">
                        Clear Cache & Reset
                    </a>
                </div>
            </div>
        </div>
    )
}

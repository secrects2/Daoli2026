'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'family' | 'pharmacist'>('family')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            router.refresh()
            router.push('/')
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleLineLogin = () => {
        window.location.href = '/api/auth/line/login'
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('family')}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${activeTab === 'family'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    家屬登錄
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('pharmacist')}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${activeTab === 'pharmacist'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    藥師登入
                </button>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">登入失敗</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Family Login View */}
            {activeTab === 'family' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="text-center space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900">歡迎使用地壺球系統</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            為了您的便利，我們推薦使用 LINE 一鍵登入。<br />
                            登入後即可連結長輩帳號，即時接收比賽通知。
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLineLogin}
                        className="w-full bg-[#00C300] hover:bg-[#00B300] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.5 10c0-4.8-4.5-8.7-10-8.7S.5 5.2.5 10c0 4.3 3.6 7.9 8.5 8.6.3.1.5.2.5.5v2.2c0 .2.1.4.3.4.1 0 .2 0 .3-.1.9-.5 4.1-2.4 5.7-4.1 3-2.6 4.7-5.3 4.7-8.5z" />
                        </svg>
                        使用 LINE 帳號登入
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        僅限已註冊的家屬帳號使用
                    </p>
                </div>
            )}

            {/* Pharmacist Login View */}
            {activeTab === 'pharmacist' && (
                <form className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            電子郵件
                        </label>
                        <div className="mt-1">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="ios-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                                placeholder="pharmacist@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            密碼
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="ios-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '登入中...' : '登入'}
                        </button>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        僅限藥師和管理員使用
                    </p>
                </form>
            )}
        </div>
    )
}

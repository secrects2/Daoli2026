'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPharmacistLogin, setShowPharmacistLogin] = useState(false)

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

    const handleQuickLogin = async (role: 'admin' | 'pharmacist' | 'family' | 'elder') => {
        const creds = {
            admin: { email: 'admin@daoli.com', password: 'daoli_admin_2026' },
            pharmacist: { email: 'pharmacist@daoli.com', password: 'password123' },
            family: { email: 'family@daoli.com', password: 'password123' },
            elder: { email: 'elder@daoli.com', password: 'password123' }
        }

        setEmail(creds[role].email)
        setPassword(creds[role].password)

        // Trigger login immediately
        setLoading(true)
        setError(null)
        try {
            // Force sign out potential previous session
            await supabase.auth.signOut()

            const { error: signInError } = await supabase.auth.signInWithPassword(creds[role])
            if (signInError) throw signInError

            // Wait a bit for cookies to settle
            await new Promise(resolve => setTimeout(resolve, 1000))

            router.refresh()

            // Redirect based on role
            switch (role) {
                case 'admin':
                    router.push('/admin')
                    break
                case 'pharmacist':
                    router.push('/pharmacist') // Or match list
                    break
                case 'family':
                    router.push('/family/dashboard')
                    break
                case 'elder':
                    router.push('/elder/dashboard')
                    break
                default:
                    router.push('/')
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
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

            {/* Default View: Family Login (LINE) */}
            <div className="space-y-4">
                <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg text-gray-900">家屬登入</h3>
                    <p className="text-sm text-gray-500">
                        為了您的便利，我們推薦使用 LINE 一鍵登入。<br />
                        登入後即可連結長輩帳號，即時接收比賽通知。
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleLineLogin}
                    className="ios-btn bg-[#00C300] hover:bg-[#00B300] focus-visible:outline-[#00C300] flex items-center justify-center gap-3 text-[15px]"
                >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.5 10c0-4.8-4.5-8.7-10-8.7S.5 5.2.5 10c0 4.3 3.6 7.9 8.5 8.6.3.1.5.2.5.5v2.2c0 .2.1.4.3.4.1 0 .2 0 .3-.1.9-.5 4.1-2.4 5.7-4.1 3-2.6 4.7-5.3 4.7-8.5z" />
                    </svg>
                    使用 LINE 帳號登入
                </button>
            </div>

            <div className="pt-2">
                <button
                    type="button"
                    onClick={() => setShowPharmacistLogin(!showPharmacistLogin)}
                    className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-medium transition-all duration-200 active:scale-95 bg-white text-gray-900 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                    {showPharmacistLogin ? '隱藏藥師登入' : '我是藥師 / 管理員'}
                </button>
            </div>

            {/* Toggleable View: Pharmacist Login */}
            {showPharmacistLogin && (
                <form className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" onSubmit={handleLogin}>
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
                                className="ios-input"
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
                                className="ios-input"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="ios-btn bg-gray-900 hover:bg-gray-800"
                        >
                            {loading ? '登入中...' : '藥師登入'}
                        </button>
                    </div>
                </form>
            )}

            {/* Quick Login for Dev/Test */}
            <div className="pt-6 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400 mb-3">🧪 測試專用快速登入 (Dev Mode)</p>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('admin')}
                        className="px-2 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100"
                    >
                        👑 Admin
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('pharmacist')}
                        className="px-2 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
                    >
                        💊 藥師
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('family')}
                        className="px-2 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
                    >
                        🏠 家屬
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('elder')}
                        className="px-2 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100"
                    >
                        🧓 長輩
                    </button>
                </div>
            </div>
        </div>
    )
}

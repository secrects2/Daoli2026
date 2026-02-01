'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

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
            // The middleware or client-side check will handle redirection, 
            // but we can try to be helpful if we know the role.
            // Since we don't know the role immediately without a query, we push to root
            // and let middleware redirect, OR we can query profile.
            // For now, let's just refresh and go root to be safe, or /pharmacist if this is pharmacist login form.
            router.push('/pharmacist/dashboard') // Assumption for email/pass login in this context
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
                    router.push('/admin') // Admin root, middleware should allow
                    break
                case 'pharmacist':
                    router.push('/pharmacist/dashboard')
                    break
                case 'family':
                    router.push('/family/portal') // or /family/dashboard depending on naming
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
                <div className="rounded-md bg-red-50 p-4 animate-in fade-in slide-in-from-top-2">
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

            {/* Family Login Mode */}
            {loginMode === 'family' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="text-center space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900">家屬登入</h3>
                        <p className="text-sm text-gray-500">
                            請使用 LINE 帳號登入<br />
                            與長輩保持連結，即時接收通知
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLineLogin}
                        className="ios-btn bg-[#00C300] hover:bg-[#00B300] focus-visible:outline-[#00C300] flex items-center justify-center gap-3 text-[15px] shadow-sm transform transition active:scale-95"
                    >
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.5 10c0-4.8-4.5-8.7-10-8.7S.5 5.2.5 10c0 4.3 3.6 7.9 8.5 8.6.3.1.5.2.5.5v2.2c0 .2.1.4.3.4.1 0 .2 0 .3-.1.9-.5 4.1-2.4 5.7-4.1 3-2.6 4.7-5.3 4.7-8.5z" />
                        </svg>
                        使用 LINE 帳號登入
                    </button>

                    <div className="pt-4 text-center">
                        <button
                            onClick={() => setLoginMode('pharmacist')}
                            className="w-full py-3 border border-blue-600 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                        >
                            我是加盟店 / 管理員
                        </button>
                    </div>
                </div>
            )}

            {/* Pharmacist / Staff Login Mode */}
            {loginMode === 'pharmacist' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-center space-y-2 mb-6">
                        <h3 className="font-semibold text-lg text-gray-900">加盟店登入</h3>
                        <p className="text-sm text-gray-500">
                            加盟店與管理員登入
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleLogin}>
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
                                    placeholder="yourname@daoli.com"
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

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="ios-btn bg-gray-900 hover:bg-gray-800 shadow-sm"
                            >
                                {loading ? '登入中...' : '加盟店登入'}
                            </button>
                        </div>
                    </form>

                    <div className="pt-4 text-center">
                        <button
                            onClick={() => setLoginMode('family')}
                            className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                        >
                            返回家屬登入
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Login for Dev/Test (Always visible for convenience, or hide in prod) 
                Keeping it visible as user seems to rely on it for testing "Quick Login"
            */}
            <div className="pt-8 mt-8 border-t border-gray-100">
                <p className="text-center text-[10px] text-gray-300 mb-3 uppercase tracking-wider">Development Mode</p>
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => handleQuickLogin('admin')} className="py-2 bg-purple-50 text-purple-600 rounded text-[10px] hover:bg-purple-100 font-bold">Admin</button>
                    <button onClick={() => handleQuickLogin('pharmacist')} className="py-2 bg-blue-50 text-blue-600 rounded text-[10px] hover:bg-blue-100 font-bold">Franchise</button>
                    <button onClick={() => handleQuickLogin('family')} className="py-2 bg-green-50 text-green-600 rounded text-[10px] hover:bg-green-100 font-bold">Family</button>
                    <button onClick={() => handleQuickLogin('elder')} className="py-2 bg-orange-50 text-orange-600 rounded text-[10px] hover:bg-orange-100 font-bold">Elder</button>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Suspense } from 'react'

function LoginForm() {
    const { t } = useLanguage()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<'staff' | 'family'>('staff')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [autoFilled, setAutoFilled] = useState(false)

    const router = useRouter()
    const supabase = createClientComponentClient()

    // 從 URL 參數自動填入測試帳號
    useEffect(() => {
        const testEmail = searchParams.get('email')
        const testPassword = searchParams.get('password')
        const role = searchParams.get('role')

        if (testEmail && testPassword) {
            setEmail(testEmail)
            setPassword(testPassword)
            setAutoFilled(true)

            // 根據角色切換標籤
            if (role === 'family') {
                setActiveTab('family')
            } else {
                setActiveTab('staff')
            }
        }
    }, [searchParams])

    // 员工登录（邮箱 + 密码）
    const handleStaffLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        console.log('🔐 开始登录流程...')

        try {
            // 1. 登录
            console.log('📧 尝试登录:', email)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                console.error('❌ 登录失败:', authError)
                throw authError
            }

            console.log('✅ 登录成功! User ID:', authData.user?.id)

            // 2. 通过服务端 API 获取用户角色（绕过 RLS）
            console.log('📋 查询用户角色...')
            const profileRes = await fetch(`/api/profile?userId=${authData.user.id}`)
            const profile = await profileRes.json()

            if (!profileRes.ok) {
                console.error('❌ Profile 查询失败:', profile.error)
                setMessage({
                    type: 'error',
                    text: profile.error || t('common.error')
                })
                return
            }

            console.log('✅ Profile:', profile)

            // 3. 根据角色重定向
            if (profile.role === 'pharmacist' || profile.role === 'admin') {
                console.log('🚀 重定向到药师仪表板...')
                setMessage({ type: 'success', text: t('common.success') })
                // 立即跳转
                window.location.replace('/pharmacist/dashboard')
            } else {
                setMessage({ type: 'error', text: '员工登录仅限药师和管理员' }) // TODO: Add translation
                await supabase.auth.signOut()
            }
        } catch (error: any) {
            console.error('❌ 登录错误:', error)
            setMessage({ type: 'error', text: error.message || t('login.errorMessage') })
        } finally {
            setLoading(false)
        }
    }

    // 家属登录（支援密碼或 Magic Link）
    const handleFamilyLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            // 如果有密碼，使用密碼登入
            if (password) {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
                // 成功登入，等待 callback 處理或 router refresh
                router.refresh()
            } else {
                // 原有的 Magic Link 邏輯
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                })
                if (error) throw error
                setMessage({
                    type: 'success',
                    text: t('login.magicLinkSent')
                })
            }
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || t('login.error')
            })
        } finally {
            setLoading(false)
        }
    }

    // LINE Login Handler (Custom Flow)
    const handleLineLogin = () => {
        setLoading(true)
        // Redirect to our custom API route which starts the LINE OAuth flow
        window.location.href = '/api/auth/line/login'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative">
            {/* 語言切換 (絕對定位右上角) */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-sm">
                <LanguageSwitcher />
            </div>

            <div className="w-full max-w-md">
                {/* Logo 和标题 */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 bg-blue-600 rounded-full mb-4">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('login.title')}</h1>
                    <p className="text-blue-200">{t('login.subtitle')}</p>
                </div>

                {/* 登录卡片 */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* 标签页切换 */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${activeTab === 'staff'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {t('login.signInButton')}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('family')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${activeTab === 'family'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                家属登录 {/* TODO */}
                            </span>
                        </button>
                    </div>

                    {/* 表单内容 */}
                    <div className="p-8">
                        {/* 消息提示 */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    {message.type === 'success' ? (
                                        <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <p className="text-sm font-medium">{message.text}</p>
                                </div>
                            </div>
                        )}

                        {/* 员工登录表单 */}
                        {activeTab === 'staff' && (
                            <form onSubmit={handleStaffLogin} className="space-y-6">
                                <div>
                                    <label htmlFor="staff-email" className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('login.emailLabel')}
                                    </label>
                                    <input
                                        id="staff-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        placeholder={t('login.emailPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('login.passwordLabel')}
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        placeholder={t('login.passwordPlaceholder')}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('login.signInLoading')}
                                        </span>
                                    ) : (
                                        t('login.signInButton')
                                    )}
                                </button>

                                <p className="text-center text-sm text-gray-500">
                                    仅限药师和管理员使用 {/* TODO */}
                                </p>
                            </form>
                        )}

                        {/* 家属登录表单 */}
                        {activeTab === 'family' && (
                            <div className="space-y-6">
                                {/* LINE Login Button */}
                                <button
                                    type="button"
                                    onClick={handleLineLogin}
                                    className="w-full bg-[#00B900] text-white py-3 px-4 rounded-lg font-bold hover:bg-[#009900] focus:outline-none focus:ring-2 focus:ring-[#00B900] focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21.156 12.026c0-4.661-4.735-8.455-10.553-8.455-5.845 0-10.603 3.794-10.603 8.455 0 4.187 3.708 7.702 8.653 8.329.337.073.795.223.91.512.104.261.068.612.034.85-.057.411-.366 1.487-.417 1.704-.067.29-.317 1.135 1.189.619 1.505-.515 8.127-4.79 11.082-8.204 2.536-2.923 1.956-2.556 1.956-2.556-.252-.401-.252-1.254-.252-1.254z" />
                                    </svg>
                                    使用 LINE 帳號登入
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white text-gray-500">
                                            或使用 Email 登入
                                        </span>
                                    </div>
                                </div>

                                <form onSubmit={handleFamilyLogin} className="space-y-6">
                                    <div>
                                        <label htmlFor="family-email" className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('login.emailLabel')}
                                        </label>
                                        <input
                                            id="family-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            placeholder={t('login.emailPlaceholder')}
                                        />
                                    </div>

                                    {/* 密碼欄位（自動填入時顯示） */}
                                    <div>
                                        <label htmlFor="family-password" className="block text-sm font-medium text-gray-700 mb-2">
                                            密碼 <span className="text-gray-400 font-normal">(可選，或使用魔法連結)</span>
                                        </label>
                                        <input
                                            id="family-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            placeholder="輸入密碼或留空使用魔法連結"
                                        />
                                    </div>

                                    {!password && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex gap-3">
                                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-medium mb-1">什么是魔法链接？</p>
                                                    <p>不输入密碼時，我们会向您的邮箱发送一个安全的登录链接。</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                {password ? '登入中...' : '发送中...'}
                                            </span>
                                        ) : (
                                            password ? '🚀 登入' : '发送魔法链接'
                                        )}
                                    </button>

                                    <p className="text-center text-sm text-gray-500">
                                        家属专用 - 可用密碼或魔法連結登入
                                    </p>
                                </form>
                            </div>
                        )}

                        {/* 自動填入提示 */}
                        {autoFilled && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-700 text-center">
                                    ✅ 測試帳號已自動填入，請點擊登入按鈕
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 页脚 */}
                <div className="text-center mt-8 text-blue-200 text-sm">
                    <p>© 2026 {t('login.subtitle')}. Powered by Supabase</p>
                </div>
            </div>
        </div>

    )
}

// Suspense 包裝以支援 useSearchParams
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}

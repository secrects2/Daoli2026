'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RoleOption {
    id: 'pharmacist' | 'family'
    title: string
    icon: string
    description: string
    features: string[]
    loginUrl: string
    dashboardUrl: string
    credentials: { email: string; password: string }
    color: string
}

const roles: RoleOption[] = [
    {
        id: 'pharmacist',
        title: '藥師 / 店長',
        icon: '💊',
        description: '管理地壺球比賽記錄、長輩積分、證據審核',
        features: [
            '📝 創建和記錄比賽',
            '📸 上傳證據照片/影片',
            '👴 管理長輩資料',
            '📱 生成 QR Code 卡片',
            '💰 發放兌換積分',
            '🔍 審核比賽證據',
            '📊 查看交易記錄'
        ],
        loginUrl: '/login',
        dashboardUrl: '/pharmacist/dashboard',
        credentials: { email: 'pharmacist_test@example.com', password: 'Test123456!' },
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'family',
        title: '家屬',
        icon: '👨‍👩‍👧',
        description: '追蹤長輩的比賽表現和積分變化',
        features: [
            '👴 查看綁定長輩資訊',
            '🏆 追蹤比賽成績',
            '📊 統計數據分析',
            '🔔 接收比賽通知',
            '📋 完整比賽記錄',
            '📷 檢視證據照片'
        ],
        loginUrl: '/login',
        dashboardUrl: '/family/dashboard',
        credentials: { email: 'family_test@example.com', password: 'Test123456!' },
        color: 'from-purple-500 to-pink-500'
    }
]

export default function GuidePage() {
    const router = useRouter()
    const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null)
    const [showCredentials, setShowCredentials] = useState(false)

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
            {/* 頂部導航 */}
            <nav className="bg-black/20 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🥌</span>
                            <div>
                                <h1 className="text-xl font-bold text-white">道里地壺球</h1>
                                <p className="text-xs text-white/60">Floor Curling Platform</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                            🔒 內部測試版
                        </span>
                    </div>
                </div>
            </nav>

            {/* 主內容 */}
            <main className="max-w-6xl mx-auto px-4 py-12">
                {/* 標題區 */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        歡迎使用測試版 👋
                    </h2>
                    <p className="text-xl text-white/70 max-w-2xl mx-auto">
                        請選擇您的角色，系統將引導您體驗相關功能
                    </p>
                </div>

                {/* 角色選擇卡片 */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role)}
                            className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 ${selectedRole?.id === role.id
                                ? 'bg-white border-white shadow-2xl scale-[1.02]'
                                : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`text-5xl p-3 rounded-xl bg-gradient-to-br ${role.color}`}>
                                    {role.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-2xl font-bold mb-2 ${selectedRole?.id === role.id ? 'text-gray-900' : 'text-white'
                                        }`}>
                                        {role.title}
                                    </h3>
                                    <p className={`text-sm mb-4 ${selectedRole?.id === role.id ? 'text-gray-600' : 'text-white/70'
                                        }`}>
                                        {role.description}
                                    </p>

                                    {/* 功能列表 */}
                                    <div className="space-y-2">
                                        {role.features.map((feature, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-sm ${selectedRole?.id === role.id ? 'text-gray-700' : 'text-white/80'
                                                    }`}
                                            >
                                                {feature}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 選中角色後顯示操作區 */}
                {selectedRole && (
                    <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-4xl">{selectedRole.icon}</span>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    以 {selectedRole.title} 身份體驗
                                </h3>
                                <p className="text-gray-500">使用測試帳號登入系統</p>
                            </div>
                        </div>

                        {/* 測試帳號資訊 */}
                        <div className="bg-gray-50 rounded-xl p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-900">測試帳號</h4>
                                <button
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    {showCredentials ? '隱藏' : '顯示'}
                                </button>
                            </div>

                            {showCredentials ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="font-mono text-gray-900">{selectedRole.credentials.email}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(selectedRole.credentials.email)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                            title="複製"
                                        >
                                            📋
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500">密碼</p>
                                            <p className="font-mono text-gray-900">{selectedRole.credentials.password}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(selectedRole.credentials.password)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                            title="複製"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">點擊「顯示」查看登入資訊</p>
                            )}
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex gap-4">
                            <Link
                                href={`${selectedRole.loginUrl}?email=${encodeURIComponent(selectedRole.credentials.email)}&password=${encodeURIComponent(selectedRole.credentials.password)}&role=${selectedRole.id}&tour=true`}
                                className={`flex-1 py-4 rounded-xl text-white font-semibold text-center bg-gradient-to-r ${selectedRole.color} hover:opacity-90 transition-opacity`}
                            >
                                🚀 開始體驗（含導覽）
                            </Link>
                            <Link
                                href={`${selectedRole.loginUrl}?email=${encodeURIComponent(selectedRole.credentials.email)}&password=${encodeURIComponent(selectedRole.credentials.password)}&role=${selectedRole.id}`}
                                className="px-6 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                直接登入
                            </Link>
                        </div>
                    </div>
                )}

                {/* 系統架構說明 */}
                <div className="mt-16">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">
                        系統核心機制
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                            <div className="text-3xl mb-3">🔐</div>
                            <h4 className="text-lg font-semibold text-white mb-2">雙帳戶系統</h4>
                            <p className="text-white/70 text-sm">
                                Global Points（榮譽積分）不可兌換，Local Points（兌換積分）可在店內使用
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                            <div className="text-3xl mb-3">📸</div>
                            <h4 className="text-lg font-semibold text-white mb-2">雙機流協議</h4>
                            <p className="text-white/70 text-sm">
                                每回合必須上傳證據照片，確保積分發放有據可查
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                            <div className="text-3xl mb-3">👨‍👩‍👧</div>
                            <h4 className="text-lg font-semibold text-white mb-2">S2B2C 連線</h4>
                            <p className="text-white/70 text-sm">
                                家屬可綁定長輩，即時收到比賽結果通知
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* 頁尾 */}
            <footer className="bg-black/20 mt-16 py-8">
                <div className="max-w-6xl mx-auto px-4 text-center text-white/50 text-sm">
                    <p>道里國際地壺球 © 2026 - 內部測試版</p>
                    <p className="mt-1">如有問題請聯繫開發團隊</p>
                </div>
            </footer>

            {/* 動畫樣式 */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}

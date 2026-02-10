'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(false)

    const handleSelectRole = async (role: 'family' | 'elder') => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Update Profile Role
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', user.id)

            if (error) throw error

            // Redirect based on role
            router.refresh() // Refresh to update middleware/server state awareness if needed
            if (role === 'family') {
                router.push('/family/dashboard')
            } else {
                router.push('/elder/dashboard')
            }
        } catch (error) {
            console.error('Error setting role:', error)
            toast.error('設定身份時發生錯誤，請稍後再試')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div>
                    <h1 className="ios-large-title text-center">歡迎加入</h1>
                    <p className="text-gray-500 mt-2">請選擇您的身份以繼續</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => handleSelectRole('elder')}
                        disabled={loading}
                        className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 transition-all flex items-center gap-4 text-left group"
                    >
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            👴
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">我是長輩 / 參賽者</h3>
                            <p className="text-sm text-gray-500">查看我的比賽成績與 QR Code</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleSelectRole('family')}
                        disabled={loading}
                        className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-green-500 transition-all flex items-center gap-4 text-left group"
                    >
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            👨‍👩‍👧‍👦
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">我是家屬 / 照護者</h3>
                            <p className="text-sm text-gray-500">綁定長輩帳號並接收通知</p>
                        </div>
                    </button>
                </div>

                {loading && (
                    <div className="text-sm text-gray-400 animate-pulse">
                        正在設定您的身份...
                    </div>
                )}
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createStore } from '../actions'

export default function NewStorePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setError(null)

        try {
            const result = await createStore(formData)
            if (result.error) throw new Error(result.error)
            router.push('/admin/stores')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">新增加盟店</h1>
                    <Link href="/admin/stores" className="text-gray-500 hover:text-gray-900">
                        取消
                    </Link>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                店鋪名稱 (Store Name) *
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                className="mt-1 ios-input"
                                placeholder="例如：台北大安旗艦店"
                            />
                        </div>

                        <div>
                            <label htmlFor="id" className="block text-sm font-medium text-gray-700">
                                自訂 ID (Custom ID) <span className="text-gray-400 font-normal">- 可選，若留空將自動生成</span>
                            </label>
                            <input
                                type="text"
                                name="id"
                                id="id"
                                className="mt-1 ios-input"
                                placeholder="例如：TP_DAAN_01 (只能包含英數字與底線)"
                                pattern="[A-Za-z0-9_]+"
                            />
                            <p className="mt-1 text-xs text-gray-500">ID 建立後無法修改。</p>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                地址 / 位置 (Location)
                            </label>
                            <input
                                type="text"
                                name="location"
                                id="location"
                                className="mt-1 ios-input"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="ios-btn bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                            >
                                {loading ? '建立中...' : '確認建立'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

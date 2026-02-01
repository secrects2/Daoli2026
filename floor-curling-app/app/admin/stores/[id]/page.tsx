'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateStore, getStore } from '../actions'

export default function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [store, setStore] = useState<any>(null)

    useEffect(() => {
        const fetchStore = async () => {
            const result = await getStore(id)
            if (result.error) {
                setError(result.error)
            } else {
                setStore(result.store)
            }
            setLoading(false)
        }
        fetchStore()
    }, [id])

    const handleSubmit = async (formData: FormData) => {
        setSaving(true)
        setError(null)

        try {
            const result = await updateStore(id, formData)
            if (result.error) throw new Error(result.error)
            router.push('/admin/stores')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>
    if (!store) return <div className="p-8 text-center text-red-500">找不到該店鋪</div>

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">編輯加盟店</h1>
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
                            <label className="block text-sm font-medium text-gray-700">
                                店鋪 ID
                            </label>
                            <input
                                type="text"
                                disabled
                                value={store.id}
                                className="mt-1 ios-input bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                店鋪名稱 (Store Name) *
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                defaultValue={store.name}
                                className="mt-1 ios-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                地址 / 位置 (Location)
                            </label>
                            <input
                                type="text"
                                name="location"
                                id="location"
                                defaultValue={store.location}
                                className="mt-1 ios-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                                狀態
                            </label>
                            <select
                                name="status"
                                id="status"
                                defaultValue={store.status}
                                className="mt-1 ios-input"
                            >
                                <option value="active">正常營運 (Active)</option>
                                <option value="suspended">暫停 (Suspended)</option>
                                <option value="closed">關閉 (Closed)</option>
                            </select>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="ios-btn bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                            >
                                {saving ? '儲存中...' : '儲存變更'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

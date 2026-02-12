'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface User {
    id: string
    email: string
    full_name: string
    nickname: string
    role: string
    store_id: string
    phone: string
    is_active: boolean
    created_at: string
    stores?: { name: string }
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    admin: { label: '管理員', color: 'bg-red-100 text-red-700' },
    pharmacist: { label: '店長', color: 'bg-blue-100 text-blue-700' },
    elder: { label: '長輩', color: 'bg-green-100 text-green-700' },
    family: { label: '家屬', color: 'bg-purple-100 text-purple-700' }
}

export default function AdminUsersPage() {
    const supabase = createClientComponentClient()
    const { confirm } = useConfirm()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [stores, setStores] = useState<{ id: string; name: string }[]>([])

    const [form, setForm] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'elder',
        store_id: '',
        nickname: '',
        phone: ''
    })

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const query = new URLSearchParams()
            if (filter !== 'all') query.append('role', filter)

            const res = await fetch(`/api/admin/users?${query.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch users')
            const data = await res.json()
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('無法載入用戶列表')
        } finally {
            setLoading(false)
        }
    }

    const fetchStores = async () => {
        try {
            const res = await fetch('/api/admin/stores')
            if (res.ok) {
                const data = await res.json()
                setStores(data)
            }
        } catch (error) {
            console.error('Error fetching stores:', error)
        }
    }

    useEffect(() => {
        fetchUsers()
        fetchStores()
    }, [filter])

    const handleCreate = async () => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error)
            }

            toast.success('用戶創建成功！')
            setShowModal(false)
            resetForm()
            fetchUsers()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleUpdate = async () => {
        if (!editingUser) return

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingUser.id,
                    full_name: form.full_name,
                    role: form.role,
                    store_id: form.store_id || null,
                    nickname: form.nickname,
                    phone: form.phone
                })
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error)
            }

            toast.success('用戶更新成功！')
            setShowModal(false)
            setEditingUser(null)
            resetForm()
            fetchUsers()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleDelete = async (userId: string) => {
        if (!await confirm({ message: '確定要停用此用戶嗎？', variant: 'danger' })) return

        try {
            const response = await fetch(`/api/admin/users?id=${userId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error)
            }

            toast.success('用戶已停用')
            fetchUsers()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setForm({
            email: user.email || '',
            password: '',
            full_name: user.full_name || '',
            role: user.role || 'elder',
            store_id: user.store_id || '',
            nickname: user.nickname || '',
            phone: user.phone || ''
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setForm({
            email: '',
            password: '',
            full_name: '',
            role: 'elder',
            store_id: '',
            nickname: '',
            phone: ''
        })
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-5 pt-12 pb-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">用戶管理</h1>
                            <p className="text-sm text-gray-500">共 {users.length} 位用戶</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(`/api/admin/export?type=users&format=csv&role=${filter}`, '_blank')}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            匯出 CSV
                        </button>
                        <button
                            onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            新增用戶
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-5 py-4">
                <div className="flex gap-2 flex-wrap">
                    {[
                        { key: 'all', label: '全部' },
                        { key: 'admin', label: '管理員' },
                        { key: 'pharmacist', label: '店長' },
                        { key: 'elder', label: '長輩' },
                        { key: 'family', label: '家屬' }
                    ].map(item => (
                        <button
                            key={item.key}
                            onClick={() => setFilter(item.key)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === item.key
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="max-w-6xl mx-auto px-5">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">用戶</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">角色</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">門店</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">狀態</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900">{user.full_name || user.nickname || '未命名'}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_LABELS[user.role]?.color || 'bg-gray-100 text-gray-600'}`}>
                                                {ROLE_LABELS[user.role]?.label || user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {user.stores?.name || user.store_id || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.is_active !== false ? '活躍' : '停用'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="px-3 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                                            >
                                                編輯
                                            </button>
                                            {user.is_active !== false && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    停用
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingUser ? '編輯用戶' : '新增用戶'}
                        </h3>

                        <div className="space-y-4">
                            {!editingUser && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">電子郵件 *</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">密碼 *</label>
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">角色 *</label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="elder">長輩</option>
                                    <option value="family">家屬</option>
                                    <option value="pharmacist">店長</option>
                                    <option value="admin">管理員</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">所屬門店</label>
                                <select
                                    value={form.store_id}
                                    onChange={e => setForm({ ...form, store_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">無</option>
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">暱稱</label>
                                    <input
                                        type="text"
                                        value={form.nickname}
                                        onChange={e => setForm({ ...form, nickname: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">電話</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowModal(false); setEditingUser(null); }}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={editingUser ? handleUpdate : handleCreate}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                {editingUser ? '儲存' : '創建'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

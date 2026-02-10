'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface Product {
    id: string
    name: string
    description: string
    category: string
    price_global: number
    price_local: number
    stock_quantity: number
    image_url: string
    is_active: boolean
    created_at: string
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    equipment: { label: '裝備', color: 'bg-blue-100 text-blue-700', emoji: '🎯' },
    apparel: { label: '服飾', color: 'bg-purple-100 text-purple-700', emoji: '👕' },
    accessory: { label: '配件', color: 'bg-green-100 text-green-700', emoji: '🎒' },
    consumable: { label: '消耗品', color: 'bg-orange-100 text-orange-700', emoji: '🧃' },
    voucher: { label: '兌換券', color: 'bg-pink-100 text-pink-700', emoji: '🎫' }
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const { confirm } = useConfirm()

    const [form, setForm] = useState({
        name: '',
        description: '',
        category: 'equipment',
        price_global: 0,
        price_local: 0,
        stock_quantity: 0,
        image_url: '',
        is_active: true
    })

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const query = new URLSearchParams()
            if (filter !== 'all') query.append('category', filter)

            const res = await fetch(`/api/admin/products?${query.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch products')
            const data = await res.json()
            setProducts(data)
        } catch (error) {
            console.error('Error fetching products:', error)
            toast.error('無法載入商品列表')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [filter])

    const handleCreate = async () => {
        try {
            const response = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error)
            }

            toast.success('商品新增成功！')
            setShowModal(false)
            resetForm()
            fetchProducts()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleUpdate = async () => {
        if (!editingProduct) return

        try {
            const response = await fetch('/api/admin/products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingProduct.id,
                    ...form
                })
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error)
            }

            toast.success('商品更新成功！')
            setShowModal(false)
            setEditingProduct(null)
            resetForm()
            fetchProducts()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const handleDelete = async (productId: string) => {
        if (!await confirm({ message: '確定要下架此商品嗎？', variant: 'danger' })) return

        try {
            const response = await fetch(`/api/admin/products?id=${productId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error)
            }

            toast.success('商品已下架')
            fetchProducts()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const openEditModal = (product: Product) => {
        setEditingProduct(product)
        setForm({
            name: product.name || '',
            description: product.description || '',
            category: product.category || 'equipment',
            price_global: product.price_global || 0,
            price_local: product.price_local || 0,
            stock_quantity: product.stock_quantity || 0,
            image_url: product.image_url || '',
            is_active: product.is_active !== false
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            category: 'equipment',
            price_global: 0,
            price_local: 0,
            stock_quantity: 0,
            image_url: '',
            is_active: true
        })
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 頂部導航 */}
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
                            <h1 className="text-2xl font-black text-gray-900">商品管理</h1>
                            <p className="text-sm text-gray-500">共 {products.length} 件商品</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingProduct(null); resetForm(); setShowModal(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新增商品
                    </button>
                </div>
            </div>

            {/* 分類篩選 */}
            <div className="max-w-6xl mx-auto px-5 py-4">
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === 'all'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        全部
                    </button>
                    {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${filter === key
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            <span>{emoji}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 商品列表 */}
            <div className="max-w-6xl mx-auto px-5">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">📦</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">尚無商品</h3>
                        <p className="text-gray-500 text-sm">點擊右上方「新增商品」開始添加</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(product => {
                            const cat = CATEGORY_LABELS[product.category] || { label: product.category, color: 'bg-gray-100 text-gray-600', emoji: '📦' }

                            return (
                                <div
                                    key={product.id}
                                    className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${product.is_active ? 'border-gray-100' : 'border-red-200 bg-red-50/30'
                                        }`}
                                >
                                    {/* 商品圖片 */}
                                    <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-5xl">{cat.emoji}</span>
                                        )}
                                    </div>

                                    {/* 商品資訊 */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${cat.color}`}>
                                            {cat.label}
                                        </span>
                                    </div>

                                    {product.description && (
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                                    )}

                                    {/* 價格與庫存 */}
                                    <div className="flex items-center gap-4 mb-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-500">🪙</span>
                                            <span className="font-bold text-gray-900">{product.price_local}</span>
                                            <span className="text-gray-400">本地積分</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-blue-500">💎</span>
                                            <span className="font-bold text-gray-900">{product.price_global}</span>
                                            <span className="text-gray-400">全域積分</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            庫存: {product.stock_quantity}
                                        </span>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="px-3 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                編輯
                                            </button>
                                            {product.is_active && (
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    下架
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {!product.is_active && (
                                        <div className="mt-3 text-center text-xs text-red-500 font-bold bg-red-100 rounded-lg py-1">
                                            已下架
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 新增/編輯彈窗 */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingProduct ? '編輯商品' : '新增商品'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">商品名稱 *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="輸入商品名稱"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">商品描述</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="輸入商品描述"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">分類 *</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
                                        <option key={key} value={key}>{emoji} {label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">本地積分價格</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price_local}
                                        onChange={e => setForm({ ...form, price_local: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">全域積分價格</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.price_global}
                                        onChange={e => setForm({ ...form, price_global: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">庫存數量</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.stock_quantity}
                                    onChange={e => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">圖片網址</label>
                                <input
                                    type="url"
                                    value={form.image_url}
                                    onChange={e => setForm({ ...form, image_url: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-gray-700">上架中</label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowModal(false); setEditingProduct(null); }}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={editingProduct ? handleUpdate : handleCreate}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                {editingProduct ? '儲存' : '新增'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

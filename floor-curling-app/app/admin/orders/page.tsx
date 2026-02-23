'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import toast from 'react-hot-toast'

interface Order {
    id: string
    order_number: string
    status: string
    total_amount: number
    note: string | null
    created_at: string
    paid_at: string | null
    completed_at: string | null
    buyer: { id: string; full_name: string; email: string }
    recipient: { id: string; full_name: string }
    order_items: { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[]
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: '已付款', color: 'bg-blue-100 text-blue-800' },
    processing: { label: '處理中', color: 'bg-purple-100 text-purple-800' },
    shipped: { label: '已送達', color: 'bg-indigo-100 text-indigo-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
    refunded: { label: '已退款', color: 'bg-red-100 text-red-800' },
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('')
    const [updating, setUpdating] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const query = new URLSearchParams()
            if (filter) query.append('status', filter)

            const res = await fetch(`/api/admin/orders?${query.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setOrders(data)
            } else {
                toast.error('無法載入訂單')
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
            toast.error('無法載入訂單')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [filter])

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setUpdating(true)
        try {
            const res = await fetch('/api/admin/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus })
            })

            if (res.ok) {
                fetchOrders()
                setSelectedOrder(null)
                toast.success('狀態更新成功')
            } else {
                const data = await res.json()
                toast.error(data.error)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setUpdating(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">📦 訂單管理</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.open(`/api/admin/export?type=orders&format=csv&status=${filter}`, '_blank')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            匯出 CSV
                        </button>
                        <button
                            onClick={fetchOrders}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            刷新
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${!filter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        全部
                    </button>
                    {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Orders Table */}
                {loading ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                        目前沒有訂單
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">訂單編號</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">購買者</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">收禮者</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">金額</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">狀態</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">建立時間</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-700">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                                        <td className="px-4 py-3">{order.buyer?.full_name || '-'}</td>
                                        <td className="px-4 py-3">{order.recipient?.full_name || '-'}</td>
                                        <td className="px-4 py-3 font-medium">NT$ {order.total_amount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[order.status]?.color || 'bg-gray-100'}`}>
                                                {STATUS_MAP[order.status]?.label || order.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                詳情
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">訂單詳情</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">訂單編號</span>
                                    <p className="font-mono">{selectedOrder.order_number}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">狀態</span>
                                    <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[selectedOrder.status]?.color}`}>
                                        {STATUS_MAP[selectedOrder.status]?.label}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-500">購買者</span>
                                    <p>{selectedOrder.buyer?.full_name}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">收禮者</span>
                                    <p>{selectedOrder.recipient?.full_name}</p>
                                </div>
                            </div>

                            {selectedOrder.note && (
                                <div className="bg-yellow-50 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800">💬 {selectedOrder.note}</p>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">購買商品</h4>
                                {selectedOrder.order_items.map(item => (
                                    <div key={item.id} className="flex justify-between py-2">
                                        <span>{item.product_name} x{item.quantity}</span>
                                        <span>NT$ {item.subtotal}</span>
                                    </div>
                                ))}
                                <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                                    <span>總計</span>
                                    <span className="text-orange-600">NT$ {selectedOrder.total_amount}</span>
                                </div>
                            </div>

                            {/* Status Update */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-2">更新狀態</h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleUpdateStatus(selectedOrder.id, key)}
                                            disabled={updating || selectedOrder.status === key}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedOrder.status === key
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                } disabled:opacity-50`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

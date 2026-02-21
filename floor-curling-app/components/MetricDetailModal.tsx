'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricDetailModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    unit: string
    color: string
    icon: React.ReactNode
    data: Array<{ date: string; value: number }>
    chartType?: 'line' | 'bar'
}

export default function MetricDetailModal({
    isOpen,
    onClose,
    title,
    unit,
    color,
    icon,
    data,
    chartType = 'line'
}: MetricDetailModalProps) {
    const [range, setRange] = useState<'7' | '30'>('7')

    if (!isOpen) return null

    const filteredData = range === '7' ? data.slice(-7) : data
    const avg = filteredData.length > 0
        ? Math.round(filteredData.reduce((sum, d) => sum + d.value, 0) / filteredData.length)
        : 0
    const max = Math.max(...filteredData.map(d => d.value))
    const min = Math.min(...filteredData.map(d => d.value))

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center pt-12 sm:pt-0 p-0 sm:p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-5 pb-3 border-b border-gray-100 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md`} style={{ backgroundColor: color }}>
                                {icon}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900">{title}</h2>
                                <p className="text-xs text-gray-500 font-medium">近{range}日趨勢</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            title="關閉"
                            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Range Tabs */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => setRange('7')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${range === '7' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                            style={range === '7' ? { backgroundColor: color } : {}}
                        >
                            近7日
                        </button>
                        <button
                            onClick={() => setRange('30')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${range === '30' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                            style={range === '30' ? { backgroundColor: color } : {}}
                        >
                            近30日
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="px-5 py-4 grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">平均</p>
                        <p className="text-lg font-black text-gray-900">{avg.toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-gray-400">{unit}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">最高</p>
                        <p className="text-lg font-black text-green-600">{max.toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-gray-400">{unit}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-400 mb-1">最低</p>
                        <p className="text-lg font-black text-orange-500">{min.toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-gray-400">{unit}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="px-5 pb-4">
                    <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100" style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <BarChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: 12 }}
                                        formatter={(value: number) => [`${value.toLocaleString()} ${unit}`, title]}
                                    />
                                    <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            ) : (
                                <LineChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: 12 }}
                                        formatter={(value: number) => [`${value.toLocaleString()} ${unit}`, title]}
                                    />
                                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Table */}
                <div className="px-5 pb-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">逐日明細</h4>
                    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left py-2.5 px-4 font-bold">日期</th>
                                    <th className="text-right py-2.5 px-4 font-bold">{title}</th>
                                    <th className="text-right py-2.5 px-4 font-bold">變化</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[...filteredData].reverse().map((item, idx, arr) => {
                                    const prev = arr[idx + 1]
                                    const diff = prev ? item.value - prev.value : 0
                                    const diffPercent = prev && prev.value > 0 ? Math.round((diff / prev.value) * 100) : 0
                                    return (
                                        <tr key={item.date} className="hover:bg-white transition-colors">
                                            <td className="py-2.5 px-4 font-medium text-gray-700">{item.date}</td>
                                            <td className="py-2.5 px-4 text-right font-bold text-gray-900">{item.value.toLocaleString()} <span className="text-gray-400 text-xs">{unit}</span></td>
                                            <td className="py-2.5 px-4 text-right">
                                                {diff !== 0 && (
                                                    <span className={`text-xs font-bold ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {diff > 0 ? '↑' : '↓'} {Math.abs(diffPercent)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

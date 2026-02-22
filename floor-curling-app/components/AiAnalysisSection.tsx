'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAiPrescription } from '@/lib/ai-diagnosis'

interface AiAnalysisSectionProps {
    elderId: string
    showLink?: boolean  // 是否顯示「前往檢測」連結
}

export default function AiAnalysisSection({ elderId, showLink = false }: AiAnalysisSectionProps) {
    const [aiSessions, setAiSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch(`/api/elder/ai-sessions?elderId=${elderId}&t=${Date.now()}`, {
                    cache: 'no-store'
                })
                const data = await res.json()
                setAiSessions(data.sessions || [])
            } catch (err) {
                console.error('無法取得 AI 檢測紀錄', err)
            } finally {
                setLoading(false)
            }
        }
        fetchSessions()
    }, [elderId])

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🤖</span> AI 動作分析與處方
                </h3>
                <p className="text-gray-400 text-sm text-center py-4">載入中...</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🤖</span> AI 動作分析與處方
            </h3>

            {aiSessions.length > 0 ? (
                <div className="space-y-6">
                    {/* 最新處方卡片 */}
                    <div className={`p-5 rounded-xl border-l-4 shadow-sm ${getAiPrescription(aiSessions[0].metrics || {}).color}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg">{getAiPrescription(aiSessions[0].metrics || {}).title}</h4>
                            <span className="text-xs opacity-75">{new Date(aiSessions[0].created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm opacity-90">{getAiPrescription(aiSessions[0].metrics || {}).content}</p>

                        {/* 關鍵指標 */}
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-black/5">
                            <div className="text-center">
                                <p className="text-xs opacity-70">手肘 ROM</p>
                                <p className="font-black text-xl">{aiSessions[0].metrics?.avg_rom || '--'}°</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs opacity-70">軀幹穩定</p>
                                <p className="font-black text-xl">{aiSessions[0].metrics?.avg_trunk_tilt || '--'}°</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs opacity-70">穩定率</p>
                                <p className="font-black text-xl">{aiSessions[0].metrics?.stable_ratio || 0}%</p>
                            </div>
                        </div>
                    </div>

                    {/* AI 智能推薦 */}
                    <div className="p-5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 text-7xl opacity-5">💡</div>
                        <h4 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2 relative z-10">
                            <span>✨</span> AI 智能推薦
                        </h4>
                        <p className="text-sm text-indigo-800 mb-4 relative z-10 font-medium tracking-wide">
                            根據 AI 處方分析結果，推薦最適合的產品組合：
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                            {getAiPrescription(aiSessions[0].metrics || {}).recommendedProducts?.map((product, idx) => (
                                <div key={idx} className="bg-white/90 backdrop-blur-sm p-3 rounded-xl flex items-center gap-3 shadow-sm border border-indigo-50 hover:border-indigo-200 transition-all">
                                    <div className="text-3xl bg-indigo-50/50 w-12 h-12 flex items-center justify-center rounded-lg">{product.icon}</div>
                                    <div>
                                        <p className="font-bold text-gray-900">{product.name}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{product.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 歷史檢測紀錄 */}
                    {aiSessions.length > 1 && (
                        <div className="space-y-2">
                            <h5 className="text-sm font-bold text-gray-500">歷史檢測紀錄</h5>
                            {aiSessions.slice(1, 4).map(session => (
                                <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div>
                                        <p className="font-bold text-sm">{new Date(session.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-500">
                                            ROM: {session.metrics?.avg_rom}° | 穩定: {session.metrics?.avg_trunk_tilt}°
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getAiPrescription(session.metrics).color.includes('green') ? 'bg-green-100 text-green-700' :
                                            getAiPrescription(session.metrics).color.includes('red') ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {getAiPrescription(session.metrics).title.split(' ')[1]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">尚無 AI 檢測紀錄</p>
                    {showLink && (
                        <Link href="/pharmacist/ai-test" className="text-blue-600 font-bold text-sm mt-2 inline-block hover:underline">
                            前往進行檢測 &rarr;
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

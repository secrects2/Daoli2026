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
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

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
            <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <span>🤖</span> AI 動作分析與處方
                </h3>
                <p className="text-muted-foreground text-sm text-center py-4">載入中...</p>
            </div>
        )
    }

    return (
        <div className="bg-card p-6 rounded-2xl shadow-card border border-border/50">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <span>🤖</span> AI 動作分析與處方
            </h3>

            {aiSessions.length > 0 ? (
                <div className="space-y-6">
                    {/* 最新處方卡片 */}
                    <div className={`p-5 rounded-xl border-l-4 shadow-card ${getAiPrescription(aiSessions[0].metrics || {}).color}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg">{getAiPrescription(aiSessions[0].metrics || {}).title}</h4>
                            <span className="text-xs opacity-75">{new Date(aiSessions[0].created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm opacity-90">{getAiPrescription(aiSessions[0].metrics || {}).content}</p>

                        {/* 關鍵指標 */}
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-black/5">
                            <div className="text-center">
                                <p className="text-xs opacity-70">手肘 ROM</p>
                                <p className="font-extrabold text-xl">{aiSessions[0].metrics?.avg_rom || '--'}°</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs opacity-70">軀幹穩定</p>
                                <p className="font-extrabold text-xl">{aiSessions[0].metrics?.avg_trunk_tilt || '--'}°</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs opacity-70">穩定率</p>
                                <p className="font-extrabold text-xl">{aiSessions[0].metrics?.stable_ratio || 0}%</p>
                            </div>
                        </div>
                    </div>

                    {/* 進階數據面板（永遠顯示） */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-background px-4 py-2 border-b border-border">
                            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">進階生物力學數據</h5>
                        </div>
                        <div className="p-4 space-y-3">
                            {/* 中轴稳定度 + 出手速度 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-background rounded-lg">
                                    <p className="text-[10px] text-muted-foreground mb-1">中軸偏移</p>
                                    <p className={`text-lg font-bold ${(aiSessions[0].metrics?.core_stability_angle || 0) > 15 ? 'text-red-500' : 'text-cyan-600'}`}>
                                        {aiSessions[0].metrics?.core_stability_angle ?? '--'}°
                                    </p>
                                </div>
                                <div className="p-3 bg-background rounded-lg">
                                    <p className="text-[10px] text-muted-foreground mb-1">出手速度均值</p>
                                    <p className="text-lg font-bold text-emerald-600">{aiSessions[0].metrics?.avg_velocity ?? '--'}</p>
                                </div>
                            </div>

                            {/* 角速度 */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-background rounded-lg text-center">
                                    <p className="text-[10px] text-muted-foreground">肩角速</p>
                                    <p className="text-sm font-bold text-purple-600">{aiSessions[0].metrics?.avg_shoulder_angular_vel ?? '--'}°/s</p>
                                </div>
                                <div className="p-2 bg-background rounded-lg text-center">
                                    <p className="text-[10px] text-muted-foreground">肘角速</p>
                                    <p className="text-sm font-bold text-purple-600">{aiSessions[0].metrics?.avg_elbow_angular_vel ?? '--'}°/s</p>
                                </div>
                                <div className="p-2 bg-background rounded-lg text-center">
                                    <p className="text-[10px] text-muted-foreground">腕角速</p>
                                    <p className="text-sm font-bold text-purple-600">{aiSessions[0].metrics?.avg_wrist_angular_vel ?? '--'}°/s</p>
                                </div>
                            </div>

                            {/* 震颤 & 代偿 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-lg ${(aiSessions[0].metrics?.tremor_detected_ratio || 0) > 0 ? 'bg-red-50 border border-red-100' : 'bg-background'}`}>
                                    <p className="text-[10px] text-muted-foreground mb-1">震顫檢出率</p>
                                    <p className={`text-lg font-bold ${(aiSessions[0].metrics?.tremor_detected_ratio || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {aiSessions[0].metrics?.tremor_detected_ratio != null ? `${aiSessions[0].metrics.tremor_detected_ratio}%` : '--'}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${(aiSessions[0].metrics?.compensation_detected_ratio || 0) > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-background'}`}>
                                    <p className="text-[10px] text-muted-foreground mb-1">代償動作</p>
                                    <p className={`text-lg font-bold ${(aiSessions[0].metrics?.compensation_detected_ratio || 0) > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                        {aiSessions[0].metrics?.compensation_detected_ratio != null ? `${aiSessions[0].metrics.compensation_detected_ratio}%` : '--'}
                                    </p>
                                    {aiSessions[0].metrics?.compensation_types?.length > 0 && (
                                        <p className="text-[10px] text-orange-400 mt-0.5">{aiSessions[0].metrics.compensation_types.join(', ')}</p>
                                    )}
                                </div>
                            </div>

                            {/* 坐姿修正 & 手指张开 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-background rounded-lg">
                                    <p className="text-[10px] text-muted-foreground mb-1">坐姿修正量</p>
                                    <p className="text-lg font-bold text-primary">{aiSessions[0].metrics?.posture_correction_avg ?? '--'}°</p>
                                </div>
                                <div className="p-3 bg-background rounded-lg">
                                    <p className="text-[10px] text-muted-foreground mb-1">🤚 手指張開度</p>
                                    <p className="text-lg font-bold text-amber-600">{aiSessions[0].metrics?.finger_spread_avg ?? '--'}°</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI 智能推薦 */}
                    <div className="p-5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-card relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 text-7xl opacity-5">💡</div>
                        <h4 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2 relative z-10">
                            <span>✨</span> AI 智能推薦
                        </h4>
                        <p className="text-sm text-indigo-800 mb-4 relative z-10 font-medium tracking-wide">
                            根據 AI 處方分析結果，推薦最適合的產品組合：
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                            {getAiPrescription(aiSessions[0].metrics || {}).recommendedProducts?.map((product, idx) => (
                                <div key={idx} className="bg-card/90 backdrop-blur-sm p-3 rounded-xl flex items-center gap-3 shadow-card border border-indigo-50 hover:border-indigo-200 transition-all">
                                    <div className="text-3xl bg-indigo-50/50 w-12 h-12 flex items-center justify-center rounded-lg">{product.icon}</div>
                                    <div>
                                        <p className="font-bold text-foreground">{product.name}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{product.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 歷史檢測紀錄（可展開） */}
                    {aiSessions.length > 1 && (
                        <div className="space-y-2">
                            <h5 className="text-sm font-bold text-muted-foreground">歷史檢測紀錄</h5>
                            {aiSessions.slice(1).map(session => {
                                const isExpanded = expandedSessionId === session.id
                                const m = session.metrics || {}
                                return (
                                    <div key={session.id} className="rounded-lg border border-border/50 overflow-hidden">
                                        <button
                                            onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                            className="w-full flex justify-between items-center p-3 bg-background hover:bg-muted transition-colors text-left"
                                        >
                                            <div>
                                                <p className="font-bold text-sm">{new Date(session.created_at).toLocaleDateString()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    ROM: {m.avg_rom ?? '--'}° | 穩定: {m.avg_trunk_tilt ?? '--'}°
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${getAiPrescription(m).color.includes('green') ? 'bg-green-100 text-green-700' :
                                                    getAiPrescription(m).color.includes('red') ? 'bg-red-100 text-red-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {getAiPrescription(m).title.split(' ')[1]}
                                                </span>
                                                <span className="text-muted-foreground text-xs">{isExpanded ? '▲' : '▼'}</span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="p-3 border-t border-border/50 space-y-2 bg-card">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">手肘 ROM</p>
                                                        <p className="text-sm font-bold text-foreground">{m.avg_rom ?? '--'}°</p>
                                                    </div>
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">軀幹傾斜</p>
                                                        <p className="text-sm font-bold text-foreground">{m.avg_trunk_tilt ?? '--'}°</p>
                                                    </div>
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">穩定率</p>
                                                        <p className="text-sm font-bold text-foreground">{m.stable_ratio ?? '--'}%</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">中軸偏移</p>
                                                        <p className={`text-sm font-bold ${(m.core_stability_angle || 0) > 15 ? 'text-red-500' : 'text-cyan-600'}`}>{m.core_stability_angle ?? '--'}°</p>
                                                    </div>
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">出手速度</p>
                                                        <p className="text-sm font-bold text-emerald-600">{m.avg_velocity ?? '--'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">肩角速</p>
                                                        <p className="text-xs font-bold text-purple-600">{m.avg_shoulder_angular_vel ?? '--'}°/s</p>
                                                    </div>
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">肘角速</p>
                                                        <p className="text-xs font-bold text-purple-600">{m.avg_elbow_angular_vel ?? '--'}°/s</p>
                                                    </div>
                                                    <div className="p-2 bg-background rounded-lg text-center">
                                                        <p className="text-[10px] text-muted-foreground">腕角速</p>
                                                        <p className="text-xs font-bold text-purple-600">{m.avg_wrist_angular_vel ?? '--'}°/s</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className={`p-2 rounded-lg text-center ${(m.tremor_detected_ratio || 0) > 0 ? 'bg-red-50' : 'bg-background'}`}>
                                                        <p className="text-[10px] text-muted-foreground">震顫</p>
                                                        <p className={`text-sm font-bold ${(m.tremor_detected_ratio || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                            {m.tremor_detected_ratio != null ? `${m.tremor_detected_ratio}%` : '--'}
                                                        </p>
                                                    </div>
                                                    <div className={`p-2 rounded-lg text-center ${(m.compensation_detected_ratio || 0) > 0 ? 'bg-orange-50' : 'bg-background'}`}>
                                                        <p className="text-[10px] text-muted-foreground">代償</p>
                                                        <p className={`text-sm font-bold ${(m.compensation_detected_ratio || 0) > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                                            {m.compensation_detected_ratio != null ? `${m.compensation_detected_ratio}%` : '--'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {m.throw_marks?.length > 0 && (
                                                    <div className="mt-1 p-2 bg-amber-50 rounded-lg">
                                                        <p className="text-[10px] font-bold text-amber-700 mb-1">📌 手動標記 ({m.manual_throw_count} 球)</p>
                                                        {m.throw_marks.map((t: any, i: number) => (
                                                            <p key={i} className="text-[10px] text-amber-600">#{i + 1} ROM {t.rom}° | 傾斜 {t.tilt}° | 速度 {t.velocity}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 bg-background rounded-xl border border-dashed border-gray-300">
                    <p className="text-muted-foreground">尚無 AI 檢測紀錄</p>
                    {showLink && (
                        <Link href="/pharmacist/ai-test" className="text-primary font-bold text-sm mt-2 inline-block hover:underline">
                            前往進行檢測 &rarr;
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ConfirmContext'

interface Match {
    id: string
    created_at: string
    winner_color: 'red' | 'yellow' | 'draw' | null
    red_score: number
    yellow_score: number
    total_ends: number
    status: string
}

interface MatchEnd {
    end_number: number
    red_score: number
    yellow_score: number
}

interface Participant {
    id: string
    team: 'red' | 'yellow'
    elder: { id: string; full_name: string; nickname: string }
}

export default function MatchEditPage() {
    const router = useRouter()
    const params = useParams()
    const { confirm } = useConfirm()
    const matchId = params.id as string

    const [match, setMatch] = useState<Match | null>(null)
    const [ends, setEnds] = useState<MatchEnd[]>([])
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchMatch()
    }, [matchId])

    const fetchMatch = async () => {
        try {
            const response = await fetch(`/api/match/${matchId}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            setMatch(data.match)
            setEnds(data.ends || [])
            setParticipants(data.participants || [])
        } catch (error) {
            console.error('Error:', error)
            toast.error('無法獲取比賽資料')
        } finally {
            setLoading(false)
        }
    }

    const handleEndChange = (index: number, field: 'red_score' | 'yellow_score', value: number) => {
        const newEnds = [...ends]
        newEnds[index] = { ...newEnds[index], [field]: value }
        setEnds(newEnds)
    }

    const handleSave = async () => {
        if (!match) return
        setSaving(true)

        try {
            // Calculate totals
            const redTotal = ends.reduce((sum, e) => sum + e.red_score, 0)
            const yellowTotal = ends.reduce((sum, e) => sum + e.yellow_score, 0)

            let winner: 'red' | 'yellow' | 'draw' | null = null
            if (redTotal > yellowTotal) winner = 'red'
            else if (yellowTotal > redTotal) winner = 'yellow'
            else if (redTotal === yellowTotal && redTotal > 0) winner = 'draw'

            const response = await fetch(`/api/match/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    winner_color: winner,
                    red_score: redTotal,
                    yellow_score: yellowTotal,
                    total_ends: ends.length,
                    ends
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error)
            }

            toast.success('儲存成功！')
            router.push('/pharmacist/match/history')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!await confirm({ message: '確定要刪除此比賽嗎？此操作無法復原。', confirmLabel: '刪除', variant: 'danger' })) return

        try {
            const response = await fetch(`/api/match/${matchId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error)
            }

            toast.success('比賽已刪除')
            router.push('/pharmacist/match/history')
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!match) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">找不到比賽</h1>
                    <Link href="/pharmacist/match/history" className="text-blue-600 hover:underline">
                        返回比賽列表
                    </Link>
                </div>
            </div>
        )
    }

    const redTotal = ends.reduce((sum, e) => sum + e.red_score, 0)
    const yellowTotal = ends.reduce((sum, e) => sum + e.yellow_score, 0)

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-5 pt-12 pb-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/pharmacist/match/history"
                            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">編輯比賽</h1>
                            <p className="text-sm text-gray-500">
                                {new Date(match.created_at).toLocaleDateString('zh-TW')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                    >
                        刪除
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
                {/* Score Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">目前比分</h3>
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
                                <span className="text-4xl font-black text-red-600">{redTotal}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-600">紅隊</span>
                        </div>
                        <span className="text-3xl font-bold text-gray-300">VS</span>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mb-2">
                                <span className="text-4xl font-black text-yellow-600">{yellowTotal}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-600">黃隊</span>
                        </div>
                    </div>
                </div>

                {/* Participants */}
                {participants.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">參賽者</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-red-600 font-bold mb-2">紅隊</p>
                                {participants.filter(p => p.team === 'red').map(p => (
                                    <div key={p.id} className="text-sm text-gray-700">
                                        {p.elder?.full_name || p.elder?.nickname || 'Unknown'}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs text-yellow-600 font-bold mb-2">黃隊</p>
                                {participants.filter(p => p.team === 'yellow').map(p => (
                                    <div key={p.id} className="text-sm text-gray-700">
                                        {p.elder?.full_name || p.elder?.nickname || 'Unknown'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Ends Editor */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">回合分數</h3>
                    <div className="space-y-3">
                        {ends.map((end, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <span className="w-16 text-sm font-bold text-gray-500">第 {end.end_number} 局</span>
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={end.red_score}
                                        onChange={e => handleEndChange(index, 'red_score', parseInt(e.target.value) || 0)}
                                        className="w-20 px-3 py-2 text-center border border-red-200 rounded-xl bg-red-50 text-red-700 font-bold focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                    <span className="text-gray-400">:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={end.yellow_score}
                                        onChange={e => handleEndChange(index, 'yellow_score', parseInt(e.target.value) || 0)}
                                        className="w-20 px-3 py-2 text-center border border-yellow-200 rounded-xl bg-yellow-50 text-yellow-700 font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {saving ? '儲存中...' : '儲存變更'}
                </button>
            </div>
        </div>
    )
}

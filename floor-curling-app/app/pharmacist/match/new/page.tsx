'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import { uploadFile } from '@/app/actions/match'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { QRScanModal } from '@/components/QRScanModal'

type End = {
    endNumber: number
    redScore: number
    yellowScore: number
    houseSnapshotFile?: File
    vibeVideoFile?: File
    houseSnapshotUrl?: string
    vibeVideoUrl?: string
}

export default function NewMatchPage() {
    const { t } = useLanguage() // Added
    const router = useRouter()
    const supabase = createClientComponentClient()

    // 状态管理
    const [redElderId, setRedElderId] = useState('')
    const [yellowElderId, setYellowElderId] = useState('')
    const [storeId, setStoreId] = useState('')
    const [ends, setEnds] = useState<End[]>([])
    const [loading, setLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // QR 掃描狀態
    const [showQRScanner, setShowQRScanner] = useState<'red' | 'yellow' | null>(null)

    // QR 掃描處理
    const handleQRScan = (elderId: string) => {
        if (showQRScanner === 'red') {
            setRedElderId(elderId)
        } else if (showQRScanner === 'yellow') {
            setYellowElderId(elderId)
        }
        setShowQRScanner(null)
    }

    // 添加新回合
    const addEnd = () => {
        if (ends.length >= 6) {
            setMessage({ type: 'error', text: 'Max 6 ends' }) // TODO: i18n
            return
        }

        setEnds([...ends, {
            endNumber: ends.length + 1,
            redScore: 0,
            yellowScore: 0
        }])
    }

    // 删除回合
    const removeEnd = (index: number) => {
        setEnds(ends.filter((_, i) => i !== index))
    }

    // 更新回合分数
    const updateEndScore = (index: number, team: 'red' | 'yellow', score: number) => {
        const newEnds = [...ends]
        if (team === 'red') {
            newEnds[index].redScore = score
        } else {
            newEnds[index].yellowScore = score
        }
        setEnds(newEnds)
    }

    // 更新回合文件
    const updateEndFile = (index: number, type: 'photo' | 'video', file: File | undefined) => {
        const newEnds = [...ends]
        if (type === 'photo') {
            newEnds[index].houseSnapshotFile = file
        } else {
            newEnds[index].vibeVideoFile = file
        }
        setEnds(newEnds)
    }

    // 提交比賽
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        setUploadProgress(t('matchNew.submitting')) // Updated

        try {
            // 验证
            if (!redElderId || !yellowElderId || !storeId) {
                throw new Error(t('matchNew.validation.required')) // Updated
            }

            if (redElderId === yellowElderId) {
                throw new Error(t('matchNew.validation.sameElder')) // Updated
            }

            if (ends.length === 0) {
                throw new Error(t('matchNew.validation.atLeastOneEnd')) // Updated
            }

            // ✅ 強制證據驗證
            const missingPhotoEnds = ends.filter(end => !end.houseSnapshotFile)
            if (missingPhotoEnds.length > 0) {
                throw new Error(t('matchNew.validation.missingPhoto', { ends: missingPhotoEnds.map(e => e.endNumber).join(', ') })) // Updated
            }

            // 先创建临时比赛 ID（用于文件上传路径）
            const tempMatchId = crypto.randomUUID()

            // 上传所有文件
            setUploadProgress(t('common.loading') + ' (Files)') // Reuse common loading, improvised
            const endsWithUrls = await Promise.all(
                ends.map(async (end, index) => {
                    const endData = { ...end } as any

                    // 上传照片
                    if (end.houseSnapshotFile) {
                        setUploadProgress(`Uploading End ${index + 1} Photo...`) // TODO: i18n for dynamic progress?
                        const result = await uploadFile(end.houseSnapshotFile, tempMatchId, index + 1, 'photo')
                        if (result.success) {
                            endData.houseSnapshotUrl = result.url
                        }
                    }

                    // 上传视频
                    if (end.vibeVideoFile) {
                        setUploadProgress(`Uploading End ${index + 1} Video...`)
                        const result = await uploadFile(end.vibeVideoFile, tempMatchId, index + 1, 'video')
                        if (result.success) {
                            endData.vibeVideoUrl = result.url
                        }
                    }

                    return endData
                })
            )

            // 调用后端 API 创建比赛
            setUploadProgress(t('matchNew.submitting'))

            const response = await fetch('/api/match/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    redElderId,
                    yellowElderId,
                    storeId,
                    ends: endsWithUrls.map(end => ({
                        endNumber: end.endNumber,
                        redScore: end.redScore,
                        yellowScore: end.yellowScore,
                        houseSnapshotUrl: end.houseSnapshotUrl || '',
                        vibeVideoUrl: end.vibeVideoUrl || ''
                    }))
                })
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || t('common.error'))
            }

            setMessage({
                type: 'success',
                text: t('matchNew.validation.success')
            })

            setTimeout(() => {
                router.push('/pharmacist/dashboard')
            }, 3000)

        } catch (error: any) {
            console.error('提交失败:', error)
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
            setUploadProgress('')
        }
    }



    // 计算当前总分
    const redTotal = ends.reduce((sum, end) => sum + end.redScore, 0)
    const yellowTotal = ends.reduce((sum, end) => sum + end.yellowScore, 0)

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 导航栏 */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <button
                                onClick={() => router.back()}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold text-blue-600">{t('matchNew.title')}</h1> {/* Updated */}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* 語言切換 */}
                            <LanguageSwitcher />
                            <div className="text-sm text-gray-600">
                                <p className="font-medium">{t('dashboard.title')}</p> {/* Reuse dashboard title */}
                                <p className="text-xs text-gray-500">{t('matchNew.subtitle')}</p> {/* Updated */}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 主内容 */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 消息提示 */}
                    {message && (
                        <div className={`p-4 rounded-lg ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            <div className="flex items-start gap-3">
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <p className="text-sm font-medium">{message.text}</p>
                            </div>
                        </div>
                    )}

                    {/* 上传进度 */}
                    {uploadProgress && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <p className="text-sm font-medium text-blue-800">{uploadProgress}</p>
                            </div>
                        </div>
                    )}

                    {/* 基本信息 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('matchNew.subtitle')} (Info)</h2> {/* Reuse subtitle as header? Or generic 'Info' */}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t('matchNew.storeId')} *
                                </label>
                                <input
                                    type="text"
                                    value={storeId}
                                    onChange={(e) => setStoreId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    placeholder="store-001"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                                    {t('matchNew.redElderId')} *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={redElderId}
                                        onChange={(e) => setRedElderId(e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        placeholder="ID 或掃描 QR Code"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowQRScanner('red')}
                                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                        title="掃描 QR Code"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                                    {t('matchNew.yellowElderId')} *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={yellowElderId}
                                        onChange={(e) => setYellowElderId(e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        placeholder="ID 或掃描 QR Code"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowQRScanner('yellow')}
                                        className="px-3 py-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                                        title="掃描 QR Code"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* 计分板 */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.cards.newMatch.title')}</h2> {/* Reuse title */}
                            <button
                                type="button"
                                onClick={addEnd}
                                disabled={ends.length >= 6}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('matchNew.addEnd')} ({ends.length}/6)
                            </button>
                        </div>

                        {/* 总分显示 */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-red-600 font-medium mb-1">{t('matchNew.redScore')}</p>
                                <p className="text-4xl font-bold text-red-700">{redTotal}</p>
                            </div>
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-yellow-600 font-medium mb-1">{t('matchNew.yellowScore')}</p>
                                <p className="text-4xl font-bold text-yellow-700">{yellowTotal}</p>
                            </div>
                        </div>

                        {/* 回合列表 */}
                        <div className="space-y-4">
                            {ends.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p>{t('matchNew.validation.atLeastOneEnd')}</p> {/* Reuse msg */}
                                </div>
                            ) : (
                                ends.map((end, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-md font-semibold text-gray-900">{t('matchNew.end', { n: end.endNumber })}</h3> {/* Updated */}
                                            <button
                                                type="button"
                                                onClick={() => removeEnd(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* 分数输入 */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-red-600 mb-2">{t('matchNew.redScore')}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={end.redScore}
                                                    onChange={(e) => updateEndScore(index, 'red', parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 text-center text-2xl font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-yellow-600 mb-2">{t('matchNew.yellowScore')}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={end.yellowScore}
                                                    onChange={(e) => updateEndScore(index, 'yellow', parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-2 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 text-center text-2xl font-bold"
                                                />
                                            </div>
                                        </div>

                                        {/* 双摄像头上传 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                                            {/* Cam B - 证明照片 */}
                                            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="p-2 bg-blue-600 rounded-lg">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-blue-900 text-sm">{t('matchNew.camBPrompt')}</p> {/* Updated */}
                                                        <p className="text-xs text-blue-700 mt-1">House Snapshot</p> {/* TODO: i18n */}
                                                    </div>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={(e) => updateEndFile(index, 'photo', e.target.files?.[0])}
                                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                                />
                                                {end.houseSnapshotFile && (
                                                    <p className="text-xs text-green-600 mt-2">✓ {end.houseSnapshotFile.name}</p>
                                                )}
                                            </div>

                                            {/* Cam A - 开心视频 */}
                                            <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-4">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="p-2 bg-green-600 rounded-lg">
                                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-green-900 text-sm">{t('matchNew.camAPrompt')}</p> {/* Updated */}
                                                        <p className="text-xs text-green-700 mt-1">Vibe Video</p> {/* TODO: i18n */}
                                                    </div>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="video/mp4,video/quicktime"
                                                    onChange={(e) => updateEndFile(index, 'video', e.target.files?.[0])}
                                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                                                />
                                                {end.vibeVideoFile && (
                                                    <p className="text-xs text-green-600 mt-2">✓ {end.vibeVideoFile.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 提交按钮 */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                        >
                            {t('matchNew.cancel')} {/* Updated */}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || ends.length === 0}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    {t('matchNew.submitting')} {/* Updated */}
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {t('matchNew.submit')} {/* Updated */}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>

            {/* QR 掃描模態框 */}
            <QRScanModal
                isOpen={showQRScanner !== null}
                onClose={() => setShowQRScanner(null)}
                onScan={handleQRScan}
                title={showQRScanner === 'red' ? '掃描紅方長輩 QR Code' : '掃描黃方長輩 QR Code'}
            />
        </div>
    )
}

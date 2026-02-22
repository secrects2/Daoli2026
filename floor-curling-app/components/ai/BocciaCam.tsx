'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { saveRehabSession } from '@/app/actions/rehab'

/**
 * BocciaCam - AI 視覺分析組件
 * 針對亞健康長輩（坐姿運動）優化的姿態分析
 * 
 * 包含專利 MVP 三大指標：
 * A. 手肘伸展度 (ROM)
 * B. 軀幹穩定度 (Trunk Stability)
 * C. 出手速度 (Release Velocity)
 * 
 * 以及 "The Brain" 診斷邏輯
 */

interface BocciaCamProps {
    elderId: string
    matchId?: string
    side: 'red' | 'blue'
    onMetricsUpdate?: (metrics: BocciaMetrics) => void
    onClose?: () => void
    className?: string
}

export interface BocciaMetrics {
    elbowROM: number | null
    trunkStability: number | null
    velocity: number | null
    isArmExtended: boolean
    isTrunkStable: boolean
    isReadyToThrow: boolean
    stableSeconds: number
}

// MediaPipe Pose Landmark IDs
const LANDMARKS = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
}

// ============ 專利核心：3D 空間向量運算（排除視角干擾）============
// 使用 MediaPipe 的 3D 座標 (x, y, z) 進行真實空間角度計算
// 無論鏡頭角度為 0° 或 60°，系統都能計算出真實的關節角度與軀幹傾斜

type Point3D = { x: number; y: number; z: number }

/** 3D 向量點積法計算關節角度 (Shoulder-Elbow-Wrist) */
function calculateAngle3D(a: Point3D, b: Point3D, c: Point3D): number {
    // 向量 BA = A - B
    const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }
    // 向量 BC = C - B
    const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) }

    // 點積 BA · BC
    const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
    // 向量長度 |BA| 和 |BC|
    const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2)
    const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2)

    if (magBA === 0 || magBC === 0) return 0

    // cos(θ) = (BA · BC) / (|BA| × |BC|)
    const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
    return Math.acos(cosTheta) * (180 / Math.PI)
}

/** 3D 空間傾斜角：肩膀連線相對水平面的真實夾角 */
function calculateTilt3D(a: Point3D, b: Point3D): number {
    // 肩膀連線的 3D 向量
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = (b.z || 0) - (a.z || 0)

    // 水平面上的投影長度 (x-z 平面)
    const horizontalLength = Math.sqrt(dx * dx + dz * dz)

    // 傾斜角 = arctan(垂直差 / 水平投影長度)
    // 當肩膀左右同高時，dy ≈ 0，角度 ≈ 0°
    // 即使鏡頭有角度(z軸差異)，水平投影也能正確反映真實距離
    if (horizontalLength === 0) return Math.abs(dy) > 0.01 ? 90 : 0
    return Math.abs(Math.atan2(dy, horizontalLength) * (180 / Math.PI))
}

const UPPER_BODY_CONNECTIONS: [number, number][] = [
    [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
]

export default function BocciaCam({
    elderId,
    matchId,
    side,
    onMetricsUpdate,
    onClose,
    className = ''
}: BocciaCamProps) {
    const webcamRef = useRef<Webcam>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const poseRef = useRef<any>(null)
    const stableTimerRef = useRef<number>(0)
    const lastStableRef = useRef<boolean>(false)
    const startTimeRef = useRef<number>(Date.now())

    // 追蹤整個 session 的指標歷史
    const metricsHistoryRef = useRef<{ rom: number; tilt: number; velocity: number }[]>([])

    // Velocity Tracking
    const prevWristRef = useRef<{ x: number, y: number, z: number, time: number } | null>(null)

    const [metrics, setMetrics] = useState<BocciaMetrics>({
        elbowROM: null, trunkStability: null, velocity: null,
        isArmExtended: true, isTrunkStable: true,
        isReadyToThrow: false, stableSeconds: 0,
    })

    // Patent "The Brain" Rules - Diagnostic Message
    const [diagnosticMsg, setDiagnosticMsg] = useState<{ text: string, color: string } | null>(null)

    const [cameraReady, setCameraReady] = useState(false)
    const [poseLoaded, setPoseLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // 隊伍色彩
    const sideColors = side === 'red'
        ? { primary: '#EF4444', bg: 'bg-red-900/50', text: 'text-red-400', label: '🔴 紅隊' }
        : { primary: '#3B82F6', bg: 'bg-blue-900/50', text: 'text-blue-400', label: '🔵 藍隊' }

    const processResults = useCallback((results: any) => {
        const canvas = canvasRef.current
        const webcam = webcamRef.current
        if (!canvas || !webcam?.video) return

        const video = webcam.video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (!results.poseLandmarks) return

        const landmarks = results.poseLandmarks
        const now = Date.now()

        // 1. A. Elbow ROM (Shoulder-Elbow-Wrist)
        const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
        const elbow = landmarks[LANDMARKS.RIGHT_ELBOW]
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const elbowROM = calculateAngle3D(shoulder, elbow, wrist)

        // 2. B. Trunk Stability (3D Shoulder Tilt - 排除視角干擾)
        const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER]
        const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
        const trunkTilt = calculateTilt3D(leftShoulder, rightShoulder)

        // 3. C. Velocity (Wrist Speed) - Normalized
        let velocity = 0
        if (wrist && wrist.visibility > 0.5) {
            if (prevWristRef.current) {
                const dt = (now - prevWristRef.current.time) / 1000
                if (dt > 0) {
                    const dx = wrist.x - prevWristRef.current.x
                    const dy = wrist.y - prevWristRef.current.y
                    const dz = (wrist.z || 0) - prevWristRef.current.z
                    // 3D 歐式距離：包含深度方向的運動
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
                    // Normalize speed roughly to screens/sec
                    velocity = Math.round((dist / dt) * 100)
                }
            }
            prevWristRef.current = { x: wrist.x, y: wrist.y, z: wrist.z || 0, time: now }
        }

        const isArmExtended = elbowROM >= 160
        const isTrunkStable = trunkTilt <= 15

        // --- PATENT LOGIC: "The Brain" Diagnostic Rules ---
        let diagText = null
        let diagColor = 'text-gray-400'

        // Rule 1: Safety/Fall Risk
        if (!isTrunkStable) {
            diagText = `⚠️ 警告：身體明顯傾斜 (>15°，目前 ${Math.round(trunkTilt)}°)`
            diagColor = "text-red-500"
        }
        // Rule 2: Spasticity/Tone Indicator
        else if (!isArmExtended) {
            diagText = `ℹ️ 提示：手臂未完全伸展 (目前 ${Math.round(elbowROM)}°)`
            diagColor = "text-orange-400"
        }
        // Rule 3: Performance/Power (Good Shot)
        else if (isArmExtended && isTrunkStable && velocity > 50) {
            diagText = "✅ 優秀：動作穩定且具發力速度！"
            diagColor = "text-green-400"
        }
        else if (isArmExtended && isTrunkStable) {
            diagText = "🔵 動作穩定，準備投球..."
            diagColor = "text-blue-400"
        }

        setDiagnosticMsg(diagText ? { text: diagText, color: diagColor } : null)
        // --------------------------------------------------

        // Record history
        metricsHistoryRef.current.push({
            rom: Math.round(elbowROM),
            tilt: Math.round(trunkTilt),
            velocity: velocity
        })

        // Stability Check
        const isCurrentlyStable = isArmExtended && isTrunkStable
        if (isCurrentlyStable) {
            if (lastStableRef.current) {
                stableTimerRef.current += 1 / 30
            } else {
                stableTimerRef.current = 0
            }
        } else {
            stableTimerRef.current = 0
        }
        lastStableRef.current = isCurrentlyStable

        const stableSeconds = Math.min(stableTimerRef.current, 5)
        const isReadyToThrow = stableSeconds >= 3

        // Drawing Skeleton
        const isGood = isArmExtended && isTrunkStable
        const skeletonColor = isGood ? sideColors.primary : '#EF4444'
        const pointColor = isGood ? sideColors.primary : '#DC2626'

        ctx.strokeStyle = skeletonColor
        ctx.lineWidth = 3
        ctx.lineCap = 'round'

        for (const [startIdx, endIdx] of UPPER_BODY_CONNECTIONS) {
            const start = landmarks[startIdx]
            const end = landmarks[endIdx]
            if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
                ctx.beginPath()
                ctx.moveTo(start.x * canvas.width, start.y * canvas.height)
                ctx.lineTo(end.x * canvas.width, end.y * canvas.height)
                ctx.stroke()
            }
        }

        for (let i = 11; i <= 24; i++) {
            const lm = landmarks[i]
            if (lm && lm.visibility > 0.5) {
                ctx.fillStyle = pointColor
                ctx.beginPath()
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI)
                ctx.fill()
                ctx.strokeStyle = '#fff'
                ctx.lineWidth = 2
                ctx.stroke()
            }
        }

        if (elbow && elbow.visibility > 0.5) {
            ctx.font = 'bold 16px sans-serif'
            ctx.fillStyle = isArmExtended ? sideColors.primary : '#EF4444'
            ctx.fillText(`${Math.round(elbowROM)}°`, elbow.x * canvas.width + 10, elbow.y * canvas.height - 10)
        }

        // Draw Velocity
        if (wrist && wrist.visibility > 0.5 && velocity > 10) {
            ctx.font = 'bold 14px monospace'
            ctx.fillStyle = '#10B981'
            ctx.fillText(`V: ${velocity}`, wrist.x * canvas.width + 10, wrist.y * canvas.height + 20)
        }

        const newMetrics: BocciaMetrics = {
            elbowROM: Math.round(elbowROM),
            trunkStability: Math.round(trunkTilt),
            velocity: velocity,
            isArmExtended, isTrunkStable, isReadyToThrow,
            stableSeconds: Math.round(stableSeconds * 10) / 10,
        }
        setMetrics(newMetrics)
        onMetricsUpdate?.(newMetrics)
    }, [onMetricsUpdate, sideColors.primary])

    // Session Report State
    const [sessionReport, setSessionReport] = useState<{ metrics: any; prescription: { title: string; content: string; color: string } } | null>(null)

    // Remove Live Prescription (User requested post-session only)
    /* 
    const [prescription, setPrescription] = useState... 
    useEffect...
    */

    // 儲存分析結果到 training_sessions
    const handleSaveAndStop = async () => {
        setSaving(true)
        try {
            const history = metricsHistoryRef.current
            const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

            // 計算摘要指標
            const romValues = history.map(h => h.rom).filter(v => v > 0)
            const tiltValues = history.map(h => h.tilt).filter(v => v >= 0)
            const velocityValues = history.map(h => h.velocity).filter(v => v > 0)

            const avgRom = romValues.length > 0 ? Math.round(romValues.reduce((a, b) => a + b, 0) / romValues.length) : (metrics.elbowROM || 0)
            const avgTilt = tiltValues.length > 0 ? Math.round(tiltValues.reduce((a, b) => a + b, 0) / tiltValues.length) : (metrics.trunkStability || 0)
            const avgVelocity = velocityValues.length > 0 ? Math.round(velocityValues.reduce((a, b) => a + b, 0) / velocityValues.length) : (metrics.velocity || 0)

            const metricsPayload = {
                elbow_rom: avgRom,
                trunk_stability: avgTilt,
                avg_velocity: avgVelocity,
                max_rom: romValues.length > 0 ? Math.max(...romValues) : null,
                min_rom: romValues.length > 0 ? Math.min(...romValues) : null,
                avg_rom: avgRom,
                avg_trunk_tilt: avgTilt,
                throw_count: romValues.length,
                stable_ratio: history.length > 0
                    ? Math.round((history.filter(h => h.rom >= 160 && h.tilt <= 15).length / history.length) * 100)
                    : 0,
            }

            // Generate Prescription for Report
            // Simple logic here to match "The Brain"
            let reportPrescription = { title: '✅ 動作表現優異', content: '各項指標均在標準範圍內，動作流暢穩定。', color: 'text-green-600 bg-green-50 border-green-200' }

            if (avgTilt > 15) {
                reportPrescription = {
                    title: '⚠️ 核心穩定度警示',
                    content: `偵測到平均軀幹傾斜 ${avgTilt}° (>15°)，建議加強核心肌群訓練。`,
                    color: 'text-red-600 bg-red-50 border-red-200'
                }
            } else if (avgRom < 160) {
                reportPrescription = {
                    title: '💪 上肢伸展受限',
                    content: `平均手肘伸展僅 ${avgRom}° (<160°)，可能是肌肉張力過高。`,
                    color: 'text-orange-600 bg-orange-50 border-orange-200'
                }
            } else if (avgVelocity < 30) {
                reportPrescription = {
                    title: '⚡ 發力速度偏慢',
                    content: '投球速度較慢，建議練習爆發力訓練。',
                    color: 'text-blue-600 bg-blue-50 border-blue-200'
                }
            }

            const result = await saveRehabSession({
                elderId,
                matchId,
                sportType: 'boccia',
                durationSeconds,
                metrics: metricsPayload,
            })

            if (result.success) {
                setSaved(true)
                // Show Report instead of closing immediately
                setSessionReport({
                    metrics: metricsPayload,
                    prescription: reportPrescription
                })
            } else {
                setError(result.error || '儲存失敗')
            }
        } catch (err: any) {
            setError(err.message || '儲存時發生錯誤')
        } finally {
            setSaving(false)
        }
    }

    // 初始化 MediaPipe Pose (Custom Loop Refactor)
    useEffect(() => {
        let requestAnimationId: number

        const initPose = async () => {
            try {
                const { Pose } = await import('@mediapipe/pose')

                const pose = new Pose({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
                })

                pose.setOptions({
                    modelComplexity: 1, smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
                })

                pose.onResults(processResults)
                poseRef.current = pose
                setPoseLoaded(true)

                // Custom Frame Loop
                const sendFrame = async () => {
                    if (webcamRef.current?.video && webcamRef.current.video.readyState === 4) {
                        try {
                            await pose.send({ image: webcamRef.current.video })
                        } catch (err) {
                            console.error('Pose send error:', err)
                        }
                    }
                    requestAnimationId = requestAnimationFrame(sendFrame)
                }

                sendFrame()

            } catch (err: any) {
                console.error('MediaPipe 初始化失敗:', err)
                setError(err.message || '無法載入 AI 模型')
            }
        }

        initPose()

        return () => {
            if (requestAnimationId) cancelAnimationFrame(requestAnimationId)
            if (poseRef.current) poseRef.current.close()
        }
    }, [processResults])

    // Memoize video constraints to prevent re-renders triggering stream restart
    const videoConstraints = React.useMemo(() => ({
        width: 640,
        height: 480,
        facingMode: 'environment'
    }), [])

    // Render Report View if sessionReport exists
    if (sessionReport) {
        return (
            <div className={`relative bg-gray-900 flex flex-col items-center justify-center p-6 h-full ${className}`}>
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6 animate-fade-in-up">
                    <div className="text-center border-b pb-4 border-gray-100">
                        <h3 className="text-2xl font-black text-gray-900">📊 AI 檢測報告</h3>
                        <p className="text-sm text-gray-500 mt-1">Detection Complete</p>
                    </div>

                    {/* 3 Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">平均 ROM</p>
                            <p className={`text-2xl font-black ${sessionReport.metrics.avg_rom < 160 ? 'text-orange-500' : 'text-gray-900'}`}>
                                {sessionReport.metrics.avg_rom}°
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">平均傾斜</p>
                            <p className={`text-2xl font-black ${sessionReport.metrics.avg_trunk_tilt > 15 ? 'text-red-500' : 'text-gray-900'}`}>
                                {sessionReport.metrics.avg_trunk_tilt}°
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">平均速度</p>
                            <p className="text-2xl font-black text-emerald-600">
                                {sessionReport.metrics.avg_velocity}
                            </p>
                        </div>
                    </div>

                    {/* Prescription Card */}
                    <div className={`p-5 rounded-xl border-l-4 ${sessionReport.prescription.color}`}>
                        <h4 className="font-bold text-lg mb-2">{sessionReport.prescription.title}</h4>
                        <p className="text-sm opacity-90">{sessionReport.prescription.content}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg hover:bg-black transition-colors shadow-lg"
                    >
                        關閉並返回
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative bg-black overflow-hidden flex flex-col ${className}`}>
            {/* Top Bar - Transparent Overlay */}
            <div className={`absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none`}>
                {/* Team Badge - Move to right */}
                <div className={`px-3 py-1 bg-black/50 backdrop-blur rounded-full border border-white/10 flex items-center gap-2`}>
                    <div className={`w-2 h-2 rounded-full ${side === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="text-white font-mono text-xs opacity-70">{elderId.slice(0, 4)}...</span>
                </div>
            </div>

            {/* Webcam - Expand to fill remaining space */}
            <div className="relative flex-1 w-full bg-black">
                <Webcam
                    ref={webcamRef} audio={false}
                    // Remove mirrored for back camera
                    className="absolute inset-0 w-full h-full object-cover"
                    videoConstraints={videoConstraints}
                    onUserMedia={() => setCameraReady(true)}
                    onUserMediaError={() => setError('無法存取相機')}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                // Remove scaleX(-1) if not mirrored
                />

                {/* Diagnostic Overlay - Moved to Top Left & Smaller */}
                {diagnosticMsg && (
                    <div className="absolute top-4 left-4 z-10 max-w-[70%]">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shadow-lg flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${diagnosticMsg.color === 'text-red-500' ? 'bg-red-500 animate-pulse' : diagnosticMsg.color === 'text-green-400' ? 'bg-green-400' : 'bg-blue-400'}`} />
                            <p className={`font-bold text-sm text-white`}>
                                {diagnosticMsg.text}
                            </p>
                        </div>
                    </div>
                )}

                {!poseLoaded && !error && (
                    <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white">
                        <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm">載入 AI 模型中...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white p-6">
                        <span className="text-4xl mb-3">⚠️</span>
                        <p className="text-sm text-center text-red-300">{error}</p>
                    </div>
                )}

                {/* Saved Overlay */}
                {saved && (
                    <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center text-white z-50">
                        <span className="text-6xl mb-4">✅</span>
                        <p className="text-xl font-black">數據已儲存！</p>
                    </div>
                )}

                {metrics.isReadyToThrow && !saved && !diagnosticMsg && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full font-bold text-sm animate-pulse backdrop-blur-sm z-10 shadow-lg shadow-green-500/20">
                        準備投球
                    </div>
                )}
            </div>

            {/* Metrics Dashboard */}
            <div className="p-4 bg-gray-800 space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Medical Rehab Data (即時醫療數據)</p>
                <div className="grid grid-cols-3 gap-3">
                    <div className={`rounded-xl p-3 text-center ${metrics.isArmExtended ? sideColors.bg : 'bg-red-900/50'}`}>
                        <p className="text-xs text-gray-400 mb-1">肘部 ROM</p>
                        <p className={`text-2xl font-black ${metrics.isArmExtended ? sideColors.text : 'text-red-400'}`}>
                            {metrics.elbowROM !== null ? `${metrics.elbowROM}°` : '--'}
                        </p>
                    </div>

                    <div className={`rounded-xl p-3 text-center ${metrics.isTrunkStable ? sideColors.bg : 'bg-red-900/50'}`}>
                        <p className="text-xs text-gray-400 mb-1">軀幹傾斜</p>
                        <p className={`text-2xl font-black ${metrics.isTrunkStable ? sideColors.text : 'text-red-400'}`}>
                            {metrics.trunkStability !== null ? `${metrics.trunkStability}°` : '--'}
                        </p>
                    </div>

                    <div className="rounded-xl p-3 text-center bg-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1">出手速度</p>
                        <p className="text-2xl font-black text-emerald-400">
                            {metrics.velocity || '--'} <span className="text-xs text-gray-500">v</span>
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSaveAndStop}
                        disabled={saving || saved}
                        className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${saved ? 'bg-green-600' :
                            saving ? 'bg-gray-600' :
                                'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg'
                            } disabled:cursor-not-allowed`}
                    >
                        {saved ? '✅ 已儲存' : saving ? '儲存中...' : '📊 儲存並停止'}
                    </button>
                    {/* Sitting Optimization Badge */}
                    <div className="absolute top-16 right-4 bg-gray-900/60 backdrop-blur border border-white/20 rounded-lg px-3 py-1.5 flex flex-col items-end pointer-events-none">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Patent Config</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            🪑 坐姿穩定追蹤 (Seated)
                        </p>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            取消
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'

/**
 * BocciaCam - AI 視覺分析組件
 * 針對坐姿選手（輪椅使用者）優化的姿態分析
 * 
 * 指標:
 * - ROM: 肩(11)-肘(13)-腕(15) 角度, < 160° 提示手臂未伸直
 * - 軀幹穩定: 雙肩(11-12) 傾斜角, > 15° 提示軀幹不穩定
 * - 投球就緒: 穩定 3 秒後顯示
 */

interface BocciaCamProps {
    onMetricsUpdate?: (metrics: BocciaMetrics) => void
    className?: string
}

export interface BocciaMetrics {
    elbowROM: number | null         // 肘部關節活動度 (度)
    trunkStability: number | null   // 軀幹傾斜角 (度)
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

// 計算三點角度 (degree)
function calculateAngle(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
    let angle = Math.abs((radians * 180) / Math.PI)
    if (angle > 180) angle = 360 - angle
    return angle
}

// 計算傾斜角 (degree)
function calculateTilt(
    a: { x: number; y: number },
    b: { x: number; y: number }
): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    return Math.abs(Math.atan2(dy, dx) * (180 / Math.PI))
}

// 上半身骨架連線 (Landmarks 11-24)
const UPPER_BODY_CONNECTIONS: [number, number][] = [
    [11, 12], // 雙肩
    [11, 13], [13, 15], // 左臂
    [12, 14], [14, 16], // 右臂
    [11, 23], [12, 24], // 軀幹
    [23, 24], // 髖部
]

export default function BocciaCam({ onMetricsUpdate, className = '' }: BocciaCamProps) {
    const webcamRef = useRef<Webcam>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const poseRef = useRef<any>(null)
    const stableTimerRef = useRef<number>(0)
    const lastStableRef = useRef<boolean>(false)

    const [metrics, setMetrics] = useState<BocciaMetrics>({
        elbowROM: null,
        trunkStability: null,
        isArmExtended: true,
        isTrunkStable: true,
        isReadyToThrow: false,
        stableSeconds: 0,
    })
    const [cameraReady, setCameraReady] = useState(false)
    const [poseLoaded, setPoseLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const processResults = useCallback((results: any) => {
        const canvas = canvasRef.current
        const webcam = webcamRef.current
        if (!canvas || !webcam?.video) return

        const video = webcam.video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 清除 canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (!results.poseLandmarks) return

        const landmarks = results.poseLandmarks

        // 計算 ROM (右臂: 12-14-16)
        const shoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
        const elbow = landmarks[LANDMARKS.RIGHT_ELBOW]
        const wrist = landmarks[LANDMARKS.RIGHT_WRIST]
        const elbowROM = calculateAngle(shoulder, elbow, wrist)

        // 計算軀幹傾斜 (雙肩 11-12)
        const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER]
        const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]
        const trunkTilt = calculateTilt(leftShoulder, rightShoulder)

        const isArmExtended = elbowROM >= 160
        const isTrunkStable = trunkTilt <= 15
        const isCurrentlyStable = isArmExtended && isTrunkStable

        // 穩定計時
        if (isCurrentlyStable) {
            if (lastStableRef.current) {
                stableTimerRef.current += 1 / 30 // ~30fps
            } else {
                stableTimerRef.current = 0
            }
        } else {
            stableTimerRef.current = 0
        }
        lastStableRef.current = isCurrentlyStable

        const stableSeconds = Math.min(stableTimerRef.current, 5)
        const isReadyToThrow = stableSeconds >= 3

        // 決定骨架顏色
        const skeletonColor = (isArmExtended && isTrunkStable) ? '#3B82F6' : '#EF4444'
        const pointColor = (isArmExtended && isTrunkStable) ? '#2563EB' : '#DC2626'

        // 繪製上半身骨架
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

        // 繪製關節點 (上半身 11-24)
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

        // 在肘部旁顯示角度
        if (elbow && elbow.visibility > 0.5) {
            ctx.font = 'bold 16px sans-serif'
            ctx.fillStyle = isArmExtended ? '#3B82F6' : '#EF4444'
            ctx.fillText(`${Math.round(elbowROM)}°`, elbow.x * canvas.width + 10, elbow.y * canvas.height - 10)
        }

        const newMetrics: BocciaMetrics = {
            elbowROM: Math.round(elbowROM),
            trunkStability: Math.round(trunkTilt),
            isArmExtended,
            isTrunkStable,
            isReadyToThrow,
            stableSeconds: Math.round(stableSeconds * 10) / 10,
        }
        setMetrics(newMetrics)
        onMetricsUpdate?.(newMetrics)
    }, [onMetricsUpdate])

    // 初始化 MediaPipe Pose
    useEffect(() => {
        let animationId: number
        let camera: any

        const initPose = async () => {
            try {
                const { Pose } = await import('@mediapipe/pose')
                const { Camera } = await import('@mediapipe/camera_utils')

                const pose = new Pose({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
                })

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                })

                pose.onResults(processResults)
                poseRef.current = pose
                setPoseLoaded(true)

                // 等相機就緒後啟動
                const checkCamera = setInterval(() => {
                    if (webcamRef.current?.video && webcamRef.current.video.readyState === 4) {
                        clearInterval(checkCamera)
                        camera = new Camera(webcamRef.current.video, {
                            onFrame: async () => {
                                if (webcamRef.current?.video && poseRef.current) {
                                    await poseRef.current.send({ image: webcamRef.current.video })
                                }
                            },
                            width: 640,
                            height: 480,
                        })
                        camera.start()
                    }
                }, 500)
            } catch (err: any) {
                console.error('MediaPipe 初始化失敗:', err)
                setError(err.message || '無法載入 AI 模型')
            }
        }

        initPose()

        return () => {
            if (camera) camera.stop()
            if (animationId) cancelAnimationFrame(animationId)
            if (poseRef.current) poseRef.current.close()
        }
    }, [processResults])

    return (
        <div className={`relative bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
            {/* Webcam */}
            <div className="relative aspect-[4/3]">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    mirrored
                    className="absolute inset-0 w-full h-full object-cover"
                    videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: 'user',
                    }}
                    onUserMedia={() => setCameraReady(true)}
                    onUserMediaError={() => setError('無法存取相機')}
                />
                {/* Overlay Canvas */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />

                {/* Loading Overlay */}
                {!poseLoaded && !error && (
                    <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center text-white">
                        <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm">載入 AI 模型中...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white p-6">
                        <span className="text-4xl mb-3">⚠️</span>
                        <p className="text-sm text-center text-red-300">{error}</p>
                    </div>
                )}

                {/* Ready to Throw Indicator */}
                {metrics.isReadyToThrow && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-6 py-3 rounded-2xl font-black text-xl animate-pulse backdrop-blur-sm">
                        ✅ 準備投球
                    </div>
                )}
            </div>

            {/* Metrics Dashboard */}
            <div className="p-4 bg-gray-800 grid grid-cols-3 gap-3">
                {/* ROM */}
                <div className={`rounded-xl p-3 text-center ${metrics.isArmExtended ? 'bg-blue-900/50' : 'bg-red-900/50'}`}>
                    <p className="text-xs text-gray-400 mb-1">肘部 ROM</p>
                    <p className={`text-2xl font-black ${metrics.isArmExtended ? 'text-blue-400' : 'text-red-400'}`}>
                        {metrics.elbowROM !== null ? `${metrics.elbowROM}°` : '--'}
                    </p>
                    {!metrics.isArmExtended && metrics.elbowROM !== null && (
                        <p className="text-xs text-red-400 mt-1">⚠️ 手臂未伸直</p>
                    )}
                </div>

                {/* Trunk */}
                <div className={`rounded-xl p-3 text-center ${metrics.isTrunkStable ? 'bg-blue-900/50' : 'bg-red-900/50'}`}>
                    <p className="text-xs text-gray-400 mb-1">軀幹傾斜</p>
                    <p className={`text-2xl font-black ${metrics.isTrunkStable ? 'text-blue-400' : 'text-red-400'}`}>
                        {metrics.trunkStability !== null ? `${metrics.trunkStability}°` : '--'}
                    </p>
                    {!metrics.isTrunkStable && metrics.trunkStability !== null && (
                        <p className="text-xs text-red-400 mt-1">⚠️ 軀幹不穩</p>
                    )}
                </div>

                {/* Stability Timer */}
                <div className={`rounded-xl p-3 text-center ${metrics.isReadyToThrow ? 'bg-green-900/50' : 'bg-gray-700/50'}`}>
                    <p className="text-xs text-gray-400 mb-1">穩定時間</p>
                    <p className={`text-2xl font-black ${metrics.isReadyToThrow ? 'text-green-400' : 'text-gray-400'}`}>
                        {metrics.stableSeconds}s
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {metrics.isReadyToThrow ? '✅ 就緒' : '等待穩定...'}
                    </p>
                </div>
            </div>
        </div>
    )
}

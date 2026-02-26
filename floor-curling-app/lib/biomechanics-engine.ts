/**
 * ============================================================================
 * 生物力学引擎 (Biomechanics Engine)
 * ============================================================================
 *
 * 独立的医学级生物力学计算引擎，从 BocciaCam 中解耦所有数学运算。
 * 供专利申请使用 — 所有公式均有完整数学文档。
 *
 * 包含六大分析器：
 * 1. CoreStabilityAnalyzer   — 中轴偏移角度（肩-髋连线 vs 垂直轴）
 * 2. AngularVelocityAnalyzer — 肩/肘/腕三关节角速度 (°/s)
 * 3. TremorDetector          — 震颤检测（滑动窗口频率分析）
 * 4. CompensationDetector    — 代偿动作识别（甩头/侧身）
 * 5. SubjectTracker          — 主体锁定（多人环境下锁定目标）
 * 6. PostureCorrector        — 坐姿修正（驼背/歪斜补偿）
 *
 * @author AI Biomechanics System
 * @patent 3D 骨架追踪分析系统 — Phase 2
 */

// ============================================================================
// 共用类型定义
// ============================================================================

export type Point3D = { x: number; y: number; z: number }

export interface JointAngles {
    shoulder: number  // 肩关节角度 (°)
    elbow: number     // 肘关节角度 (°)
    wrist: number     // 腕关节角度 (°) — 肘-腕-手指
}

export interface AngularVelocities {
    shoulder: number  // 肩关节角速度 (°/s)
    elbow: number     // 肘关节角速度 (°/s)
    wrist: number     // 腕关节角速度 (°/s)
}

export interface TremorResult {
    detected: boolean          // 是否检测到震颤
    frequency: number | null   // 估计频率 (Hz)，null 表示未检测到
    severity: 'none' | 'mild' | 'moderate' | 'severe'
    affectedJoint: string | null  // 受影响的关节
}

export interface CompensationResult {
    type: 'head_throw' | 'side_lean' | 'shoulder_hike' | null
    severity: number           // 0-100 严重度
    description: string        // 人类可读描述
}

export interface SubjectTrackingResult {
    locked: boolean            // 是否成功锁定
    confidence: number         // 锁定信心值 0-1
    boundingBox: { x: number; y: number; w: number; h: number } | null
}

export interface PostureCorrectionResult {
    correctionAngle: number    // 补偿旋转角度 (°)
    isHunched: boolean         // 是否驼背
    isTilted: boolean          // 是否歪斜
    adjustedLandmarks: Map<number, Point3D> | null  // 修正后的坐标
}

/** 扩展后的完整生物力学指标 */
export interface BiomechanicsMetrics {
    // === 基础指标（Phase 1 已有）===
    elbowROM: number | null
    trunkStability: number | null
    velocity: number | null

    // === Phase 2: 核心数据指标 ===
    coreStabilityAngle: number | null
    shoulderAngularVel: number | null
    elbowAngularVel: number | null
    wristAngularVel: number | null
    tremorDetected: boolean
    tremorFrequency: number | null
    tremorSeverity: string
    compensationType: string | null
    compensationSeverity: number
    compensationDescription: string

    // === Phase 2: 场域信息 ===
    subjectLocked: boolean
    subjectConfidence: number
    postureCorrection: number
    isHunched: boolean
    isTilted: boolean
}


// ============================================================================
// MediaPipe Pose Landmark IDs（扩展）
// ============================================================================

export const LANDMARKS = {
    NOSE: 0,
    LEFT_EYE: 2,
    RIGHT_EYE: 5,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
} as const


// ============================================================================
// 1. CoreStabilityAnalyzer — 中轴偏移角度
// ============================================================================
/**
 * 中轴稳定性分析器
 *
 * 【数学模型】
 * 计算肩膀中点 (M_shoulder) 与髋部中点 (M_hip) 连线相对于垂直轴的3D偏移角度。
 *
 * $$
 * M_{shoulder} = \frac{P_{L\_shoulder} + P_{R\_shoulder}}{2}
 * $$
 *
 * $$
 * M_{hip} = \frac{P_{L\_hip} + P_{R\_hip}}{2}
 * $$
 *
 * 躯干向量：$\vec{T} = M_{shoulder} - M_{hip}$
 * 垂直参考向量：$\vec{V} = (0, -1, 0)$（Y轴向上）
 *
 * $$
 * \theta_{core} = \cos^{-1}\left(\frac{|\vec{T} \cdot \vec{V}|}{|\vec{T}|}\right) \times \frac{180°}{\pi}
 * $$
 *
 * 【临床意义】
 * - θ_core ≤ 5°  → 优秀（核心肌群控制良好）
 * - θ_core ≤ 15° → 正常范围
 * - θ_core > 15° → 高跌倒风险（核心肌群失能）
 */
export class CoreStabilityAnalyzer {
    /**
     * 计算中轴偏移角度
     * @param leftShoulder 左肩 3D 坐标（已转换为像素）
     * @param rightShoulder 右肩 3D 坐标
     * @param leftHip 左髋 3D 坐标
     * @param rightHip 右髋 3D 坐标
     * @returns 中轴偏移角度 (°)
     */
    calculate(
        leftShoulder: Point3D,
        rightShoulder: Point3D,
        leftHip: Point3D,
        rightHip: Point3D
    ): number {
        // 步骤 1: 计算肩膀中点
        const mShoulder: Point3D = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: (leftShoulder.z + rightShoulder.z) / 2,
        }

        // 步骤 2: 计算髋部中点
        const mHip: Point3D = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: (leftHip.z + rightHip.z) / 2,
        }

        // 步骤 3: 躯干向量 (从髋到肩)
        const trunkVec: Point3D = {
            x: mShoulder.x - mHip.x,
            y: mShoulder.y - mHip.y,
            z: mShoulder.z - mHip.z,
        }

        // 步骤 4: 垂直参考向量
        // 注意：MediaPipe 坐标系中 Y 轴正方向朝下，所以垂直向上是 (0, -1, 0)
        const verticalRef = { x: 0, y: -1, z: 0 }

        // 步骤 5: 向量点积法求夹角
        const dot = trunkVec.x * verticalRef.x + trunkVec.y * verticalRef.y + trunkVec.z * verticalRef.z
        const magTrunk = Math.sqrt(trunkVec.x ** 2 + trunkVec.y ** 2 + trunkVec.z ** 2)

        if (magTrunk === 0) return 0

        const cosTheta = Math.abs(dot) / magTrunk
        const clampedCos = Math.max(-1, Math.min(1, cosTheta))
        return Math.acos(clampedCos) * (180 / Math.PI)
    }
}


// ============================================================================
// 2. AngularVelocityAnalyzer — 关节角速度
// ============================================================================
/**
 * 角速度分析器
 *
 * 【数学模型】
 * 在每帧中，分别计算肩、肘、腕三个关节的角度，
 * 然后以帧间时间差 Δt 计算角速度：
 *
 * $$
 * \omega_{joint} = \frac{\theta_t - \theta_{t-1}}{\Delta t} \quad (°/s)
 * $$
 *
 * 关节角度定义：
 * - 肩角：(肘 → 肩 → 髋) 三点夹角
 * - 肘角：(肩 → 肘 → 腕) 三点夹角（即现有 ROM）
 * - 腕角：(肘 → 腕 → 食指) 三点夹角
 *
 * 【临床意义】
 * - ω > 300°/s → 爆发力优秀
 * - ω 50-300°/s → 正常范围
 * - ω < 50°/s → 动作迟缓（可能早期帕金森/肌少症）
 */
export class AngularVelocityAnalyzer {
    private prevAngles: JointAngles | null = null
    private prevTimestamp: number = 0

    // 滑动窗口历史（供震颤分析使用）
    private history: { angles: JointAngles; time: number }[] = []
    private readonly HISTORY_WINDOW = 30  // 保留 30 帧（~1秒 @ 30fps）

    /**
     * 3D 向量点积法计算三点夹角
     */
    private calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
        const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }
        const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) }

        const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
        const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2)
        const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2)

        if (magBA === 0 || magBC === 0) return 0
        const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
        return Math.acos(cosTheta) * (180 / Math.PI)
    }

    /**
     * 更新帧数据并返回角速度
     * @returns AngularVelocities (°/s)
     */
    update(
        shoulder: Point3D,
        elbow: Point3D,
        wrist: Point3D,
        hip: Point3D,
        indexFinger: Point3D | null,
        timestamp: number
    ): AngularVelocities {
        // 计算当前帧的三个关节角度
        const shoulderAngle = this.calculateAngle(elbow, shoulder, hip)
        const elbowAngle = this.calculateAngle(shoulder, elbow, wrist)
        const wristAngle = indexFinger
            ? this.calculateAngle(elbow, wrist, indexFinger)
            : 0

        const currentAngles: JointAngles = {
            shoulder: shoulderAngle,
            elbow: elbowAngle,
            wrist: wristAngle,
        }

        // 记录历史
        this.history.push({ angles: currentAngles, time: timestamp })
        if (this.history.length > this.HISTORY_WINDOW) {
            this.history.shift()
        }

        // 计算角速度
        let velocities: AngularVelocities = { shoulder: 0, elbow: 0, wrist: 0 }

        if (this.prevAngles && this.prevTimestamp > 0) {
            const dt = (timestamp - this.prevTimestamp) / 1000  // ms → s
            if (dt > 0 && dt < 1) {  // 排除异常帧间隔
                velocities = {
                    shoulder: Math.abs(currentAngles.shoulder - this.prevAngles.shoulder) / dt,
                    elbow: Math.abs(currentAngles.elbow - this.prevAngles.elbow) / dt,
                    wrist: Math.abs(currentAngles.wrist - this.prevAngles.wrist) / dt,
                }
            }
        }

        this.prevAngles = currentAngles
        this.prevTimestamp = timestamp
        return velocities
    }

    /**
     * 获取角速度历史（供外部震颤分析）
     */
    getHistory() {
        return this.history
    }

    /**
     * 重置状态
     */
    reset() {
        this.prevAngles = null
        this.prevTimestamp = 0
        this.history = []
    }
}


// ============================================================================
// 3. TremorDetector — 震颤检测
// ============================================================================
/**
 * 震颤检测器
 *
 * 【数学模型】
 * 在滑动窗口（30帧 ≈ 1秒 @30fps）内分析角速度方向变化：
 *
 * 零交叉法 (Zero-Crossing Method)：
 * 计算角速度导数的正负号变化次数 N_cross
 *
 * $$
 * N_{cross} = \sum_{i=1}^{n-1} \mathbb{1}\left[\text{sign}(\Delta\theta_i) \neq \text{sign}(\Delta\theta_{i-1})\right]
 * $$
 *
 * 估计频率：
 * $$
 * f_{tremor} = \frac{N_{cross}}{2 \times T_{window}} \quad (Hz)
 * $$
 *
 * 【临床阈值】
 * - N_cross ≥ 6 且 f_tremor 在 3-12 Hz → 震颤阳性
 * - 帕金森震颤典型频率：4-6 Hz（静息震颤）
 * - 必要性震颤 (Essential Tremor)：5-12 Hz（动作震颤）
 *
 * 严重度分级：
 * - mild:     N_cross 6-8,   振幅 < 5°
 * - moderate: N_cross 8-12,  振幅 5-15°
 * - severe:   N_cross > 12,  振幅 > 15°
 */
export class TremorDetector {
    private readonly MIN_CROSSINGS = 6        // 最小交叉次数
    private readonly MIN_FREQ_HZ = 3          // 最小震颤频率
    private readonly MAX_FREQ_HZ = 12         // 最大震颤频率
    private readonly WINDOW_FRAMES = 30       // 分析窗口帧数

    /**
     * 分析震颤
     * @param angVelHistory 角速度历史记录（来自 AngularVelocityAnalyzer.getHistory()）
     */
    analyze(angVelHistory: { angles: JointAngles; time: number }[]): TremorResult {
        if (angVelHistory.length < this.WINDOW_FRAMES) {
            return { detected: false, frequency: null, severity: 'none', affectedJoint: null }
        }

        // 取最近 WINDOW_FRAMES 帧
        const window = angVelHistory.slice(-this.WINDOW_FRAMES)

        // 对三个关节分别分析
        const joints: (keyof JointAngles)[] = ['shoulder', 'elbow', 'wrist']
        let worstResult: TremorResult = { detected: false, frequency: null, severity: 'none', affectedJoint: null }

        for (const joint of joints) {
            // 提取该关节的角度序列
            const angleSequence = window.map(h => h.angles[joint])

            // 计算帧间角度变化（一阶差分）
            const deltas: number[] = []
            for (let i = 1; i < angleSequence.length; i++) {
                deltas.push(angleSequence[i] - angleSequence[i - 1])
            }

            // 零交叉计数
            let crossings = 0
            for (let i = 1; i < deltas.length; i++) {
                if ((deltas[i] > 0 && deltas[i - 1] < 0) || (deltas[i] < 0 && deltas[i - 1] > 0)) {
                    crossings++
                }
            }

            // 计算时间窗口
            const tWindow = (window[window.length - 1].time - window[0].time) / 1000  // s
            if (tWindow <= 0) continue

            // 估计频率
            const freq = crossings / (2 * tWindow)

            // 计算振幅（角度变化的标准差）
            const meanDelta = deltas.reduce((a, b) => a + Math.abs(b), 0) / deltas.length
            const amplitude = meanDelta

            // 判断是否为震颤
            if (crossings >= this.MIN_CROSSINGS && freq >= this.MIN_FREQ_HZ && freq <= this.MAX_FREQ_HZ) {
                let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'mild'
                if (crossings > 12 || amplitude > 15) severity = 'severe'
                else if (crossings > 8 || amplitude > 5) severity = 'moderate'

                // 保留最严重的结果
                const severityRank = { none: 0, mild: 1, moderate: 2, severe: 3 }
                if (severityRank[severity] > severityRank[worstResult.severity]) {
                    worstResult = {
                        detected: true,
                        frequency: Math.round(freq * 10) / 10,
                        severity,
                        affectedJoint: joint,
                    }
                }
            }
        }

        return worstResult
    }
}


// ============================================================================
// 4. CompensationDetector — 代偿动作识别
// ============================================================================
/**
 * 代偿动作检测器
 *
 * 【数学模型】
 *
 * A. 甩头代偿 (Head Throw)：
 * 监控投球过程中头部节点(NOSE, ID:0) 相对肩膀中点的 急剧位移。
 * $$
 * D_{head} = \sqrt{(\Delta x_{nose})^2 + (\Delta y_{nose})^2} - \sqrt{(\Delta x_{shoulder\_mid})^2 + (\Delta y_{shoulder\_mid})^2}
 * $$
 * 若 D_head > 阈值（30px/frame），判定为甩头代偿。
 *
 * B. 侧身代偿 (Side Lean)：
 * 监控髋部中线相对肩膀中线的 侧向偏移差异。
 * $$
 * \Delta_{lateral} = |M_{shoulder,x} - M_{hip,x}|
 * $$
 * 若 Δ_lateral > 阈值（肩宽的 25%），判定为侧身代偿。
 *
 * C. 耸肩代偿 (Shoulder Hike)：
 * 投球侧肩膀突然上抬超过非投球侧。
 * $$
 * \Delta_{shoulder\_y} = |P_{R\_shoulder,y} - P_{L\_shoulder,y}|
 * $$
 * 若 Δ_shoulder_y 增量 > 阈值，判定为耸肩代偿。
 */
export class CompensationDetector {
    private prevNose: Point3D | null = null
    private prevShoulderMid: Point3D | null = null
    private prevHipMid: Point3D | null = null
    private baselineShoulderWidth: number = 0

    // 头部相对位移历史（用于平滑判断）
    private headDisplacementHistory: number[] = []
    private lateralOffsetHistory: number[] = []
    private readonly SMOOTHING_WINDOW = 5

    /**
     * 设置肩宽基准值（在初始帧中调用）
     */
    setBaseline(leftShoulder: Point3D, rightShoulder: Point3D) {
        this.baselineShoulderWidth = Math.sqrt(
            (rightShoulder.x - leftShoulder.x) ** 2 +
            (rightShoulder.y - leftShoulder.y) ** 2
        )
    }

    /**
     * 检测代偿动作
     */
    detect(
        nose: Point3D,
        leftShoulder: Point3D,
        rightShoulder: Point3D,
        leftHip: Point3D,
        rightHip: Point3D
    ): CompensationResult {
        const shoulderMid: Point3D = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: (leftShoulder.z + rightShoulder.z) / 2,
        }
        const hipMid: Point3D = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: (leftHip.z + rightHip.z) / 2,
        }

        // 自动设置基准
        if (this.baselineShoulderWidth === 0) {
            this.setBaseline(leftShoulder, rightShoulder)
        }

        let result: CompensationResult = { type: null, severity: 0, description: '动作正常' }

        if (this.prevNose && this.prevShoulderMid && this.prevHipMid) {
            // --- A. 甩头检测 ---
            const headDisp = Math.sqrt(
                (nose.x - this.prevNose.x) ** 2 +
                (nose.y - this.prevNose.y) ** 2
            )
            const shoulderDisp = Math.sqrt(
                (shoulderMid.x - this.prevShoulderMid.x) ** 2 +
                (shoulderMid.y - this.prevShoulderMid.y) ** 2
            )
            const relativeHeadDisp = headDisp - shoulderDisp

            this.headDisplacementHistory.push(relativeHeadDisp)
            if (this.headDisplacementHistory.length > this.SMOOTHING_WINDOW) {
                this.headDisplacementHistory.shift()
            }

            const avgHeadDisp = this.headDisplacementHistory.reduce((a, b) => a + b, 0)
                / this.headDisplacementHistory.length

            // 阈值：相对位移 > 肩宽的 8%
            const headThreshold = this.baselineShoulderWidth * 0.08
            if (avgHeadDisp > headThreshold) {
                const severity = Math.min(100, Math.round((avgHeadDisp / headThreshold) * 30))
                result = {
                    type: 'head_throw',
                    severity,
                    description: `甩头代偿：头部相对肩膀急剧位移 (${Math.round(avgHeadDisp)}px)`,
                }
            }

            // --- B. 侧身检测 ---
            const lateralOffset = Math.abs(shoulderMid.x - hipMid.x)
            this.lateralOffsetHistory.push(lateralOffset)
            if (this.lateralOffsetHistory.length > this.SMOOTHING_WINDOW) {
                this.lateralOffsetHistory.shift()
            }

            const avgLateralOffset = this.lateralOffsetHistory.reduce((a, b) => a + b, 0)
                / this.lateralOffsetHistory.length

            // 阈值：侧向偏移 > 肩宽的 25%
            const lateralThreshold = this.baselineShoulderWidth * 0.25
            if (avgLateralOffset > lateralThreshold && (!result.type || avgLateralOffset / lateralThreshold > avgHeadDisp / headThreshold)) {
                const severity = Math.min(100, Math.round((avgLateralOffset / lateralThreshold) * 40))
                result = {
                    type: 'side_lean',
                    severity,
                    description: `侧身代偿：肩-髋中线侧向偏移 ${Math.round(avgLateralOffset)}px (${Math.round(avgLateralOffset / this.baselineShoulderWidth * 100)}% 肩宽)`,
                }
            }

            // --- C. 耸肩检测 ---
            const shoulderHeightDiff = Math.abs(rightShoulder.y - leftShoulder.y)
            const shoulderHikeThreshold = this.baselineShoulderWidth * 0.2
            if (shoulderHeightDiff > shoulderHikeThreshold && !result.type) {
                const severity = Math.min(100, Math.round((shoulderHeightDiff / shoulderHikeThreshold) * 35))
                result = {
                    type: 'shoulder_hike',
                    severity,
                    description: `耸肩代偿：左右肩高低差 ${Math.round(shoulderHeightDiff)}px`,
                }
            }
        }

        // 更新前帧记录
        this.prevNose = { ...nose }
        this.prevShoulderMid = { ...shoulderMid }
        this.prevHipMid = { ...hipMid }

        return result
    }

    reset() {
        this.prevNose = null
        this.prevShoulderMid = null
        this.prevHipMid = null
        this.baselineShoulderWidth = 0
        this.headDisplacementHistory = []
        this.lateralOffsetHistory = []
    }
}


// ============================================================================
// 5. SubjectTracker — 主体锁定机制
// ============================================================================
/**
 * 主体锁定追踪器
 *
 * 【算法设计】
 * MediaPipe Pose 本身只追踪单人。在多人环境中：
 *
 * 1. 初始化锁定阶段：
 *    - 用户点击画面中的目标人物，系统获取初始 ROI（Region of Interest）
 *    - 若未手动选择，默认锁定画面中央最大的骨架
 *
 * 2. 帧间追踪：
 *    - 计算当前帧骨架的 bounding box 中心与上一帧锁定目标的距离
 *    - 若距离 < 阈值（bounding box 对角线的 50%），认为是同一目标
 *    - 若距离 > 阈值，标记为锁定丢失
 *
 * 3. 面积一致性验证：
 *    - 比较当前帧骨架面积 vs 历史平均面积
 *    - 偏差 > 40% → 可能误抓了另一个人
 *
 * $$
 * D_{track} = \sqrt{(x_{center,t} - x_{center,t-1})^2 + (y_{center,t} - y_{center,t-1})^2}
 * $$
 *
 * $$
 * \text{locked} = D_{track} < 0.5 \times D_{diagonal} \quad \wedge \quad |\frac{A_t - \bar{A}}{\\bar{A}}| < 0.4
 * $$
 */
export class SubjectTracker {
    private lockedCenter: { x: number; y: number } | null = null
    private lockedArea: number = 0
    private areaHistory: number[] = []
    private readonly MAX_DISPLACEMENT_RATIO = 0.5   // 最大允许位移 = 对角线 × 50%
    private readonly MAX_AREA_DEVIATION = 0.4       // 最大面积偏差 40%
    private readonly AREA_HISTORY_SIZE = 10

    /**
     * 从骨架节点计算 bounding box
     */
    private computeBoundingBox(landmarks: any[]): { x: number; y: number; w: number; h: number; cx: number; cy: number; area: number } | null {
        const visible = landmarks.filter((lm: any) => lm && lm.visibility > 0.3)
        if (visible.length < 5) return null

        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity

        for (const lm of visible) {
            if (lm.x < minX) minX = lm.x
            if (lm.x > maxX) maxX = lm.x
            if (lm.y < minY) minY = lm.y
            if (lm.y > maxY) maxY = lm.y
        }

        const w = maxX - minX
        const h = maxY - minY
        return {
            x: minX, y: minY, w, h,
            cx: minX + w / 2,
            cy: minY + h / 2,
            area: w * h,
        }
    }

    /**
     * 更新追踪状态
     * @param landmarks 当前帧的全部 33 个 MediaPipe 节点
     * @returns 追踪结果
     */
    update(landmarks: any[]): SubjectTrackingResult {
        const bbox = this.computeBoundingBox(landmarks)
        if (!bbox) {
            return { locked: false, confidence: 0, boundingBox: null }
        }

        // 首次锁定
        if (!this.lockedCenter) {
            this.lockedCenter = { x: bbox.cx, y: bbox.cy }
            this.lockedArea = bbox.area
            this.areaHistory = [bbox.area]
            return { locked: true, confidence: 1.0, boundingBox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h } }
        }

        // 计算位移距离
        const displacement = Math.sqrt(
            (bbox.cx - this.lockedCenter.x) ** 2 +
            (bbox.cy - this.lockedCenter.y) ** 2
        )

        const diagonal = Math.sqrt(bbox.w ** 2 + bbox.h ** 2)
        const maxDisplacement = diagonal * this.MAX_DISPLACEMENT_RATIO

        // 面积一致性
        const avgArea = this.areaHistory.reduce((a, b) => a + b, 0) / this.areaHistory.length
        const areaDeviation = Math.abs(bbox.area - avgArea) / avgArea

        // 综合判断
        const displacementOk = displacement < maxDisplacement
        const areaOk = areaDeviation < this.MAX_AREA_DEVIATION

        const locked = displacementOk && areaOk
        const confidence = locked
            ? Math.max(0, 1 - displacement / maxDisplacement) * Math.max(0, 1 - areaDeviation)
            : 0

        if (locked) {
            // 更新锁定位置（指数移动平均）
            const alpha = 0.3
            this.lockedCenter = {
                x: this.lockedCenter.x * (1 - alpha) + bbox.cx * alpha,
                y: this.lockedCenter.y * (1 - alpha) + bbox.cy * alpha,
            }
            this.areaHistory.push(bbox.area)
            if (this.areaHistory.length > this.AREA_HISTORY_SIZE) {
                this.areaHistory.shift()
            }
        }

        return {
            locked,
            confidence: Math.round(confidence * 100) / 100,
            boundingBox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h },
        }
    }

    /**
     * 手动重新锁定（用户点击画面时调用）
     */
    resetLock() {
        this.lockedCenter = null
        this.lockedArea = 0
        this.areaHistory = []
    }
}


// ============================================================================
// 6. PostureCorrector — 坐姿深度优化
// ============================================================================
/**
 * 坐姿修正器
 *
 * 【数学模型】
 *
 * A. 驼背检测 (Hunched Posture)：
 * 计算耳朵-肩膀连线相对垂直线的前倾角度。
 * $$
 * \theta_{hunch} = \arctan\left(\frac{|P_{ear,z} - P_{shoulder,z}|}{|P_{ear,y} - P_{shoulder,y}|}\right) \times \frac{180°}{\pi}
 * $$
 * 若 θ_hunch > 20° → 判定为驼背，需校正角度数据。
 *
 * B. 歪斜检测 (Tilted Seat)：
 * 计算左右髋部的高度差。
 * $$
 * \theta_{tilt\_seat} = \arctan\left(\frac{|P_{L\_hip,y} - P_{R\_hip,y}|}{\sqrt{(P_{L\_hip,x} - P_{R\_hip,x})^2 + (P_{L\_hip,z} - P_{R\_hip,z})^2}}\right) \times \frac{180°}{\pi}
 * $$
 * 若 θ_tilt_seat > 8° → 判定为歪斜坐姿。
 *
 * C. 坐标系旋转补偿：
 * 当检测到歪斜时，以髋部中点为原点，将坐标系反向旋转 θ_tilt_seat，
 * 使后续的躯干稳定度计算不受歪斜椅子的影响。
 *
 * 旋转矩阵（绕 Z 轴）：
 * $$
 * \begin{pmatrix} x' \\ y' \end{pmatrix} = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix} \begin{pmatrix} x - cx \\ y - cy \end{pmatrix} + \begin{pmatrix} cx \\ cy \end{pmatrix}
 * $$
 */
export class PostureCorrector {
    private readonly HUNCH_THRESHOLD = 20   // 驼背阈值 (°)
    private readonly TILT_THRESHOLD = 8     // 歪斜阈值 (°)

    /**
     * 分析并修正坐姿
     */
    analyze(
        ear: Point3D | null,
        leftShoulder: Point3D,
        rightShoulder: Point3D,
        leftHip: Point3D,
        rightHip: Point3D,
        allLandmarks: Map<number, Point3D>
    ): PostureCorrectionResult {
        // --- A. 驼背检测 ---
        let isHunched = false
        let hunchAngle = 0

        if (ear) {
            const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2
            const shoulderMidZ = (leftShoulder.z + rightShoulder.z) / 2

            const dz = Math.abs((ear.z || 0) - shoulderMidZ)
            const dy = Math.abs(ear.y - shoulderMidY)

            if (dy > 0.01) {
                hunchAngle = Math.atan2(dz, dy) * (180 / Math.PI)
                isHunched = hunchAngle > this.HUNCH_THRESHOLD
            }
        }

        // --- B. 歪斜检测 ---
        const hipDx = leftHip.x - rightHip.x
        const hipDy = leftHip.y - rightHip.y
        const hipDz = (leftHip.z || 0) - (rightHip.z || 0)

        const hipHorizontal = Math.sqrt(hipDx ** 2 + hipDz ** 2)
        let tiltAngle = 0
        let isTilted = false

        if (hipHorizontal > 0.01) {
            tiltAngle = Math.abs(Math.atan2(hipDy, hipHorizontal) * (180 / Math.PI))
            isTilted = tiltAngle > this.TILT_THRESHOLD
        }

        // --- C. 坐标系旋转补偿 ---
        let adjustedLandmarks: Map<number, Point3D> | null = null

        if (isTilted) {
            const hipMid = {
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2,
            }

            // 计算旋转方向：使高侧降低
            const rotAngleRad = hipDy > 0
                ? -tiltAngle * (Math.PI / 180)
                : tiltAngle * (Math.PI / 180)

            const cosR = Math.cos(rotAngleRad)
            const sinR = Math.sin(rotAngleRad)

            adjustedLandmarks = new Map()
            for (const [id, pt] of allLandmarks) {
                const dx = pt.x - hipMid.x
                const dy = pt.y - hipMid.y
                adjustedLandmarks.set(id, {
                    x: cosR * dx - sinR * dy + hipMid.x,
                    y: sinR * dx + cosR * dy + hipMid.y,
                    z: pt.z,
                })
            }
        }

        const correctionAngle = isTilted ? Math.round(tiltAngle * 10) / 10 : 0

        return {
            correctionAngle,
            isHunched,
            isTilted,
            adjustedLandmarks,
        }
    }
}


// ============================================================================
// 主引擎：BiomechanicsEngine（组合所有分析器）
// ============================================================================

/**
 * 生物力学引擎
 *
 * 将所有分析器封装为统一接口，供 BocciaCam 调用。
 */
export class BiomechanicsEngine {
    readonly coreStability = new CoreStabilityAnalyzer()
    readonly angularVelocity = new AngularVelocityAnalyzer()
    readonly tremor = new TremorDetector()
    readonly compensation = new CompensationDetector()
    readonly subjectTracker = new SubjectTracker()
    readonly postureCorrector = new PostureCorrector()

    // 帧间数据存储
    private frameHistory: BiomechanicsMetrics[] = []

    /**
     * 辅助函数：将 MediaPipe 正规化坐标转为真实像素坐标
     */
    toRealPixels(
        landmark: { x: number; y: number; z: number; visibility?: number },
        imageWidth: number,
        imageHeight: number
    ): Point3D {
        return {
            x: landmark.x * imageWidth,
            y: landmark.y * imageHeight,
            z: (landmark.z || 0) * imageWidth,
        }
    }

    /**
     * 处理一帧骨架数据，返回完整生物力学指标
     */
    processFrame(
        landmarks: any[],
        imageWidth: number,
        imageHeight: number,
        timestamp: number
    ): BiomechanicsMetrics {
        // 转换关键点坐标
        const lShoulder = this.toRealPixels(landmarks[LANDMARKS.LEFT_SHOULDER], imageWidth, imageHeight)
        const rShoulder = this.toRealPixels(landmarks[LANDMARKS.RIGHT_SHOULDER], imageWidth, imageHeight)
        const rElbow = this.toRealPixels(landmarks[LANDMARKS.RIGHT_ELBOW], imageWidth, imageHeight)
        const rWrist = this.toRealPixels(landmarks[LANDMARKS.RIGHT_WRIST], imageWidth, imageHeight)
        const lHip = this.toRealPixels(landmarks[LANDMARKS.LEFT_HIP], imageWidth, imageHeight)
        const rHip = this.toRealPixels(landmarks[LANDMARKS.RIGHT_HIP], imageWidth, imageHeight)

        // 可选节点（可能不可见）
        const nose = landmarks[LANDMARKS.NOSE]?.visibility > 0.3
            ? this.toRealPixels(landmarks[LANDMARKS.NOSE], imageWidth, imageHeight) : null
        const rEar = landmarks[LANDMARKS.RIGHT_EAR]?.visibility > 0.3
            ? this.toRealPixels(landmarks[LANDMARKS.RIGHT_EAR], imageWidth, imageHeight) : null
        const rIndex = landmarks[LANDMARKS.RIGHT_INDEX]?.visibility > 0.3
            ? this.toRealPixels(landmarks[LANDMARKS.RIGHT_INDEX], imageWidth, imageHeight) : null

        // 0. 主体锁定
        const trackingResult = this.subjectTracker.update(landmarks)

        // 1. 坐姿修正
        const allLandmarksMap = new Map<number, Point3D>()
        for (let i = 0; i < landmarks.length; i++) {
            if (landmarks[i]?.visibility > 0.3) {
                allLandmarksMap.set(i, this.toRealPixels(landmarks[i], imageWidth, imageHeight))
            }
        }

        const postureResult = this.postureCorrector.analyze(
            rEar, lShoulder, rShoulder, lHip, rHip, allLandmarksMap
        )

        // 使用修正后的坐标（如果有）
        const getLandmark = (id: number, fallback: Point3D): Point3D => {
            if (postureResult.adjustedLandmarks) {
                return postureResult.adjustedLandmarks.get(id) || fallback
            }
            return fallback
        }

        const adjLShoulder = getLandmark(LANDMARKS.LEFT_SHOULDER, lShoulder)
        const adjRShoulder = getLandmark(LANDMARKS.RIGHT_SHOULDER, rShoulder)
        const adjLHip = getLandmark(LANDMARKS.LEFT_HIP, lHip)
        const adjRHip = getLandmark(LANDMARKS.RIGHT_HIP, rHip)

        // 2. 中轴稳定度
        const coreAngle = this.coreStability.calculate(adjLShoulder, adjRShoulder, adjLHip, adjRHip)

        // 3. 角速度
        const angVel = this.angularVelocity.update(
            rShoulder, rElbow, rWrist, rHip, rIndex, timestamp
        )

        // 4. 震颤检测
        const tremorResult = this.tremor.analyze(this.angularVelocity.getHistory())

        // 5. 代偿检测
        const compResult = nose
            ? this.compensation.detect(nose, lShoulder, rShoulder, lHip, rHip)
            : { type: null, severity: 0, description: '动作正常' } as CompensationResult

        // 组装结果
        const metrics: BiomechanicsMetrics = {
            // 基础指标（保持与 Phase 1 兼容）
            elbowROM: null,          // 由 BocciaCam 原有逻辑填充
            trunkStability: null,     // 由 BocciaCam 原有逻辑填充
            velocity: null,           // 由 BocciaCam 原有逻辑填充

            // Phase 2 指标
            coreStabilityAngle: Math.round(coreAngle * 10) / 10,
            shoulderAngularVel: Math.round(angVel.shoulder * 10) / 10,
            elbowAngularVel: Math.round(angVel.elbow * 10) / 10,
            wristAngularVel: Math.round(angVel.wrist * 10) / 10,
            tremorDetected: tremorResult.detected,
            tremorFrequency: tremorResult.frequency,
            tremorSeverity: tremorResult.severity,
            compensationType: compResult.type,
            compensationSeverity: compResult.severity,
            compensationDescription: compResult.description,

            // 场域信息
            subjectLocked: trackingResult.locked,
            subjectConfidence: trackingResult.confidence,
            postureCorrection: postureResult.correctionAngle,
            isHunched: postureResult.isHunched,
            isTilted: postureResult.isTilted,
        }

        this.frameHistory.push(metrics)
        return metrics
    }

    /**
     * 获取完整的帧历史纪录（供导出使用）
     */
    getFrameHistory(): BiomechanicsMetrics[] {
        return this.frameHistory
    }

    /**
     * 重置所有状态（新 session 开始时调用）
     */
    reset() {
        this.angularVelocity.reset()
        this.compensation.reset()
        this.subjectTracker.resetLock()
        this.frameHistory = []
    }
}

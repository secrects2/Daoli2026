
export interface BocciaMetrics {
    elbowROM: number | null
    trunkStability: number | null
    velocity: number | null
    isArmExtended: boolean
    isTrunkStable: boolean
    isReadyToThrow: boolean
    stableSeconds: number
}

export interface AiPrescription {
    title: string
    content: string
    color: string
    recommendedProducts: {
        id: number
        name: string
        icon: string
        reason: string
    }[]
}

export function getAiPrescription(metrics: any): AiPrescription {
    const rom = metrics.elbow_rom || metrics.elbowROM || 0
    const stability = metrics.trunk_stability || metrics.trunkStability || 0
    const velocity = metrics.avg_velocity || metrics.velocity || 0

    // 優先級 1: 安全性 (指標 B：軀幹穩定度差 / 傾斜角過大) - Threshold: > 15 degrees
    if (stability > 15) {
        return {
            title: '⚠️ 軀幹穩定度差 (高跌倒風險)',
            content: `3D 水平面投影顯示重心偏移 ${Math.round(stability)}° (>15°)，學術對應核心肌群失能、神經肌肉控制退化。依據美國老年醫學會 AGS/BGS (2011) 跌倒預防指南，需加強姿勢控制。`,
            color: 'text-red-600 bg-red-50 border-red-200',
            recommendedProducts: [
                { id: 1, name: '核心穩定與神經肌肉控制訓練', icon: '🏋️', reason: '運動處方：核心穩定、太極、平衡感訓練' },
                { id: 2, name: '綜合維生素B群+鈣+維生素D3', icon: '💊', reason: '營養處方：支持神經健康與肌肉收縮閾值 (含鎂)' }
            ]
        }
    }

    // 優先級 2: 張力/伸展 (指標 A：關節活動度 ROM 不足) - Threshold: < 160 degrees
    if (rom > 0 && rom < 160) {
        return {
            title: '💪 關節活動度 (ROM) 不足',
            content: `關節夾角 ${Math.round(rom)}° (<160°)，學術對應骨關節炎(OA)或軟組織沾黏。依 OARSI (2019) 指南，活動度受限為關節退化核心表徵。`,
            color: 'text-orange-600 bg-orange-50 border-orange-200',
            recommendedProducts: [
                { id: 3, name: '關節活動度伸展與水中太極課程', icon: '🏋️', reason: '運動處方：ROM exercises, 皮拉提斯' },
                { id: 4, name: 'UC-II 頂級非變性第二型膠原蛋白', icon: '💊', reason: '營養處方：配合 Omega-3 / 薑黃素降低局部發炎，修復軟骨' }
            ]
        }
    }

    // 優先級 3: 力量/速度 (指標 C：出手速度偏低 / 位移遲緩) - Threshold: < 0.8
    // 如果舊版數值是像素，建議這裡先用 velocity < 0.8 || (velocity > 1 && velocity < 30) 涵蓋這兩種情形。
    // 使用題目要求的 < 0.8 m/s 來觸發肌少症處方。
    if (velocity >= 0 && (velocity < 0.8 || (velocity > 1 && velocity < 30))) {
        return {
            title: '⚡ 出手速度偏低 / 位移遲緩',
            content: `單位時間位移不足 (數值: ${velocity.toFixed(2)}，標準 < 0.8 m/s)，對應早期肌少症 (Sarcopenia)。依 EWGSOP2 (2019) 共識，步速/位移量為衰弱指標。`,
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            recommendedProducts: [
                { id: 5, name: '漸進式抗阻力與增強式訓練', icon: '🏋️', reason: '運動處方：增強肌肉神經連結與爆發力' },
                { id: 6, name: '乳清蛋白 + BCAA 分枝鏈胺基酸', icon: '💊', reason: '營養處方：結合維生素 D3/HMB，激活 mTORC1 促進肌肉合成' }
            ]
        }
    }

    return {
        title: '✅ 動作表現優異',
        content: '各項指標均在標準範圍內，動作流暢穩定。經個人化協同效應評估，建議繼續維持目前的營養與訓練基底。',
        color: 'text-green-600 bg-green-50 border-green-200',
        recommendedProducts: [
            { id: 7, name: '進階地板滾球戰術與精準度專班', icon: '🏆', reason: '運動處方：挑戰技術極限，增強競技能力' },
            { id: 8, name: '常態日常綜合保健維他命', icon: '💊', reason: '營養處方：維持基礎代謝率與體力' }
        ]
    }
}

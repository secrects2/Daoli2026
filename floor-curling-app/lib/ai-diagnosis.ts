
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

    // 優先級 1: 安全性 (核心/軀幹穩定) - Patent Threshold: > 15 degrees
    if (stability > 15) {
        return {
            title: '⚠️ 核心穩定度警示 (Fall Risk)',
            content: `偵測到投球時軀幹傾斜 ${Math.round(stability)}° (>15°)，這可能增加跌倒風險。建議加強核心肌群訓練（如坐姿轉體），並檢查輪椅擺位是否穩固。`,
            color: 'text-red-600 bg-red-50 border-red-200',
            recommendedProducts: [
                { id: 3, name: '穩定底座 (Stable Base)', icon: '🪨', reason: '增加坐姿穩定性，降低傾斜風險' },
                { id: 4, name: '經典藍衫', icon: '👕', reason: '舒適透氣，訓練時保持乾爽' }
            ]
        }
    }

    // 優先級 2: 張力/伸展 (手肘 ROM) - Patent Threshold: < 160 degrees
    if (rom < 160) {
        return {
            title: '💪 上肢伸展受限 (Spasticity)',
            content: `手肘伸展角度僅 ${Math.round(rom)}° (<160°)，未達完全伸展標準。可能是肌肉張力過高。建議投球前進行被動伸展按摩。`,
            color: 'text-orange-600 bg-orange-50 border-orange-200',
            recommendedProducts: [
                { id: 2, name: '精準把手 (Precision Handle)', icon: '🎯', reason: '輔助握持投球，減少手部關節負擔' },
                { id: 3, name: '穩定底座 (Stable Base)', icon: '🪨', reason: '減少投球時的姿態代償' }
            ]
        }
    }

    // 優先級 3: 力量/速度 (Velocity)
    if (velocity < 30) {
        return {
            title: '⚡ 發力速度偏慢',
            content: '投球速度較慢，可能影響遠距離投擲表現。建議練習爆發力訓練（如快速推球），或嘗試減輕球重以建立神經連結。',
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            recommendedProducts: [
                { id: 1, name: '高速壺底 (Speed Base)', icon: '🚀', reason: '減少地面摩擦力，提升投擲距離' },
                { id: 2, name: '精準把手 (Precision Handle)', icon: '🎯', reason: '增加旋轉控制力，投擲更精準' }
            ]
        }
    }

    return {
        title: '✅ 動作表現優異',
        content: '各項指標均在標準範圍內，動作流暢穩定。請繼續保持目前的訓練強度，可嘗試提升投球精準度挑戰。',
        color: 'text-green-600 bg-green-50 border-green-200',
        recommendedProducts: [
            { id: 5, name: '黃金戰袍 (Golden Jersey)', icon: '🏆', reason: '榮耀專屬——表現優異者的象徵' },
            { id: 6, name: '冠軍披風', icon: '🦸', reason: '真正的王者才配得上的榮譽裝備' }
        ]
    }
}

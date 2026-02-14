
export interface BocciaMetrics {
    elbowROM: number | null
    trunkStability: number | null
    velocity: number | null
    isArmExtended: boolean
    isTrunkStable: boolean
    isReadyToThrow: boolean
    stableSeconds: number
}

export function getAiPrescription(metrics: any): { title: string; content: string; color: string } {
    const rom = metrics.elbow_rom || metrics.elbowROM || 0
    const stability = metrics.trunk_stability || metrics.trunkStability || 0
    const velocity = metrics.avg_velocity || metrics.velocity || 0

    // 優先級 1: 安全性 (核心/軀幹穩定)
    if (stability > 20) {
        return {
            title: '⚠️ 核心穩定度不足',
            content: '偵測到投球時軀幹明顯傾斜，這可能增加跌倒風險。建議加強核心肌群訓練（如坐姿轉體），並檢查輪椅擺位是否穩固。',
            color: 'text-red-600 bg-red-50 border-red-200'
        }
    }

    // 優先級 2: 張力/伸展 (手肘 ROM)
    if (rom < 130) {
        return {
            title: '💪 上肢伸展受限',
            content: '手肘伸展角度不足 (<130°)，可能是肌肉張力過高或關節活動度受限。建議在投球前進行被動伸展按摩，並練習懸吊運動。',
            color: 'text-orange-600 bg-orange-50 border-orange-200'
        }
    }

    // 優先級 3: 力量/速度 (Velocity)
    if (velocity < 30) {
        return {
            title: '⚡ 發力速度偏慢',
            content: '投球速度較慢，可能影響遠距離投擲表現。建議練習爆發力訓練（如快速推球），或嘗試減輕球重以建立神經連結。',
            color: 'text-blue-600 bg-blue-50 border-blue-200'
        }
    }

    return {
        title: '✅ 動作表現優異',
        content: '各項指標均在標準範圍內，動作流暢穩定。請繼續保持目前的訓練強度，可嘗試提升投球精準度挑戰。',
        color: 'text-green-600 bg-green-50 border-green-200'
    }
}

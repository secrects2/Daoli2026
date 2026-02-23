
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
                { id: 1, name: '銀髮族核心強化基礎班', icon: '🧘‍♀️', reason: '改善軀幹控制，預防跌倒風險' },
                { id: 2, name: '輪椅擺位與姿勢評估諮詢', icon: '📋', reason: '專業物理治療師一對一穩定度評估' }
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
                { id: 3, name: '上肢關節活動度(ROM)伸展課程', icon: '🙆', reason: '透過指導伸展降低肌肉張力' },
                { id: 4, name: '筋膜放鬆與按摩舒緩療程', icon: '💆', reason: '緩解長時間不動造成的肌肉緊繃' }
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
                { id: 5, name: '彈力帶上肢爆發力訓練營', icon: '💪', reason: '建立肌肉神經連結，提升投擲動能' },
                { id: 6, name: '營養師增肌飲食指導規劃', icon: '🍎', reason: '配合訓練，有效提升出球肌耐力' }
            ]
        }
    }

    return {
        title: '✅ 動作表現優異',
        content: '各項指標均在標準範圍內，動作流暢穩定。請繼續保持目前的訓練強度，可嘗試提升投球精準度挑戰。',
        color: 'text-green-600 bg-green-50 border-green-200',
        recommendedProducts: [
            { id: 7, name: '進階地板滾球戰術與精準度專班', icon: '🎯', reason: '挑戰極限，提升實戰對抗能力' },
            { id: 8, name: '常態社區地板滾球俱樂部會籍', icon: '🏆', reason: '保持訓練頻率與社交互動' }
        ]
    }
}

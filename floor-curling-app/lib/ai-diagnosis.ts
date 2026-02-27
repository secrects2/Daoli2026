
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
    references: string[]
    recommendedProducts: {
        id: number
        name: string
        icon: string
        reason: string
    }[]
}

/**
 * AI 處方引擎 — 基於生物力學分析數據產生個人化處方建議
 * 
 * 學術引用清單 (References):
 * [R1] Goetz CG et al. (2008). MDS-UPDRS: Clinimetric Properties. Movement Disorders, 23(15), 2129-2170.
 * [R2] Deuschl G et al. (1998). Consensus Statement of the MDS on Tremor. Movement Disorders, 13(S3), 2-23.
 * [R3] ACSM (2018). Guidelines for Exercise Testing and Prescription, 10th Ed. Wolters Kluwer.
 * [R4] AGS/BGS (2011). Clinical Practice Guideline for Prevention of Falls in Older Persons. JAGS, 59(1), 148-157.
 * [R5] Granacher U et al. (2013). The Importance of Trunk Muscle Strength for Balance, Functional Performance, and Fall Prevention in Seniors. Sports Medicine, 43(7), 627-641.
 * [R6] OARSI (2019). Guidelines for the Non-Surgical Management of Knee, Hip, and Polyarticular OA. Osteoarthritis & Cartilage, 27(11), 1578-1589.
 * [R7] Page P et al. (2010). Assessment and Treatment of Muscle Imbalance: The Janda Approach. Human Kinetics.
 * [R8] Cruz-Jentoft AJ et al. (2019). Sarcopenia: Revised European Consensus (EWGSOP2). Age & Ageing, 48(1), 16-31.
 * [R9] Dent E et al. (2019). Physical Frailty: ICFSR International Clinical Practice Guidelines. JNHA, 23(9), 771-787.
 * [R10] Lozano-Montoya I et al. (2017). Non-pharmacological Interventions to Treat Physical Frailty and Sarcopenia. JAMDA, 18(9), 780-786.
 * [R11] Bauer J et al. (2013). Evidence-Based Recommendations for Optimal Dietary Protein Intake in Older People: A Position Paper From the PROT-AGE Study Group. JAMDA, 14(8), 542-559.
 */
export function getAiPrescription(metrics: any): AiPrescription {
    const rom = metrics.elbow_rom || metrics.elbowROM || 0
    const stability = metrics.trunk_stability || metrics.trunkStability || 0
    const velocity = metrics.avg_velocity || metrics.velocity || 0
    // Phase 2 指标
    const tremorRatio = metrics.tremor_detected_ratio || 0
    const tremorFreq = metrics.tremor_avg_frequency || metrics.tremorFrequency || 0
    const compensationType = metrics.compensation_types?.[0] || metrics.compensationType || null
    const compensationRatio = metrics.compensation_detected_ratio || 0

    // 優先級 0: 神經系統警示 (震顫檢測) - Phase 2
    if (tremorRatio > 20 || (metrics.tremorDetected && tremorFreq > 0)) {
        const freqText = tremorFreq ? `${tremorFreq} Hz` : '偵測中'
        return {
            title: '🫨 肢體震顫警示 (Tremor Alert)',
            content: `AI 動作分析偵測到規律性震顫信號（頻率 ${freqText}，影響幀占比 ${tremorRatio}%）。依據 MDS-UPDRS 運動評估量表 [R1]，3-6 Hz 靜息震顫為帕金森氏症核心特徵；5-12 Hz 動作震顫對應本態性震顫 (Essential Tremor) [R2]。建議轉介神經內科做進一步評估。`,
            color: 'text-purple-600 bg-purple-50 border-purple-200',
            references: [
                'Goetz CG et al. (2008). MDS-UPDRS: Clinimetric Properties. Mov Disord, 23(15), 2129-2170.',
                'Deuschl G et al. (1998). Consensus Statement of the MDS on Tremor. Mov Disord, 13(S3), 2-23.'
            ],
            recommendedProducts: [
                { id: 9, name: '神經內科轉介評估', icon: '🧠', reason: '臨床處方：MDS-UPDRS 動作評估 + DaTSCAN 多巴胺影像 [R1]' },
                { id: 10, name: '維生素 B6 + 鎂離子複方', icon: '💊', reason: '營養處方：支持神經傳導穩定，緩解肌肉細微抽搐' }
            ]
        }
    }

    // 優先級 0.5: 代償動作警示 - Phase 2
    if (compensationType && compensationRatio > 15) {
        const compLabels: Record<string, string> = {
            'head_throw': '甩頭代償',
            'side_lean': '側身代償',
            'shoulder_hike': '聳肩代償',
        }
        const compName = compLabels[compensationType] || '代償動作'
        return {
            title: `⚠️ ${compName} (Compensation Pattern)`,
            content: `系統偵測到投球時出現${compName}慣性（出現率 ${compensationRatio}%），學術對應肩袖肌群 (Rotator Cuff) 功能不足或核心力量代償 [R7]。依 ACSM 運動處方指南 [R3]，長期代償可能導致二次損傷，需針對性訓練矯正。`,
            color: 'text-amber-600 bg-amber-50 border-amber-200',
            references: [
                'Page P et al. (2010). Assessment and Treatment of Muscle Imbalance: The Janda Approach. Human Kinetics.',
                'ACSM (2018). Guidelines for Exercise Testing and Prescription, 10th Ed. Wolters Kluwer.'
            ],
            recommendedProducts: [
                { id: 11, name: '肩袖穩定與核心整合訓練', icon: '🏋️', reason: '運動處方：肩胛骨穩定訓練 + 動力鏈矯正 [R3][R7]' },
                { id: 12, name: '膠原蛋白 + 維生素 C 修復配方', icon: '💊', reason: '營養處方：支持肌腱修復與關節潤滑' }
            ]
        }
    }

    // 優先級 1: 安全性 (指標 B：軀幹穩定度差 / 傾斜角過大) - Threshold: > 15 degrees
    if (stability > 15) {
        return {
            title: '⚠️ 軀幹穩定度差 (高跌倒風險)',
            content: `3D 水平面投影顯示重心偏移 ${Math.round(stability)}° (>15°)，學術對應核心肌群失能、神經肌肉控制退化 [R5]。依據美國老年醫學會 AGS/BGS 跌倒預防指南 [R4]，核心穩定度不足為跌倒風險獨立預測因子，需加強姿勢控制訓練。`,
            color: 'text-red-600 bg-red-50 border-red-200',
            references: [
                'AGS/BGS (2011). Clinical Practice Guideline for Prevention of Falls in Older Persons. JAGS, 59(1), 148-157.',
                'Granacher U et al. (2013). Trunk Muscle Strength for Balance and Fall Prevention in Seniors. Sports Med, 43(7), 627-641.'
            ],
            recommendedProducts: [
                { id: 1, name: '核心穩定與神經肌肉控制訓練', icon: '🏋️', reason: '運動處方：核心穩定、太極、平衡感訓練 [R4][R5]' },
                { id: 2, name: '綜合維生素B群+鈣+維生素D3', icon: '💊', reason: '營養處方：支持神經健康與肌肉收縮閾值 (含鎂)' }
            ]
        }
    }

    // 優先級 2: 張力/伸展 (指標 A：關節活動度 ROM 不足) - Threshold: < 160 degrees
    if (rom > 0 && rom < 160) {
        return {
            title: '💪 關節活動度 (ROM) 不足',
            content: `關節夾角 ${Math.round(rom)}° (<160°)，學術對應骨關節炎(OA)或軟組織沾黏。依 OARSI 非手術治療指南 [R6]，活動度受限為關節退化核心表徵，需透過規律伸展與水中運動進行介入。`,
            color: 'text-orange-600 bg-orange-50 border-orange-200',
            references: [
                'OARSI (2019). Guidelines for Non-Surgical Management of Knee, Hip, and Polyarticular OA. Osteoarthritis Cart, 27(11), 1578-1589.',
                'Page P et al. (2010). Assessment and Treatment of Muscle Imbalance: The Janda Approach. Human Kinetics.'
            ],
            recommendedProducts: [
                { id: 3, name: '關節活動度伸展與水中太極課程', icon: '🏋️', reason: '運動處方：ROM exercises, 皮拉提斯 [R6]' },
                { id: 4, name: 'UC-II 頂級非變性第二型膠原蛋白', icon: '💊', reason: '營養處方：配合 Omega-3 / 薑黃素降低局部發炎，修復軟骨 [R6]' }
            ]
        }
    }

    // 優先級 3: 力量/速度 (指標 C：出手速度偏低 / 位移遲緩)
    if (velocity >= 0 && (velocity < 0.8 || (velocity > 1 && velocity < 30))) {
        return {
            title: '⚡ 出手速度偏低 / 位移遲緩',
            content: `單位時間位移不足 (數值: ${velocity.toFixed(2)}，標準 < 0.8 m/s)，對應早期肌少症 (Sarcopenia)。依 EWGSOP2 歐洲共識修訂版 [R8]，步速/位移量為衰弱指標；ICFSR 指南 [R9] 建議漸進式抗阻力訓練搭配蛋白質補充。`,
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            references: [
                'Cruz-Jentoft AJ et al. (2019). Sarcopenia: Revised European Consensus (EWGSOP2). Age Ageing, 48(1), 16-31.',
                'Dent E et al. (2019). Physical Frailty: ICFSR International Clinical Practice Guidelines. JNHA, 23(9), 771-787.',
                'Bauer J et al. (2013). Optimal Dietary Protein Intake in Older People: PROT-AGE Position Paper. JAMDA, 14(8), 542-559.'
            ],
            recommendedProducts: [
                { id: 5, name: '漸進式抗阻力與增強式訓練', icon: '🏋️', reason: '運動處方：增強肌肉神經連結與爆發力 [R8][R10]' },
                { id: 6, name: '乳清蛋白 + BCAA 分枝鏈胺基酸', icon: '💊', reason: '營養處方：結合 D3/HMB，激活 mTORC1 促進肌肉合成 [R11]' }
            ]
        }
    }

    return {
        title: '✅ 動作表現優異',
        content: '各項指標均在標準範圍內，動作流暢穩定。經個人化協同效應評估 [R3]，建議繼續維持目前的營養與訓練基底，並定期追蹤數據變化趨勢。',
        color: 'text-green-600 bg-green-50 border-green-200',
        references: [
            'ACSM (2018). Guidelines for Exercise Testing and Prescription, 10th Ed. Wolters Kluwer.'
        ],
        recommendedProducts: [
            { id: 7, name: '進階地板滾球戰術與精準度專班', icon: '🏆', reason: '運動處方：挑戰技術極限，增強競技能力' },
            { id: 8, name: '常態日常綜合保健維他命', icon: '💊', reason: '營養處方：維持基礎代謝率與體力' }
        ]
    }
}

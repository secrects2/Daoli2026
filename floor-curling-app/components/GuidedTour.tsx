'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface TourStep {
    target: string              // CSS 選擇器
    title: string               // 步驟標題
    content: string             // 說明內容
    position?: 'top' | 'bottom' | 'left' | 'right'
    action?: string             // 可選：提示用戶動作
}

interface TourContextType {
    isActive: boolean
    currentStep: number
    steps: TourStep[]
    startTour: (steps: TourStep[]) => void
    nextStep: () => void
    prevStep: () => void
    endTour: () => void
    skipTour: () => void
}

const TourContext = createContext<TourContextType | null>(null)

export function useTour() {
    const context = useContext(TourContext)
    if (!context) {
        throw new Error('useTour must be used within TourProvider')
    }
    return context
}

export function TourProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [steps, setSteps] = useState<TourStep[]>([])
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

    const startTour = (tourSteps: TourStep[]) => {
        setSteps(tourSteps)
        setCurrentStep(0)
        setIsActive(true)
        localStorage.setItem('tourCompleted', 'false')
    }

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            endTour()
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const endTour = () => {
        setIsActive(false)
        setCurrentStep(0)
        setSteps([])
        setHighlightRect(null)
        localStorage.setItem('tourCompleted', 'true')
    }

    const skipTour = () => {
        endTour()
    }

    // 更新高亮位置
    useEffect(() => {
        if (!isActive || steps.length === 0) return

        const step = steps[currentStep]
        const element = document.querySelector(step.target)

        if (element) {
            const rect = element.getBoundingClientRect()
            setHighlightRect(rect)

            // 滾動到元素位置
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
            setHighlightRect(null)
        }
    }, [isActive, currentStep, steps])

    const currentStepData = steps[currentStep]

    return (
        <TourContext.Provider value={{
            isActive,
            currentStep,
            steps,
            startTour,
            nextStep,
            prevStep,
            endTour,
            skipTour
        }}>
            {children}

            {/* 導覽覆蓋層 */}
            {isActive && (
                <div className="fixed inset-0 z-[9999] pointer-events-none">
                    {/* 半透明背景 */}
                    <div className="absolute inset-0 bg-black/60" />

                    {/* 高亮區域 */}
                    {highlightRect && (
                        <div
                            className="absolute bg-transparent pointer-events-auto"
                            style={{
                                top: highlightRect.top - 8,
                                left: highlightRect.left - 8,
                                width: highlightRect.width + 16,
                                height: highlightRect.height + 16,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                                borderRadius: '12px',
                                border: '3px solid #3B82F6',
                                animation: 'pulse 2s infinite'
                            }}
                        />
                    )}

                    {/* 說明卡片 */}
                    {currentStepData && highlightRect && (
                        <div
                            className="absolute bg-white rounded-2xl shadow-2xl p-5 max-w-sm pointer-events-auto"
                            style={{
                                top: highlightRect.bottom + 20,
                                left: Math.max(16, Math.min(
                                    highlightRect.left,
                                    window.innerWidth - 340
                                )),
                                zIndex: 10000
                            }}
                        >
                            {/* 進度指示 */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-gray-400">
                                    步驟 {currentStep + 1} / {steps.length}
                                </span>
                                <button
                                    onClick={skipTour}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    跳過導覽
                                </button>
                            </div>

                            {/* 標題 */}
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {currentStepData.title}
                            </h3>

                            {/* 內容 */}
                            <p className="text-gray-600 text-sm mb-4">
                                {currentStepData.content}
                            </p>

                            {/* 動作提示 */}
                            {currentStepData.action && (
                                <div className="bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
                                    <span>👆</span>
                                    {currentStepData.action}
                                </div>
                            )}

                            {/* 導航按鈕 */}
                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <button
                                        onClick={prevStep}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                                    >
                                        上一步
                                    </button>
                                )}
                                <button
                                    onClick={nextStep}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    {currentStep === steps.length - 1 ? '完成 🎉' : '下一步'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 動畫樣式 */}
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.6), 0 0 20px 10px rgba(59, 130, 246, 0); }
                }
            `}</style>
        </TourContext.Provider>
    )
}

// 預設導覽步驟
export const pharmacistTourSteps: TourStep[] = [
    {
        target: '[data-tour="create-match"]',
        title: '創建比賽 🥌',
        content: '點擊這裡開始記錄一場新的地壺球比賽。您需要選擇紅方和黃方長輩，並記錄每回合的得分。',
        action: '點擊卡片進入創建頁面'
    },
    {
        target: '[data-tour="match-history"]',
        title: '比賽歷史 📋',
        content: '查看所有已完成的比賽記錄，包含詳細的回合比分和證據照片。',
    },
    {
        target: '[data-tour="elder-management"]',
        title: '長輩管理 👴',
        content: '管理您店鋪的長輩名單，新增、編輯或查看長輩資料。',
    },
    {
        target: '[data-tour="qrcode"]',
        title: 'QR Code 管理 📱',
        content: '為長輩生成專屬 QR Code 卡片，方便在創建比賽時快速掃描識別。',
    },
    {
        target: '[data-tour="points"]',
        title: 'Local Points 發放 💰',
        content: '為長輩發放兌換積分獎勵，可用於店內兌換商品或服務。',
    },
    {
        target: '[data-tour="evidence"]',
        title: '證據審核 🔍',
        content: '瀏覽和審核比賽的證據照片和影片，確保雙機流協議的執行。',
    },
    {
        target: '[data-tour="transactions"]',
        title: '交易記錄 📊',
        content: '查看所有積分變動的詳細記錄，包含比賽獎勵和手動發放。',
    }
]

export const familyTourSteps: TourStep[] = [
    {
        target: '[data-tour="elder-info"]',
        title: '長輩資訊 👴',
        content: '這裡顯示您綁定長輩的基本資訊和積分餘額。',
    },
    {
        target: '[data-tour="stats"]',
        title: '比賽統計 📊',
        content: '查看長輩的總比賽場次、獲勝次數和勝率統計。',
    },
    {
        target: '[data-tour="notifications"]',
        title: '通知中心 🔔',
        content: '當長輩完成比賽時，您會在這裡收到即時通知。',
        action: '點擊查看所有通知'
    },
    {
        target: '[data-tour="matches"]',
        title: '比賽記錄 🏆',
        content: '查看長輩的完整比賽記錄，包含每回合詳情和證據照片。',
        action: '點擊查看完整戰績'
    }
]

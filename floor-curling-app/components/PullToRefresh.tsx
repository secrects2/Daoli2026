'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export function PullToRefresh({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [startY, setStartY] = useState(0)
    const [currentY, setCurrentY] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const PULL_THRESHOLD = 80 // px to trigger refresh
    const MAX_PULL = 150 // max visual pull distance

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                setStartY(e.touches[0].clientY)
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            const y = e.touches[0].clientY
            const diff = y - startY

            // Only allow pulling if we started at the top and are pulling down
            if (window.scrollY === 0 && diff > 0 && !refreshing) {
                // Add resistance
                const resistance = 0.4
                const pulledDistance = Math.min(diff * resistance, MAX_PULL)
                setCurrentY(pulledDistance)

                // Prevent default scrolling only if we are effectively pulling to refresh
                // This can be tricky with native scrolling, but for top-level pull usually okay
                if (diff > 10 && e.cancelable) {
                    e.preventDefault()
                }
            } else {
                setCurrentY(0)
            }
        }

        const handleTouchEnd = async () => {
            if (currentY > PULL_THRESHOLD && !refreshing) {
                setRefreshing(true)
                setCurrentY(60) // Hold position for spinner

                try {
                    // Trigger refresh
                    router.refresh()
                    // Add a small artificial delay to let user see it happened if network is too fast
                    await new Promise(resolve => setTimeout(resolve, 800))
                } finally {
                    setRefreshing(false)
                    setCurrentY(0)
                }
            } else {
                setCurrentY(0)
            }
        }

        // We use non-passive listeners to be able to preventDefault if needed
        container.addEventListener('touchstart', handleTouchStart, { passive: true })
        container.addEventListener('touchmove', handleTouchMove, { passive: false })
        container.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            container.removeEventListener('touchstart', handleTouchStart)
            container.removeEventListener('touchmove', handleTouchMove)
            container.removeEventListener('touchend', handleTouchEnd)
        }
    }, [startY, currentY, refreshing, router])

    return (
        <div
            ref={containerRef}
            className="min-h-screen relative"
        >
            {/* Refresh Spinner Indicator */}
            <div
                className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none"
                style={{
                    height: `${currentY}px`,
                    opacity: currentY > 0 ? 1 : 0,
                    transition: refreshing ? 'height 0.2s' : 'height 0s'
                }}
            >
                <div className={`transition-transform duration-200 ${currentY > PULL_THRESHOLD ? 'rotate-180' : ''}`}>
                    {refreshing ? (
                        <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content with offset */}
            <div
                style={{
                    transform: `translateY(${currentY}px)`,
                    transition: refreshing ? 'transform 0.2s' : 'transform 0.1s cubic-bezier(0,0,0.2,1)'
                }}
            >
                {children}
            </div>
        </div>
    )
}

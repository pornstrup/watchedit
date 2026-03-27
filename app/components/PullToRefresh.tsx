'use client'

import { useEffect, useRef, useState } from 'react'

export default function PullToRefresh({ onRefresh }: { onRefresh: () => void }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const threshold = 72

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(delta * 0.5, threshold + 20))
      }
    }

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true)
        setPullDistance(threshold)
        await onRefresh()
        setRefreshing(false)
      }
      setPullDistance(0)
      startY.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, refreshing, onRefresh])

  if (pullDistance === 0 && !refreshing) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const ready = progress >= 1

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center pointer-events-none"
      style={{
        height: refreshing ? threshold : pullDistance,
        transition: refreshing ? 'height 0.2s ease' : 'none',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          opacity: progress,
          transform: `scale(${0.6 + progress * 0.4}) rotate(${refreshing ? 0 : progress * 180}deg)`,
          transition: refreshing ? 'transform 0.6s linear' : 'none',
        }}
      >
        {refreshing ? (
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <path d="M7 1.5A5.5 5.5 0 1 1 1.5 7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d={ready
                ? 'M2 6.5L5 9.5L10 4'
                : 'M6 2.5V9.5M6 9.5L3.5 7M6 9.5L8.5 7'}
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}

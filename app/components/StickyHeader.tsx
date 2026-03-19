'use client'

import { useEffect, useState } from 'react'

export default function StickyHeader({ title }: { title: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 220)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 transition-all duration-300"
      style={{
        height: '56px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: visible ? 'blur(40px) saturate(180%)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(40px) saturate(180%)' : 'none',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
      }}
    >
      <button
        onClick={() => window.history.back()}
        className="text-white/70 text-sm font-medium mr-4 hover:text-white transition-colors"
      >
        ← Tilbage
      </button>
      <p className="text-white font-semibold text-sm truncate flex-1">{title}</p>
    </div>
  )
}
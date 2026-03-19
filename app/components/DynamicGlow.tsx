'use client'

import { useEffect, useState } from 'react'

export default function DynamicGlow({ posterUrl }: { posterUrl: string | null }) {
  const [color, setColor] = useState('30,30,30')

  useEffect(() => {
    if (!posterUrl) return
    fetch(`/api/color?url=${encodeURIComponent(posterUrl)}`)
      .then(r => r.json())
      .then(d => setColor(d.color))
  }, [posterUrl])

  return (
    <div
      className="absolute inset-0 pointer-events-none transition-all duration-1000"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(${color}, 0.4) 0%, rgba(0,0,0,0) 70%)`,
        zIndex: 0,
      }}
    />
  )
}
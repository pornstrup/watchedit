'use client'

import { ChevronLeft } from 'lucide-react'

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="absolute top-14 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
      style={{
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      }}
    >
      <ChevronLeft size={20} strokeWidth={2.5} color="white" />
    </button>
  )
}
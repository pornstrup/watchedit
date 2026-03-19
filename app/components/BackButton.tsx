'use client'

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="absolute top-14 left-6 flex items-center gap-1.5 px-4 py-2 rounded-full text-white/70 text-sm font-medium transition-all duration-200 hover:text-white/90"
      style={{
        background: 'rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      ← Tilbage
    </button>
  )
}
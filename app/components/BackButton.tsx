'use client'

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="absolute top-14 left-6 text-white/60 text-sm font-medium"
    >
      ← Tilbage
    </button>
  )
}
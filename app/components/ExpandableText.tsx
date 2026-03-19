'use client'

import { useState } from 'react'

export default function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative">
      <div
        className={`relative overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-96' : 'max-h-16'
        }`}
      >
        <p className="text-white/60 text-sm leading-relaxed">{text}</p>
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black to-transparent" />
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-white/40 text-xs mt-1.5 hover:text-white/60 transition-colors"
      >
        {expanded ? 'Vis mindre' : 'Læs mere'}
      </button>
    </div>
  )
}
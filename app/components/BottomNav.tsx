'use client'

import { usePathname } from 'next/navigation'
import { Tv2, Compass, Search, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const items = [
    { href: '/', icon: Tv2, label: 'Min liste' },
    { href: '/discover', icon: Compass, label: 'Opdag' },
    { href: '/search', icon: Search, label: 'Søg' },
    { href: '/profile', icon: User, label: 'Profil' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/8 flex items-center pb-6 pt-3 z-50">
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 transition-all ${isActive ? 'text-white' : 'text-white/30'}`}
          >
            <Icon size={22} strokeWidth={1.5} />
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
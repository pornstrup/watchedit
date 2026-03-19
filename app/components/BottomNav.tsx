'use client'

import { usePathname } from 'next/navigation'
import { Tv2, Search, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  // Skjul navbar på detailsider
  const isDetailPage = 
  pathname.startsWith('/movie/') || 
  pathname.startsWith('/tv/') ||
  pathname === '/login'
  if (isDetailPage) return null

  const items = [
    { href: '/', icon: Tv2, label: 'Min liste' },
    // { href: '/discover', icon: Compass, label: 'Opdag' },
    { href: '/search', icon: Search, label: 'Søg' },
    { href: '/profile', icon: User, label: 'Profil' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-8 pointer-events-none"
    >
      <div
        className="pointer-events-auto flex items-center gap-1 px-3 py-3 rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {items.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <a
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
              style={{
                background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                boxShadow: isActive
                  ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)'
                  : 'none',
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)'}
              />
            </a>
          )
        })}
      </div>
    </nav>
  )
}
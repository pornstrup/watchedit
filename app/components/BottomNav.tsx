'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Tv2, Search, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SearchSheet from './SearchSheet'

export default function BottomNav() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  const isDetailPage =
    pathname.startsWith('/movie/') ||
    pathname.startsWith('/tv/') ||
    pathname === '/login'
  if (isDetailPage) return null

  // Udled aktiv gruppe fra URL
  const groupId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('group')
    : null

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-8 pointer-events-none">
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
          {/* MIN LISTE */}
          <a
            href="/"
            aria-label="Min liste"
            className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
            style={{
              background: pathname === '/' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              boxShadow: pathname === '/' ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <Tv2
              size={22}
              strokeWidth={pathname === '/' ? 2 : 1.5}
              color={pathname === '/' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)'}
            />
          </a>

          {/* SØG */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Søg"
            className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
            style={{
              background: searchOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              boxShadow: searchOpen ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <Search
              size={22}
              strokeWidth={searchOpen ? 2 : 1.5}
              color={searchOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)'}
            />
          </button>

          {/* PROFIL */}
          <a
            href="/profile"
            aria-label="Profil"
            className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200"
            style={{
              background: pathname === '/profile' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              boxShadow: pathname === '/profile' ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <User
              size={22}
              strokeWidth={pathname === '/profile' ? 2 : 1.5}
              color={pathname === '/profile' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.35)'}
            />
          </a>
        </div>
      </nav>

      <AnimatePresence>
        {searchOpen && (
          <SearchSheet
            onClose={() => setSearchOpen(false)}
            initialGroupId={groupId}
          />
        )}
      </AnimatePresence>
    </>
  )
}
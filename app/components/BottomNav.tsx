'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Tv2, Compass, User } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import NotificationBell from './NotificationBell'
import { prefetchDiscoveryData, refreshDiscoveryData } from './discoveryCache'
import { OPEN_SEARCH_EVENT, type OpenSearchDetail } from './searchEvents'

function SheetFallback({ title }: { title: string }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center"
      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />
      <div
        className="relative w-full max-w-md flex flex-col rounded-t-3xl px-6 pt-5 pb-6"
        style={{
          minHeight: '45vh',
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5 flex-shrink-0" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="h-4 w-24 rounded-full bg-white/10 mb-2" />
            <div className="h-3 w-36 rounded-full bg-white/5" />
          </div>
          <div className="h-8 w-8 rounded-full bg-white/8" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-12 rounded-2xl bg-white/7" />
          <div className="h-12 rounded-2xl bg-white/7" />
          <div className="h-12 rounded-2xl bg-white/7" />
        </div>
        <div className="mt-6 text-center text-white/35 text-sm">{title} loader...</div>
      </div>
    </div>
  )
}

const SearchSheet = dynamic(() => import('./SearchSheet'), {
  ssr: false,
  loading: () => <SheetFallback title="Opdag" />,
})

const ProfileSheet = dynamic(() => import('./ProfileSheet'), {
  ssr: false,
  loading: () => <SheetFallback title="Profil" />,
})

export default function BottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchGroupId, setSearchGroupId] = useState<string | null | undefined>(undefined)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState('')
  const [initialAiMode, setInitialAiMode] = useState(false)

  const isDetailPage =
    pathname.startsWith('/movie/') ||
    pathname.startsWith('/tv/') ||
    pathname === '/login'

  const groupId = searchParams.get('group')

  useEffect(() => {
    prefetchDiscoveryData()
  }, [])

  useEffect(() => {
    if (isDetailPage) return
    const timer = window.setTimeout(() => {
      void import('./SearchSheet')
      void import('./ProfileSheet')
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [isDetailPage])

  useEffect(() => {
    const handleProfileUpdate = () => {
      refreshDiscoveryData()
    }

    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [])


  // Genåbn søgning når vi navigerer tilbage til forsiden med søge-params i URL
  useEffect(() => {
    if (isDetailPage) return
    const savedQuery = searchParams.get('search') || ''
    if (savedQuery) {
      setInitialQuery(savedQuery)
      setInitialAiMode(searchParams.get('aiMode') === '1')
      setSearchOpen(true)
    }
  }, [pathname, isDetailPage, searchParams])

  useEffect(() => {
    const checkSearchUrl = () => {
      const savedQuery = searchParams.get('search') || ''
      const savedAiMode = searchParams.get('aiMode') === '1'
      if (savedQuery) {
        setInitialQuery(savedQuery)
        setInitialAiMode(savedAiMode)
        setSearchOpen(true)
      }
    }

    // Auto-åbn søgning ved mount
    checkSearchUrl()

    // Genåbn søgning når bruger navigerer tilbage via browser-back
    window.addEventListener('popstate', checkSearchUrl)

    const show = () => setSheetOpen(true)
    const hide = () => setSheetOpen(false)
    const openSearch = (event: Event) => {
      const detail = (event as CustomEvent<OpenSearchDetail | undefined>).detail
      setSearchGroupId(detail?.groupId)
      setSearchOpen(true)
    }
    window.addEventListener('sheet-opened', show)
    window.addEventListener('sheet-closed', hide)
    window.addEventListener(OPEN_SEARCH_EVENT, openSearch)
    return () => {
      window.removeEventListener('popstate', checkSearchUrl)
      window.removeEventListener('sheet-opened', show)
      window.removeEventListener('sheet-closed', hide)
      window.removeEventListener(OPEN_SEARCH_EVENT, openSearch)
    }
  }, [searchParams])

  const initialSearchGroupId = searchGroupId !== undefined ? searchGroupId : groupId

  if (isDetailPage) return null

  const isHidden = searchOpen || profileOpen || sheetOpen

  return (
    <>
      <AnimatePresence>
        {!isHidden && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
            <div
              className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-[28px]"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* MIN LISTE */}
              <Link
                href="/"
                aria-label="Lister"
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200"
                style={{
                  background: pathname === '/' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  boxShadow: pathname === '/' ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Tv2
                  size={20}
                  strokeWidth={pathname === '/' ? 2 : 1.5}
                  color={pathname === '/' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)'}
                />
                <span style={{ color: pathname === '/' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Lister</span>
              </Link>

              {/* OPDAG */}
              <button
                onClick={() => {
                  setSearchGroupId(groupId)
                  setSearchOpen(true)
                }}
                aria-label="Opdag"
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200"
                style={{
                  background: searchOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  boxShadow: searchOpen ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <Compass
                  size={20}
                  strokeWidth={searchOpen ? 2 : 1.5}
                  color={searchOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)'}
                />
                <span style={{ color: searchOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Opdag</span>
              </button>

              {/* NYHEDER */}
              <NotificationBell />

              {/* PROFIL */}
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Profil"
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200"
                style={{
                  background: profileOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  boxShadow: profileOpen ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <User
                  size={20}
                  strokeWidth={profileOpen ? 2 : 1.5}
                  color={profileOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)'}
                />
                <span style={{ color: profileOpen ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>Profil</span>
              </button>
            </div>
          </nav>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen && (
          <SearchSheet
            onClose={() => {
              setSearchOpen(false)
              setInitialQuery('')
              setInitialAiMode(false)
              setSearchGroupId(undefined)
              // Ryd søge-params fra URL
              const urlParams = new URLSearchParams(window.location.search)
              urlParams.delete('search')
              urlParams.delete('aiMode')
              const qs = urlParams.toString()
              window.history.replaceState(null, '', qs ? `/?${qs}` : '/')
            }}
            initialGroupId={initialSearchGroupId ?? null}
            initialQuery={initialQuery}
            initialAiMode={initialAiMode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileOpen && (
          <ProfileSheet onClose={() => setProfileOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

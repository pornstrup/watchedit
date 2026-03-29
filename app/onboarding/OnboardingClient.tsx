'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Step = 'username' | 'streaming' | 'titles'

type Provider = { id: number; name: string; logo: string }
type SearchResult = { tmdb_id: number; media_type: string; title: string; year?: string; poster: string | null }

const STEPS: Step[] = ['username', 'streaming', 'titles']

export default function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('username')
  const stepIndex = STEPS.indexOf(step)

  const finish = () => router.replace('/')

  return (
    <main className="min-h-screen bg-black flex flex-col px-6 pt-16 pb-12">
      <div className="w-full max-w-xs mx-auto flex flex-col gap-10 flex-1">

        {/* Progress dots */}
        <div className="flex gap-2 justify-center">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === stepIndex ? 20 : 6,
                height: 6,
                background: i <= stepIndex ? 'white' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1">
          {step === 'username' && (
            <UsernameStep
              userName={userName}
              onNext={() => setStep('streaming')}
              onSkip={() => setStep('streaming')}
            />
          )}
          {step === 'streaming' && (
            <StreamingStep
              onNext={() => setStep('titles')}
              onSkip={() => setStep('titles')}
            />
          )}
          {step === 'titles' && (
            <TitlesStep onDone={finish} />
          )}
        </div>

      </div>
    </main>
  )
}

// --- STEP 1: USERNAME ---

function UsernameStep({ userName, onNext, onSkip }: { userName: string; onNext: () => void; onSkip: () => void }) {
  const [username, setUsername] = useState('')
  const [searchable, setSearchable] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'taken'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const save = async () => {
    if (!username.trim()) { onNext(); return }
    setStatus('saving')
    const res = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), searchable }),
    })
    if (res.ok) {
      onNext()
    } else {
      const data = await res.json()
      setStatus(data.error?.includes('taget') ? 'taken' : 'error')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-white text-2xl font-bold">Hvad skal vi kalde dig?</h2>
        <p className="text-white/45 text-sm mt-2 leading-relaxed">
          Dit brugernavn gør det muligt for venner at finde dig.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Username input */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${status === 'taken' || status === 'error' ? 'rgba(255,59,48,0.5)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <span className="text-white/40 text-base">@</span>
          <input
            ref={inputRef}
            value={username}
            onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setStatus('idle') }}
            placeholder="brugernavn"
            className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-white/25"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        {status === 'taken' && <p className="text-red-400 text-xs -mt-2 px-1">Brugernavnet er allerede taget.</p>}
        {status === 'error' && <p className="text-red-400 text-xs -mt-2 px-1">Noget gik galt. Prøv igen.</p>}

        {/* Searchable toggle */}
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-white text-sm font-medium">Synlig for andre</p>
            <p className="text-white/40 text-xs mt-0.5">Venner kan søge dig frem</p>
          </div>
          <button
            onClick={() => setSearchable(s => !s)}
            className="relative flex-shrink-0 transition-colors duration-200"
            style={{
              width: 51,
              height: 31,
              borderRadius: 999,
              background: searchable ? 'rgba(52,199,89,1)' : 'rgba(255,255,255,0.15)',
            }}
          >
            <span
              className="absolute top-0.5 transition-all duration-200"
              style={{
                left: searchable ? 22 : 2,
                width: 27,
                height: 27,
                borderRadius: 999,
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto pt-8">
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="py-4 rounded-2xl text-black text-sm font-semibold transition-opacity"
          style={{ background: 'white', opacity: status === 'saving' ? 0.6 : 1 }}
        >
          {status === 'saving' ? 'Gemmer…' : 'Fortsæt'}
        </button>
        <button onClick={onSkip} className="py-2 text-white/35 text-sm text-center">
          Spring over
        </button>
      </div>
    </div>
  )
}

// --- STEP 2: STREAMING ---

function StreamingStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/streaming-providers')
      .then(r => r.json())
      .then(d => setProviders((d.providers || []).slice(0, 16)))
  }, [])

  const toggle = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    if (selected.length === 0) { onNext(); return }
    setSaving(true)
    await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streaming_services: selected }),
    })
    onNext()
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-white text-2xl font-bold">Hvilke tjenester har du?</h2>
        <p className="text-white/45 text-sm mt-2 leading-relaxed">
          Vi bruger det til at vise hvad der er nyt der, du kan se.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {providers.map(p => {
          const active = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-150"
              style={{
                background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden relative">
                <Image src={p.logo} alt={p.name} fill className="object-cover" sizes="40px" />
              </div>
              <p className="text-white/60 text-xs text-center leading-tight line-clamp-2">{p.name}</p>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 mt-auto pt-4">
        <button
          onClick={save}
          disabled={saving}
          className="py-4 rounded-2xl text-black text-sm font-semibold transition-opacity"
          style={{ background: 'white', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Gemmer…' : selected.length > 0 ? `Fortsæt (${selected.length} valgt)` : 'Fortsæt'}
        </button>
        <button onClick={onSkip} className="py-2 text-white/35 text-sm text-center">
          Spring over
        </button>
      </div>
    </div>
  )
}

// --- STEP 3: FIRST TITLE ---

function TitlesStep({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [searching, setSearching] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults((data.results || []).slice(0, 10))
      setSearching(false)
    }, 300)
  }, [query])

  const addTitle = async (item: SearchResult) => {
    setAdded(prev => new Set(prev).add(item.tmdb_id))
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: item.tmdb_id, media_type: item.media_type }),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-white text-2xl font-bold">Tilføj noget du vil se</h2>
        <p className="text-white/45 text-sm mt-2 leading-relaxed">
          Søg efter film eller serier og tilføj dem til din liste.
        </p>
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Søg film eller serie…"
          className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-white/25"
          autoFocus
        />
        {searching && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map(item => {
            const isAdded = added.has(item.tmdb_id)
            return (
              <button
                key={`${item.tmdb_id}-${item.media_type}`}
                onClick={() => !isAdded && addTitle(item)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors text-left"
                style={{
                  background: isAdded ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isAdded ? 'rgba(52,199,89,0.25)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                <div className="w-9 h-14 rounded-lg overflow-hidden relative flex-shrink-0 bg-white/10">
                  {item.poster && (
                    <Image src={item.poster} alt={item.title} fill className="object-cover" sizes="36px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {item.media_type === 'tv' ? 'Serie' : 'Film'}{item.year && ` · ${item.year}`}
                  </p>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: isAdded ? 'rgba(52,199,89,0.8)' : 'rgba(255,255,255,0.1)' }}
                >
                  {isAdded
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  }
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 mt-auto pt-4">
        <button
          onClick={onDone}
          className="py-4 rounded-2xl text-black text-sm font-semibold"
          style={{ background: 'white' }}
        >
          {added.size > 0 ? `Kom i gang (${added.size} tilføjet)` : 'Kom i gang'}
        </button>
        {added.size === 0 && (
          <button onClick={onDone} className="py-2 text-white/35 text-sm text-center">
            Spring over
          </button>
        )}
      </div>
    </div>
  )
}

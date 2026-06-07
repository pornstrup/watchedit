export default function HomeLoading() {
  return (
    <main
      className="min-h-screen bg-black flex flex-col items-center"
      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-md px-6 flex flex-col pt-14">
        <div className="w-full max-w-md flex flex-col gap-8">

          {/* Logo */}
          <p className="text-2xl font-bold tracking-wide leading-none">
            <span className="text-white">Flim</span>
            <span style={{ color: '#FF3B30' }}>r</span>
          </p>

          <div className="flex flex-col gap-4">
            {/* Titel */}
            <div className="flex items-center justify-between">
              <div className="h-8 w-32 rounded-xl bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Watchlist skeleton — matcher Watchlist.tsx loading state */}
          <div className="flex flex-col gap-8">
            {/* "Fortsæt med" — horisontal scroll */}
            <div className="flex gap-3 overflow-x-hidden pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-40 h-60 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
            {/* "Vil se" — 2-kolonne grid */}
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}

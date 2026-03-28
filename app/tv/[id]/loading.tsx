export default function TVLoading() {
  return (
    <main className="min-h-screen bg-black relative" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* Backdrop */}
      <div className="relative h-[45vh] overflow-hidden bg-white/5 animate-pulse" />

      <div className="px-6 -mt-16 relative">
        <div className="flex gap-4 mb-4">
          {/* Poster */}
          <div className="w-32 h-48 rounded-xl bg-white/10 animate-pulse flex-shrink-0" />

          <div className="flex flex-col justify-between flex-1 pb-1" style={{ minHeight: 192 }}>
            <div className="flex flex-col gap-2 mt-2">
              {/* Titel */}
              <div className="h-5 w-3/4 rounded-lg bg-white/15 animate-pulse" />
              <div className="h-5 w-1/2 rounded-lg bg-white/10 animate-pulse" />
              {/* Meta */}
              <div className="flex gap-2 mt-1">
                <div className="h-3 w-10 rounded bg-white/8 animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/8 animate-pulse" />
              </div>
            </div>
            {/* Status buttons */}
            <div className="flex gap-2">
              <div className="h-10 w-20 rounded-full bg-white/8 animate-pulse" />
              <div className="h-10 w-20 rounded-full bg-white/8 animate-pulse" />
              <div className="h-10 w-20 rounded-full bg-white/8 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Streaming */}
        <div className="mb-6 flex gap-3">
          <div className="h-10 w-28 rounded-xl bg-white/8 animate-pulse" />
          <div className="h-10 w-24 rounded-xl bg-white/8 animate-pulse" />
        </div>

        {/* Beskrivelse */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="h-3.5 w-full rounded bg-white/8 animate-pulse" />
          <div className="h-3.5 w-full rounded bg-white/8 animate-pulse" />
          <div className="h-3.5 w-4/5 rounded bg-white/8 animate-pulse" />
          <div className="h-3.5 w-3/5 rounded bg-white/8 animate-pulse" />
        </div>

        {/* Sæsoner */}
        <div className="h-3 w-20 rounded bg-white/8 animate-pulse mb-3" />
        <div className="flex flex-col gap-2 mb-6">
          <div className="h-14 w-full rounded-xl bg-white/8 animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-white/8 animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-white/8 animate-pulse" />
        </div>

        {/* Lignende */}
        <div className="h-3 w-16 rounded bg-white/8 animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-24 h-36 rounded-xl bg-white/8 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  )
}

import Image from 'next/image'
import Link from 'next/link'

type SimilarItem = {
  id: number
  title: string
  poster: string
  year: string | null
  mediaType: 'movie' | 'tv'
}

export default function SimilarTitles({ items, ctx }: { items: SimilarItem[]; ctx?: string }) {
  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-white/50 text-sm mb-3">Lignende</p>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${item.mediaType}/${item.id}${ctx ? `?ctx=${ctx}` : ''}`}
            className="flex-shrink-0 w-24"
          >
            <div className="w-24 h-36 rounded-xl overflow-hidden bg-white/10 mb-1.5">
              <Image
                src={item.poster}
                alt={item.title}
                width={96}
                height={144}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-white/70 text-xs leading-tight line-clamp-2">{item.title}</p>
            {item.year && <p className="text-white/30 text-xs mt-0.5">{item.year}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}

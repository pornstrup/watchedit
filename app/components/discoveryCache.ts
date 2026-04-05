'use client'

export type OpdagItem = {
  tmdb_id: number
  media_type: string
  title: string
  year?: string | null
  poster: string | null
  reason?: string
}

export type OpdagSection = {
  id: string
  title: string
  providerLogo?: string
  items: OpdagItem[]
}

type ProfileResponse = {
  streaming_services?: number[]
}

type SectionsResponse = {
  sections?: OpdagSection[]
}

const normalizeStreamingKey = (services: number[]) =>
  [...services]
    .filter((id) => Number.isFinite(id))
    .sort((a, b) => a - b)
    .join(',') || 'none'

let baseSectionsCache: OpdagSection[] | null = null
let baseSectionsPromise: Promise<OpdagSection[]> | null = null

let streamingKeyCache: string | null = null
let streamingKeyPromise: Promise<string> | null = null

const providerSectionsCache = new Map<string, OpdagSection[]>()
const providerSectionsPromise = new Map<string, Promise<OpdagSection[]>>()

async function fetchSections(url: string): Promise<OpdagSection[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  const data = (await res.json()) as SectionsResponse
  return data.sections || []
}

export async function getDiscoveryBaseSections(): Promise<OpdagSection[]> {
  if (baseSectionsCache) return baseSectionsCache
  if (!baseSectionsPromise) {
    baseSectionsPromise = fetchSections('/api/opdag/base')
      .then((sections) => {
        baseSectionsCache = sections
        return sections
      })
      .finally(() => {
        baseSectionsPromise = null
      })
  }
  return baseSectionsPromise
}

export async function getStreamingServicesKey(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    streamingKeyCache = null
    streamingKeyPromise = null
  }

  if (streamingKeyCache !== null) return streamingKeyCache

  if (!streamingKeyPromise) {
    streamingKeyPromise = fetch('/api/profile/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load profile')
        return res.json() as Promise<ProfileResponse>
      })
      .then((data) => {
        streamingKeyCache = normalizeStreamingKey(data.streaming_services || [])
        return streamingKeyCache
      })
      .catch(() => {
        streamingKeyCache = 'none'
        return 'none'
      })
      .finally(() => {
        streamingKeyPromise = null
      })
  }

  return streamingKeyPromise
}

export async function getDiscoveryProviderSections(forceProfileRefresh = false): Promise<{
  key: string
  sections: OpdagSection[]
}> {
  const key = await getStreamingServicesKey(forceProfileRefresh)

  if (!forceProfileRefresh && providerSectionsCache.has(key)) {
    return { key, sections: providerSectionsCache.get(key) || [] }
  }

  const cachedPromise = providerSectionsPromise.get(key)
  if (cachedPromise) {
    return { key, sections: await cachedPromise }
  }

  const promise = fetchSections('/api/opdag/providers')
    .then((sections) => {
      providerSectionsCache.set(key, sections)
      return sections
    })
    .finally(() => {
      providerSectionsPromise.delete(key)
    })

  providerSectionsPromise.set(key, promise)

  return { key, sections: await promise }
}

export async function prefetchDiscoveryData(forceProfileRefresh = false) {
  return Promise.all([
    getDiscoveryBaseSections(),
    getDiscoveryProviderSections(forceProfileRefresh),
  ])
}

export async function refreshDiscoveryData() {
  streamingKeyCache = null
  streamingKeyPromise = null
  providerSectionsPromise.clear()
  return prefetchDiscoveryData(true)
}


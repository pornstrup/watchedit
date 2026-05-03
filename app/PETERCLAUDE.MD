# CLAUDE.md – WatchedIt

Dette dokument fortæller Claude hvordan projektet fungerer, hvilke mønstre der bruges, og hvilke fejl der skal undgås. Læs det grundigt før du ændrer noget.

---

## Hvad er WatchedIt?
En PWA til at holde styr på film og serier. Kernefunktionen er delte gruppelister hvor man kan se hinandens fremgang i realtid.

## Om brugeren
- Lærer Next.js undervejs – forklar **hvorfor** ikke bare hvad
- Vil have Apple-kvalitet i design og UX – udfordre forslag der ikke lever op til det
- Foretrækker at se **hele filen** frem for diff/patches
- Al UI-tekst er på **dansk**

---

## Tech Stack
- **Next.js 15** (App Router, Turbopack) – ingen Pages Router
- **Tailwind CSS** – kun core utility classes, ingen custom config
- **Framer Motion** – animationer og transitions
- **Supabase** – database, auth, realtime
- **TMDB API** – alt indhold, region=DK
- **Claude API** – AI-anbefalinger (ikke bygget endnu)
- **Hosting**: Hetzner via Coolify

---

## Next.js 15 quirks – VIGTIGT

`params` og `searchParams` skal **awaites** i server components:

```typescript
// KORREKT
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ctx?: string }>
}) {
  const { id } = await params
  const { ctx } = await searchParams
```

Server components er default. Brug kun `'use client'` når der er brug for state, events eller browser APIs.

---

## Supabase – kritiske regler

### To clients – brug dem rigtigt
```typescript
import { createClient } from '@/lib/supabase/server'      // bruger JWT session
import { supabaseAdmin } from '@/lib/supabase/admin'       // bypasser RLS
```

**`createClient()`** – til alt der vedrører den indloggede brugers egne data (personlig watchlist, profil).

**`supabaseAdmin`** – SKAL bruges til:
- Alle inserts/reads på gruppe-tabeller (`groups`, `group_members`, `group_invites`)
- Læsning af andre brugeres data i en gruppe (watchlist items med group_id)
- Årsag: server-side JWT videregives ikke korrekt til RLS policies ved inserts

Mønster: autentificer med `createClient`, hent/skriv data med `supabaseAdmin`:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
// Herefter brug supabaseAdmin til gruppe-operationer
const { data } = await supabaseAdmin.from('groups').insert(...)
```

### RLS – kendte problemer
- `group_members` policy bruger en `SECURITY DEFINER` funktion `get_my_group_ids()` for at undgå infinite recursion – **rør den ikke**
- Policies der refererer til sig selv skaber infinite recursion – undgå det

### Soft delete
Brug altid soft delete – aldrig hard delete på `watchlist_items`:
```typescript
// KORREKT
.update({ deleted_at: new Date().toISOString() })

// FORKERT
.delete()
```
Husk altid `.is('deleted_at', null)` på queries så soft-deleted items ikke vises.

### `.single()` advarsel
`.single()` fejler hvis der returneres nul eller flere rækker. Brug det kun når du er sikker på præcis én række. Ved usikkerhed brug `.maybeSingle()` eller tjek array.

---

## Datamodel – KRITISK

### group_id null = personlig liste
```
watchlist_items.group_id = null    → personlig liste (kun ejeren ser den)
watchlist_items.group_id = uuid    → gruppeliste (alle gruppemedlemmer ser den)
```

**Personlige queries skal ALTID have:**
```typescript
.is('group_id', null)
```
Uden denne filter henter du også gruppe-items og får dobbeltdata.

**Gruppe-queries skal ALTID have:**
```typescript
.eq('group_id', groupId)
```

### Kontekst-flow
- Aktiv gruppe gemmes i URL: `/?group=GROUP_ID`
- Detailsider modtager kontekst via: `/tv/123?ctx=GROUP_ID`
- `ctx` bruges på detailsiden til at hente det rigtige item (gruppe vs. personlig)
- `RemoveFromList` modtager `groupId` prop og sender den med til DELETE

---

## Centrale komponenter

### `WatchlistProvider.tsx`
Den vigtigste komponent. Styrer al kontekst-logik:
- Segmented control (Min liste ↔ Gruppe)
- `activeGroupId` state + URL sync
- `refreshKey` pattern til at tvinge reload
- `switchGroup()` funktion opdaterer både state og URL
- New group bottom sheet

### `GroupView.tsx`
Viser gruppe-indhold. Modtager `refreshKey` prop for at reloade når items tilføjes.
Bruger `GroupPosterCard` (ikke `PosterCard` fra Watchlist) – identisk funktionalitet men sender `group_id` med til API-kald.

### `Search.tsx`
Modtager `groupId` prop. Tilføjer til gruppe hvis `groupId` er sat, ellers personlig liste.

### `RemoveFromList.tsx`
Modtager `groupId?: string` prop. Bruger `router.back()` – ALDRIG `router.push('/')`.

---

## Routing mønstre

```
/                           # Forsiden (WatchlistProvider)
/?group=UUID                # Forsiden med aktiv gruppe
/movie/[id]                 # Film detailside
/movie/[id]?ctx=UUID        # Film detailside i gruppe-kontekst
/tv/[id]                    # Serie detailside
/tv/[id]?ctx=UUID           # Serie detailside i gruppe-kontekst
/join/[token]               # Join gruppe via invite-link
/search                     # Søg + discover
/profile                    # Profil
```

**Tilbage-navigation**: Brug altid `router.back()` eller `window.history.back()` fra detailsider – aldrig `router.push('/')` da det mister gruppe-konteksten.

---

## `refreshKey` pattern
Bruges til at tvinge komponenter til at reloade data:
```typescript
const [refreshKey, setRefreshKey] = useState(0)
const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

// Komponent reloader når refreshKey ændrer sig
<Watchlist key={refreshKey} onRemove={refresh} />
<GroupView refreshKey={refreshKey} ... />
```

---

## Design system – præcise værdier

### Glass effekt (standard)
```typescript
{
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
}
```

### Glass effekt (aktiv/fremhævet)
```typescript
{
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
}
```

### Bottom sheet
```typescript
{
  background: 'rgba(28, 28, 30, 0.85)',
  backdropFilter: 'blur(60px) saturate(180%)',
  WebkitBackdropFilter: 'blur(60px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
  borderBottom: 'none',
}
```

### iOS systemfarver
```
Grøn (success):  rgba(52, 199, 89, ...)
Rød (fare):      rgba(255, 59, 48, ...)
```

### Font
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif
```

### Animationer – Apple-principper
- Sektioner animerer som **ét objekt** – ikke staggered per kort
- Brug `opacity` fade på hele sektionen, ikke `y: 12` på individuelle items
- Exit-animationer på individuelle kort: `opacity: 0, scale: 0.95`
- Spring animations på sheets: `damping: 26, stiffness: 300`
- Undgå at bruge dynamiske Tailwind klasser som `w-${size}` – brug inline styles

### Tailwind dynamiske klasser – VIGTIGT
Tailwind genererer kun klasser der er hardcodet i koden. Dette virker IKKE:
```tsx
// FORKERT
className={`w-${size} h-${size}`}

// KORREKT
style={{ width: size * 4, height: size * 4 }}
```

---

## Hvad der IKKE er bygget endnu
- Realtime via Supabase (lyt på `watchlist_items` for gruppe)
- Aktivitetsfeed i GroupView
- Dual progress bar i gruppe "I gang"-sektion
- Claude AI-anbefalinger
- Push-notifikationer
- TMDB da-DK sprog fallback (fetch `da-DK`, fallback til `en-US`)
- `/groups/new` mappen eksisterer men bruges ikke – al gruppe-oprettelse sker via bottom sheet

---

## Teknisk gæld
- `img` tags bruges i stedet for Next.js `Image`
- Ingen error handling på detail-sider
- TMDB data caches ikke aggressivt nok
- Framer Motion bruges kun delvist
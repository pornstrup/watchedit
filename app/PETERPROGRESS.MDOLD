# WatchedIt – Projekt Status

## Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion
- **Backend**: Supabase (DB + Auth + Realtime), supabaseAdmin til inserts der kræver RLS bypass
- **APIs**: TMDB (indhold, region=DK), Claude API (anbefalinger – ikke bygget endnu)
- **Hosting**: Hetzner via Coolify

---

## Database (Supabase) – komplet
| Tabel | Formål |
|-------|--------|
| `profiles` | Brugerprofiler (navn, avatar) |
| `watchlist_items` | Film/serier – `group_id null` = personlig, `group_id` sat = gruppe |
| `episode_progress` | Episodemarkeringer |
| `groups` | Grupper (navn, created_by) |
| `group_members` | Medlemskaber (group_id, user_id, role) |
| `group_invites` | Invite-tokens (expires efter 7 dage, bruges én gang) |
| `tmdb_cache` | Cache af TMDB-data |
| `push_subscriptions` | Push-notifikationer (ikke bygget endnu) |
| `notification_preferences` | Notifikationspræferencer (ikke bygget endnu) |

### RLS noter
- Alle tabeller har RLS slået til
- `group_members_select` er fixed med en `SECURITY DEFINER` funktion `get_my_group_ids()` for at undgå infinite recursion
- `supabaseAdmin` bruges til alle gruppe-inserts da server-side JWT ikke altid videregives korrekt til RLS

---

## Bygget ✅

### Auth
- Google OAuth via Supabase
- Redirect til `/login` hvis ikke logget ind
- Logout via settings bottom sheet

### Min liste (personlig)
- Vis film/serier opdelt i: **I gang**, **Vil se**, **Set**
- Long-press overlay på poster: skift status (Vil se / I gang / Set) + fjern fra liste
- Soft delete (deleted_at timestamp)
- Optimistisk UI ved fjernelse
- Haptic feedback på mobil

### Søgning
- Søg via TMDB API
- Tilføj til liste direkte fra søgeresultater
- Viser ✓ hvis allerede tilføjet
- Kender til gruppe-kontekst (tilføjer til gruppe hvis man er på gruppe-fanen)

### Discover (søgesiden)
- Populært i Danmark (TMDB discover, region=DK)
- Filter på type (Film/Serie), genre, streaming-platform
- Søgeresultater live ved typing

### Detail-sider (film + serie)
- Backdrop + poster hero
- Streaming-platforme i Danmark (TMDB watch providers, region=DK)
- Status-knapper (Vil se / I gang / Set)
- Episodegrid med sæsonvælger (TV)
- Marker enkelt episode eller hel sæson
- Auto-status: skifter til "I gang" når første episode markeres
- Dynamisk glow fra poster-farve
- Sticky header ved scroll
- Tilbage-knap (glass pill)
- Fjern fra liste knap
- Beskrivelse med fade/expand

### Profil
- Profilbillede + navn fra Google
- Stats: film, serier, episoder, i gang, denne måned, færdige
- Top genrer
- Senest tilføjet
- Settings bottom sheet (tandhjul): logout, notifikationer (kommer snart)
- Filtreret til kun personlige items (group_id null)

### Grupper
- Opret gruppe via bottom sheet (navn → invite-link)
- Invite via link (7 dages token, bruges én gang)
- Join via `/join/[token]`
- Glass segmented control: Min liste ↔ Gruppenavn
- `+ gruppe` knap i segmented control
- URL husker aktiv gruppe (`?group=GROUP_ID`) så tilbage-knap virker
- **GroupView** med:
  - "Hvad ser I i aften?" cinematisk kort (første "Vil se"-item)
  - I gang / Vil se / Set sektioner
  - Long-press overlay på poster (samme som personlig liste)
  - Memberavatars vist øverst
- **Gruppe-settings** (tandhjul → bottom sheet): omdøb, kopier invite-link, forlad gruppe
- Detailsider bruger `?ctx=GROUP_ID` til at hente det rigtige item

### PWA
- `manifest.json` konfigureret
- Apple Web App meta tags
- Theme color sort

### Design system
- Mørkt tema (#000 baggrund)
- Glass cards: `rgba(255,255,255,0.07)` + `backdropFilter: blur(20px)` + border
- Alle knapper: glass stil
- Framer Motion AnimatePresence på lister
- Bottom sheets: spring animation, backdrop blur

---

## Mangler / TODO

### Høj prioritet
- [ ] **Realtime** – Supabase Realtime på gruppe-watchlist så siden opdaterer automatisk når partner tilføjer/ændrer
- [ ] **Aktivitetsfeed** – "Maria tilføjede The Bear · 2 min siden" i GroupView
- [ ] **TMDB da-DK fallback** – fetch `da-DK` sprog først, fallback til `en-US`

### Medium prioritet  
- [ ] **Claude AI-anbefalinger** – send watch history til Claude API, få personlige anbefalinger med forklaring ("fordi du så X..."), filtreret til DK platforme
- [ ] **Push-notifikationer** – nye episoder, gruppe-aktivitet
- [ ] **Dual progress bar** i GroupView – vis begge medlemmers fremgang side om side på "I gang"-poster

### Lav prioritet
- [ ] Rating system (1-5 stjerner)
- [ ] Review/note per item
- [ ] Tagging system
- [ ] Manuel sortering af watchlist
- [ ] Follow system + offentlige profiler
- [ ] Deling af lister/statistik
- [ ] År-i-review billede

---

## Kendte quirks / teknisk gæld
- `img` tags bruges i stedet for Next.js `Image` (ingen automatisk optimering)
- Ingen error handling på detail-sider (siden er bare tom ved fejl)
- TMDB data caches ikke aggressivt nok (mange API-kald)
- `supabaseAdmin` bruges bredt til gruppe-operationer – overvej mere granulær RLS i stedet
- Framer Motion er installeret men bruges kun delvist
- `/groups/new` mappen eksisterer stadig men bruges ikke (kan slettes)

---

## Filstruktur (vigtige filer)
```
app/
  page.tsx                          # Forsiden
  components/
    WatchlistProvider.tsx           # Segmented control + gruppe/personlig kontekst
    Watchlist.tsx                   # Personlig liste med PosterCard
    GroupView.tsx                   # Gruppe-visning med GroupPosterCard
    Search.tsx                      # Søgefelt (kender til groupId)
    GroupPosterCard (i GroupView)    # Long-press overlay til gruppe-poster
    BackButton.tsx                  # Tilbage-knap
    RemoveFromList.tsx              # Fjern fra liste (støtter groupId)
    ProfileClient.tsx               # Profilside
    SettingsSheet.tsx               # Settings bottom sheet (profil)
  api/
    watchlist/
      route.ts                      # POST/DELETE watchlist item (støtter group_id)
      list/route.ts                 # GET watchlist (støtter ?group_id param)
      status/route.ts               # PATCH status
      episode/route.ts              # POST/DELETE episode progress
    groups/
      route.ts                      # GET/POST grupper
      [id]/route.ts                 # PATCH (omdøb)
      [id]/leave/route.ts           # DELETE (forlad)
      [id]/members/route.ts         # GET medlemmer
      invite/route.ts               # POST generer invite-link
    profile/
      stats/route.ts                # GET profilstatistik
  join/[token]/page.tsx             # Join gruppe via invite-link
  movie/[id]/page.tsx               # Film detailside (støtter ?ctx)
  tv/[id]/page.tsx                  # Serie detailside (støtter ?ctx)
```
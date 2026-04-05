# PERFORMANCE-ROADMAP.md

## Formål
Denne plan samler de vigtigste performance-arbejder for Flimr i en rækkefølge, der giver mærkbar effekt uden at ødelægge appens nuværende styrker: hurtig preload, sociale flows, AI-forslag, optimistic updates og de visuelle “smartness”-detaljer.

## Mål for forbedringen
- Hurtigere første load
- Mindre initial JS og hydration
- Færre samtidige fetches
- Smoothere scroll og lavere CPU-forbrug
- Bedre oplevelse på mobil og langsommere enheder
- Mindre “tung” følelse i søgning, sheets og lister

## Arbejdsprincip
- Start med ændringer, der giver størst effekt og lav risiko
- Bevar UX, funktionalitet og eksisterende “smartness”
- Optimér efter målte problemer, ikke antagelser
- Split større refactors op i små, sikre leverancer

## Prioriteret roadmap

### 1. Split de tunge sheets ud med `next/dynamic`
**Mål**
- Lazy-loade store client-komponenter som `SearchSheet`, `ProfileSheet`, `NotificationBell`, `GroupView` og `Watchlist`.

**Hvorfor**
- De er ikke nødvendige ved første load, men bliver i dag en del af den tidlige JS-belastning.
- `BottomNav` trækker flere af dem tæt på kerne-navigationen, så de er oplagte candidates for dynamisk import.

**Succes**
- Mindre initial bundle
- Hurtigere første load
- Uændret oplevelse når brugeren åbner sheets første gang

---

### 2. Reducér antallet af `use client`-flader
**Mål**
- Flyt så meget statisk dataarbejde som muligt tilbage til server components.

**Hvorfor**
- Flere client components betyder mere JS, mere hydration og mere arbejde i browseren.
- Nogle sider og delvis UI kan sandsynligvis være server-first uden at ændre brugeroplevelsen.

**Succes**
- Mindre JS til browseren
- Hurtigere render
- Færre komponenter der hydreres unødigt

---

### 3. Del store komponenter op i mindre server/client-grænser
**Mål**
- Split store views og sider op, så datafetch og interaktivitet ikke ligger i samme store komponent.

**Hvorfor**
- `app/page.tsx` og flere detail-sider gør meget på én gang.
- Når serveren laver dataarbejdet, bliver browserens opgave mindre og mere fokuseret.

**Succes**
- Lavere time-to-interactive
- Mere målrettede rerenders
- Lettere vedligeholdelse

---

### 4. Gør `SearchSheet` til en lettere bootstrapped flade
**Mål**
- Reducér antallet af ting der hentes ved mount.
- Overvej en samlet bootstrap-response for de data, søgesiden altid skal bruge.

**Hvorfor**
- `SearchSheet` henter stadig flere datasæt: feed, follows, grupper, discovery og recommendations.
- Det gør den til et tungt entrypoint.

**Succes**
- Færre netværkskald
- Mindre loading-støj
- Hurtigere åbning af søgning

---

### 5. Lazy-load discovery og sociale sektioner inde i søgning
**Mål**
- Lade sekundære sektioner vente til efter første paint eller til de er synlige.

**Hvorfor**
- Brugeren har ofte kun brug for søgefeltet først.
- Sektioner som “Udvalgt til dig”, “Dine venner ser” og provider-loops er gode at defer’e.

**Succes**
- Hurtigere visning af selve søgefeltet
- Lavere initial belastning i sheetet

---

### 6. Gør billedstrategien mere aggressivt lazy
**Mål**
- Kun første række eller featured cards skal have `priority`.
- Resten skal lazy-load mere konsekvent.

**Hvorfor**
- Appen bruger mange billeder: posters, avatars, backgrounds og rails.
- Billeder er ofte en stor del af den oplevede tunghed.

**Succes**
- Lavere båndbreddeforbrug
- Hurtigere initial paint
- Bedre mobilperformance

---

### 7. Skær ned på animationer på lange lister
**Mål**
- Behold animationer på sheets, modaler og overgange.
- Gør kort-grid og horisontale rails mere statiske.

**Hvorfor**
- `framer-motion` er fint visuelt, men dyrere når mange cards animeres samtidigt.
- Det gælder især i `Watchlist`, `GroupView`, `SearchSheet`, `NotificationBell` og `ProfileSheet`.

**Succes**
- Mindre CPU-belastning
- Mere smooth scroll
- Mindre mount-lag

---

### 8. Fjern per-card event listeners hvor det er muligt
**Mål**
- Gennemgå long-press, touch og mouse handlers på kort.
- Flyt logik op eller saml den, hvor det giver mening.

**Hvorfor**
- Mange cards med hver deres listeners skalerer dårligere, især i `Watchlist` og `GroupView`.

**Succes**
- Færre listeners
- Lavere runtime overhead
- Bedre performance i lange lister

---

### 9. Virtualisér kun de rigtig store lister
**Mål**
- Brug virtualization kun hvor der reelt er store datasæt og dokumenteret performanceproblem.

**Hvorfor**
- Watchlist, gruppe-lister og store “set”-sektioner kan blive lange nok til, at DOM-mængden mærkes.
- Det kan hjælpe meget, men kan også gøre UX mere kompleks.

**Succes**
- Markant mindre DOM ved store datasæt
- Bedre scroll-performance på store lister

---

### 10. Saml tunge API-kald på serveren
**Mål**
- Overvej bootstrap-endpoints pr. view i stedet for mange små fetches ved mount.

**Hvorfor**
- `SearchSheet`, `ProfileSheet`, `Watchlist` og `GroupView` laver i dag flere samtidige requests.

**Succes**
- Færre roundtrips
- Mere deterministisk load
- Mindre “loader-flimmer”

---

### 11. Cache mere af TMDb-data tættere på brug
**Mål**
- Udvid eller stram cache-strategien i `lib/tmdb.ts`.
- Cache stabile felter mere aggressivt.

**Hvorfor**
- Detail-sider og discovery-flows slår stadig mange TMDb-endpoints op.
- Meget af data er relativt stabilt: poster, årstal, genres, providers og season-info.

**Succes**
- Færre live TMDb-kald
- Hurtigere detail-load
- Mindre afhængighed af eksterne request-kæder

---

### 12. Gør `DynamicGlow` billigere
**Mål**
- Reducér eller defer farveudtræk på detail-sider.
- Brug fallback-farver eller cachede resultater oftere.

**Hvorfor**
- `DynamicGlow` er ekstra arbejde i load-pathen, men er ikke kernefunktionalitet.

**Succes**
- Hurtigere detail-page paint
- Mindre ekstra fetch/compute-arbejde

---

### 13. Reducér scroll listeners og globale UI-effects
**Mål**
- Gennemgå body overflow, popstate, custom events og scroll listeners.
- Behold kun det nødvendige.

**Hvorfor**
- Flere komponenter styrer UI via globale side effects.
- Det er sjældent den største flaskehals, men det bidrager til tunghed og kompleksitet.

**Succes**
- Mindre koordinationsarbejde i browseren
- Færre ekstra rerenders
- Mere robust UI-state

---

### 14. Defer “nice to have” indhold
**Mål**
- Lade sekundært indhold komme efter kerneoplevelsen.

**Hvorfor**
- AI-forslag, vennefeed, provider-logos og previews er gode features, men ikke nødvendige for at kunne bruge appen.

**Succes**
- Hurtigere førstegangsoplevelse
- Lavere belastning på kritiske views

---

### 15. Hold AI-flows helt eksplicitte
**Mål**
- Bevar `ai-search` og `ai-recommend` som opt-in flows.
- Sørg for, at de er cachet og kun kører når brugeren vælger dem.

**Hvorfor**
- AI-kald er intrinsisk tunge, fordi de går gennem både Anthropic og TMDb.

**Succes**
- AI føles som en bonus, ikke som standard load
- Resten af appen forbliver hurtig

---

### 16. Brug mere præcise image sizes og færre overlappende posters
**Mål**
- Justér `sizes` og billedstørrelser så de passer til faktisk visning.
- Begræns samtidige thumbnails hvor det ikke giver værdi.

**Hvorfor**
- Flere poster-rækker og rails kan blive unødigt tunge, hvis billederne er større eller flere end nødvendigt.

**Succes**
- Mindre båndbredde
- Hurtigere render
- Bedre mobiloplevelse

---

### 17. Undersøg om nogle sheets kan være mere server-first
**Mål**
- Vurdér om modaler og overlays kan få server-side data som default og kun åbne client-side interaktivitet når nødvendigt.

**Hvorfor**
- Ikke alt skal være client-side fra start.
- Nogle sheets åbnes sjældent og bør ikke belaste initial load.

**Succes**
- Mindre initial JS
- Hurtigere first paint

---

### 18. Ryd op i komponenter der gør meget samtidig
**Mål**
- Split især `GroupView` og `SearchSheet` i mindre ansvarsenheder.

**Hvorfor**
- Store komponenter med mange ansvarsområder er dyrere at optimere og sværere at holde lette.

**Succes**
- Lettere render-kæder
- Mere målrettet optimering
- Bedre vedligeholdelse

---

### 19. Overvej en minimal mode for langsomme enheder
**Mål**
- Introducér en lav-effekt tilstand med færre blur-, parallax- og preview-effekter.

**Hvorfor**
- Det kan give en mærkbar forbedring på svage telefoner uden at ændre hovedoplevelsen for alle.

**Succes**
- Bedre oplevelse på low-end devices
- Lavere CPU/GPU-belastning

---

### 20. Mål med bundle analyzer og performance profiler
**Mål**
- Brug bundle analyzer til at identificere hvad der faktisk fylder mest.
- Brug browser-profiler til at se hvor der opstår lange tasks og lag.

**Hvorfor**
- Vi skal optimere ud fra data, ikke fornemmelse.

**Succes**
- Mere præcise prioriteringer
- Færre blinde refactors
- Konkrete før/efter-målinger

## Anbefalet implementeringsrækkefølge
1. `next/dynamic` for tunge sheets
2. lettere `SearchSheet`
3. færre animationer på store lister
4. mere aggressiv image-lazy loading
5. server/bootstrap-konsolidering
6. derefter større refactors og advanced optimeringer

## Definition af færdig
- Appen føles hurtigere ved første load
- Sheets åbner uden tung forsinkelse
- Søgning føles lettere og mere responsiv
- Scroll i lister føles smooth
- Der er færre unødige requests og mindre JS
- Vi har målt forbedringer før og efter ændringerne

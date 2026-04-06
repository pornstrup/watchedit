# PERFORMANCE-ROADMAP.md v2

## Formål
Flimr er en webapp/PWA designet som en Apple-agtig glassmorphism-app. Målet med denne roadmap er ikke at fjerne motion eller gøre UI'et fladt, men at gøre appen hurtigere at loade, lettere at navigere og billigere at animere.

## Mål
- Hurtigere første load og hurtigere åbning af centrale sheets
- Mindre initial JS og mindre hydration
- Færre samtidige fetches og mindre loader-støj
- Smoothere scroll og lavere CPU-forbrug
- Bevarelse af glass-like look, motion og app-følelse
- Bedre oplevelse på mobil og langsommere enheder

## Arbejdsprincip
- Start med lav-risiko ændringer med høj effekt
- Bevar den visuelle stil og de animationer, der gør appen levende
- Reducér animationernes omkostning før vi reducerer dem helt
- Mål før og efter, så vi ved hvad der faktisk hjælper

## Guardrails
- **Bevar primære landing-flows hurtige**
  - `Watchlist` og gruppevisning er ofte første skærm for brugeren og må ikke føles langsomme eller skjulte bag unødigt lazy-loading.
- **Bevar motion, men gør den billigere**
  - Sheets, overlays og transitions skal stadig føles Apple-agtige; vi må kun trimme den dyreste animation på store lister og gentagne cards.
- **Lazy-load kun det der er sekundært**
  - Sekundære panels og modaler kan loades senere, men kerne-navigation og første oplevelse skal være klar med det samme.
- **Prefetch hvor det giver mening**
  - Hvis noget lazy-loades, skal vi overveje prefetch af næste sandsynlige step, så åbning stadig føles responsiv.
- **Bevar glassmorphism-fallbacks**
  - Loading states må gerne være lette og pæne, men de må ikke være flade, grimme eller bryde appens premium-look.

## Fase 1: Hurtige gevinster

### 1. Split de tunge sheets ud med `next/dynamic`
**Mål**
- Lazy-loade store client-komponenter som `SearchSheet`, `ProfileSheet`, `NotificationBell`, `GroupView` og `Watchlist`.

**Hvorfor**
- De er ikke nødvendige ved første paint, men fylder stadig i den tidlige JS-belastning.
- `BottomNav` gør dem relevante tidligt i appens struktur, så de er oplagte til dynamisk import.

**Impact:** High  
**Effort:** Medium  
**Risk:** Low

**Implementering**
- Lazy-load de store sheets med `next/dynamic`.
- Behold en let loading-state, så åbning stadig føles smooth.
- Sørg for at første åbning ikke mister funktionalitet eller fokusadfærd.

**Succes**
- Mindre initial bundle
- Hurtigere første load
- Samme oplevelse når sheetet åbnes første gang

### 2. Gør `SearchSheet` til en lettere bootstrapped flade
**Mål**
- Reducér de data, der hentes ved mount.
- Saml den første nødvendige payload i færre requests.

**Hvorfor**
- `SearchSheet` er et af de tungeste entrypoints og henter flere datasæt.
- Den bør prioritere input og kerne-søgning før discovery/sociale sektioner.

**Impact:** High  
**Effort:** Medium  
**Risk:** Medium

**Implementering**
- Fald tilbage til et lille bootstrap-payload for søgning og discovery.
- Genbrug data mellem åbninger, hvor det er sikkert.
- Lad tungere sektioner komme efter første paint.

**Succes**
- Færre netværkskald
- Kortere “åbn sheet”-tid
- Mindre loading-flimmer

### 3. Lazy-load discovery og sociale sektioner inde i søgning
**Mål**
- Lade “Udvalgt til dig”, “Dine venner ser” og provider-loops vente til efter første paint eller viewport.

**Hvorfor**
- De er gode features, men ikke nødvendige for at få søgning i gang.

**Impact:** Medium  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Render søgefelt og resultater først.
- Load recommendation/social blocks deferred.
- Undgå at de blokerer input eller første resultatsæt.

**Succes**
- Hurtigere visning af søgefeltet
- Mindre initial rendering i sheetet

### 4. Gør billedstrategien mere aggressivt lazy
**Mål**
- Kun første række eller featured cards skal have `priority`.
- Resten skal lazy-load mere konsekvent og med korrekte `sizes`.

**Hvorfor**
- Posters, avatars og backgrounds er en stor del af den oplevede tunghed.
- Billedbelastning er ofte en stor faktor i PWA-oplevelsen.

**Impact:** High  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Gennemgå alle poster-rails og cards for `priority`.
- Stram `sizes` så de matcher faktisk viewport.
- Undgå at loade for mange billeder samtidig i samme view.

**Succes**
- Lavere båndbreddeforbrug
- Hurtigere initial paint
- Mindre layout- og billedtryk på mobil

### 5. Saml tunge API-kald på serveren
**Mål**
- Overvej bootstrap-endpoints pr. view i stedet for mange små fetches ved mount.

**Hvorfor**
- `SearchSheet`, `ProfileSheet`, `Watchlist` og `GroupView` laver mange samtidige requests.

**Impact:** High  
**Effort:** Medium  
**Risk:** Medium

**Implementering**
- Identificér views med 3+ samtidige mount-fetches.
- Saml dem hvor det giver mening i én server response.
- Bevar cache og stale-reuse, hvor data er delt mellem views.

**Succes**
- Færre roundtrips
- Mere deterministisk load
- Mindre loader-flimmer

## Fase 2: Strukturel performance

### 6. Reducér antallet af `use client`-flader
**Mål**
- Flyt så meget statisk dataarbejde som muligt tilbage til server components.

**Hvorfor**
- Flere client components betyder mere JS, mere hydration og mere arbejde i browseren.

**Impact:** High  
**Effort:** High  
**Risk:** Medium

**Implementering**
- Gennemgå klientkomponenter og flyt rent statiske dele til serveren.
- Behold kun state, events og browser APIs på klienten.
- Prioritér de største og mest centrale views først.

**Succes**
- Mindre JS til browseren
- Hurtigere render
- Færre komponenter der hydreres unødigt

### 7. Del store komponenter op i mindre server/client-grænser
**Mål**
- Split store views og sider op, så datafetch og interaktivitet ikke ligger i samme store komponent.

**Hvorfor**
- `app/page.tsx` og flere detail-sider gør meget på én gang.
- Serveren bør lave mest muligt af dataarbejdet.

**Impact:** High  
**Effort:** High  
**Risk:** Medium

**Implementering**
- Del store views i data, layout og interaktive delkomponenter.
- Undgå at én fil både håndterer fetch, render og tung interaktion.
- Hold grænserne skarpe mellem server og client.

**Succes**
- Lavere time-to-interactive
- Mere målrettede rerenders
- Lettere vedligeholdelse

### 8. Skær ned på animationer på lange lister
**Mål**
- Behold motion på sheets, modaler og overgange.
- Gør kort-grid og horisontale rails mere statiske.

**Hvorfor**
- `framer-motion` er en del af appens stil, men er dyrere når mange cards animeres samtidigt.
- I en glassmorphism PWA skal animationer føles lette, ikke tunge.

**Impact:** High  
**Effort:** Medium  
**Risk:** Low

**Implementering**
- Behold motion i entry/exit og sheets.
- Reducér gentagne animationer per card i store lister.
- Simplificér hover/press-animations hvor de ikke giver meget værdi.

**Succes**
- Mindre CPU-belastning
- Mere smooth scroll
- Mindre mount-lag

### 9. Fjern per-card event listeners hvor det er muligt
**Mål**
- Gennemgå long-press, touch og mouse handlers på kort.
- Flyt logik op eller saml den, hvor det giver mening.

**Hvorfor**
- Mange kort med egne listeners skalerer dårligere, især i `Watchlist` og `GroupView`.

**Impact:** Medium  
**Effort:** Medium  
**Risk:** Low

**Implementering**
- Undersøg om hændelser kan delegeres i stedet for at blive bundet per card.
- Bevar long-press og touch UX, men gør implementeringen billigere.

**Succes**
- Færre listeners
- Lavere runtime overhead
- Bedre performance i lange lister

### 10. Reducér scroll listeners og globale UI-effects
**Mål**
- Gennemgå body overflow, popstate, custom events og scroll listeners.
- Behold kun det nødvendige.

**Hvorfor**
- Flere komponenter styrer UI via globale side effects.
- Det bidrager til tunghed og gør interaktioner dyrere end nødvendigt.

**Impact:** Medium  
**Effort:** Medium  
**Risk:** Medium

**Implementering**
- Fjern dublerede scroll-/overflow-handlers.
- Konsolider globale events hvor det er muligt.
- Test at sheets, navigation og tilbage-knap stadig føles naturlig.

**Succes**
- Mindre koordinationsarbejde i browseren
- Færre ekstra rerenders
- Mere robust UI-state

### 11. Ryd op i komponenter der gør meget samtidig
**Mål**
- Split især `GroupView` og `SearchSheet` i mindre ansvarsenheder.

**Hvorfor**
- Store komponenter med mange ansvarsområder er sværere at optimere og dyrere at render’e.

**Impact:** Medium  
**Effort:** High  
**Risk:** Medium

**Implementering**
- Adskil data, UI-sektioner og interaktive overlays.
- Gør hver komponent ansvarlig for én tydelig del af flowet.

**Succes**
- Lettere render-kæder
- Mere målrettet optimering
- Bedre vedligeholdelse

## Fase 3: Data og cache

### 12. Cache mere af TMDb-data tættere på brug
**Mål**
- Udvid eller stram cache-strategien i `lib/tmdb.ts`.
- Cache stabile felter mere aggressivt.

**Hvorfor**
- Detail-sider og discovery-flows slår stadig mange TMDb-endpoints op.
- Meget af data er relativt stabilt: poster, årstal, genres, providers og season-info.

**Impact:** High  
**Effort:** Medium  
**Risk:** Medium

**Implementering**
- Brug cache smartere for data, der ikke ændrer sig ofte.
- Bevar de felter som sæson- og episodeflow afhænger af.

**Succes**
- Færre live TMDb-kald
- Hurtigere detail-load
- Mindre afhængighed af eksterne request-kæder

### 13. Gør `DynamicGlow` billigere
**Mål**
- Reducér eller defer farveudtræk på detail-sider.
- Brug fallback-farver eller cachede resultater oftere.

**Hvorfor**
- `DynamicGlow` er ekstra arbejde i load-pathen, men er ikke kernefunktionalitet.

**Impact:** Medium  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Cache resultatet mere konsekvent.
- Lad fallback være visuel nok til at stylingen stadig føles premium.

**Succes**
- Hurtigere detail-page paint
- Mindre ekstra fetch/compute-arbejde

### 14. Brug mere præcise image sizes og færre overlappende posters
**Mål**
- Justér `sizes` og billedstørrelser så de passer til faktisk visning.
- Begræns samtidige thumbnails hvor det ikke giver værdi.

**Hvorfor**
- Flere poster-rækker og rails kan blive unødigt tunge, hvis billederne er større eller flere end nødvendigt.

**Impact:** Medium  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Gennemgå poster, avatars og detail-assets.
- Tilpas billedstørrelser til layoutets faktiske behov.

**Succes**
- Mindre båndbredde
- Hurtigere render
- Bedre mobiloplevelse

## Fase 4: Smartness, men billigere

### 15. Defer “nice to have” indhold
**Mål**
- Lade sekundært indhold komme efter kerneoplevelsen.

**Hvorfor**
- AI-forslag, vennefeed, provider-logos og previews er gode features, men ikke nødvendige for at bruge appen.

**Impact:** Medium  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Prioritér søgning, watchlist og detail-header før sekundære sektioner.
- Vis ikke alt med det samme hvis det ikke hjælper første interaktion.

**Succes**
- Hurtigere førstegangsoplevelse
- Lavere belastning på kritiske views

### 16. Hold AI-flows helt eksplicitte
**Mål**
- Bevar `ai-search` og `ai-recommend` som opt-in flows.
- Sørg for, at de er cachet og kun kører når brugeren vælger dem.

**Hvorfor**
- AI-kald er intrinsisk tunge, fordi de går gennem både Anthropic og TMDb.

**Impact:** Medium  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Undgå at gøre AI til standard-load.
- Lad den være en tydelig, bevidst brugerhandling.

**Succes**
- AI føles som en bonus, ikke som standard load
- Resten af appen forbliver hurtig

### 17. Undersøg om nogle sheets kan være mere server-first
**Mål**
- Vurdér om modaler og overlays kan få server-side data som default og kun åbne client-side interaktivitet når nødvendigt.

**Hvorfor**
- Ikke alt skal være client-side fra start.
- Nogle sheets åbnes sjældent og bør ikke belaste initial load.

**Impact:** Medium  
**Effort:** High  
**Risk:** Medium

**Implementering**
- Identificér sheets der sjældent åbnes.
- Flyt statisk data ud af klienten hvor det er muligt.

**Succes**
- Mindre initial JS
- Hurtigere first paint

### 18. Overvej en minimal mode for langsomme enheder
**Mål**
- Introducér en lav-effekt tilstand med færre blur-, parallax- og preview-effekter.

**Hvorfor**
- Det kan give en mærkbar forbedring på svage telefoner uden at ødelægge den visuelle identitet.

**Impact:** Low  
**Effort:** Medium  
**Risk:** Low

**Implementering**
- Lad mode være adaptiv eller brugerstyret.
- Slå de dyreste visuelle effekter ned uden at ændre layoutets identitet.

**Succes**
- Bedre oplevelse på low-end devices
- Lavere CPU/GPU-belastning

## Fase 5: Måling og beslutning

### 19. Virtualisér kun de rigtig store lister
**Mål**
- Brug virtualization kun hvor der reelt er store datasæt og dokumenteret performanceproblem.

**Hvorfor**
- Watchlist, gruppe-lister og store “set”-sektioner kan blive lange nok til, at DOM-mængden mærkes.
- Det kan hjælpe meget, men det er et UX-valg, ikke en standard-løsning.

**Impact:** High  
**Effort:** High  
**Risk:** Medium

**Implementering**
- Brug kun virtualization hvis profilerne viser reelt behov.
- Start med de længste lister først.

**Succes**
- Markant mindre DOM ved store datasæt
- Bedre scroll-performance på store lister

### 20. Mål med bundle analyzer og performance profiler
**Mål**
- Brug bundle analyzer til at identificere hvad der faktisk fylder mest.
- Brug browser-profiler til at se hvor der opstår lange tasks og lag.

**Hvorfor**
- Vi skal optimere ud fra data, ikke fornemmelse.

**Impact:** High  
**Effort:** Low  
**Risk:** Low

**Implementering**
- Tag baseline før ændringer.
- Mål igen efter hver større fase.
- Brug resultaterne til at vælge næste iteration.

**Succes**
- Mere præcise prioriteringer
- Færre blinde refactors
- Konkrete før/efter-målinger

## Implementeringscheckliste
- Lazy-load tunge sheets med `next/dynamic`
- Reducér initiale requests i `SearchSheet`
- Defer discovery/sociale sektioner i søgning
- Stram image loading og `priority`-brug
- Saml tunge API-kald på serveren
- Skær animationer ned i store lister, men behold dem i sheets og transitions
- Fjern per-card listeners hvor det er muligt
- Konsolidér globale scroll/overflow events
- Split store komponenter i mindre server/client-grænser
- Stram TMDb-cache uden at ødelægge sæson- og episodeflow
- Gør `DynamicGlow` billigere
- Overvej minimal mode først efter profiler viser behov

## Måleplan
### Baseline før ændringer
- Bundle størrelse for client components
- Antal requests ved åbning af søgning og profil
- Tid fra sheet åbnes til første indhold er synligt
- Scroll-performance i Watchlist og GroupView
- Antal long tasks og animationstunge frames

### Måling efter ændringer
- Samme metrics måles igen efter hver fase
- Sammenlign bundelstørrelse, load-tid og request-count før/efter
- Verificér at motion stadig føles premium og ikke er blevet “død”

### Værktøjer
- Bundle analyzer
- Browser devtools performance panel
- Network tab
- Manuel mobiltest på PWA-lignende flow

## Definition af færdig for første performance-iteration
- Appen føles hurtigere ved første load
- Sheets åbner uden tung forsinkelse
- Søgning og discovery føles lettere og mere responsiv
- Scroll i lister føles smooth, også med motion og glass-effect
- De visuelle animationer er stadig der, men de koster mindre
- Der er færre unødige requests og mindre JS
- Vi har målt forbedringer før og efter ændringerne

## Assumptions
- Vi beholder `PERFORMANCE-ROADMAP.md` som filnavn og bruger den som det primære performance-arbejdsdokument.
- Vi prioriterer performance uden at ødelægge den visuelle stil.
- Animationer skal stadig være en del af appen, men deres runtime-omkostning skal ned.
- Planen skal kunne bruges direkte af en udvikler uden yderligere beslutninger.

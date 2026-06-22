# Cautie Learn Hub — Backlog Checklist

> Werkwijze: Claude bewerkt bestanden alleen lokaal in deze map. Geen `git commit`/`git push` vanuit Claude — jij doet dat zelf naar `main` wanneer je wilt.

---

## ✅ Afgerond

### Dark mode fix — `app/components/tools/source-input.tsx`
Hardcoded lichte kleuren (`#d0d0d0`, `#f8f8f8`, `#333`, `#fafafa`, `#999`, bare `bg-white`) vervangen door theme-aware classes (`border-input surface-panel`, `text-muted-foreground`, etc.) op Upload/Photo/Mic/Import/Link knoppen, Captions knop, manual-text Textarea en helper-tekst.

### Flashcards options-scherm redesign — `app/(main)/tools/flashcards/page.tsx`
Layout herbouwd naar quiz's settings-rail structuur: breadcrumb boven, Card Types links, instellingen rechts (incl. nieuwe Knowledge Level slider, Card Extras kaart, Advanced Options kaart met 5 switches), footer onder.

### Mobile sidebar fixes
- `app/components/sidebar-profile.tsx` — `isCollapsed` hield geen rekening met `isMobile`, waardoor de Sign-Up knop verdween / het profiel inklapte op telefoon. Fix: `const isCollapsed = !isMobile && state === 'collapsed';`
- `app/components/sidebar.tsx` — tap-glitch op iconen in mobiele sidebar door ontbrekende `animateOnTap` (alleen `animateOnHover`, werkt niet op touch). Toegevoegd aan 8 regels in de `isPhone` branch.

### Mic taal-bug — `app/(main)/tools/notes/page.tsx`
"Listen mode" gebruikte hardcoded `language === 'nl' ? 'nl-NL' : 'en-US'` (alleen 2 talen). Vervangen door `resolveSpeechLocale()` uit `app/hooks/use-browser-speech.ts` (12 talen support).

### Sources/citaties pill+sidebar — Quiz & Flashcards
- `app/components/tools/sources-panel.tsx` — nieuwe component: pill (text/photo/video iconen) + Sheet-sidebar met bronnen.
- `app/components/tools/quiz-taker.tsx` — pill gewired naast "Show explanation".
- `app/components/tools/flashcard-viewer.tsx` — oude citation-only Popover vervangen door dezelfde pill+sidebar (incl. citation, source image, research-mode grounding note).

---

## ⏳ Te doen

### 1. Notes — sources/citaties integratie
**Doel:** dezelfde pill+sidebar pattern als quiz/flashcards, nu in de notes-tool.
**Stappen:**
1. Open `app/(main)/tools/notes/page.tsx` en zoek waar de notes-content gerenderd wordt (sectie-niveau, niet top-level).
2. Importeer `SourcesPanel` uit `app/components/tools/sources-panel.tsx` (zelfde import als in `quiz-taker.tsx` / `flashcard-viewer.tsx`).
3. Render de pill op een logische plek per sectie/notitie-blok (vergelijkbaar met "naast Show explanation" in quiz).
4. Zorg dat de data die `SourcesPanel` nodig heeft (citation, source image, grounding note) al aanwezig is in het notes data-model — check `lib/tools/notes-canonical-adapter.ts` of dat veld al bestaat; zo niet, toevoegen.
5. Verifieer met `npx tsc --noEmit -p tsconfig.json | grep notes/page.tsx` (moet leeg zijn).

### 2. Flashcard modes/types parity
**Doel:** flashcard kaarttypes/modes gelijktrekken met wat quiz al heeft (parity, niet zomaar kopiëren — alleen wat logisch is voor flashcards).
**Stappen:**
1. Vergelijk `QUIZ_TYPE_DEFINITIONS` in `app/(main)/tools/quiz/page.tsx` met de huidige flashcard card-types in `app/(main)/tools/flashcards/page.tsx`.
2. Lijst de quiz-types die geen flashcard-equivalent hebben (en omgekeerd).
3. Beslis per ontbrekend type of het zinvol is voor flashcards (niet alles 1-op-1 overnemen — flashcards ≠ quiz).
4. Implementeer ontbrekende types in de flashcard generatie-flow + viewer (`flashcard-viewer.tsx`) + AI-flow/prompt die de kaarten genereert.
5. Test elk nieuw type minstens 1x door een generatie te draaien.

### 3. Auth redesign
**Doel:** volledige auth-flow vernieuwen.
**Stappen:**
1. **Setup wizard verwijderen** — zoek de wizard-component (waarschijnlijk onder `app/(auth)/` of `app/onboarding/`) en de route die ernaar verwijst; verwijder/redirect.
2. **Signup-flow**: formulier met email + wachtwoord + naam (Supabase `signUp()` met die velden in `user_metadata`).
3. **Email-verificatie**: Supabase auth setting "Confirm email" aanzetten + verificatie-pagina/redirect bouwen die de gebruiker na het klikken op de link naar de juiste plek stuurt.
4. **2FA**: Supabase MFA (TOTP) inschakelen — enroll-flow in account settings, challenge-flow bij login.
5. **Google sign-in**: Supabase OAuth provider "Google" configureren (client ID/secret in Supabase dashboard) + knop op login-pagina (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
6. **6-karakter student/teacher codes**: nieuwe Supabase tabel (bv. `class_codes`) met random 6-char code generator, gekoppeld aan teacher/class; student voert code in bij signup/join-flow om gekoppeld te worden.
7. **Account settings pagina**: nieuwe route `app/(main)/settings/account` (of uitbreiden van bestaande settings) met: naam wijzigen, wachtwoord wijzigen, 2FA in-/uitschakelen, gekoppelde Google-account, eigen code (teacher) tonen/regenereren.

### 4. Grading redesign
**Doel:** grading verplaatsen naar einde van de quiz + betere sourcing.
**Stappen:**
1. **Grading aan einde van quiz**: zoek huidige per-vraag grading-logica in `quiz-taker.tsx` / de grading API-route; verplaats de daadwerkelijke score-berekening naar een "submit all" moment in plaats van per vraag (UI kan per vraag feedback tonen, maar het officiële cijfer wordt pas bij het einde vastgelegd).
2. **`suggested_answer` veld**: toevoegen aan het quiz-question datamodel/type + de AI generatie-prompt zodat elke vraag een voorgesteld modelantwoord meekrijgt (voor open/subjectieve vragen).
3. **Source-text chunking** voor literal/research mode: bij het genereren van vragen de source-tekst in chunks opdelen zodat citaties exact terug te herleiden zijn naar een chunk (i.p.v. de hele bron).
4. **Citaties in resultaten**: na het indienen, in de resultaten-view (waarschijnlijk een `quiz-results.tsx` of vergelijkbaar) de `SourcesPanel`/citatie-pattern hergebruiken om per vraag te laten zien welk stuk bron gebruikt is.

### 5. Subjectieve grading anti-manipulatie
**Doel:** voorkomen dat gebruikers de AI-grading kunnen manipuleren (bv. door rare tekst in hun antwoord te zetten om een hoger cijfer te forceren).
**Stappen:**
1. **Sampling-aanpak**: bij het graden van een subjectief/open antwoord, het antwoord meerdere keren (2-3x) laten beoordelen door de AI en de meest voorkomende/mediaan-score gebruiken in plaats van 1 enkele call — dit maakt prompt-injectie/manipulatie pogingen minder effectief.
2. **Taal-uitzondering**: zorg dat deze sampling-logica niet onterecht non-Engelse/non-app-language antwoorden afkeurt — expliciet de taal van het antwoord meegeven aan de grading-prompt zodat het niet als "verdacht" gezien wordt puur omdat het in een andere taal is.
3. Bouw dit in de grading API-route (zelfde plek als waar de huidige AI-grading-call gebeurt).

### 6. Analytics
**Doel:** student- en teacher-analytics + persistente reminder.
**Stappen:**
1. **Student analytics**: nieuwe pagina/sectie die prestaties per onderwerp/quiz toont (scores over tijd, sterke/zwakke topics) — gebruik bestaande grading-resultaten als databron.
2. **Teacher analytics**: vergelijkbaar maar geaggregeerd per klas/groep (gemiddelde scores, welke vragen/topics de meeste fouten opleveren).
3. **Persistente notes reminder**: een banner/badge die blijft staan (niet wegklikbaar tot actie) die de gebruiker herinnert aan iets met notes (bv. "je hebt nog geen notities voor dit onderwerp") — bepaal exacte trigger-conditie en bouw een dismissible-but-persistent UI component (vergelijkbaar met een sticky notification).

---

## 🔎 Losse kleine punten (niet eerder formeel opgepakt)

- [ ] **Dode backup-bestanden opruimen**: `notes/page.tsx.BROKEN_BACKUP`, `notes/page.WORKING_BACKUP.tsx`, `flashcards/page.WORKING_BACKUP.tsx`, `flashcards/page.tsx.BROKEN_BACKUP`, `quiz/page.WORKING_BACKUP.tsx`, `quiz/page.tsx.BROKEN_BACKUP` — verwijderen als ze niet meer nodig zijn.
- [ ] **`use-browser-speech.ts` dode hook**: bevat volledige Web Speech API implementatie die nergens gebruikt wordt (behalve nu de `resolveSpeechLocale` helper voor notes). Beslissen: opruimen, of alsnog gebruiken voor `tool-input-box.tsx`?
- [ ] **Onbekende rest van "plan #14"**: een oudere sessie verwees naar een genummerd plan met 14+ items waarvan ik alleen item #14 (sources/citations) kan reconstrueren. Mogelijk zitten hier nog item #1–13 in die niet in deze checklist staan — niet terug te vinden zonder de originele lijst.

---

## 🆕 Gevonden door de codebase te scannen (echte/live bestanden, geen backups)

### 1. Studyset Materials-panel — "Add" doet niets
**Bestand:** `app/components/studyset/materials-panel.tsx` (gebruikt in `app/(main)/tools/studyset/[studysetId]/page.tsx`)
**Probleem:** de "Add" knop toont alleen een `toast({ title: 'Coming soon', description: 'Material upload feature will be available soon.' })` — er is geen daadwerkelijke upload-functionaliteit.
**Stappen om het echt te bouwen:**
1. Bepaal welk type materialen toegevoegd moeten kunnen worden (tekst/foto/bestand — vergelijkbaar met de attachment-flow in `source-input.tsx`).
2. Bouw een upload-dialoog (file picker + eventueel paste-tekst) die het materiaal opslaat (Supabase storage + een `materials` tabel/record gekoppeld aan de studyset).
3. Vervang de `toast(...)`-stub door de echte upload-call + refresh van de materials-lijst.
4. Test: materiaal toevoegen, zien dat het in de lijst verschijnt na reload.

### 2. Quiz Duel (1v1) — gebouwd maar nergens aan de app gekoppeld
**Bestanden:** `app/components/tools/quiz-duel.tsx`, `app/ai/flows/generate-quiz-duel-data.ts`, gebruikt via `app/lib/ai/flow-executor.ts`
**Probleem:** het component en de AI-flow bestaan volledig (1v1 quiz duel UI + data-generatie), maar `QuizDuel` wordt in geen enkele pagina/route geïmporteerd — het is dode/orphaned code, niet bereikbaar voor gebruikers.
**Te beslissen:** is dit een feature die je nog wil afmaken en lanceren, of mag het weg?
- **Als afmaken:** zoek een logische plek (bv. een "Duel"-knop in de quiz-tool naast normaal genereren) om `<QuizDuel sourceText=... onRestart=... />` te mounten, en test de volledige flow (genereren → spelen → winnaar tonen).
- **Als verwijderen:** `quiz-duel.tsx`, `generate-quiz-duel-data.ts` en de bijbehorende registratie in `flow-executor.ts` opruimen.

---

## Hoe "100% klaar" te verifiëren per item
1. Code aanpassen.
2. `npx tsc --noEmit -p tsconfig.json | grep <bestand>` — moet leeg zijn.
3. `npx eslint <bestand>` — moet leeg zijn.
4. Voor UI-features: handmatig testen in de browser (dev server), inclusief mobile/tablet viewport waar relevant.
5. Pas dan als "done" aanvinken.

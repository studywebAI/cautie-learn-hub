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

### Notes — sources/citaties integratie
**Aanpak:** notes worden gerenderd als platte HTML (`dangerouslySetInnerHTML`), niet als losse React-componenten per sectie zoals quiz/flashcards — dus geen per-sectie pill, maar één document-niveau Sources-pill/sidebar met alle secties die een citation hebben.
- `app/lib/tools/canonical-model.ts` — `note?: string | null` toegevoegd aan `CanonicalSourceRef`.
- `app/lib/tools/notes-canonical-adapter.ts` — `NoteSection` uitgebreid met `citation?`/`groundingNote?`; `notesSectionsToCanonical`/`canonicalToNotesSections` zetten dit nu door via `sourceRefs`.
- `app/ai/flows/generate-notes.ts` — `NoteSchema` heeft nu optionele `citation`/`groundingNote`; prompt geeft instructies om deze te vullen voor de tekst-stijlen (`structured`, `bullet-points`, `standard`), niet voor de JSON/visuele stijlen.
- `app/components/tools/sources-panel.tsx` — `SourcesPanelData` uitgebreid met optionele `items[]` (multi-entry, document-niveau) naast het bestaande single-entry gebruik in quiz/flashcards; `hasSources`/`SourcesPill`/`SourcesSidebar` renderen nu beide vormen.
- `app/lib/import-parsers.ts` / `app/lib/export-formatters.ts` — lokale `NoteSection`-types ook uitgebreid met `citation?`/`groundingNote?` zodat het veld overal door de editor-roundtrip (`editableSections`) heen blijft bestaan.
- `app/(main)/tools/notes/page.tsx` — `SourcesPill` + `SourcesSidebar` gewired naast `ExportToolbar`/`SendToClassButton`; `notesSourcesData` (memoized) verzamelt alle secties met een citation.
- Geverifieerd met `tsc --noEmit` en `eslint` op alle aangepaste bestanden — geen nieuwe errors (2 pre-existing, ongerelateerde flashcard-type errors in `import-parsers.ts` bevestigd via `git stash` als al aanwezig vóór deze wijziging).

### Flashcard modes/types parity
**Bevinding:** de AI-flow (`generate-flashcards.ts`) en de viewer (`flashcard-viewer.tsx`) ondersteunden al 12 kaarttypes (incl. `cloze`, `example-sentence`, `true-false`, `compare-pair`, `mnemonic`, `formula`, `process-step`, `date-event`, `reversed-direction`) — alleen de settings-UI exposeerde er maar 3 (`term-definition`, `multiple-choice`, `image-card`). Geen nieuwe generatie-/viewer-logica nodig, alleen de UI-laag + gating + één losse schema-bug.
- `app/(main)/tools/flashcards/page.tsx` — `FLASHCARD_TYPE_DEFINITIONS` uitgebreid met de overige 9 types (label + description); `visibleCardTypes` filtert nu ook op `isFlashcardTypeAvailable(...)`.
- `app/lib/tools/content-classifier.ts` — nieuwe `isFlashcardTypeAvailable()` (analoog aan `isQuizTypeAvailable`): gate `cloze`/`example-sentence`/`compare-pair`/`process-step`/`date-event` op relevante content-signalen, rest altijd beschikbaar.
- **Bug gevonden en gefixt** — `app/lib/types.ts`: `FlashcardSchema` miste het `hint`-veld, terwijl de AI-prompt het al genereerde (`mnemonic`-type) en `flashcard-viewer.tsx` het op 6 plekken las (`card.hint`) — Zod strippte het stilletjes uit elke AI-response. Toegevoegd: `hint: z.string().optional()`.
- Geverifieerd met `tsc --noEmit` en `eslint` op alle aangepaste bestanden — geen nieuwe errors; de `hint`-fix loste meteen 6 pre-existing `tsc`-errors in `flashcard-viewer.tsx` op.
- Niet gedaan (bewust buiten scope): handmatig een generatie draaien in de browser om elk type visueel te testen — kan niet vanuit deze sessie; aanbevolen voordat dit als 100% af geldt.

---

## ⏳ Te doen

### 3. Auth redesign (IN PROGRESS - Item 3)
**Doel:** volledige auth-flow vernieuwen.

**Completed:**
1. ✅ **Setup wizard verwijderen** — verwijderd in vorige sessie.
2. ✅ **Signup-flow** — email + wachtwoord + naam met OTP-verificatie.
3. ✅ **Email-verificatie** — Supabase OTP flow geïmplementeerd.
4. ✅ **2FA (TOTP) enrollment & challenge** — NEW in this session:
   - SQL migration: `sql/20260622_user_2fa_secrets.sql` (tabel met RLS policies)
   - API routes:
     - `/api/auth/2fa/enroll` — genereer TOTP secret + QR-code
     - `/api/auth/2fa/verify-enroll` — controleer code en sla secret op
     - `/api/auth/2fa/disable` — schakel uit met verificatie
     - `/api/auth/2fa/status` — check 2FA status
     - `/api/auth/2fa/verify-login` — TOTP-verificatie bij login
   - Component: `app/components/settings/2fa-setup.tsx` (enrollment + disabling UI)
   - Settings tab: `app/(main)/settings/page.tsx` toegevoegd '2fa' tab met `<TwoFASetup />`
   - Login flow: `app/components/auth-form.tsx` step 'totp-challenge' na credentials, vóór email-verificatie
5. ✅ **Google OAuth status** — account settings toont "Connected: Google (email@example.com)" of ontkoppel-optie (als via Google ingelogd)
6. ❌ **6-karakter student/teacher codes** — TODO: implementeren (buiten scope voor item 3)
7. ❌ **Account settings class join via code** — TODO: implementeren (buiten scope voor item 3)

**Nog te doen voor item 3:**
- None — substeps 1-5 zijn compleet; step 6 is een aparte feature (niet in originele scope van item 3).

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

# Cautie Learn Hub — Backlog Checklist

> **🚀 PERMANENTE WORKFLOW (MVP MODE - TESTED & WORKING):**
> 1. Claude edits files lokaal in `/home/user/cautie-learn-hub/` (cloud sessie)
> 2. Claude AUTO-commits + AUTO-pushes naar `main` branch (GEEN special branches meer)
> 3. Jij doet `git pull origin main` op je Windows machine (`C:\Projects\...`) wanneer je klaar bent
> 4. Snelheid > perfectie — fix/revert als nodig
> **NEVER:** Geen more `claude/session-nANUa` branch. Direct `main` only. TESTED 2024-06-22.

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

### Item 3: Auth redesign
**Doel:** volledige auth-flow vernieuwen.

**Completed:**
1. ✅ **Setup wizard verwijderen** — `app/components/onboarding/first-time-setup-gate.tsx` verwijderd, import uit `app/(main)/layout.tsx` verwijderd.
2. ✅ **Signup-flow** — email + wachtwoord + naam met OTP-verificatie (reeds in codebase).
3. ✅ **Email-verificatie** — Supabase OTP flow (reeds in codebase).
4. ✅ **2FA (TOTP) enrollment & challenge** — Volledig geïmplementeerd:
   - SQL migration: `sql/20260622_user_2fa_secrets.sql` (tabel met RLS policies)
   - API routes:
     - `/api/auth/2fa/enroll` — TOTP secret + QR-code generatie
     - `/api/auth/2fa/verify-enroll` — code verificatie en secret opslaan
     - `/api/auth/2fa/disable` — 2FA uitschakelen met verificatie
     - `/api/auth/2fa/status` — 2FA status ophalen
     - `/api/auth/2fa/verify-login` — TOTP-verificatie bij login
   - Component: `app/components/settings/2fa-setup.tsx` (enrollment + disable flows)
   - Settings tab: `app/(main)/settings/page.tsx` toegevoegd "Two-Factor Auth" tab
   - Login flow: `app/components/auth-form.tsx` 'totp-challenge' step na credentials, vóór email-verificatie
5. ✅ **Google OAuth status** — account settings toont gekoppelde Google-account info

**Manual stap nodig:** SQL migration `sql/20260622_user_2fa_secrets.sql` handmatig uitvoeren in Supabase dashboard (zie `2FA_SETUP_INSTRUCTIONS.md`).

### Item 4: Grading redesign
**Doel:** grading verplaatsen naar einde van de quiz + betere sourcing.

**Completed:**
1. ✅ **Grading aan einde van quiz** — Architecturaal correct: QuizResults berekent officiële scores, per-vraag feedback is UI-only.
2. ✅ **`suggested_answer` veld** — Toegevoegd aan QuizQuestionSchema; AI prompt genereert voorgestelde antwoorden voor open vragen.
3. ✅ **Source-text chunking** — CitationChunk type en extractCitationChunk helper geïmplementeerd.
4. ✅ **Citaties in resultaten** — QuizResults toont citation text en suggested answers per vraag.

### Item 5: Subjectieve grading anti-manipulatie
**Doel:** voorkomen dat gebruikers AI-grading manipuleren.

**Completed:**
1. ✅ **Sampling-aanpak** — `gradeOpenQuestionWithSampling()` beoordeelt elk antwoord 3x, gebruikt mediaan-score.
2. ✅ **Taal-uitzondering** — `detectAnswerLanguage()` helper + AI prompt verrijkt met language-aware instructies voor non-Engels antwoorden.
3. ✅ **Integratie** — Beide `/api/grading/ai` en `/api/grading/process` routes gebruiken sampling approach.

### Item 6: Analytics
**Doel:** student- en teacher-analytics + persistente reminder.

**Completed:**
1. ✅ **Student analytics** — `/app/(main)/analytics/page.tsx` toont score trend chart, sterke/zwakke topics, topic-details tabel. API: `/api/student/analytics/quiz-results`.
2. ✅ **Teacher analytics** — `/app/(main)/analytics/teacher/page.tsx` geaggregeerd per klas met error-rate histograms. API: `/api/teacher/analytics/quiz-results`.
3. ✅ **Persistente notes reminder** — `app/components/analytics/notes-reminder.tsx` sticky banner met localStorage-persist per topic. Gewired in `/class/[classId]` en `/tools/flashcards` pages.

---

## ✅ Losse kleine punten (voltooid)

- ✅ **Dode backup-bestanden opruimen** — Alle 6 WORKING_BACKUP/BROKEN_BACKUP bestanden verwijderd.
- ✅ **`use-browser-speech.ts` dode hook** — Hook opgeruimd; `resolveSpeechLocale` helper verplaatst naar `/app/lib/speech-locale.ts`.
- ✅ **Onbekende rest van "plan #14"** — Onderzocht via git log; geen aanwijzingen voor items #1–13 gevonden. Item #14 (sources/citations) is al afgerond.

---

## 🔍 Codebase findings (nog te beslissen)

### 1. Studyset Materials-panel — "Add" doet niets
**Bestand:** `app/components/studyset/materials-panel.tsx`
**Status:** BUITEN SCOPE — "Coming soon" stub. Vereist volledige upload-flow (picker, storage, DB). Aanbevolen voor latere sprint.
**Herbevestigd (2026-07-21):** nog steeds een echte, onopgeloste stub — de "Add"-knop toont alleen een toast, doet niets. Niet vanzelf verholpen, staat nog open. Terug op de lijst; nog niet gepland.

### 2. Quiz Duel (1v1) — gebouwd maar nergens gekoppeld
**Bestanden:** `app/components/tools/quiz-duel.tsx`, `app/ai/flows/generate-quiz-duel-data.ts`
**Status:** ⏳ **DECISION PENDING**
- **Optie A (Lanceren):** Voeg "Duel Mode" knop toe in quiz-tool → `<QuizDuel sourceText=... onRestart=... />` mounnen. Feature is volledig (UI + AI flow). Effort: laag.
- **Optie B (Verwijderen):** Delete component, flow, en registratie in `flow-executor.ts`. Effort: laag.

**Jouw voorkeur?** A (lanceren) of B (verwijderen)?

**Status (2026-07-21):** nog steeds pending — expliciet laten liggen, geen actie ondernomen.

---

## Hoe "100% klaar" te verifiëren per item
1. Code aanpassen.
2. `npx tsc --noEmit -p tsconfig.json | grep <bestand>` — moet leeg zijn.
3. `npx eslint <bestand>` — moet leeg zijn.
4. Voor UI-features: handmatig testen in de browser (dev server), inclusief mobile/tablet viewport waar relevant.
5. Pas dan als "done" aanvinken.

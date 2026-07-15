# Subjects — Feature Brainstorm

**Proces:** per punt `[x]` bouwen, `[~]` bouwen met aanpassing (aanpassing noteren), `[!]` niet doen. Reageer per punt of per sub-sectie, ik verwerk het en bouw wat akkoord is.

**Herkomst-tags:** `[Competitor: naam]` / `[Forum/review]` / `[Eigen idee]` / `[Gemiste feature]`.

**Meegenomen vanuit dashboard-brainstorm:**
- `S0` `[ ]` Snel-toegang "nieuwe opdracht/toets aanmaken" als prominente actie (verplaatst vanaf dashboard B6.18) — hoort hier thuis, niet op het dashboard.

---

## Huidige situatie (feitelijk, geen mening)

Content-hiërarchie: **Subject → Chapter → Paragraph → Assignment → Block** (vraag/content-eenheid binnen een assignment).

- **`/subjects`**: grid van subject-cards. Studenten zien alles, docenten kunnen aanmaken (titel, beschrijving, cover: keyword-gematchte icon óf eigen upload).
- **Subject-pagina**: platte lijst van alle chapters, elk met paragrafen inline + voortgangsbalk. Docent: "+ Add Chapter"/"+ Add Paragraph"-dialoog, puur titel-invoer, geen AI.
- **Chapter-pagina**: minimaal — titel, prev/next-navigatie, paragraaf-lijst met voltooiings-%. Geen content-viewer, geen aanmaak-acties hier.
- **Paragraaf-pagina**: lijst van assignments (a, b, c…) met voortgang/lock-status. Docent maakt assignment via 3-staps-wizard (Homework/Test → preset of "Create Your Own" met blok-mix-preview → instellingen: deadline/timer/pogingen/anti-cheat/agenda). Geen paragraaf-content (tekst/materiaal) zichtbaar of bewerkbaar hier.
- **Assignment-pagina**: container van geordende Blocks (open vraag, meerkeuze, invullen, matching, ordering, tekst). Docent: block-editor zonder AI-hook. Student: invulweergave.
- **Subject-card**: icon-badge, titel, klasnaam, "Resume [paragraaf]"-pill, max 3 paragraaf-voortgangsbalken. `cover_image_url` bestaat als prop maar wordt nergens gerenderd — dode code.

**Bevestigd: nergens in de Subjects-boom bestaat al AI-generatie of een "beschrijf wat je wil"-chatinvoer.** Alle aanmaak is puur formulier/wizard met tekstvelden. Dit is dus een echt gat, geen kwestie van "verbeteren wat er al is."

**Update:** de chatinvoer (punt 1) is inmiddels gebouwd, zie sectie A.

**Nieuw — Toetsen-hoofdstuk (`[x]` beslist en gebouwd):** een subject kan één hoofdstuk markeren als het "Toetsen"-hoofdstuk (`chapters.is_tests_chapter`, max 1 per subject, migratie `20260715_add_tests_chapter_flag.sql`). Docent maakt 'm aan via een "+ Toetsen-hoofdstuk"-knop op de subject-pagina (verschijnt alleen als er nog geen is); krijgt een gele "Toetsen"-badge in de hoofdstukkenlijst. Geen automatische verplaatsing van toetsen bij aanmaken vanuit een andere paragraaf — de docent plaatst toetsen er zelf in door er een paragraaf/assignment aan te maken zoals overal, dit is puur een organisatorische markering, geen gedwongen routing (bewuste scope-keuze om de aanmaak-wizard niet aan te hoeven raken).

---

## A. De "beschrijf wat je wil"-chatbox + sleepbare bouw-omgeving (jouw voorbeeld)

Referentie: Coda/Superhuman Docs insert-paneel (chatinvoer onderaan een AI-paneel, "Create a table"/"Create a project brief"-suggestiekaarten, resultaat direct in het document invoegen) en Notion's blok-systeem (elk blok verplaatsbaar via sleep-handle, template-galerij, `/`-commando's, template-knoppen die een vast blok-structuur droppen).

1. `[x]` **Gebouwd.** De chatbox is geen aparte structuur-generator, maar een invoegcommando binnen de assignment-editor: "maak een multiple choice blok over X" → juiste bloktype wordt ingevoegd, met AI-gegenereerde inhoud (voor tekst/multiple_choice/open_question/fill_in_blank een volledig ingevuld blok; voor image/video alleen een caption, de teacher upload zelf het bestand). Bestaande blocks in de assignment gaan als context mee zodat toon/onderwerp aansluit. Nieuw endpoint `.../blocks/ai-command` + AI-flow `insert-block-command.ts`. Ingevoegde blokken landen gewoon in de bestaande block-state, dezelfde autosave als handmatig toegevoegde blokken. `[Competitor: Coda/Superhuman Docs insert-paneel]` `[Gemiste feature]`
2. `[x]` **Bleek al gebouwd.** Bij onderzoek bleek sleepbaar herordenen van blocks al te bestaan in `AssignmentEditor.tsx` (custom pointer-drag met grip-handle, niet dnd-kit maar functioneel gelijk) — geen nieuwe bouw nodig. `[Competitor: Notion]` `[Forum/review — LMS-course-builders noemen drag-and-drop-herordenen als kernfeature in 2026]`
3. `[x]` **Gebouwd.** De 4 bestaande wizard-presets (Concept check, Oefen-mix, Quiz 20 min, Hoofdstuktoets 45 min) zijn nu ook los toe te voegen als "template" binnen een al openstaande assignment, niet meer alleen kiesbaar bij het aanmaken. `[Competitor: Notion template-knoppen, Canvas Modules]`
4. `[ ]` "Instellingen"-paneel voor het samenstellen van een paragraaf/chapter: stapelbare, inklapbare secties per onderdeel (vergelijkbaar met Framer's property-inspector-patroon, al eerder goedgekeurd als referentie voor instellingenpagina's in dit project). `[Competitor: Framer settings-paneel — al genoemd in het visuele reference-doc]`
5. `[ ]` AI-gegenereerde content ALS startpunt, nooit als eindresultaat zonder review: bv. "genereer een paragraaf-samenvatting op basis van geüpload materiaal" die de docent nog moet goedkeuren/bewerken — sluit aan bij het bestaande principe elders in de app (AI stelt voor, mens beslist). `[Eigen idee]` `[Gemiste feature]`

---

## B. Subject-lijst pagina (`/subjects`)

6. `[x]` **Gebouwd.** `cover_image_url` wordt nu getoond i.p.v. het keyword-icoon zodra een subject een eigen cover heeft; de nooit-aangeroepen `IconCover`-component (dode code) is verwijderd. `[Gemiste feature]` (bugfix, geen brainstorm-punt eigenlijk)
7. `[ ]` Filter/sorteer subjects (bv. op voortgang, laatst actief, klas) — nu gewoon een vaste grid-volgorde. `[Eigen idee]`
8. `[ ]` Archiveren van een subject (voor afgeronde vakken/schooljaren) i.p.v. dat de lijst blijft groeien. `[Forum/review — Quizlet folders/nested organisatie expliciet gevraagd]`
9. `[ ]` Subjects groeperen in mappen/categorieën (bv. per schooljaar of vakkengroep) — Quizlet-gebruikers vroegen expliciet om geneste mappen. `[Competitor: Quizlet folders]` `[Forum/review]`

## C. Subject-detailpagina (chapter-overzicht)

10. `[x]` **Gebouwd, andere vorm dan origineel voorgesteld.** Geen aparte materialen-sectie, maar een nieuw "file"-blocktype in de assignment-editor (upload + downloadknop, zelfde patroon als image/video) én bestand-bijlagen op agenda-items ("Attach file"-knop). **Migratie nodig** (`20260716_add_file_block_type.sql`) — nog niet gedraaid. `[Competitor: Google Classroom "Materials"]` `[Gemiste feature]`
11. `[ ]` Chapters slepen om te herordenen i.p.v. vaste volgorde. `[Competitor: Canvas Modules, LMS course builders algemeen]`
12. `[x]` **Gebouwd.** Klein voortgangsbalkje onder het hoofdstuknummer op de subject-pagina, gemiddelde van alle paragraaf-voortgangen in dat hoofdstuk. `[Eigen idee]`

## D. Chapter- en paragraaf-pagina

13. `[~]` **Verduidelijkt door gebruiker — geen aparte content-viewer-pagina.** In plaats daarvan: het bestaande assignment/block-systeem breder gebruiken dan alleen toetsen. Een "assignment" binnen een paragraaf kan een contentblok zijn (tekst + foto's + video, via het al bestaande `text`-blocktype — foto/video-blocktype moet er nog bij) i.p.v. per se een set vragen. Zo staat in één paragraaf gewoon een lijst van assignments naast elkaar: de ene is de leerstof zelf, de andere een toets erover — **alles in hetzelfde tabblad**, geen gesplitste "leerstof hier, oefenen daar"-navigatie. Sluit aan bij het kernprincipe: Subjects = leerstof + oefensommen + toetsen in 1 plek. `[Gemiste feature]` — nog steeds de fundamentele lacune, alleen de oplossingsvorm is anders dan ik eerst voorstelde.
14. `[x]` **Gebouwd.** "Genereren"-menu op de paragraafpagina (flashcards/quiz), verzamelt alle tekstblok-content in die paragraaf en stuurt door naar de bestaande Flashcards/Quiz-tools via hun `sourceText`-query-param (zelfde patroon als de Material-pagina al gebruikte). `[Competitor: RemNote, Quizlet AI-generator, StudyFetch, Knowt — allemaal one-click generatie uit materiaal]` `[Forum/review]`
15. `[ ]` Prerequisites/vergrendeling: paragraaf X pas beschikbaar na afronden paragraaf Y — bestaat al deels als "lock"-icoon per assignment, maar niet als paragraaf/chapter-niveau concept. `[Competitor: Canvas Modules prerequisites]`

## E. Assignment/Block-editor

16. `[ ]` AI-assistentie in de block-editor zelf: bv. "genereer 3 meerkeuzevragen over dit onderwerp" direct vanuit de editor i.p.v. alleen via de externe preset-wizard. `[Eigen idee]` `[Gemiste feature]`
17. `[ ]` Hergebruik van een blok-set tussen assignments (kopiëren/dupliceren i.p.v. steeds opnieuw opbouwen). `[Eigen idee]`

## F. Aanmaak-snelkoppeling (S0, meegenomen vanuit dashboard)

18. `[x]` **Gebouwd.** "+ New assignment/test"-knop op de Subjects-lijst opent een subject/chapter/paragraph-kiezer en zet de docent direct in de aanmaak-wizard op die plek. `[Eigen idee]` (oorspronkelijk dashboard B6.18)

---

## G. Het volledige toets-systeem (grote, cross-cutting feature — raakt Subjects, Agenda, Dashboard, Grades)

Dit is expliciet omschreven door de gebruiker als één samenhangende levenscyclus. Elke fase hieronder heeft een `[ ]`-status, zelfde proces als de rest van dit doc.

**Al bestaande bouwstenen om op voort te bouwen (bevestigd in de codebase):**
- Anti-cheat bestaat al deels: `AssignmentSettingsOverlay` heeft `requireFullscreen`, `detectTabSwitch`, `restrictIpOrDevice`, `perQuestionTimeLimitSeconds`; `StudentAssignmentView.tsx` heeft al werkende `visibilitychange`/`fullscreenchange`-listeners die events loggen via `sendAssignmentEvent(...)`.
- AI-nakijken bestaat al als schakelaar: `ai_grading_enabled`-vlag op een assignment, gekoppeld aan `/api/ai/grade-submission` en `/api/grading/ai` — nog niet vanuit de UI aangestuurd voor zover bekeken.
- Klas-toetreding via link+code bestaat al als patroon (`app/(main)/classes/join/[code]/page.tsx`, `join_code`/`teacher_join_code`-velden, RPC-lookup) — zelfde mechanisme kan hergebruikt worden voor toets-delen.

### G1. Aanmaken en zichtbaarheid
19. `[x]` **Gebouwd.** Bij het onderzoeken hiervan bleek een echt beveiligingsgat: de assignments/blocks-API's stuurden altijd **alle** data (incl. verborgen toetsen en hun vragen) naar de client, en verborgen het alleen client-side — via devtools/network-tab was dus alsnog alles zichtbaar. Gefixt op 3 plekken (paragraaf-assignmentlijst, los assignment ophalen, blocks ophalen): server-side filtering op `is_visible`, nooit meer client-side alleen. Nieuwe toetsen krijgen nu standaard `is_visible: false` bij aanmaken (homework/content blijven direct zichtbaar) — docent moet expliciet publiceren. **Pragmatische scope-keuze:** geen losse "Toetsen"-sectie in de UI gebouwd — de bestaande All/Homework/Test-filterknoppen op de paragraafpagina geven docenten al een gefilterd toetsen-overzicht, dat vond ik voldoende voor "eigen lijst" zonder een hele nieuwe UI-sectie te bouwen. Zeg het als je wél een echt aparte sectie wil.

### G2. Plannen
20. `[x]` **Gebouwd — bleek al bijna compleet.** De "add-to-agenda"-optie bestond al en plant al in op de starttijd die je instelt (nu of later). Wel nog een lek gevonden: het aangemaakte agenda-item werd altijd meteen `visible: true`, ook voor toetsen — een leerling zou de toets-titel + datum dus al op zijn agenda zien vóórdat de toets zelf gepubliceerd is. Gefixt door het al bestaande `scheduled`/`publish_at`-mechanisme van de agenda-API te hergebruiken: toets-agenda-items starten verborgen en worden automatisch zichtbaar op het moment dat de toets zelf opent.

### G3. Delen tussen docenten
21. `[x]` **Gebouwd.** Share-knop bij een toets (alleen zichtbaar bij test-type assignments) genereert een code + link, docent B plakt die code op de Subjects-pagina + kiest doelparagraaf → volledig losstaande kopie (nieuwe assignment + gekopieerde blocks, geen sync). Code zit in de bestaande `settings`-JSONB i.p.v. een nieuwe kolom — geen migratie nodig, zelfde truc als G1. Kopie krijgt automatisch `is_visible: false` (zelfde G1-regel) en lege scheduling, dus de importerende docent plant zelf opnieuw in.

### G4. Live tijdens de toets
22. `[x]` **Gebouwd.** Zelf-verbergend dashboard-widget (verschijnt alleen als er echt een toets live is), pollt elke 30s zoals de bestaande reminder-checkers. Klapt uit naar per-leerling goed/fout/nog-niet-nagekeken-tellingen.
23. `[x]` **Gebouwd, met een eerlijke kanttekening.** Geen websockets/heartbeat in deze codebase, dus "wie is eruit gegaan" is een proxy: een attempt met status `in_progress` waarvan het laatste event >2 minuten geleden is, wordt gemarkeerd als `possiblyLeft`. Geen harde garantie, wel een bruikbare hint voor de docent.
24. `[x]` **Gebouwd.** Plak-detectie op open vragen: een plak-actie van >30 tekens vuurt een `suspicious_paste`-event (hergebruikt de al bestaande vrije-vorm event-log, geen schema-wijziging). Exacte "binnen 0.1 seconde"-timing is client-side niet betrouwbaar te meten, dus de heuristiek is "grote plak-actie" i.p.v. millisecondes.
25. `[x]` **Gebouwd — alleen de twee genoemde acties.** Per-leerling afsluiten en alles-afsluiten, beide scoren de huidige antwoorden en zetten de attempt op `auto_submitted` (geen nieuwe status mogelijk door de DB-constraint, dus hergebruikt de bestaande auto-submit-waarde). "Meer handige opties" bleef ongespecificeerd, dus niet zelf verzonnen — laat het weten als je iets specifieks wil toevoegen.

### G5. Nakijken (fase 1 — correct/incorrect, geen cijfer)
26. `[x]` **Beslist.** Meerkeuze automatisch. Open vragen: docent zelf óf Cautie AI. Resultaat = score (bv. "4 goed, 2 fout"), nog geen cijfer. **"To Grade" leeft in Grades zelf** (niet een apart dashboard-concept — de dashboard-kaart die er al is blijft gewoon linken naar Grades). Grades heeft hiervoor een **grote refactor nodig** — zie `docs/grades-feature-brainstorm.md`, dit is te groot om binnen de Subjects-scope te bouwen.
27. `[x]` **Beslist.** Automatisch-nakijken-met-AI wordt aangeklikt **vanuit Grades**, niet vanuit Subjects/het live-toets-paneel.
28. `[x]` **Beslist.** Antwoorden-vrijgeven en cijfer-vrijgeven zijn **twee gescheiden acties** — nakijk-resultaten tonen (welke vraag goed/fout) kan los van het cijfer zelf vrijgeven.

### G6. Cijfers geven (fase 2 — losstaand van fase 1)
29. `[x]` **Beslist, met uitbreiding.** Docent bepaalt zelf hoe de ruwe score naar een cijfer vertaalt. **Nieuw:** we bieden **cijfer-templates** aan (gebaseerd op land/systeem — NL 1-10, VS A-F, Duitsland 1-6, etc., of een eigen uitleg van hun scoresysteem) — als een docent zo'n template kiest, kan het cijfer daarna automatisch berekend worden volgens die template/formule i.p.v. steeds handmatig. Cautie bepaalt dus nog steeds nooit zelf "het" cijfer zonder een door de docent gekozen/ingestelde regel.

**→ Sectie G is hiermee inhoudelijk klaar wat betreft beslissingen. De uitvoering van G5/G6 valt samen met een grotere Grades-tab-herziening — zie het nieuwe `docs/grades-feature-brainstorm.md`.**

---

## Beslist plan van aanpak

**Fase 1 — nu:** punt 13 (leerstof-blokken in assignments: `text`-blocktype volwaardig maken, foto/video-blocktype toevoegen, wizard-optie "dit is content, geen toets").

**Fase 2 — apart vervolgtraject, sectie G gefaseerd:**
G1 (aanmaken/zichtbaarheid) → G2 (plannen, hergebruikt bestaande agenda-koppeling) → G3 (delen via link/code, losstaande kopie) → G4 (live-monitoring, automatisch op dashboard) → G5 (nakijken fase 1: goed/fout) → G6 (cijfers fase 2, losstaand vanwege internationale cijfersystemen).

Sectie G is fors — waarschijnlijk meerdere sessies, elke G-subsectie is op zichzelf al een flinke brok werk (G4 met name: live status vereist polling-infrastructuur zoals al gebruikt bij notificaties/reminders elders in de app, geen websockets aanwezig in de codebase).

---

## Kernvraag om mee te beginnen

Punt 13 blijft het fundament — zonder assignments die ook gewoon tekst/foto/video-content kunnen zijn (i.p.v. alleen vraag-sets), hebben punt 1 (chatbox) en 14 (one-click flashcards/quiz) niks om op te draaien. Concreet zou dit betekenen: het `text`-blocktype uitbreiden/gebruiken als volwaardig "leerstof"-blok, foto/video-blocktypes toevoegen, en de assignment-wizard een optie geven "dit is content, geen toets" (of gewoon geen vragen toevoegen = automatisch een contentblok). Wil je dat ik hier prioriteit aan geef?

Daarnaast is sectie G (het toets-systeem) een groot apart traject — waarschijnlijk te groot om in dezelfde ronde als punt 13 te bouwen. Voorstel: eerst punt 13 (leerstof-blokken) afronden, dan sectie G als eigen vervolgtraject, gefaseerd zoals G1 → G2 → G3 → G4 → G5 → G6. Ben je het daarmee eens, of wil je dat ik het anders volgordt?

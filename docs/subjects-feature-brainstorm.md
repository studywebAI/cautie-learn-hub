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

---

## A. De "beschrijf wat je wil"-chatbox + sleepbare bouw-omgeving (jouw voorbeeld)

Referentie: Coda/Superhuman Docs insert-paneel (chatinvoer onderaan een AI-paneel, "Create a table"/"Create a project brief"-suggestiekaarten, resultaat direct in het document invoegen) en Notion's blok-systeem (elk blok verplaatsbaar via sleep-handle, template-galerij, `/`-commando's, template-knoppen die een vast blok-structuur droppen).

1. `[~]` **Verduidelijkt door gebruiker:** de chatbox is geen aparte structuur-generator, maar een invoegcommando binnen een assignment/paragraaf: "maak een multiple choice blok" → juiste bloktype wordt ingevoegd. Kan ook vragen genereren, maar dat is niet het hoofddoel — het hoofddoel is snel het juiste blok neerzetten (tekst, foto, video, vraag-type) zonder handmatig door een menu te klikken. Alle bestaande content in die paragraaf (alle assignments/blocks erin) is de context/data waar de chatbox uit put. `[Competitor: Coda/Superhuman Docs insert-paneel]` `[Gemiste feature]`
2. `[ ]` Sleepbare content-blokken binnen een paragraaf/assignment (tekst, afbeelding, video, vraag-blok) — herordenen via drag-handle, zelfde interactiepatroon als Notion. `[Competitor: Notion]` `[Forum/review — LMS-course-builders noemen drag-and-drop-herordenen als kernfeature in 2026]`
3. `[ ]` Template-galerij voor hele paragrafen/assignments: een kant-en-klare structuur (bv. "5 meerkeuzevragen + 1 open vraag") in één klik toevoegen, i.p.v. steeds los een preset kiezen in de wizard. `[Competitor: Notion template-knoppen, Canvas Modules]`
4. `[ ]` "Instellingen"-paneel voor het samenstellen van een paragraaf/chapter: stapelbare, inklapbare secties per onderdeel (vergelijkbaar met Framer's property-inspector-patroon, al eerder goedgekeurd als referentie voor instellingenpagina's in dit project). `[Competitor: Framer settings-paneel — al genoemd in het visuele reference-doc]`
5. `[ ]` AI-gegenereerde content ALS startpunt, nooit als eindresultaat zonder review: bv. "genereer een paragraaf-samenvatting op basis van geüpload materiaal" die de docent nog moet goedkeuren/bewerken — sluit aan bij het bestaande principe elders in de app (AI stelt voor, mens beslist). `[Eigen idee]` `[Gemiste feature]`

---

## B. Subject-lijst pagina (`/subjects`)

6. `[ ]` `cover_image_url` daadwerkelijk renderen op de subject-card — bestaat al als data, wordt nu gewoon niet getoond. `[Gemiste feature]` (bugfix, geen brainstorm-punt eigenlijk)
7. `[ ]` Filter/sorteer subjects (bv. op voortgang, laatst actief, klas) — nu gewoon een vaste grid-volgorde. `[Eigen idee]`
8. `[ ]` Archiveren van een subject (voor afgeronde vakken/schooljaren) i.p.v. dat de lijst blijft groeien. `[Forum/review — Quizlet folders/nested organisatie expliciet gevraagd]`
9. `[ ]` Subjects groeperen in mappen/categorieën (bv. per schooljaar of vakkengroep) — Quizlet-gebruikers vroegen expliciet om geneste mappen. `[Competitor: Quizlet folders]` `[Forum/review]`

## C. Subject-detailpagina (chapter-overzicht)

10. `[ ]` Materialen/bestanden-sectie op subject- of chapter-niveau (nu bestaat er geen upload/bekijk-UI hier — Material is een losse, ongerelateerde pagina in de app). `[Competitor: Google Classroom "Materials"]` `[Gemiste feature]`
11. `[ ]` Chapters slepen om te herordenen i.p.v. vaste volgorde. `[Competitor: Canvas Modules, LMS course builders algemeen]`
12. `[ ]` Per-chapter voortgangsindicator zichtbaar op subject-niveau zelf (nu alleen per paragraaf) — sneller overzicht zonder te hoeven inklikken. `[Eigen idee]`

## D. Chapter- en paragraaf-pagina

13. `[~]` **Verduidelijkt door gebruiker — geen aparte content-viewer-pagina.** In plaats daarvan: het bestaande assignment/block-systeem breder gebruiken dan alleen toetsen. Een "assignment" binnen een paragraaf kan een contentblok zijn (tekst + foto's + video, via het al bestaande `text`-blocktype — foto/video-blocktype moet er nog bij) i.p.v. per se een set vragen. Zo staat in één paragraaf gewoon een lijst van assignments naast elkaar: de ene is de leerstof zelf, de andere een toets erover — **alles in hetzelfde tabblad**, geen gesplitste "leerstof hier, oefenen daar"-navigatie. Sluit aan bij het kernprincipe: Subjects = leerstof + oefensommen + toetsen in 1 plek. `[Gemiste feature]` — nog steeds de fundamentele lacune, alleen de oplossingsvorm is anders dan ik eerst voorstelde.
14. `[ ]` "Genereer flashcards/quiz van dit hoofdstuk" met één klik, gebaseerd op de tekst/media-assignments in die paragraaf (punt 13) — sluit aan bij hoe concurrenten dit standaard aanbieden. `[Competitor: RemNote, Quizlet AI-generator, StudyFetch, Knowt — allemaal one-click generatie uit materiaal]` `[Forum/review]`
15. `[ ]` Prerequisites/vergrendeling: paragraaf X pas beschikbaar na afronden paragraaf Y — bestaat al deels als "lock"-icoon per assignment, maar niet als paragraaf/chapter-niveau concept. `[Competitor: Canvas Modules prerequisites]`

## E. Assignment/Block-editor

16. `[ ]` AI-assistentie in de block-editor zelf: bv. "genereer 3 meerkeuzevragen over dit onderwerp" direct vanuit de editor i.p.v. alleen via de externe preset-wizard. `[Eigen idee]` `[Gemiste feature]`
17. `[ ]` Hergebruik van een blok-set tussen assignments (kopiëren/dupliceren i.p.v. steeds opnieuw opbouwen). `[Eigen idee]`

## F. Aanmaak-snelkoppeling (S0, meegenomen vanuit dashboard)

18. `[ ]` Prominente "nieuwe opdracht/toets aanmaken"-actie op de Subjects-pagina i.p.v. drie niveaus diep (Subject → Chapter → Paragraph → "+ Assignment"). `[Eigen idee]` (oorspronkelijk dashboard B6.18)

---

## G. Het volledige toets-systeem (grote, cross-cutting feature — raakt Subjects, Agenda, Dashboard, Grades)

Dit is expliciet omschreven door de gebruiker als één samenhangende levenscyclus. Elke fase hieronder heeft een `[ ]`-status, zelfde proces als de rest van dit doc.

**Al bestaande bouwstenen om op voort te bouwen (bevestigd in de codebase):**
- Anti-cheat bestaat al deels: `AssignmentSettingsOverlay` heeft `requireFullscreen`, `detectTabSwitch`, `restrictIpOrDevice`, `perQuestionTimeLimitSeconds`; `StudentAssignmentView.tsx` heeft al werkende `visibilitychange`/`fullscreenchange`-listeners die events loggen via `sendAssignmentEvent(...)`.
- AI-nakijken bestaat al als schakelaar: `ai_grading_enabled`-vlag op een assignment, gekoppeld aan `/api/ai/grade-submission` en `/api/grading/ai` — nog niet vanuit de UI aangestuurd voor zover bekeken.
- Klas-toetreding via link+code bestaat al als patroon (`app/(main)/classes/join/[code]/page.tsx`, `join_code`/`teacher_join_code`-velden, RPC-lookup) — zelfde mechanisme kan hergebruikt worden voor toets-delen.

### G1. Aanmaken en zichtbaarheid
19. `[ ]` Een toets die een docent aanmaakt staat onder het chapter in een **aparte "Toetsen"-lijst die alleen docenten zien** — leerlingen zien deze titel/structuur nooit in hun eigen systeem, puur voor examenveiligheid (niet als lock-icoon op een overigens zichtbare rij, zoals nu, maar volledig afwezig uit de leerling-view totdat ingepland).

### G2. Plannen
20. `[ ]` Docent plant de toets in (nu, of voor later) — koppelt aan Agenda, sluit aan bij de bestaande "add-to-agenda"-optie in de assignment-wizard.

### G3. Delen tussen docenten
21. `[ ]` Toets delen via link + code (hergebruik `join_code`-patroon). Andere docent gebruikt de link/code om de toets te **importeren** — wordt daarmee hun eigen kopie, die zij op hun beurt weer kunnen delen en zelf inplannen, los van het origineel.

### G4. Live tijdens de toets
22. `[ ]` Dashboard-widget voor docenten met live voortgang per leerling: goed/fout-telling, of "–" als iets nog niet nagekeken/gemaakt is (open vragen worden niet automatisch nagekeken tenzij AI-nakijken aanstaat).
23. `[ ]` Live status per leerling: wie zit er nu in de toets, wie is eruit gegaan.
24. `[ ]` Extra beveiliging: als een leerling een heel antwoord in ~0.1 seconde plakt (plak-detectie, bovenop de al bestaande tab-switch/fullscreen-detectie) → waarschuwing voor de docent.
25. `[ ]` Docent kan de toets live afsluiten — per leerling, of voor iedereen tegelijk — plus "meer handige opties" (nog niet gespecificeerd door gebruiker, blijft open).

### G5. Nakijken (fase 1 — correct/incorrect, geen cijfer)
26. `[ ]` Na afloop gaat de toets naar "to grade" (Grades-tab, mogelijk ook zichtbaar op dashboard). Nakijken = bepalen wat goed/fout is, nog **geen cijfer**.
27. `[ ]` Docent kiest: automatisch laten nakijken door Cautie AI, of handmatig.
28. `[ ]` Docent bepaalt zelf wanneer de nagekeken antwoorden zichtbaar worden voor leerlingen (geen automatische directe release).

### G6. Cijfers geven (fase 2 — losstaand van fase 1)
29. `[ ]` Docent maakt een grade set aan (geeft het een naam), en vult cijfers in — handmatig, of automatisch. **Bewuste scheiding tussen fase 1 en 2:** Cautie levert de objectieve score (bv. "4 goed, 11 fout"), maar de docent bepaalt zelf hoe dat naar een cijfer vertaalt — want cijfersystemen verschillen internationaal (VS: A–F, Duitsland: 1–8, Nederland: 1–10, etc.). Cautie kan dus nooit zelf "het cijfer" bepalen, alleen de ruwe score.

---

## Openstaande vragen (zie chat voor de gestelde vragen en antwoorden)
- Toets-import (G3): volledig losstaande kopie, of blijft die gekoppeld aan het origineel?
- Live-monitoring (G4): verschijnt dit automatisch op het dashboard zodra een toets van jou live is, of is dit een aparte "live toets"-pagina die je zelf opent?

---

## Kernvraag om mee te beginnen

Punt 13 blijft het fundament — zonder assignments die ook gewoon tekst/foto/video-content kunnen zijn (i.p.v. alleen vraag-sets), hebben punt 1 (chatbox) en 14 (one-click flashcards/quiz) niks om op te draaien. Concreet zou dit betekenen: het `text`-blocktype uitbreiden/gebruiken als volwaardig "leerstof"-blok, foto/video-blocktypes toevoegen, en de assignment-wizard een optie geven "dit is content, geen toets" (of gewoon geen vragen toevoegen = automatisch een contentblok). Wil je dat ik hier prioriteit aan geef?

Daarnaast is sectie G (het toets-systeem) een groot apart traject — waarschijnlijk te groot om in dezelfde ronde als punt 13 te bouwen. Voorstel: eerst punt 13 (leerstof-blokken) afronden, dan sectie G als eigen vervolgtraject, gefaseerd zoals G1 → G2 → G3 → G4 → G5 → G6. Ben je het daarmee eens, of wil je dat ik het anders volgordt?

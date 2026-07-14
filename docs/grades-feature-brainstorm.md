# Grades — feature brainstorm

## Proces & legenda
Zelfde aanpak als `docs/dashboard-feature-brainstorm.md` en `docs/subjects-feature-brainstorm.md`: ik onderzoek de code + doe kort marktonderzoek, jij reageert puntsgewijs, ik verwerk de beslissing in dit bestand en bouw.

- `[x]` **Beslist — bouwen**
- `[~]` **Beslist — bouwen, met aanpassing** (aanpassing staat erbij)
- `[!]` **Afgewezen** — niet bouwen
- `[ ]` **Nog niet besloten** — wacht op jouw reactie

## Aanleiding
Dit document is de vervolgstap op `docs/subjects-feature-brainstorm.md` sectie G (toetsen-lifecycle). Daar is besloten dat een toets na afloop eerst wordt **nagekeken** (goed/fout per vraag) en pas daarna een **cijfer** krijgt, en dat "to grade" in Grades zelf leeft, niet als los dashboard-concept. Dat raakt het bestaande Grades-systeem genoeg om een eigen doc te verdienen — vandaar dit bestand.

## Huidige situatie (onderzocht in de code)
- **`grade_sets`** (titel, class_id, subject_id, weight, frequency, status `draft/in_progress/completed`, `published_at`) en **`student_grades`** (grade_set_id, student_id, `grade_numeric` (0-10), `grade_value` (tekst/letter), feedback, `graded_at`) bestaan al, maar zijn **volledig losgekoppeld van `assignments`** — geen `assignment_id`-kolom nergens. Een grade set wordt nu altijd handmatig aangemaakt en handmatig ingevuld (`app/(main)/teacher-grades/...`, `app/api/classes/[classId]/grades/...`).
- **`class_grading_presets`** bestaat al (migratie `20260302_grading_presets_and_flexible_scores.sql`): per klas een preset met `kind` (`freeform` / `numeric_range` / `letter_scale`), een `config` jsonb, en een `is_default`-vlag. `grade_sets.grading_preset_id` verwijst er al naar. Dit is dus **al bijna precies de "cijfer-template" infrastructuur** die je wilt — hij is er alleen nog nooit voor land-templates gebruikt, en de UI om er een te kiezen/bouwen ontbreekt grotendeels.
- **`ai_grading_enabled`** bestaat als vlag op `assignments`, met werkende endpoints `/api/ai/grade-submission` en `/api/grading/ai`, maar nergens in de UI aan te zetten — precies het "los eindje" dat je noemde.
- De **student-cijferpagina** (`app/(main)/grades/page.tsx`) heeft al een "welk cijfer heb ik nodig"-rekenmachine en kleurcodering (groen ≥8,5 / amber 5,5-6,9 / rood <5,5) — Nederlandse 1-10-schaal hardcoded.
- **Toetsen en cijfers hebben nu geen enkele link.** Een leerling die een toets afrondt (`assignment_attempts`, met `score`/`max_score` al aanwezig) krijgt daar nooit automatisch een `grade_sets`/`student_grades`-rij van — dat moet een docent nu helemaal los en handmatig opnieuw doen. Dit is de kern van de "grote refactor".

## Kort marktonderzoek
- Internationale cijferschalen hebben geen officiële 1-op-1 omrekening — conversietabellen (bv. [Scholaro NL](https://www.scholaro.com/db/Countries/netherlands/Grading-System), [Utrecht University conversietabel](https://students.uu.nl/sites/default/files/hum_general_conversion-table-foreign-grades.pdf)) zijn altijd benaderingen op basis van percentage-bins, niet een exacte formule. Voor dit doc betekent dat: een "template" moet zelf percentage→cijfer-bins definiëren, niet proberen automatisch te vertalen tussen bv. NL en VS.
- Gangbare patronen bij gradebook-software (SOLVED, PowerSchool e.d.): een grading-scale is een lijst van `{ label, minPercent, maxPercent }`-bins; docenten kunnen een schoolstandaard kiezen of zelf bins intypen; sommige tools wegen assignment-categorieën (huiswerk 30% / toetsen 50% / ...) mee in een eindcijfer.
- AI-gradingtools voor open vragen (CoGrader, GradeWithAI, Formative) draaien allemaal op hetzelfde patroon dat jij al beschreef: automatisch voor meerkeuze, AI-suggestie + docent-akkoord voor open vragen, en pas daarna zichtbaar voor de leerling na een expliciete publish-actie — bevestigt dat de door jou gekozen "twee gescheiden acties" (nakijken vrijgeven vs. cijfer vrijgeven) een gangbaar en verstandig patroon is, niet alleen een NL-eigenaardigheid.

---

## H. De twee fases (uit jouw antwoord, letterlijk verwerkt)

1. `[x]` **Beslist.** Een toets heeft twee fases voordat er een cijfer is: **nakijken** (meerkeuze automatisch, open vragen door de docent zelf of door Cautie met AI) → resultaat is een **score**, geen cijfer (bv. "4 goed, 2 fout"). Pas daarna, apart, bepaalt de docent hoe die score een cijfer wordt.
2. `[x]` **Beslist.** "To grade" is geen los dashboard-concept — het leeft **in Grades zelf**. De bestaande dashboard-kaart blijft gewoon naar Grades linken.
3. `[x]` **Beslist.** Automatisch-nakijken-met-AI wordt aangeklikt **vanuit Grades**, niet vanuit Subjects of het live-toets-paneel.
4. `[x]` **Beslist.** Antwoorden-vrijgeven (nakijkresultaten tonen: welke vraag goed/fout) en cijfer-vrijgeven zijn **twee gescheiden acties**.

### H1. Voorstel — hoe fase 1 (nakijken) er technisch uitziet
5. `[x]` **Beslist, met uitwerking.** Een afgeronde toets krijgt automatisch een `grade_sets`-rij zodra de eerste attempt binnen is — dat vult "to grade". UI-concept (jouw beschrijving): Grades krijgt een top-menu met knoppen/selectie zoals Subjects dat ook heeft, met (in elk geval) twee lijsten: **"Nog nakijken"** en **"Nog becijferen"** — twee aparte modi. Je opent een item uit "Nog nakijken" en komt in een nakijk-tool met opties (o.a. automatisch nakijken). De kernervaring is een **splitscreen/flashcard-interface**: links de vraag + het correcte antwoord, rechts het antwoord van de leerling; docent markeert goed/fout, kan een notitie toevoegen (voor zichzelf/later), en gaat door naar de volgende — per leerling of door alle leerlingen heen. De resultaten worden opgeslagen in een tabel-achtige structuur ("grade set resultaten"), die je vervolgens oppakt in de "Nog becijferen"-lijst om er (automatisch, via een template) een cijfer van te maken.
6. `[x]` **Beslist.** Zit al in punt 5 — de flashcard-splitscreen-flow is ook het antwoord op de vraag "hoe wordt elke open vraag beoordeeld": per vraag/leerling goed of fout markeren, met "automatisch nakijken" als los te kiezen optie in dezelfde tool (AI-suggestie die de docent met één klik overneemt of overrulet, i.p.v. een aparte flow).
7. `[ ]` Jij noemde eerder (bij het dashboard-gesprek) ook een **"foutgekeurd"-meldknop**: leerling kan aangeven "vraag 4c is fout nagekeken", docent krijgt dat als issue bij Grades. Jouw reactie hierop ("dit gaat meer over grades, maar Subjects is waar de grade sets worden gemaakt") bevestigt dat dit een Grades-feature is — maar de precieze vraag staat nog open: hoort de meldknop er al bij **vóór** het cijfer definitief is (dus tijdens fase 1), of pas **na** cijfer-publicatie als correctieverzoek?

### H2. Voorstel — hoe fase 2 (cijfer) er technisch uitziet
8. `[ ]` Zodra nakijken compleet is, verschijnt de score (bv. "16/20") in Grades. Docent zet die zelf om naar een cijfer — handmatig, of automatisch via een gekozen template (zie sectie I). Klopt dit als basis-flow?
9. `[ ]` "Antwoorden vrijgeven" (leerling ziet goed/fout per vraag) en "cijfer vrijgeven" (leerling ziet het cijfer) worden allebei losse knoppen in dezelfde Grades-detailpagina — geen aparte pagina's. Akkoord?

---

## I. Cijfer-templates per land/systeem (jouw uitbreiding)
10. `[x]` **Beslist, met detaillering.** Docent bepaalt zelf hoe een ruwe score een cijfer wordt. Cautie biedt daarvoor **kant-en-klare templates** (NL 1-10, VS A-F, Duitsland 1-6, of een eigen uitleg/systeem) zodat het cijfer daarna automatisch berekend kan worden i.p.v. steeds handmatig. Cautie bepaalt dus nooit zelf "het" cijfer zonder een door de docent gekozen/ingestelde regel.
11. `[ ]` Voorstel voor de bouw: dit hergebruikt de **al bestaande** `class_grading_presets`-tabel — geen nieuwe tabel nodig. `kind` breidt uit met een nieuwe waarde `'scale_template'`, en `config` bevat de bins, bv.:
    ```json
    { "system": "nl_1_10", "bins": [{ "min": 90, "max": 100, "label": "9-10" }, { "min": 80, "max": 89, "label": "8" }, ...] }
    ```
    Cautie levert een paar kant-en-klare `system`-presets (NL, VS A-F, DE 1-6) die de docent kan kiezen en daarna zelf mag aanpassen (bins verschuiven). `[~]` **Aangevuld:** de "eigen systeem"-optie is niet alleen handmatig bins intypen — een docent moet ook een **standaard kunnen aanleveren als bestand met een tabel**, of gewoon **platte tekst plakken** die het systeem uitlegt, waarna Cautie dat omzet naar bins (AI-parsing, zelfde soort aanpak als elders in de app). Akkoord met dit model?
12. `[ ]` Moet een gekozen template **per klas** gelden (zoals `class_grading_presets` nu al werkt — 1 tabel per klas), of wil je 'm ook **per grade set** kunnen overriden (bv. deze ene toets telt toch net anders)? De kolom `grade_sets.grading_preset_id` bestaat al en maakt per-grade-set override zonder migratie mogelijk — dus dit kan sowieso, de vraag is alleen of de UI het aanbiedt.
13. `[ ]` Moet er ook een **gewicht-per-categorie** (huiswerk/toetsen/proefwerken tellen anders mee voor een eindcijfer) bij, of is dat te veel voor nu en beperken we ons tot losse cijfers per grade set (zoals nu al het geval is, met de bestaande `weight`-kolom als eenvoudige factor)?

---

## J. De "grote refactor" — koppeling toetsen ↔ grades
14. `[ ]` De kern van de refactor is dat `grade_sets`/`student_grades` een `assignment_id` moeten krijgen om een toets-resultaat automatisch te kunnen doorzetten naar Grades. **Dit vereist een databasemigratie** (nieuwe kolom + evt. nieuwe status-waarde op `grade_sets.status`). Zoals besproken raak ik de productiedatabase niet aan zonder jouw expliciete akkoord — dus dit is het moment om dat te geven of een andere aanpak te kiezen (bv. de link puur via een los koppel-veld in `assignments.settings` jsonb leggen i.p.v. een nieuwe kolom op `grade_sets`, wat weer geen migratie zou vereisen maar wel lastiger te queryen is). Welke wil je?
15. `[ ]` Blijft handmatig-een-grade-set-aanmaken (los van een toets, bv. voor mondelinge overhoring) gewoon bestaan naast de nieuwe toets-gekoppelde flow, of vervangt de nieuwe flow dat volledig?
16. `[ ]` De huidige teacher-grades pagina's (`app/(main)/teacher-grades/...`) zijn met een wizard-achtige flow gebouwd (zie `GRADES_IMPLEMENTATION_PLAN.md`, een oud, nooit afgemaakt implementatieplan uit een eerdere sessie — nog deels `🔜 pending`, o.a. CSV import/export). Wil je dat ik die pagina's meeneem in dezelfde visuele stijl als de rest van de app (net als Dashboard/Subjects zijn gedaan), of eerst puur de nakijken/cijfer-functionaliteit bouwen en de visuele pas later los doen?

---

## Openstaande vragen samengevat
De kernbeslissingen (H, top van I) staan vast. Wat ik van jou nodig heb voordat ik ga bouwen: punten 5-9 (precieze flow nakijken/cijfer), 11-13 (vorm van de templates), en vooral **14** (migratie ja/nee — en zo ja, akkoord om die op de live database te zetten).

## Status: gebouwd (2026-07-14)
Punt 14 is uitgevoerd (migratie `20260714_link_grade_sets_to_assignments.sql`, live gezet). Op basis daarvan is de hele flow gebouwd in één keer:
- Auto-aangemaakte `grade_sets`-rij bij een ingeleverde/afgesloten toets.
- **Nog nakijken** / **Nog becijferen** als twee lijsten onder Grades, met een flashcard-splitscreen nakijk-tool (goed/fout + notitie, plus "automatisch nakijken" met AI).
- Cijfer-templates (NL/VS/DE kant-en-klaar, handmatige bins, of AI-parsing van geplakte tekst/bestand) via de bestaande `class_grading_presets`-tabel — geen nieuwe kolom/kind nodig, gemarkeerd via `config.templateType`.
- Twee losse vrijgeef-knoppen (antwoorden / cijfer) + een leerling-resultatenpagina die gate't op `answers_released_at`.

Punten waar ik zelf een pragmatische keuze in heb gemaakt (niet expliciet bevestigd, makkelijk aan te passen):
- **12**: template geldt nu per klas (kies 'm bij het becijferen); per-grade-set override kán al via de bestaande `grading_preset_id`-kolom maar heeft nog geen eigen UI.
- **13**: gewicht-per-categorie is niet gebouwd — alleen de bestaande simpele `weight` per grade set.
- **15**: handmatig een grade set aanmaken (los van een toets) blijft gewoon werken naast de nieuwe flow.
- **16**: alleen functionaliteit gebouwd, geen visuele hertekening van de teacher-grades pagina's — dat kan later los.
- AI-parsing van geüploade bestanden werkt nu alleen voor tekstbestanden (.txt/.csv/.md, uitgelezen als platte tekst) — geen OCR/PDF-parsing.

**Update:** punt 7 (foutgekeurd-meldknop) is alsnog gebouwd. Leerling kan op de resultatenpagina (na vrijgave van antwoorden) per vraag "Meld fout" klikken met een notitie; landt als `grading_dispute`-event. Docent ziet open meldingen als een geel paneel bovenaan de becijfer-pagina, met per melding "heropen voor nakijken" (zet het antwoord terug in de nakijken-flashcard-queue) of "afwijzen".

**Update:** punt 12 en 13 zijn ook gebouwd.
- **12**: een cijfer-template kan nu als standaard voor de klas gemarkeerd worden (checkbox bij aanmaken) en wordt dan automatisch voorgeselecteerd bij het becijferen van een nieuwe toets; per-grade-set override werkte al via de bestaande picker (je kunt altijd handmatig een andere template kiezen/toepassen voor één specifieke cijferlijst).
- **13**: docenten kunnen nu een gewicht per categorie instellen (Toetsen/Huiswerk/Quizzes/...) via een paneel op de Metrics-pagina (per klas). Het eindcijfer wordt daarmee gewogen berekend en getoond op de cijferpagina van de leerling naast het simpele gemiddelde. Zonder ingestelde gewichten valt het terug op het bestaande simpele gewogen gemiddelde (per grade-set-`weight`).

**Sectie G is hiermee volledig gebouwd.** Alleen punt 16 (visuele restyle van de teacher-grades pagina's, los van de nieuwe functionaliteit) staat nog open — de nieuwe pagina's zijn wel al gebouwd met de bestaande designtokens/componenten (surface-panel, class-panel-lg, Card/Button) dus ze passen al redelijk in de stijl, maar hebben geen eigen polish-ronde gehad zoals andere tabs.

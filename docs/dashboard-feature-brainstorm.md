# Dashboard — Feature Brainstorm

**Status:** Brainstormfase, niks gebouwd. Doel: alles verzamelen wat een dashboard zou kunnen bevatten — van competitors, van forums/reviews, en eigen ideeën/gemiste features — zodat we daaruit kunnen kiezen wat we bouwen.

**Proces:** Zelfde als het visuele reference-document. Loop erdoorheen, per punt: `[x]` bouwen, `[~]` bouwen met aanpassing (aanpassing noteren), `[!]` niet doen. Wat je niet aanraakt laat ik open staan — geen aanname dat het akkoord is, dit is puur een lange keuzelijst. Zodra de lijst doorlopen is, maak ik op basis van de `[x]`/`[~]`-punten een mockup voor Dashboard (student + teacher versie).

**Herkomst-tags per punt:**
- `[Competitor: naam]` — bestaat al zo (of vergelijkbaar) bij een concrete concurrent
- `[Forum/review]` — expliciet genoemd als wens/pijnpunt in reviews, fora, of "wat mensen missen"-onderzoek
- `[Eigen idee]` — door mij bedacht, past bij Cautie's positionering
- `[Gemiste feature]` — iets wat Cautie nu simpelweg niet heeft maar logisch zou zijn gegeven de bestaande functionaliteit elders in de app

Een punt kan meerdere tags hebben.

---

## Kernprincipe voor dit dashboard (uit je bericht)

Het dashboard is geen los canvas met widgets — het is een **doorverwijs- en informatiepunt**. Bovenaan algemene data/status, daaronder concrete doorverwijzingen naar de plek waar je verder moet (agenda, grades, class, tools). Niet "hier is alles", maar "hier is wat er speelt, en hier moet je zijn om er iets aan te doen."

---

## A. Student Dashboard — RONDE 1 BESLIST EN GEBOUWD

Alle `[x]`/`[~]`-punten hierboven zijn geïmplementeerd: nieuwe stat-rij, week-strookje samengevoegd in Today's plan (deep-link naar agenda-item), grades-kaart met wissel recently-graded/to-grade (incl. nieuw `/api/student/grades/pending` endpoint), voorwaardelijke "oefen nu"-suggestie (alleen bij material-gekoppelde items), docent→klas/leerling-melding via de notificatie-inbox (nieuw `/api/notifications/send-message` endpoint + compose-dialoog + dashboard-kaart), en widget-personalisatie (aan/uit + compact-modus, in het schuifjes-menu naast de meldingenbel).

### A1. Overzicht / status bovenaan
1. `[x]` Begroeting blijft, wordt "Welcome back, [naam]" i.p.v. "Good afternoon" — datum eronder in kleinere tekst (structuur blijft, tekst verandert).
2. `[~]` Stat-rij: **niet** "aantal classes" — wordt Subjects-count + Average grade (klikbaar → naar die klas/vak-specifieke grades) + Notifications (ongelezen-count uit de bestaande notificatie-inbox, getoond als getal-in-cirkel — **deze cirkel-weergave is dashboard-exclusief**, elders blijft het een gewone badge).
3. `[!]` Samenvattende zin — vervalt, stat-rij (2) dekt dit beter.
4. `[!]` Streak — vervalt.
5. `[~]` Wordt: klein week-strookje met alléén toetsen/huiswerk-titels per dag, klikken opent dat item direct in Agenda (open het item zelf, niet alleen de dag). **Zelfde ding als punt 9** — gedupliceerd, samengevoegd.

### A2. Doorverwijzing naar Agenda
6. `[!]` "Volgend uur"-kaart — minder prioriteit dan 7, laten we voorlopig niet apart bouwen.
7. `[~]` "Vandaag te doen"-lijst blijft het hoofdwidget, wordt herschreven/gemoderniseerd (inclusief punt 8 erin gevouwen — geen los "komende toets"-kaartje, toetsen krijgen gewoon meer visuele nadruk binnen deze lijst).
8. → samengevoegd met 7.
9. `[x]` = exact hetzelfde als de herziene punt 5 (week-strookje met toetsen/huiswerk, klik opent item direct). Eén widget, niet twee.
10. `[ ]` Nog niet besproken — open.

### A3. Doorverwijzing naar Grades
11. `[~]` Eén kaart met **wisselknop** tussen "Recently graded" (titel + cijfer + gemiddelde) en "To grade" (toetsen die nog geen cijfer hebben). ⚠️ Afhankelijk van of er al een "to grade"-databron voor studenten bestaat — wordt nu uitgezocht, zie vraag hieronder.
    - Notitie voor later (niet nu bouwen): toetsen moeten sowieso beter/robuuster bij Subjects — incl. inplannen via Agenda, browser-tab-detectie/anti-cheat, en dat je na de verlopen tijd niet meer kan invullen. Voor nu: minimale versie zodat dit dashboard-onderdeel werkt, geen losse sessie bouwen om dit heen en weer te fixen.
12. `[!]` What-if calculator preview — niet op dashboard. Mogelijk later als losse, student-only extra feature (geen docent-kant), niet nu.
13. `[ ]` Nog niet besproken — open.

### A4. Doorverwijzing naar Subjects/Tools/Studysets
14. `[!]` "Ga verder waar je gebleven was" — vervalt.
15. `[~]` "Binnenkort een toets? Oefen nu" — **alleen** tonen als het agenda-item een gekoppeld vak/paragraaf/opdracht/bestand heeft om naar te verwijzen. Bij losse vrije tekst ("paragraaf 1 2 3") is er niks om een suggestie van te maken, dus dan geen kaart. ⚠️ Hangt af van of agenda-items al zo'n koppeling ondersteunen — wordt uitgezocht.
16. `[!]` Recent bekeken materiaal — vervalt, zit al bij Subjects.

### A5. Communicatie
17. `[!]` Chat is uit Class verwijderd — dit punt in zijn oorspronkelijke vorm vervalt, zie 18.
18. `[~]` Wordt: docent kan vanuit het eigen dashboard een gerichte melding/bericht sturen — naar een hele klas óf naar één specifieke leerling — géén losse chat-functie. Verschijnt op het dashboard van de ontvangende student(en) als berichtkaart (bv. "Bericht van meneer Kribbe: lokaal voor SK is nu 109"). ⚠️ Hangt af van of het bestaande announcement-systeem al per-leerling kan targetten — wordt uitgezocht.
19. `[!]` Klasgenoten-activiteit — **absoluut niet**, privacy-principe: leren is privé, iedereen doet zijn eigen ding, studysets zijn toch bijna nooit hetzelfde. Dit principe geldt voor toekomstige features in het algemeen, niet alleen dit punt.

### A6. Motivatie / gamification
20. `[?]` Wekelijkse samenvatting — twijfel, niet gecommit. Risico op scope-vraag ("waar stop je dan": per week? cumulatief?) en onduidelijk of het echt gebruikt wordt. Lage prioriteit, niet in ronde 1.
21. `[!]` Badges — vervalt.
22. `[!]` Leaderboard — vervalt, expliciet afgekeurd ("slechtste idee tot nu toe"). Enige denkbare heropening: als er ooit live multiplayer-games komen, maar niet nu en niet als dashboard-feature.

### A7. AI-ondersteund
23. `[!]` Vervalt — hele sectie A7 geschrapt.
24. `[!]` Vervalt — hele sectie A7 geschrapt.

### A8. Personalisatie
25. `[x]` Widgets aan/uit/herschikken — akkoord.
26. `[x]` Compact/uitgebreid weergave-modus — akkoord.

---

## B. Teacher Dashboard

### B1. Overzicht / status bovenaan
1. `[ ]` Begroeting + datum + aantal klassen (**al aanwezig**, blijft).
2. `[ ]` Stat-rij: klassen, leerlingen, openstaande beoordelingen, ongelezen berichten (**al aanwezig**, wordt visueel herzien).
3. `[ ]` "Vandaag in het kort"-zin: bv. "2 klassen vandaag, 7 nog te beoordelen, 1 nieuw bericht" — zelfde principe als student-versie. `[Eigen idee]`
4. `[ ]` Actieve-klas-indicator duidelijk bovenaan (voor docenten met meerdere klassen) — welke klas is nu "geselecteerd" voor de rest van het dashboard. `[Gemiste feature]` — nu al impliciet via localStorage, niet zichtbaar in UI.

### B2. Doorverwijzing naar Grading/Grades
5. `[ ]` "Te beoordelen"-kaart bovenaan, prominent: aantal + directe knop naar de oudste/dringendste inzending. (**al aanwezig** als "To Grade", wordt visueel/functioneel herzien — nu vaak leeg/onduidelijk).
6. `[ ]` Beoordelingsdeadline-indicator: als een toets/opdracht een resultatendatum heeft die dichtbij komt. `[Eigen idee]`
7. `[ ]` Klasgemiddelde-trend (mini-sparkline) per vak/klas — in één oogopslag zien of een klas vooruit- of achteruitgaat. `[Competitor: Schoology analytics, Microsoft Teams Insights]`
8. `[ ]` "Snelste beoordeel-actie": bulk-beoordelen van meerkeuzevragen automatisch afgehandeld tonen (bespaarde tijd zichtbaar maken). `[Forum/review — "administratieve automatisering" expliciet genoemd als wens]`

### B3. Doorverwijzing naar Agenda/Rooster
9. `[ ]` "Volgend lesuur"-kaart: welke klas, welk lokaal/tijdstip, één klik naar lesvoorbereiding of aanwezigheid. `[Eigen idee]`
10. `[ ]` Aankomende toetsen/deadlines die de docent zelf heeft ingepland, overzicht voor de week. (**al aanwezig** deels, wordt herzien)

### B4. Student-monitoring / engagement
11. `[ ]` "Leerlingen die achterblijven"-signalering: leerlingen met opvallend lage voortgang/cijfers/afwezigheid, proactief gemarkeerd i.p.v. dat de docent het zelf moet opzoeken. `[Forum/review — expliciet genoemd: "dashboard dat laat zien wie betrokken is en wie afdwaalt"]` `[Competitor: Schoology, Microsoft Teams Insights]`
12. `[ ]` Aanwezigheidsoverzicht mini-widget: snelle blik op afwezigheid deze week zonder naar Attendance-tab te gaan. (**al aanwezig** als quick-access link, kan een echte data-widget worden)
13. `[ ]` Wie heeft het materiaal nog niet geopend — leesbevestiging voor gedeeld lesmateriaal. `[Forum/review]` `[Gemiste feature]`
14. `[ ]` Klassenbetrokkenheid-score (activiteit, inleveringen op tijd, etc.) als samengestelde indicator per klas. `[Competitor: Microsoft Teams for Education Insights]`

### B5. Communicatie
15. `[ ]` Recente berichten/vragen van leerlingen of ouders, met snel-antwoord. (**al aanwezig** via recent-activity-feed, blijft)
16. `[ ]` Aankondiging plaatsen direct vanaf dashboard zonder naar Class te navigeren. (**al aanwezig**, blijft)
17. `[ ]` Ouder-communicatie-log: wanneer voor het laatst contact was per leerling/klas — alleen relevant als Cautie ooit een ouder-rol krijgt, dus voorlopig noteren, niet bouwen. `[Competitor: ClassDojo]`

### B6. Class management
18. `[ ]` Snel-toegang "nieuwe opdracht/toets aanmaken" als prominente actie i.p.v. weggestopt in een submenu. `[Eigen idee]`
19. `[ ]` Klas-wisselaar met live-stats per klas in de dropdown zelf (niet alleen naam) — zodat je in de switcher al ziet welke klas aandacht nodig heeft. `[Eigen idee]`
20. `[ ]` Interactieve-les-snelstart: quiz/poll direct vanaf dashboard starten voor de actieve klas. `[Forum/review — "polls/gamified quiz in seconden starten" genoemd als wens]`

### B7. Analytics/inzicht
21. `[ ]` Mini-analytics-kaart: gemiddelde score laatste toets, vergelijking met vorige toets (trend-pijltje). (**al aanwezig** deels, wordt visueel herzien)
22. `[ ]` "Sterkste/zwakste onderwerp deze week" over alle klassen heen — helpt bij het bijsturen van lesstof. `[Competitor: student-progress-tracking tools met heatmaps]`
23. `[ ]` Exporteerbare weekrapportage (bv. voor teamoverleg) — one-click samenvatting genereren. `[Forum/review — CSV-export/rapportage genoemd als gewaardeerd]`

### B8. AI-ondersteund
24. `[ ]` Automatische suggestie voor interventie: "3 leerlingen scoren onder 60% op [onderwerp], wil je een hersteloefening aanmaken?" `[Eigen idee]` `[Gemiste feature]`
25. `[ ]` Auto-gegenereerde lesreflectie/samenvatting na een toets: wat ging goed, wat niet, gebaseerd op de resultaten. `[Eigen idee]`

### B9. Personalisatie
26. `[ ]` Widgets aan/uit/herschikken, zelfde als student-kant. `[Competitor: Canvas]`
27. `[ ]` Rol-specifieke shortcuts vastpinnen (bv. docent die vooral toetsen maakt vs. docent die vooral aanwezigheid bijhoudt heeft andere prioriteiten). `[Eigen idee]`

---

## C. Dingen die NIET op het dashboard moeten (bewust weglaten, expliciet genoemd in onderzoek als "clutter")

- `[Forum/review]` Uurlijkse time-blocking met kleurcodes/energie-levels — te veel wrijving, mensen stoppen na een week.
- `[Forum/review]` Habit-modules (water drinken, slaap, beweging) — leidt af van het eigenlijke doel (leren), hoort niet bij een studie-dashboard.
- Weer-widgets, klok-widgets, muziek-widgets — leuk voor een persoonlijke Notion-pagina, niet functioneel voor een leerplatform; sluit ook niet aan bij "neutraal, functioneel" chrome-principe.

---

## Volgende stap
Loop door A + B, zet statussen. Ik maak daarna een mockup (apart artifact/voorstel) voor zowel de student- als de docent-kant van Dashboard, gebaseerd op de `[x]`/`[~]`-punten, met de "doorverwijspunt"-structuur (status bovenaan → concrete wijzers naar agenda/grades/tools) als leidend layoutprincipe.

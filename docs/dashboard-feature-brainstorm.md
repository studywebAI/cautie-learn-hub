# Dashboard — Feature Brainstorm

**Proces:** per punt `[x]` bouwen, `[~]` bouwen met aanpassing (aanpassing noteren), `[!]` niet doen. Reageer per punt of per sub-sectie, ik verwerk het en bouw wat akkoord is.

**Herkomst-tags:** `[Competitor: naam]` / `[Forum/review]` / `[Eigen idee]` / `[Gemiste feature]`.

**Kernprincipe:** het dashboard is geen los canvas met widgets — het is een **doorverwijs- en informatiepunt**. Bovenaan status, daaronder concrete doorverwijzingen naar agenda/grades/class/tools.

---

## Nog open (student-kant, sectie A is verder al gebouwd)
- `A2.10` — "Gemiste deadline"-waarschuwing
- `A3.13` — Vak met laagste gemiddelde highlighten
- `A6.20` — Wekelijkse samenvatting (stond op `[?]` twijfel)

---

## B. Teacher Dashboard — hier zit je nu, alles nog open

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
16. `[ ]` Aankondiging plaatsen direct vanaf dashboard zonder naar Class te navigeren. (**al aanwezig**, blijft — nu vervangen door de nieuwe klas/leerling-melding uit sectie A18)
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

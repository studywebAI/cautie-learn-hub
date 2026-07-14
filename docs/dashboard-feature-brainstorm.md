# Dashboard — Feature Brainstorm

**Proces:** per punt `[x]` bouwen, `[~]` bouwen met aanpassing (aanpassing noteren), `[!]` niet doen. Reageer per punt of per sub-sectie, ik verwerk het en bouw wat akkoord is.

**Kernprincipe:** het dashboard is geen los canvas met widgets — het is een **doorverwijs- en informatiepunt**. Bovenaan status, daaronder concrete doorverwijzingen naar agenda/grades/class/tools.

---

## Student-kant (sectie A) — laatste 3 punten nu ook beslist

- `A2.10` `[~]` Gemiste-deadline-waarschuwing wordt geen dashboard-kaart maar een **notificatie**: één melding wanneer iets morgen moet worden ingeleverd, en nog één als het te laat is.
- `A3.13` `[!]` Vak met laagste gemiddelde highlighten — vervalt.
- `A6.20` `[!]` Wekelijkse samenvatting — vervalt definitief.

---

## B. Teacher Dashboard — RONDE 1 BESLIST

### B1. Overzicht / status bovenaan
1. `[x]` Begroeting + datum + aantal klassen — blijft.
2. `[x]` Stat-rij — zelfde principe als student-kant: gecureerde stats i.p.v. rauwe tellingen (niet zomaar "aantal classes/students/assignments/messages").
3. `[!]` Samenvattende zin — vervalt, stat-rij dekt dit.
4. `[x]` Actieve-klas-indicator — simpel, gewoon een duidelijke indicatie welke klas nu actief is.

### B2. Doorverwijzing naar Grading/Grades
5. `[x]` "Te beoordelen"-kaart bovenaan, prominent.
6. `[~]` Geen "beoordelingsdeadline" als concept — **notitie voor later**: als een toets is afgerond, optioneel een reminder instellen om te graden, die wordt ingepland in Agenda.
7. `[x]` Klasgemiddelde/snelle data — wordt onderdeel van de **uitklapbare stat-rij** (zie B7 hieronder, zelfde ding, samengevoegd).
8. `[~]` **Groot, apart te bouwen (niet in deze ronde, notitie voor Grades-pagina):**
    - Auto-beoordeel-assistentie: AI suggereert goed/fout bij meerkeuzevragen (en waar mogelijk standaardvragen).
    - Publiceer-optie bij Grades: leerlingen kunnen hun toetsvragen + goed/foutkeuring terugzien.
    - Betwist-knop per vraag/som voor leerlingen ("dit was fout gekeurd maar was goed") + notitie-veld.
    - Docent ziet die betwistingen terug bij Grades onder een soort "issues/opnieuw nakijken"-lijst.
    - Dit is een grades-brede feature, niet dashboard-scope — apart oppakken.

### B3. Doorverwijzing naar Agenda/Rooster
9. `[x]` "Volgend lesuur"-kaart — zelfde aanpak als de student-kant (today's-plan-stijl widget).
10. `[x]` Aankomende toetsen/deadlines-overzicht — zelfde aanpak als student-kant (week-strip, deep-link naar agenda-item).

### B4. Student-monitoring / engagement
11. `[!]` "Leerlingen die achterblijven"-signalering — vervalt, is te zien uit de data zelf, docent bepaalt dat zelf.
12. `[~]` Geen los data-widget. Wordt: simpele link naar Attendance, gekoppeld aan de klas die **nu** in het rooster zit (niet per se de handmatig geselecteerde actieve klas).
13. `[~]` **Notitie voor later (geen dashboard-feature, hoort bij Agenda-file-uploads):** bij een bestand in een agenda-item zichtbaar wie het heeft geplaatst + tijdstip; voor docenten een 3-dots-menu per upload om te zien wie het heeft geopend.
14. `[!]` Klassenbetrokkenheid-score — vervalt, slecht idee.

### B5. Communicatie
15. `[~]` Recente berichten-widget krijgt een **snel-antwoord** optie (1 bericht terugsturen), gekoppeld aan het bestaande messaging-systeem.
16. `[x]` Aankondiging/melding naar klas — **al gebouwd** (send-message systeem). Kleine UI-toevoeging: een "+"-knop ergens die direct naar het compose-scherm gaat, geen mail-achtige flow.
17. `[~]` Ouder-communicatie-log — interessant, hoort bij een toekomstig "management"-rol concept. Noteren, niet nu bouwen.

### B6. Class management
18. `[!]` Snel-toegang "nieuwe opdracht/toets aanmaken" — hoort niet op dashboard, **verplaatst naar de Subjects-brainstorm** (zie onderaan dit doc).
19. `[!]` Klas-wisselaar met live-stats in de dropdown — niet goed, vervalt. Los daarvan: de klas-wisselaar zelf heeft sowieso een nieuwe visuele update nodig — genoteerd onder Sidebar hieronder.
20. `[!]` Interactieve-les-snelstart (quiz/poll direct starten) — dom idee, vervalt.

### B7. Analytics/inzicht
21. `[x]` = zelfde als B2.7 — **uitklapbare stat-rij**: klik op bv. "Average grade" → kies specifieke klas of totaalgemiddelde → klapt uit naar een grafiekje eronder. Geldt voor de andere stats in de rij ook.
22. `[!]` "Sterkste/zwakste onderwerp" over alle klassen — vervalt, te veel data, niet nuttig genoeg.
23. `[~]` **Notitie voor later (grote Grades-pagina-feature, niet dashboard):** exporteren/analytics-link handig voor management/ouders, geen prioriteit. Wel voor later: Grades uitklapbaar maken per leerling / per losse grade set / hele klas / alle klassen — apart oppakken, hoort niet bij dashboard-ronde.

### B8. AI-ondersteund
24. `[!]` Automatische interventie-suggesties — **hard nee**. Principe: we grijpen niet in op data, dat is aan de docent. Geen voorgestelde acties (bv. extra oefeningen) vanuit het systeem.
25. `[!]` Auto-gegenereerde lesreflectie — vervalt (geen AI door een toets laten "snuffelen"). Los idee dat overblijft maar niet nu gebouwd wordt: gewone (niet-AI) per-vraag statistiek welke vragen sterk/zwak scoorden — puur cijfermatig, geen AI-samenvatting.

### B9. Personalisatie
26. `[x]` Widgets aan/uit — zelfde patroon als student-kant.
27. `[x]` Rol-specifieke shortcuts vastpinnen — akkoord.

---

## Backlog — grote features, expliciet NIET dashboard-scope (apart oppakken)
- **Grading-assistentie + publiceer + betwist-flow** (B2.8) — auto-keuren meerkeuze met AI, publiceren van beoordeelde toetsen aan leerlingen, betwist-knop per vraag met notitie, docent-review van betwistingen.
- **Grades uitklapbaar maken** (B7.23) — per leerling / per grade set / per klas / alle klassen, plus export/analytics-link voor management/ouders.
- **Agenda-file-tracking** (B4.13) — wie heeft een geüpload bestand geopend, per-upload 3-dots-menu.
- **Grading-reminder-scheduling** (B2.6) — na afronden toets optioneel een agenda-reminder plannen om te graden.
- **Ouder-communicatie-log** (B5.17) — hoort bij een toekomstig management-rol concept.
- **Per-vraag sterk/zwak-statistiek** (B8.25) — puur cijfermatig, expliciet geen AI-samenvatting.

---

## Notities voor andere tabs (verzameld tijdens dashboard-werk, blijft in dit doc zodat alles op één plek staat)

### Subjects
- `[ ]` Snel-toegang "nieuwe opdracht/toets aanmaken" als prominente actie (verplaatst vanaf dashboard B6.18) — hoort inhoudelijk bij Subjects, niet bij het dashboard. **Opgepakt in [`docs/subjects-feature-brainstorm.md`](./subjects-feature-brainstorm.md) als punt S0/F18.**

### Sidebar
- `[ ]` Klas-wisselaar (in de sidebar/teacher-dropdown) heeft een visuele update nodig — los van het "live-stats in dropdown"-idee dat is afgekeurd (B6.19), de component zelf is aan vernieuwing toe qua uiterlijk.

---

## Status ronde 1 + 2: dashboard afgerond

**Gebouwd:**
- B1.1/1.2/1.4 — begroeting, gecureerde stat-rij, actieve-klas-indicator.
- B2.5 — "To Grade" op echte data (`/api/dashboard/teacher/pending-grades`), was hardcoded fake tekst.
- B2.7 + B7.21 — uitklapbare stat-rij met grafiek (`/api/dashboard/teacher/grade-averages`).
- B3.9/10 — agenda-widget met week-strip, deep-link naar agenda-item.
- B9.26 — widgets aan/uit, per rol apart opgeslagen.
- `A2.10` — deadline-notificaties: nieuwe `DeadlineReminderChecker` (zelfde client-poll-patroon als de bestaande `ScheduledReminderChecker`), vuurt één "morgen"-melding en één "te laat"-melding per item via `/api/deadlines/check`, gededupliceerd tegen al verstuurde notificaties.
- `B5.15` — snel-antwoord inline op bericht-items in recent-activity (alleen zichtbaar als het item een herleidbare afzender+klas heeft).
- `B5.16` — "+"-snelknop in de header naast de melding-bel, opent hetzelfde compose-scherm.
- `B9.27` — vastgepinde Quick Access-shortcuts, aan/uit te zetten in het personalisatie-menu.
- Oude nep-"Announcements"-kaart (hardcoded "No recent announcements") verwijderd — vervangen door het echte send-message-systeem.

**Bewust niet gebouwd (te riskant/onzeker qua databron, geen quick win):**
- `B4.12` — Attendance-link exact aan "klas nu in het rooster" koppelen. De school-schedule-endpoint filtert op "zichtbaar voor studenten" en is niet betrouwbaar voor docent-gebruik zonder eerst het rooster-datamodel voor docenten uit te zoeken. Blijft voorlopig gewoon gekoppeld aan de handmatig actieve klas.

**Alle punten nu beslist.** B4.14 en B6.18/19/20 zijn afgekeurd (zie hierboven) — B6.18 leeft door als een Subjects-notitie, de klas-wisselaar-update staat onder Sidebar. Dashboard qua features/layout is hiermee compleet; enige open vraag is de visuele sweep hieronder.

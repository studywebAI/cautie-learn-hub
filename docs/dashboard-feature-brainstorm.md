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
14. `[ ]` Nog niet besproken — open.

### B5. Communicatie
15. `[~]` Recente berichten-widget krijgt een **snel-antwoord** optie (1 bericht terugsturen), gekoppeld aan het bestaande messaging-systeem.
16. `[x]` Aankondiging/melding naar klas — **al gebouwd** (send-message systeem). Kleine UI-toevoeging: een "+"-knop ergens die direct naar het compose-scherm gaat, geen mail-achtige flow.
17. `[~]` Ouder-communicatie-log — interessant, hoort bij een toekomstig "management"-rol concept. Noteren, niet nu bouwen.

### B6. Class management
18. `[ ]` Nog niet besproken — open.
19. `[ ]` Nog niet besproken — open.
20. `[ ]` Nog niet besproken — open.

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

## Nog open (niet besproken)
- `B4.14` — Klassenbetrokkenheid-score
- `B6.18/19/20` — Snel-toegang nieuwe opdracht, klas-wisselaar met live-stats, interactieve-les-snelstart

---

## Status ronde 1: gebouwd vs. nog te doen

**Gebouwd:** B1.1/1.2/1.4, B2.5 (nu op echte data, was hardcoded fake tekst), B2.7 + B7.21 (uitklapbare stat-rij met grafiek), B3.9/10 (agenda-widget met week-strip), B9.26 (widgets aan/uit). De oude nep-"Announcements"-kaart (hardcoded "No recent announcements") is verwijderd — vervangen door het echte send-message-systeem.

**Nog te bouwen, bewust uitgesteld i.v.m. scope van dit ene bericht:**
- `A2.10` — deadline-notificaties (morgen + te laat) — heeft een cron/scheduled-check nodig, nog te onderzoeken hoe dat hier werkt.
- `B4.12` — Attendance-link exact aan "klas nu in het rooster" koppelen (nu nog gewoon de handmatig actieve klas).
- `B5.15` — snel-antwoord op berichten in recent-activity.
- `B5.16` — losse "+"-snelknop voor messaging.
- `B9.27` — rol-specifieke vastgepinde shortcuts (alleen widgets aan/uit is gebouwd, pinning nog niet).

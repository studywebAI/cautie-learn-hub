# Studyset Interactive Flows V2 — Checklist

## 🔄 Koerswijziging t.o.v. eerste versie

De vorige `studyset-25-flows.html` deed het verkeerde: 25x dezelfde pagina met
andere **kleuren/thema's**. Dat is niet wat Cautie nodig heeft — Cautie heeft
**één** merkidentiteit (`#6b7c4e` olijfgroen, wit, rounded-2xl cards,
`shadow-sm`, grijswaarden uit `DESIGN_SYSTEM.md`) en die verandert niet per
tool.

**Nieuwe aanpak:**
- ✅ Kleuren/thema = **altijd hetzelfde** Cautie-palet (brand green, wit,
  foreground/muted-foreground grijzen, border-grijs, amber/rood alleen voor
  status)
- ✅ Wat wél verschilt per flow = **layout & plaatsing**: sommige met sliders,
  sommige met boxen/cards, sommige met tabellen, sommige met sidebar,
  sommige met stapsgewijze schermen, sommige met tijdlijnen, etc.
- ✅ Elke flow bestaat uit **meerdere echte, doorklikbare pagina's** (geen
  losse losstaande secties) — je klikt door van overzicht → bron kiezen →
  instellingen → review → studeren → analyse, met werkende navigatie
  (vorige/volgende knoppen, sidebar-links, tab-switches) via vanilla JS
  show/hide binnen één HTML-bestand
- ✅ Alle eerder genoemde features komen terug, maar dan verspreid over de
  juiste pagina's i.p.v. op elkaar gestapeld in één scherm

---

## ✅ Gebouwde flows (12 layout-paradigma's, elk 4-6 doorklikbare pagina's)

Elke flow hieronder = eigen **structuur/plaatsing**, identieke **huisstijl**
(`#6b7c4e` brand-groen, witte cards, `--border`/`--muted` grijzen — exact
zoals het design system). Alles is **echt doorklikbaar**: knoppen wisselen
van pagina via JS (`showFlow`/`showPage`/`showTab`/etc.), niets is een losse
screenshot.

- [x] **Flow 1 — Lineaire Wizard** — volledig scherm, één stap centraal,
  puntjes-voortgang bovenaan, Vorige/Volgende. 5 pagina's: Naam&Vak → Bron
  (3 upload-methodes met live wisselende detailkaart) → Instellingen → Review
  (met "bewerken"-links terug naar elke stap) → Klaar
- [x] **Flow 2 — Werkbank Sidebar** — vaste linker navigatie met
  voortgangs-nummers (●done/●actief), canvas rechts wisselt per klik.
  5 secties: Bron → Studiedagen&Vraagtypen → Output&Grounding → Voorbeeld
  (live gegenereerde kaarten) → Klaar&Analyse
- [x] **Flow 3 — Dashboard Hub → Detail** — landingspagina met 4 klikbare
  tegels (Bronnen/Planning/Output/Analyse, elk met statusbadge), elke tegel
  opent een volledige pagina met eigen "← terug naar overzicht"-knop
- [x] **Flow 4 — Split-canvas Live Preview** — links instellingen, rechts een
  **levend** voorbeeldkaartje: klik een vraagtype-chip en de kaart rechts
  verandert direct (badge/vraag/antwoord/bron wisselen via JS). Losse tabs
  voor Bronnen-beheer en Analyse
- [x] **Flow 5 — Tabbed Paneel** — werkblad met 5 interne tabs (Bronnen,
  Studiedagen, Vraagtypen, Output&Grounding, Organisatie) + bovenliggende
  schakelaar naar losse Review&Analyse-pagina
- [x] **Flow 6 — Accordeon Stappen** — 5 verticaal uitklapbare secties;
  klik opent/sluit, "volgende"-knop rolt automatisch door naar de
  eerstvolgende sectie (`nextAccordion`), eindigt op eigen samenvattingspagina
- [x] **Flow 7 — Laag-op-laag Sheets** — basisoverzicht met 4 categorie-cards;
  "aanpassen" opent een paneel dat van rechts inschuift over de pagina heen
  (overlay + sheet-animatie), met eigen save/cancel-voettekst per paneel
- [x] **Flow 8 — Kaart-stapel Bronnenkiezer** — swipeable kaartenstapel
  (3 gestapelde kaarten, "volgende kaart"-knop schuift de stapel door),
  daarna instellingen-pagina met sliders/chips, eindigt op gefeliciteerd-pagina
- [x] **Flow 9 — Verticale Tijdlijn** — 5 klikbare tijdlijn-knooppunten
  (Aanmaken→Bronnen→Planning→Studeren→Analyse) met done/actief-status;
  elk knooppunt opent zijn eigen volledige pagina, incl. een "studeer-modus"
  voorbeeld met Again/Hard/Good/Easy-knoppen
- [x] **Flow 10 — Tabel/Power-user Grid** — dichte configuratietabel met
  12 inline-bewerkbare cellen (`<input class="cell">`), losse
  analytics-dashboardpagina met 3 SVG-grafieken (staafdiagram, donut-ring,
  sparkline) — geen externe libraries, puur inline SVG
- [x] **Flow 11 — Chat-geleide Assistent** — 6 opeenvolgende
  vraag-en-antwoord-uitwisselingen; elke keuze laat je eigen "antwoord"-bubbel
  verschijnen en onthult de volgende vraag (`chatAdvance`), eindigt in
  een samenvattingskaart met CTA's
- [x] **Flow 12 — Command Palette + Canvas** — vrijwel lege rustige canvas;
  `⌘K` (of een knop) opent een doorzoekbare commandobalk die 6 zwevende
  instellingenpanelen kan openen (Bronnen/Dagen/Vraagtypen/Output/Export/
  Analyse), elk met eigen sluitknop

---

## 🧩 Features die overal terugkomen (verdeeld over de juiste pagina's)

- [x] Upload-optie 1: vak + agenda-toets met gekoppelde hoofdstukken — in elke flow als eerste/aanbevolen kaart
- [x] Upload-optie 2: vak → hoofdstuk → paragrafen — keuzekaart + detailweergave in alle flows
- [x] Upload-optie 3: bestand / foto / link / gedeelde pagina / audio / YouTube — icoonrij met alle 6 typen
- [x] Studiedagen (geen tijden — eigen tempo) — Ma–Zo dag-chips, expliciet toegelicht in F1, F11
- [x] Vraagtypen (flashcards, MC, open vragen, waar/onwaar, invul, beeld-occlusie)
- [x] Bronnen aan/uit zetten + per-bron gewicht (hoog/gemiddeld) — toggle-rijen in elke bronnenlijst
- [x] Grounding (alleen eigen bronnen / citaties+paginanummer / confidence-indicator)
- [x] Output-controle (moeilijkheidsgraad-slider, taal, toon, daglimiet-slider)
- [x] Analytics (retentie%, streak🔥, kaarten-gezien, zwakke onderwerpen met badges)
- [x] Versiegeschiedenis / undo — F2, F3, F4, F9, F10 tonen versie-badges/links
- [x] Export & delen (Anki, CSV, PDF, Notion, community/klasgenoten)
- [x] Organisatie (mappen, tags, vastpinnen aan dashboard, archiveren/status)
- [x] Agenda-koppeling (studyset direct vanaf toetsdatum, automatisch teruggepland)
- [x] Dashboard "te studeren vandaag" call-to-action — zichtbaar als pin-toggle (F5) en statuskaart (F12)
- [x] **Live interactiviteit** — F4's voorbeeldkaart verandert mee met je instelling, F11's chat onthult
      stap voor stap, F8's kaartstapel schuift door, F7's panelen schuiven in/uit, F12's commandobalk
      filtert live op zoekterm

---

## 🎨 Bevestiging: kleuren blijven overal identiek

Elke flow gebruikt dezelfde CSS-variabelen (`--brand:#6b7c4e`, `--bg`, `--fg`,
`--muted`, `--border`, `--amber/red/blue` alléén voor status-badges). Er zit
**geen enkele kleurvariatie** tussen de 12 flows — wat verandert is uitsluitend
de **lay-out**: sidebar vs. tabs vs. tijdlijn vs. tabel vs. chat vs. kaartstapel
vs. command palette vs. accordeon vs. sheets vs. split-canvas vs. hub-tegels
vs. lineaire stappen.

---

## 📄 Bestanden

| Bestand | Status |
|---|---|
| `studyset-interactive-flows.html` | ✅ Klaar — 12 volledig doorklikbare flows, één huisstijl, open in browser |
| `STUDYSET_FLOWS_V2_CHECKLIST.md` | Dit bestand |
| `studyset-25-flows.html` | Oud — 25x kleurvariaties, niet meer leidend (eerste, foute interpretatie) |
| `STUDYSET_CHECKLIST.md` | Oud — checklist bij vorige (kleuren-)versie |

---

*Laatste update: 07-06-2026*

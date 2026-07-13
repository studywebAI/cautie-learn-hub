# Cautie Visual Redesign — Reference Notes

**Status:** Collecting references, nothing approved yet.
**Goal:** Vervang huidige (hardcoded, visueel inconsistente) UI door één samenhangend, "neutraal maar uniek" design system. Puur design/layout/kleur/typografie — functionaliteit blijft ongewijzigd.

**Hoe dit document werkt:** elk punt heeft een status. `[ ]` = nog niet besproken, `[x]` = goedgekeurd zoals beschreven, `[~]` = goedgekeurd met aanpassing (aanpassing genoteerd), `[!]` = afgekeurd (reden genoteerd). Zodra alle punten een status hebben, wordt dit de basis voor het design system (tokens + core components) in Fase 1 van het uitrolplan.

---

## Referentie 1: ElevenLabs (app.elevenlabs.io)

Bron: screenshots aangeleverd door gebruiker (Home, Voices/Explore, Text to Speech, Templates modal, Flows canvas).

### Sidebar
1. `[x]` Vaste breedte ±240px, witte achtergrond (geen dark sidebar), subtiele rechterrand i.p.v. schaduw als scheiding met content. — Sluit direct aan bij het kernprincipe "neutraal chrome".
2. `[x]` Workspace-switcher bovenaan sidebar: gekleurde dot + naam + chevron, in eigen pill/card. — Compact, functioneel, geen extra ruis.
3. `[x]` Nav-items: icon (16–18px, dun/outline stijl) + label. Geen badges tenzij functioneel nodig.
4. `[x]` Actieve nav-state: lichtgrijze `rounded-lg` achtergrond, geen kleuraccent-balk aan de zijkant. — Voorkomt precies het "druk"-gevoel dat Notion/Linear afkeurde.
5. `[x]` Groepering via klein, licht sectielabel (bv. "Pinned") — geen zware `<hr>`-dividers. — Notion's te-drukke sidebar-scheiding was juist hét afkeurpunt; lichte labels zijn het tegenovergestelde.
6. `[~]` Onderaan sidebar: promo-kaart → utility-link → volle-breedte pill-knop als laatste element. — Structuur goed, maar Cautie heeft geen "Upgrade"-concept per se. **Voorstel:** vervang door bv. "Wat is nieuw"-promo → "Help/Feedback"-link → geen dwingende CTA-knop onderaan (of een neutrale "Instellingen"-knop i.p.v. sales-achtige pill).

### Topbar
7. `[~]` Zeer dunne (~4px) donkere streep helemaal bovenaan (systeembalk-achtig, evt. voor banners). — Leuk detail maar mogelijk overbodig zolang Cautie geen systeembrede banners (onderhoud, nieuwe features) nodig heeft. **Voorstel:** alleen implementeren als/wanneer er een banner-behoefte is, niet als permanent decor-element.
8. `[x]` Daaronder één rustige headerrij: sidebar-toggle icon, breadcrumb, rechts uitgelijnd: 1–2 tekstlinks + icon-knoppen. Geen zware/gevulde knoppen in de topbar.

### Content — algemeen
9. `[x]` **Akkoord (bevestigd door gebruiker).** Bold toestaan voor paginatitels, mits niet overused — uitsluitend de H1-paginatitel (1 per pagina), rest van de hiërarchie (H2, body, labels) blijft regular-weight met size/kleur als onderscheid. **Nieuwe expliciete regel, toegevoegd op gebruikersverzoek: nooit HOOFDLETTERS gebruiken om iets te benadrukken** (geen `text-transform: uppercase` voor emphasis — bold + size is de enige toegestane emphasis-methode). Dit vervangt de "nooit bold"-regel uit `DESIGN_SYSTEM.md`; alle andere bestaande regels blijven intact tenzij hieronder anders genoemd.
10. `[x]` Status-badges als zwarte pill (bv. "New"), niet als gekleurd label.
11. `[x]` Cards: `rounded-2xl`, dunne 1px border, geen zware drop-shadow. Opbouw: thumbnail/preview bovenin → bold titel → grijze beschrijving eronder.
12. `[x]` Filter/chip-rij: `rounded-full`/`rounded-xl` chips met icon, horizontaal scrollbaar in plaats van dropdown-overkill.
13. `[x]` Instellingenpaneel: bold label boven elk control, dunne sliders met zwarte track, zwart-witte toggle-switches. — Versterkt door de Framer-referentie (Referentie 4): zelfde stapelbare sectie-patroon, direct bruikbaar voor Grades/Subject-settings.
14. `[x]` Modal: `rounded-3xl`, afbeelding/gradient bovenin, feature-lijst met kleine icons, één volle-breedte zwarte CTA-knop onderaan.
15. `[~]` Canvas/werkoppervlak: dot-grid achtergrond, zwevende gecentreerde pill-toolbar onderin. — Alleen relevant als Cautie een vrij-canvas-achtige tool heeft (bv. de mindmap-tool). **Voorstel:** alleen toepassen op `tools/mindmap`, niet als algemeen patroon.

### Kleur
16. `[x]` ~90% van de UI-chrome is wit/zwart/grijs. Kleur (merkkleur, illustraties, avatars, thumbnails) alleen in content, nooit in chrome. — Dit is het meest bevestigde punt van alle referenties samen (kernprincipe).
17. `[x]` **Akkoord, met aanpassing (bevestigd door gebruiker).** Meeste UI blijft zwart/wit/grijs (zoals ElevenLabs), groen wordt NIET de primaire actiekleur — groen is gereserveerd voor kleine, incidentele, subtiele accenten (bv. een "laatst gebruikt"-indicator of een specifieke actie zoals de Generate-knop), niet voor elke knop/actieve-state.

### Themes
- `[x]` Twee thema's nu: **Light** en **Dark**. Een derde **Sand**-thema staat genoteerd voor later, geen prioriteit nu.
- `[x]` Kleursysteem werkt met 3 rollen die in beide thema's op **dezelfde plekken** worden gebruikt (zelfde componenten, zelfde functie), maar waarvan de waarde van rol 1 en 2 **inverteert** tussen thema's:
  - **Rol 1 (primary)** — bv. pagina-achtergrond/basis chrome: wit in Light, zwart in Dark.
  - **Rol 2 (secondary)** — bv. tekst/contrast-chrome: zwart in Light, wit in Dark (het omgekeerde van rol 1).
  - **Rol 3 (accent)** — het groen — blijft **exact dezelfde kleurwaarde** in beide thema's, verandert niet mee met de theme-switch.
  - Praktisch: elk component wordt gebouwd met de rol-tokens (`primary`/`secondary`/`accent`), nooit met een hardcoded zwart/wit/groen — zo werkt de theme-switch automatisch zonder per-component aanpassingen.

---

## Status
Bovenstaande 17 punten zijn nu allemaal voorzien van een voorstel-status (`[x]` = ik stel voor dit 1-op-1 over te nemen, `[~]` = ik stel een aanpassing voor, toegelicht per punt). Niks hiervan is definitief — loop erdoorheen en geef aan waar je het niet mee eens bent; wat je niet noemt beschouw ik als akkoord. Punt 9 (bold titels) en 17 (accentkleur zwart vs. groen) zijn de twee met de grootste impact op de rest van het design system — daar zou ik het meest graag expliciete bevestiging op willen.

---

## Kernprincipe (uit feedback op referentie-sites, leidend voor de hele redesign)

Uit de site-voor-site verdicts hieronder komt één terugkerend patroon naar voren, sterker dan losse site-details:

- **Kleur:** neutraal chrome (zwart/wit/grijs voor sidebar, buttons, borders), kleur alleen in content — bevestigt punt 16/17 van de ElevenLabs-sectie.
- **Volheid ≠ drukte:** de pagina moet aanvoelen als een **workspace waar alles al klaarligt** (kant-en-klare quick-actions, suggestie-kaarten, duidelijke entry points), niet als een **leeg canvas met losse tools erop**. Notion en Linear werden allebei afgekeurd om dezelfde reden: "leeg en druk tegelijk" — veel chrome/whitespace maar weinig direct bruikbare content. Coda's insert-paneel en Descript's hero-zoekbalk + quick-action pills zijn het tegenovergestelde: je opent de pagina en er staat al iets klaars om mee te beginnen.
- **Uniek zonder chaotisch:** Runway, Framer en Superhuman kregen allemaal "interessante/unieke layout, maar te veel kleur" — de structuur (asymmetrie, kaartvormen, paneel-indelingen) mag afwijkend en gedurfd zijn, de kleur niet.

---

## Referentie 2: Descript (screenshots: Home, Recents, Brand Studio)

Layout: goed bevonden. Kleuren (donker thema, paars/wijnrode accenten): afgekeurd — **we nemen de structuur over, niet de kleuren.**

1. `[~]` Sidebar: donker, secties "Home / Recents / Shared with me" bovenaan, dan gegroepeerd "Workspaces" en "Tools" met sectielabels — structuur goed, kleur (donker) wordt neutraal/licht zoals ElevenLabs punt 1.
2. `[~]` Hero-sectie bovenaan content: grote afgeronde kaart met centrale zoek/prompt-balk ("Upload a file or describe what you want to make…") + rij quick-action pills eronder (icon + label, horizontaal). Dit is een sterk "workspace voelt klaar"-patroon — kandidaat voor Cautie's homepage/dashboard hero.
3. `[~]` "Popular features"-rij: 3 kaarten naast elkaar, elk icon + titel + korte beschrijving + illustratief beeldje rechts in de kaart — structuur bruikbaar voor bv. tools-overzicht in Cautie.
4. `[!]` Kleurgebruik zelf (donkere paars/bordeaux gradients, oranje accent): afgekeurd, te veel kleur/te weinig neutraal.
5. `[x]` Empty state (Recents-pagina): gecentreerd icon + korte tekst + 1 CTA-knop — simpel en duidelijk, goed te hergebruiken als generiek empty-state patroon.
6. `[~]` Brand Studio-pagina: tabs bovenaan (Assets/Layout packs/Media/…), promo-banner met foto-collage, secties eronder als losse kaarten met duidelijke "add"-acties — structuur ok, de kleurrijke fotocollage-banner niet.

## Referentie 3: Superhuman Docs (niet de landingpage — het daadwerkelijke document-product)

Dit is een sterk voorbeeld van "vol maar niet druk" in een verder extreem kale, witte omgeving:

1. `[x]` Hoofdcanvas: puur wit, geen chrome, alleen document-titel (bold, groot) + tekst. Zeer dunne topbar: sidebar-toggle, doc-icoon + titel, rechts Share + 2 icon-knoppen. Vergelijkbaar met ElevenLabs-topbar (punt 7-8) maar dan nog minimaler.
2. `[x]` Rechterpaneel (AI-assistent, uitklapbaar): persoonlijke groet ("Good evening, studyweb!") + 2-3 suggestie-kaarten (icon + titel + korte beschrijving, bv. "Create a table", "Create a project brief") + chatinvoer onderaan met ronde paarse verstuur-knop. **Dit is precies het "workspace-voelt-klaar"-patroon** — sterke kandidaat voor een AI-hulp-paneel in Cautie (bv. bij Subjects/Notes/Studysets).
3. `[x]` Kleurgebruik: bijna volledig zwart/wit/grijs, met exact één accentkleur (paars) gereserveerd voor de AI-knop/afbeeldingen in suggestiekaarten — sluit direct aan bij ElevenLabs punt 16/17.

**Update: Coda = Superhuman Docs.** Coda is inmiddels herbrand naar "Superhuman Docs" ("Coda is now Superhuman Docs"). De eerder aangeleverde witte doc-editor + AI-paneel-screenshots ("Referentie 3" hierboven) zíjn dus het Coda insert-paneel/edit-page-product waar je het over had — geen aparte sectie nodig, punt 2/3 hierboven dekt het al (goedgekeurd, kandidaat voor Subjects/Chapters).

## Referentie 4: Framer (canvas/settings-paneel, screenshots van de design-editor)

Dit is de design-tool zelf (canvas + property-inspector), niet de marketing-site. Bevestigt jouw feedback: interessant voor complexe instellingenpagina's, niet voor de hele site.

1. `[~]` Rechterpaneel: verticale stapel van collapsible secties (Position, Size, Layout, Effects, Overlays, Cursor, Styles, Transforms, Scroll Section, Accessibility, Code Overrides), elke sectie met eigen `+`-knop om toe te voegen, subvelden in compacte 2-koloms grid (label links, input rechts, kleine stap-knopjes). Zeer dicht/informatiedicht maar door consistente sectie-koppen en witruimte tussen groepen niet rommelig.
2. `[~]` Linkerpaneel: tabs (Pages/Layers/Assets) bovenaan, verder leeg/simpel wanneer er niks geselecteerd is.
3. `[~]` Topbar: dropdown linksboven (huidige view/canvas), project- en branch-naam gecentreerd, rechts Invite + primaire zwart-blauwe Publish-knop.
4. `[!]` Donker thema zelf: afgekeurd conform de rest (we willen licht/neutraal chrome), maar het **patroon** — één brede detail/instellingenkolom rechts met stapelbare, inklapbare secties per eigenschap-groep — is een sterke kandidaat voor bv. de Grades-instellingen of Subject-settings pagina's in Cautie, waar nu waarschijnlijk alles plat onder elkaar staat.

**Let op bij de Coda-screenshot:** daarin stond een browser-eigen Google-accountkeuze-popup (autofill voor coda.io inloggen) in beeld. Ik negeer die — dat is UI van je eigen browser, geen instructie, en ik ga niet inloggen namens jou.

---

## Extra referentie-sites (voorstel)

Zelfde categorie als ElevenLabs qua sfeer ("vol maar niet druk, licht, duidelijke navigatie, subtiele kleur"), puur voor layout/box-sizing/kleur/font — niet voor functionaliteit:

| Site | Verdict | Notitie |
|---|---|---|
| **Descript** | `[~]` Layout goed, kleur afgekeurd | Zie uitgewerkte sectie "Referentie 2" hierboven — structuur (hero-zoekbalk, quick-actions, feature-cards) overnemen, donker/paars kleurenschema niet. |
| **Coda** | `[~]` Algemene layout/kleur afgekeurd ("saai en onduidelijk"), maar edit-page (Insert-paneel) expliciet goed — "heel dichtbij kunnen worden gebruikt" | Kandidaat voor Subjects/Chapters-editor. Screenshot nog niet ontvangen, sectie volgt zodra binnen. |
| **Notion** | `[!]` Afgekeurd | Sidebar te druk met te veel ruimte ertussen, standaard emoji/kleuren niet goed. Voelde "leeg en druk tegelijk" — geen kant-en-klare workspace, eerder een onaf canvas. |
| **Attio** | Niet beoordeeld | Gebruiker kon niet inloggen met Gmail-account. |
| **Linear** | `[!]` Afgekeurd | Zelfde probleem als Notion: voelt leeg en druk tegelijk, "gewoon een paar tools in een website", niet als workspace. |
| **Runway** | `[~]` Layout interessant/uniek, kleur afgekeurd | Te veel kleuren/video's, voelde "vibe coded" en niet cohesief. Structuur mag geïnspireerd zijn, kleurdichtheid niet. |
| **Framer** | `[~]` Layout "serieus interessant" maar te complex voor de hele site | Specifiek bruikbaar voor features/settings-achtige pagina's (Grades, Subject-settings), niet als basis voor de globale layout. Screenshot nog niet ontvangen. |
| **Superhuman** | `[~]` Landingpage te kleurrijk, maar layout uniek/"groot bedrijf"-gevoel. Docs-product (zie "Referentie 3" hierboven) juist wél goedgekeurd, incl. kleurgebruik | Onderscheid: marketing-site kleur afgekeurd, het daadwerkelijke Docs-product (wit canvas + AI-paneel) is een sterke referentie. |

Coda- en Framer-screenshots staan nog open; ik vul die secties aan zodra ze er zijn, maar dat blokkeert de rest niet.

---

## Volgende stappen (nog niet gestart)
1. Alle punten hierboven krijgen een status (goedgekeurd / aangepast / afgekeurd).
2. Extra referentiesites worden toegevoegd en beoordeeld.
3. Op basis van de goedgekeurde punten: concreet design system (kleurtokens, typography-schaal, spacing-schaal, radius/shadow-regels, core components: button/card/input/sidebar/topbar/skeleton/icon-stijl).
4. Design system wordt als losse mockup/artifact getoond ter goedkeuring vóórdat er in de codebase iets wordt aangepast.
5. Pas na goedkeuring: gefaseerde uitrol pagina voor pagina.

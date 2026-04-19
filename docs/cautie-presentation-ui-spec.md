
# CAUTIE Presentation Tool â€” UI Spec

Versie: 1.0  
Doel: een rustige, simpele, professionele UI voor de Presentation tool die past bij de rest van CAUTIE.

---

## 1. Productprincipe

De Presentation tool is geen editor en geen wizard met harde â€œstep 1 / step 2 / step 3â€ paginaâ€™s.

De UI werkt als Ã©Ã©n rustige page met **3 states**:

1. **Source mode**
2. **Smart settings mode**
3. **Preview mode**

De gebruiker voelt dus flow, maar ziet geen drukke multi-step wizard.

---

## 2. Hoofdregels voor de UI

### Wat de UI moet uitstralen
- clean
- rustig
- professioneel
- weinig ruis
- weinig keuzes tegelijk
- consistent met de rest van de site

### Wat de UI niet moet doen
- geen drukke sidebar met tientallen settings
- geen nep-editor met tekstvelden per slide
- geen â€œAI did this, AI did thatâ€ overload
- geen grote uitlegblokken / tips-secties
- geen overmatig visuele brainstorm-map
- geen wizard die zwaar of schools voelt

---

## 3. Pagina-structuur

## Algemene shell
Behoud de algemene website-shell:
- linker globale navigatie van CAUTIE blijft
- hoofdcontent in het midden
- geen vaste rechter-sidebar in de eerste state

### Content width
- hoofdcontent max-width: 1200â€“1320px
- horizontaal gecentreerd
- voldoende witruimte links/rechts

### Vertical rhythm
- top spacing ruim
- componenten met consistente gaps
- geen opeenstapeling van card op card op card zonder lucht

---

## 4. State model

# STATE A â€” SOURCE MODE

### Doel
Alleen bronmateriaal verzamelen en de gebruiker een onderwerp laten geven.

### Wat zichtbaar is
- page title: Presentation
- subtiele source area
- lage brede prompt bar
- bronacties: Upload, Import, Connect
- source chips / source cards
- primaire knop: Analyze

### Wat NIET zichtbaar is
- platform settings
- tone settings
- dense advanced settings
- slide editor
- preview
- title als verplicht apart veld bovenaan

---

# STATE B â€” SMART SETTINGS MODE

### Doel
Na analyse toont de tool alleen compacte, relevante settings.

### Wat zichtbaar is
- bestaande sources
- prompt blijft zichtbaar
- compacte AI analysis summary
- 4 settings groups
- primary action: Generate presentation

### Wat NIET zichtbaar is
- lange lijst met alle mogelijke toggles
- complexe editor
- per-slide content editing

---

# STATE C â€” PREVIEW MODE

### Doel
De gegenereerde presentatie tonen in read-only vorm met export/open/share acties.

### Wat zichtbaar is
- compact deck header
- thumbnail rail
- large slide preview
- action buttons
- slideshow knop

### Wat NIET zichtbaar is
- losse editing velden
- zware instellingen direct in beeld
- verwarrende generatieschermen

---

## 5. Source Mode â€” exacte layout

## Page header
Bovenaan:
- **Presentation** als paginatitel
- geen extra beschrijvende alinea
- geen tips
- geen info box

### Spacing
- top margin: 28â€“36px
- titel tot content: 20â€“28px

---

## Main source area

De source mode bestaat uit 3 visuele lagen:

### Laag 1 â€” Source canvas / source cluster area
Een rustige zone waar bronmateriaal zichtbaar wordt zodra toegevoegd.

Dit is gÃ©Ã©n zware mindmap.

### Vorm
- lege staat: subtiel leeg canvas
- zodra sources zijn toegevoegd: chips of rounded cards
- optioneel dunne verbindingslijnen tussen gerelateerde items
- hover geeft accentkleur aan card + lijn
- geen chaotisch web

### Componentvorm
Elke source card/chip toont:
- icoon
- bestandsnaam of bronnaam
- type-label
- eventueel mini status

### Source card style
- rounded-xl
- lichte border
- zachte achtergrond
- compacte hoogte
- hover = lichte accent-outline
- selected = iets duidelijker border

---

### Laag 2 â€” Prompt bar
Onderaan of midden-onder in de content area een **lage brede input bar**.

#### Inhoud
- groot tekstvlak, maar niet hoog
- input hint text:
  - â€œDescribe your presentation or add materialâ€¦â€
  - of
  - â€œWhat should this presentation be about?â€

#### Hoogte
- ongeveer 52â€“64px als single-line / auto-grow compact
- niet een enorme textarea bij start

#### Breedte
- breed, vergelijkbaar met huidige centrale breedte
- mag ongeveer 70â€“78% van de main content width innemen

---

### Laag 3 â€” Actieknoppen rond de prompt
**Links van de promptbar**
- Upload
- Import
- Connect

**Rechts van de promptbar**
- Analyze

### Knopstijl
- pill / rounded-xl
- compact
- gelijke visuele hoogte
- niet oversized
- icon + label
- zelfde baseline en spacing

### Knoppenvolgorde
Links:
1. Upload
2. Import
3. Connect

Rechts:
1. Analyze

---

## 6. Source Mode â€” behavior

### Upload
Opent lokale file picker voor:
- docs
- pdf
- images
- pptx
- spreadsheets
- text files

### Import
Opent dropdown / modal met:
- Recents
- bestaande interne bronnen
- class materials
- notes / studysets indien relevant

### Connect
Opent dropdown met connect providers.
Voor nu:
- Microsoft

Deferred \(post-launch\):
- Google
- Dropbox

### Analyze
Wordt pas primary zodra:
- er minimaal 1 source is
of
- de gebruiker prompttekst heeft ingevoerd

Disabled state:
- subtiel maar duidelijk disabled
- niet verwarrend

---

## 7. Smart Settings Mode â€” exacte layout

Zelfde pagina, geen navigatie naar aparte wizard.

Na analyze transformeert de UI.

## Bovenste zone blijft
- page title
- source cards blijven zichtbaar
- prompt bar blijft zichtbaar
- acties kleiner / secundair

---

## Nieuwe sectie: Analysis summary card

Compacte card direct onder de source area.

### Inhoud
- detected type
- detected audience
- recommended slide count
- visual potential
- optional warnings

### Voorbeeld
- Type: tutorial
- Audience: general
- Slides: 10â€“14
- Visuals: medium

### Acties
- Apply suggestions
- Fine-tune manually

### Stijl
- geen AI-marketing toon
- geen â€œour advanced AI has determinedâ€¦â€
- gewoon rustig:
  - â€œDetected from your materialâ€
  - â€œRecommended setupâ€

---

## Nieuwe sectie: Settings panel

Niet als rechter sidebar.  
Gewoon als compacte section onder de analysis card.

### Layout
2 kolommen op desktop:
- links 2 setting groups
- rechts 2 setting groups

1 kolom op small screens

---

## 8. De enige 4 settings groups die standaard zichtbaar moeten zijn

# Group 1 â€” Structure
Doel: lengte en deck-opbouw

Velden:
- Slides (slider of segmented auto/custom)
- Summary slide (toggle)
- Q&A slide (toggle)
- Speaker notes (toggle)

#### UI-regel
Niet meer dan 4 controls in deze groep.

---

# Group 2 â€” Style
Doel: taalgevoel en informatiedichtheid

Velden:
- Tone:
  - Simple
  - Academic
  - Professional
- Density:
  - Light
  - Balanced
  - Dense

#### UI-regel
Segmented controls, niet dropdowns als het weinig opties zijn.

---

# Group 3 â€” Visuals
Doel: hoeveel beeld en welke beeldbron

Velden:
- Image usage:
  - Low
  - Medium
  - High
- Visual source:
  - Source only
  - Allow internet

#### Belangrijke productregel
Hier staat nergens AI images.

---

# Group 4 â€” Output
Doel: eindformaat

Velden:
- Platform:
  - PowerPoint
  - Google Slides
- Language:
  - Dutch
  - English
  - Auto

---

## 9. Advanced settings

Advanced staat standaard dicht.

### Plaatsing
Onderaan settings panel:
- â€œMore optionsâ€
- compacte disclosure row
- geen huge accordion dump

### Mag bevatten
- references
- appendix
- citations strictness
- source priority
- use only uploaded sources
- preserve terminology

### Mag niet
- 20 irrelevante toggles
- visuele chaos
- alles open by default

---

## 10. Smart Settings Mode â€” visual hierarchy

Volgorde:

1. source area
2. prompt bar
3. analysis summary
4. settings groups
5. primary button: Generate presentation

### Generate button
- staat onder settings panel
- groot genoeg om primary te voelen
- niet los zwevend ergens bovenaan

---

## 11. Preview Mode â€” exacte layout

Hier gaat de UI naar een output-first scherm.

## Deck header
Bovenaan:
- presentation title
- deck metadata:
  - slide count
  - platform
  - type
- rechts action buttons

### Header actions
- Download .pptx
- Open / Export
- Share preview
- Start slideshow

Eventueel:
- Choose OneDrive folder als cloud export nog niet gekozen is

---

## Main preview area

2-kolom lay-out:

### Links â€” thumbnail rail
- vaste smalle kolom
- scrollbaar
- elke thumbnail met slide nummer
- actieve slide duidelijk geselecteerd
- hover subtiel

### Rechts â€” large slide viewer
- grote render van actuele slide
- gecentreerd
- goede witruimte rondom
- aspect ratio consistent
- geen editor controls

---

## Bottom action row
Herhaling van belangrijkste acties mag:
- Download
- Open in PowerPoint
- Share preview
- Start slideshow

Maar houd het compact.

---

## 12. Preview Mode â€” behavior

### Thumbnails
- klik = switch slide
- keyboard support in post-launch accessibility phase
- scroll onafhankelijk van de main slide

### Large slide
- read-only
- geen text cursor
- geen draggable boxes
- geen fake edit handles

### Slideshow
- full screen overlay
- next / previous
- esc to exit
- geen editing

---

## 13. Responsiveness

## Desktop
- volledige layout zoals hierboven

## Tablet
- source cards wrappen
- settings panel 1 kolom
- thumbnail rail smaller

## Mobile
- source cards stacked
- promptbar full width
- action buttons in row/scroll
- preview thumbnails horizontaal of collapsible
- no sidebar patterns

---

## 14. Component inventory

### Page level
- `PresentationPageShell`
- `PresentationStateView`

### Source mode
- `SourceCanvas`
- `SourceChip`
- `PromptBar`
- `SourceActions`

### Analysis/settings mode
- `AnalysisSummaryCard`
- `SettingsPanel`
- `SettingGroup`
- `AdvancedSettingsDisclosure`

### Preview mode
- `DeckHeader`
- `ThumbnailRail`
- `SlideViewer`
- `PreviewActionBar`

### Overlays / modals
- `ImportModal`
- `ConnectDropdown`
- `CloudPickerModal`
- `SharePreviewModal`

---

## 15. Component behavior spec

## PromptBar
### Props
- value
- promptHint
- onChange
- onAnalyze
- onGenerate
- mode: source | settings

### Behavior
- source mode â†’ CTA is Analyze
- settings mode â†’ CTA is Generate presentation
- compact auto-grow, max 3 lines before internal scroll

---

## SourceCanvas
### Empty state
Toont geen tips-lijst.  
Alleen subtiele lege-state copy:

- â€œAdd material to startâ€
- â€œUpload files, import recents, or connect Microsoftâ€

### Filled state
Toont source cards in clean cluster layout.

---

## AnalysisSummaryCard
### Copy style
Kort en feitelijk:
- â€œDetected from your materialâ€
- â€œRecommended setupâ€

### Niet gebruiken
- â€œOur AI engineâ€
- â€œAdvanced automationâ€
- marketing copy

---

## SettingsPanel
### Visual rule
Elke group is een rustige card:
- title
- 2â€“4 controls
- geen lange helper teksten
- alleen korte labels

---

## 16. Visual design tokens

## Radius
- cards: 20â€“24px
- buttons: 14â€“18px
- inputs: 14â€“18px

## Shadows
- zeer subtiel
- liever border + zachte contrastlaag dan zware shadows

## Borders
- licht
- consistent
- hover = accent color

## Spacing
- inner card padding: 18â€“24px
- group gap: 16â€“20px
- section gap: 20â€“28px

## Typography
- page title duidelijk maar niet oversized
- labels klein en rustig
- settings group titles medium weight
- metadata secondary

---

## 17. Content copy rules

### Buttons
Gebruik eenvoudige taal:
- Upload
- Import
- Connect
- Analyze
- Generate presentation
- Download .pptx
- Open in PowerPoint
- Share preview
- Start slideshow

### Vermijd
- technical phrasing
- overmatige AI-verwijzingen
- lange beschrijvende teksten

---

## 18. UX copy per state

## Source mode
- Title: Presentation
- Prompt hint: â€œDescribe your presentation or add materialâ€¦â€
- Empty source text: â€œAdd material to startâ€

## Settings mode
- Analysis card title: â€œDetected from your materialâ€
- Secondary label: â€œRecommended setupâ€
- Primary CTA: â€œGenerate presentationâ€

## Preview mode
- Section title: â€œPreviewâ€
- Secondary text: â€œRead-only slide preview. Editing happens in external apps.â€

---

## 19. Wat expliciet verwijderd moet worden uit de huidige versie

- grote tips box
- losse onedrive-icoon upload knop
- vaste rechter sidebar op de start state
- title/platform aan begin
- manual slide input screen
- step 1 / 2 / 3 labeling
- promptHint slide text split view
- editor-achtige interface voor slides vÃ³Ã³r generatie

---

## 20. Definitieve UX flow

### Start
Gebruiker komt op Presentation page.

Ziet:
- page title
- source canvas
- prompt bar
- Upload / Import / Connect / Analyze

### Na analyze
Zelfde page verandert naar:
- sources
- prompt
- analysis summary
- compact settings panel
- Generate presentation

### Na generate
Zelfde page verandert naar:
- preview header
- thumbnail rail
- slide viewer
- download/open/share/slideshow

Dit houdt alles simpel, rustig en logisch.

---

## 21. Design intent in Ã©Ã©n zin

De tool moet voelen als:

**â€œDrop in your material, let the system understand it, make a few calm choices, and preview a real deck.â€**

Niet als:
- editor
- wizard
- dashboard vol controls
- concept screen overloaded with AI cards

---

## 22. Harde UI-beslissing

De beste versie voor CAUTIE is:

- **geen step wizard**
- **geen editor**
- **geen settings sidebar bij start**
- **wel progressive disclosure**
- **wel Ã©Ã©n rustige page die mee-evolueert met de flow**

---

## 23. Build priority voor frontend

### V1
- Source mode UI
- Analyze transition
- Settings mode UI
- Preview mode UI

### V2
- subtiele source-link visuals
- smooth transitions
- improved import/connect modal polish
- better preview interactions

### V3
- micro-animations
- richer source clustering
- more nuanced adaptive settings

---

END


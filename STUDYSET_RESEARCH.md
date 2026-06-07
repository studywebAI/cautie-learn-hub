# Studyset UX Research — Proven Patterns from Real Products

Onderzoek van hoe echte, succesvolle producten hun workflows/configuratie-flows opbouwen.
Ik zal per product analyseren: **wat zijn de stappen, affordances, cognitive load, en waar gebeurt interactiviteit?**

---

## 1. NOTION — Template Gallery & Setup

### Hoe werkt het in werkelijkheid:

**Template Discovery:**
- Notion Home → "Saved templates" sidebar OR "Browse templates" global
- Gridview van templates (kaarten met preview-screenshot, use-count, rating)
- Zoek/filter op category (CRM, Project Management, Wiki, enz.)
- Click → fullscreen preview (left: snapshot, right: beschrijving + properties)

**Installatie:**
- "Duplicate this template" knop → directly in your workspace, no wizard
- Template kan relational databases hebben (meerdere tables) → allemaal tegelijk duplicated
- Relaties blijven intact

**Configuratie DAARNA (niet in template install flow):**
- Je opent de gedupliceerde base
- Database properties zijn al ingesteld (Status: [Not started, In progress, Done], Date, Assignee, Tags)
- Je voegt je eigen data in
- Optional: "Customize database" → edit properties, formulas, views

**Key UX moments:**
- Zero configuratie vooraf
- Alles is visual (preview screenshot, niet "select options")
- Installatie is 1 klik, niet 5 wizard-stappen
- Customization happens on-the-go, not before use

**Data types:** Database properties zijn pre-set (Select, Multi-select, Checkbox, Date, Person, etc.)

---

## 2. FIGMA — Design System Setup

### Hoe werkt het:

**Flow 1: Start with community file**
- Open "Discover" → browse design systems (Material Design, iOS, etc.)
- Duplicate file → alles (components, tokens, guidelines) kopieert
- Open je duped file
- Customize colors/typography/spacing incrementeel

**Flow 2: Build from scratch**
- Start blank file
- Create components directly (Button/Card/Input)
- Right-click → "Create component"
- Build hierarchy (Button/Primary, Button/Secondary, Button/Danger)
- Set properties (Size: Small/Medium/Large, State: Default/Hover/Active)
- Publish library → available to workspace

**Key UX moments:**
- Componenten zijn visual objects, niet form-fields
- Properties zijn setters, niet dropdowns (you pick what makes sense)
- Publishing is a final step, not a wizard
- No "configure before you use" — use first, refine later

**Data model:**
- Components have Variants (sets of properties)
- Each variant is a discrete, visual state
- Properties are keys (Size, State, Color) with discrete values

---

## 3. DUOLINGO — Learning Path Setup

### Hoe werkt het:

**For course creators (not in UI, but conceptual):**
- Lesson blocks organized in Units
- Each Unit has multiple Lesson blocks
- Lesson blocks have story (narrative arc), exercises, review

**For learners (what they see):**
- Timeline view: Week 1 Unit 1 Lesson 1 → Week 1 Unit 1 Lesson 2 → Week 2 Unit 1 Review
- Daily goal (e.g., "5 lessons") shown as progress bar
- Lessons are gated: can't start Unit 2 until Unit 1 is 80% done
- XP/hearts/streak visible

**Personalization:**
- AI tracks which exercise types you struggle with
- If you fail 3x at "listening", system gives you more listening lessons
- If you're fast, difficulty ramps

**Key UX moments:**
- Path is linear but adaptive
- No configuration UI for learners (path is opinionated, given to you)
- Progress is visible everywhere (XP counter, flame emoji, progress bar)
- Difficulty is implicit (you don't "set" it, system adjusts)

**Data model:**
- Lessons are sequences
- Exercises have difficulty (1-5)
- Learner has stats (XP, streak, weak skills)
- AI adjusts sequence based on stats

---

## 4. ANKI — Deck Configuration

### Hoe werkt het:

**Deck creation:**
- Click "Create Deck"
- Name it
- Create cards (front/back HTML)
- That's it — deck is usable immediately

**Configuration (after creation):**
- Right-click deck → "Options"
- Advanced modal with tabs:
  - **Learning**: New cards: 20/day, learning steps (1m 10m), graduating interval (1d)
  - **Review**: Max reviews/day (200), ease factor (1.3-2.5), etc.
  - **Lapses**: When you forget a card, how many times to re-show it
  - **Display**: Language, font
- These options are templates (you can create "Aggressive", "Conservative", "Chill" presets)
- Apply preset to deck

**Import/Share:**
- Download .apkg file
- Drop in, deck imports with all settings

**Key UX moments:**
- Deck creation is frictionless
- Configuration is optional (defaults work)
- When you do configure, it's technical (intervals, factors) not "pick a vibe"
- Advanced users deep-dive into algorithms; casual users ignore it
- Presets let you cargo-cult other users' settings

**Data model:**
- Card: {front, back, history[attempts, dates]}
- Deck: {cards[], config{newCardsPerDay, learningSteps, etc.}}
- Learning algorithm (SM-2) is deterministic math, not AI

---

## 5. ZAPIER — Automation Builder

### Hoe werkt het:

**Create automation (Zap):**
- Step 1: Pick trigger app (Gmail, Slack, Stripe, etc.)
- Step 2: Pick trigger event (New email, New message, New payment)
- Click "Continue"
- Step 3: Connect your account (if not already connected)
- Step 4: Configure trigger specifics (From: [your boss], Subject contains: "urgent")
- Step 5: Test trigger (fetches real data from your app)

- Step 6: Add action app (Google Sheets, Notion, Slack, etc.)
- Step 7: Pick action (Create spreadsheet row, Create page, Post message)
- Step 8: Map fields (Trigger email subject → Spreadsheet cell A1, etc.)
- Step 9: Test action (actually creates the row/page/message, then deletes it)

- Step 10: Turn on Zap

**Key UX moments:**
- Visible steps (Step 1, Step 2, ..., Step 10) on left
- Current step is big, interactive; past steps are collapsed summaries
- Test button after each config step (risk-free)
- Field mapping is drag-drop or type-to-search
- Errors are shown inline, not at the end
- Can add multiple actions (not just 1 trigger → 1 action)

**Data model:**
- Trigger outputs fields: {subject, body, from, date, ...}
- Action accepts fields: {title, description, assignee, ...}
- Mapping is explicit user choice

---

## 6. AIRTABLE — Base Templating

### Hoe werkt het:

**Start with template:**
- Airtable home → "Browse templates"
- Click template (CRM, Project tracker, Inventory, etc.)
- It opens a demo (read-only)
- "Use this template" → duplicates to your workspace
- Duplicate opens immediately, fully functional
- Schema (tables, fields, relationships) already set up

**Within the base:**
- Multiple tables visible as tabs (Contacts, Companies, Deals)
- Each table is a grid with columns (field types)
- Field types: Text, Number, Select, Lookup, Rollup, Formula, Attachment, etc.
- Views: Grid, Calendar, Gallery, Kanban, Form, etc. (same data, different UI)

**Customization:**
- Click field header → edit field type/options
- Right-click table → edit schema
- Create new field on the fly (click + at end of columns)
- Relationships are visual: create Link field in Table A, it auto-creates reverse link in Table B

**Key UX moments:**
- No wizard for schema setup (template provides it)
- Customization is incremental and visual (not modal-based)
- Multiple views of same data (grid/calendar/kanban) without re-mapping
- Relationships are bidirectional by default
- You can add/remove fields while viewing data

**Data model:**
- Base has Tables
- Tables have Fields (with types and config)
- Fields can be Lookup/Rollup (computed from related records)
- Views are queries + presentation of same data

---

## 7. VERCEL — Deployment Flow

### Hoe werkt het:

**For a new project:**
- Import repo (GitHub/GitLab) → Vercel scans package.json
- Auto-detects framework (Next.js, React, Vue, etc.)
- Shows detected build settings (Framework: Next.js, Build command, Output directory)
- Option to override if wrong
- Set environment variables (if needed)
- Click "Deploy"
- Live log of build process (you see compilation, errors in real-time)
- Deployment complete → gets a URL

**For configuration:**
- Project settings (domain, environment, git) are separate screens, not in deploy wizard
- Redeploy is 1-click (no reconfiguration needed)

**Key UX moments:**
- Detection is automatic (framework, build command)
- Wizard is minimal (3-4 steps, not 10)
- Configuration is optional (defaults work for 90% of cases)
- Build log is transparent (you see what's happening)
- Errors are shown immediately, not silently

**Data model:**
- Project: {repo, buildSettings, envVars, domain}
- Build: {status, logs[], output}
- Deployment: {buildID, URL, timestamp}

---

## 8. ChatGPT — Conversation System

### Hoe werkt het:

**Start conversation:**
- Click "New chat"
- Blank canvas
- You type a prompt
- AI responds
- You can follow up, refine, ask clarifications

**Context building (implicit):**
- Each message is added to conversation history
- AI has full context of all prior messages
- You don't "configure" context; it's automatic

**Advanced features:**
- System message (you can set custom instructions for the whole conversation)
- Conversation title auto-generated after a few exchanges
- Search past conversations
- Pin/archive conversations
- Share conversation as link

**Key UX moments:**
- Zero setup: just start typing
- Context grows naturally with conversation
- System message is optional power-user feature
- Conversation is the only "unit" (no nested structure)
- You can branch a conversation (continue from old message, creating a new thread)

**Data model:**
- Conversation: {messages[], systemMessage?, title}
- Message: {role: "user"/"assistant", content, timestamp}
- Branching: conversation tree (one message can spawn multiple continuations)

---

## 9. TYPEFORM — Form Logic & Routing

### Hoe werkt het:

**Create form:**
- Start blank
- Add questions one by one (drag-drop or "Add question")
- Set question type (short text, multiple choice, rating, etc.)
- Question appears as a card

**Add logic (branching):**
- Right-click question → "Add logic"
- Modal: "If answer is [choice], jump to [question]"
- Can skip questions, jump to end, show/hide fields
- Visual: logic rules shown as small chip below the question card

**Conditional fields:**
- "Show this question only if previous answer was X"
- Set up without re-ordering questions (logic handles order)

**Key UX moments:**
- Questions are cards, not rows (better readability)
- Logic is added per-question, not as separate "logic editor"
- Logic rules are visible but not intrusive
- Preview mode shows actual user journey (you can test the branching)
- No code needed; all visual

**Data model:**
- Form: {questions[], rules[]}
- Question: {type, label, options[], id}
- Rule: {ifQuestion, ifAnswer, thenJumpTo/show/hide}

---

## 10. ADOBE LIGHTROOM — Presets & Workflows

### Hoe werkt het:

**Photography workflow:**
- Import photos from camera
- Develop panel shows sliders: Exposure, Contrast, Saturation, etc.
- You adjust sliders live (photo updates in real-time)
- Save adjustments as "Preset" (Lightroom saves the slider values)
- Apply preset to another photo (all sliders adjust instantly)

**Preset library:**
- Left sidebar: built-in presets (B&W, Landscape, Portrait, etc.)
- Click preset → it applies
- You can further tweak sliders
- Save your tweaks as new custom preset

**Sync:**
- Develop photo #1, save as preset
- Select photo #2, right-click → "Copy settings from #1"
- All settings copy over
- Refine photo #2, save as new preset

**Key UX moments:**
- Sliders are the primary UI (not buttons/dropdowns)
- Live preview of every change
- Presets are bundles of slider values, not mysterious filters
- You can apply preset then override individual sliders
- Batch operations (sync to 50 photos) are non-destructive

**Data model:**
- Photo: {originalFile, adjustments{exposure, contrast, saturation, ...}}
- Preset: {name, adjustments{values}}
- Applying preset = merge preset values into photo adjustments

---

## 11. SPACED REPETITION THEORY (for Studyset context)

### Key concepts:
- **Forgetting curve (Ebbinghaus):** You forget 50% of new info in 1 day, 70% in 1 week
- **Optimal review intervals:** Review again at 1 day, 3 days, 7 days, 14 days, 30 days (roughly)
- **Difficulty adjustment:** If you nail a card, wait longer before showing again; if you fail, show sooner
- **Lapse handling:** Cards you failed on need more frequent reviews (they're "lapses")
- **SRS algorithm (SM-2):** Based on user's rating (Again/Hard/Good/Easy), adjust interval and difficulty

### Why it matters for Studyset:
- Scheduling shouldn't be manual
- Settings (new cards/day, review cards/day, intervals) should have smart defaults
- User shouldn't think about "when to review"; system handles it
- BUT user should understand WHY they're seeing this card today (because they failed it 2 days ago)

---

## Summary: Patterns I see across these 11 products

| Product | Discovery | Config | Use | Adaptation |
|---------|-----------|--------|-----|-----------|
| **Notion** | Browse templates, click | Zero upfront; later | Immediately after dupe | None (user-driven) |
| **Figma** | Duplicate community file | Components are visual | Drag components | Variants, not presets |
| **Duolingo** | Path is given | None (opinionated) | Implicit progression | AI adjusts path |
| **Anki** | Create deck | Optional (preset presets) | Immediately | Difficulty factor adjusts |
| **Zapier** | Pick trigger/action | Step-by-step, tests | Turn on | None; re-edit if needed |
| **Airtable** | Browse templates | Visual, incremental | Immediately | Forms, filters, views |
| **Vercel** | Repo scan | Auto-detect, then override | Deploy button | Env vars, redeploy |
| **ChatGPT** | Start blank | System message (optional) | Type first message | Implicit context growth |
| **Typeform** | Start blank | Logic per-question | Preview before publish | Branching visible |
| **Lightroom** | Upload photos | Sliders (live preview) | Apply preset | Presets are layerable |
| **Anki SRS** | — | Intervals, difficulty | Study session | SM-2 algorithm |

---

## Key Takeaways for Studyset Flows

1. **Zero-config is powerful** (Notion, ChatGPT, Duolingo) — set a good default, let power users customize later
2. **Visual, not modal-based** (Figma, Typeform, Lightroom) — card-based, drag-drop, live preview
3. **Testing is key** (Zapier) — don't let user go live without seeing real data
4. **Incremental is better than upfront** (Airtable) — add complexity as you go
5. **Smart defaults + transparency** (Anki, Lightroom) — show the math/logic, let users understand
6. **Presets are powerful** (Lightroom, Anki) — bundle settings, reuse, remix
7. **Branching/conditional logic is UI not a flow** (Typeform) — don't force linear wizard
8. **Adaptation can be implicit** (Duolingo, Anki SM-2) — system adjusts invisibly based on behavior
9. **Context/history matters** (ChatGPT, Lightroom sync) — remember what you've done

---

## Now: How do I apply this to Studyset?

**Key insight:** Studyset isn't just "make a flow, configure it, use it." It's:
1. **Discover** (what stof do I have? what exam is coming?)
2. **Plan** (how much time? what tools?)
3. **Configure** (which tools? what settings per tool?)
4. **Generate** (AI builds the actual study materials)
5. **Study** (SRS algorithm, adapts)
6. **Analyze** (see what's working, adjust)
7. **Iterate** (new version, refine)

Each flow should emphasize a different step and have fundamentally different UX paradigms.

**Next: Design 5-7 completely different flows for Studyset creation, each inspired by one of these products' paradigms.**

# 🎓 Cautie Study Tools - Real Settings & Customization Guide
**Based on: Competitor analysis, user reviews, forums, and educational research**

---

## 📋 TABLE OF CONTENTS
1. [Flashcards Tool](#flashcards-tool)
2. [Notes Tool](#notes-tool)
3. [Quiz Tool](#quiz-tool)
4. [Mindmap Tool](#mindmap-tool)
5. [Timeline Tool](#timeline-tool)
6. [Global Settings](#global-settings)

---

## FLASHCARDS TOOL
*Based on: Anki, Quizlet, SuperMemory, and research on spaced repetition effectiveness*

### ⚙️ MODES (Study Approaches)

#### Mode 1: **Learn Mode** (Default for new cards)
- Shows card → click to reveal answer
- Tracks if you got it right/wrong/hard
- Adapts difficulty based on your performance
- **Why it works**: Active recall increases retention 50% vs. passive reading

**Settings within Learn Mode:**
- `New Cards Per Day` - How many new cards to introduce (default: 20, range: 1-100)
  - *Why*: Med students increase to 50-100; language learners keep 10-20
- `Learning Steps` - How soon to show card again (default: 25 min → 1 day)
  - *Example*: 25 minutes, 4 hours, 1 day, 3 days
  - *Why*: Spacing retrieval practice prevents forgetting
- `Graduating Interval` - When card "graduates" to review (default: 1 day)
  - *Recommendation*: 3-4 days (users increase this; 1 day too aggressive)
- `Easy Interval` - When you click "Easy," jump to this interval (default: 4 days)
  - *Recommendation*: 7+ days (users customize heavily)
- `Maximum Interval` - Cap how long card can stay out (default: 36,500 days)
  - *Recommendation*: 120-180 days for exam prep

#### Mode 2: **Spaced Repetition Review**
- Reviews cards due today based on algorithm
- Learns optimal spacing for YOUR memory
- **Why it works**: Scientifically proven 6-10% exam score improvement

**Settings:**
- `Algorithm Type` - Which scheduling algorithm
  - `SM-2` (Classic, default) - Simple but effective
  - `FSRS` (Modern) - Optimized for spacing, uses ML, 15-20% better retention
  - `Leitner` (Simple) - 3-level system, good for beginners
  - *Why it matters*: FSRS analyzes your difficulty rating to predict when you'll forget; SM-2 is easier to understand
- `Interleaving Mode` - How to order cards
  - `Sequential` - Study in order added
  - `Random` - Shuffle all cards (scientific studies show random is 20% better for retention)
  - `Mixed Topics` - Alternate between different subjects (prevents blocking)
  - *Why it works*: Interleaving builds long-term retention better than blocked practice
- `Daily Review Limit` - Max cards to review today (default: unlimited)
  - *Recommendation*: 200+ cards/day for serious learners; 50-100 for casual
- `Minimum Interval Between Reviews` - Don't repeat same card (default: 1 day)

#### Mode 3: **Test Mode** (Exam Simulation)
- Timed practice test with different question types
- Shows score at end
- Tests random selection of cards

**Settings:**
- `Time Limit` - Minutes for entire test (0 = no limit)
  - *Recommendation*: Match your actual exam duration
- `Number of Questions` - How many cards (default: 20, range: 5-200)
- `Question Types Included`
  - ☐ Multiple choice
  - ☐ Written answer
  - ☐ True/False
  - ☐ Matching
  - ☐ Cloze deletion (fill-in-blank)
- `Difficulty Filter` - Only include:
  - ☐ All cards
  - ☐ Cards you've struggled with (hard cards only)
  - ☐ Cards due for review
  - ☐ Recent cards only
- `Show Answers Timing` - When to reveal correct answer
  - `After Each Question` - Feedback is immediate
  - `After All Questions` - Test yourself fully first (harder, better learning)
  - `Never Show` - Self-grade mode (hardest, most realistic)
- `Shuffle Options` - Randomize answer positions (multiple choice)

#### Mode 4: **Quick Drill** (Speed Mode)
- Rapid-fire flashcard flipping
- No time per card (you control pace)
- Streak counter
- **Why it works**: Builds automaticity and speed

**Settings:**
- `Show Streak Counter` - Yes/No (visible counter increases motivation)
- `Sound Effects` - Flip sound/correct sound
  - *Note*: Most users toggle OFF (distracting)
- `Card Preview` - Show card front for X seconds before you flip
  - Default: 0 sec, Range: 0-5 sec
- `Color Feedback` - Green/Red highlight for correct/wrong
  - Toggle On/Off

---

### 🎨 GLOBAL FLASHCARD SETTINGS

#### Card Customization
- **Card Display**
  - Front size: Small / Medium / Large
  - Back size: Small / Medium / Large
  - Font: Default / Serif / Monospace
  - Font color: Auto (based on theme) / Custom
  - Card background: Theme color / White / Custom color

- **Card Types Available**
  - ☐ Basic (front/back)
  - ☐ Cloze Deletion (fill blank: "The capital of France is {{Paris}}")
  - ☐ Image Occlusion (hide parts of image, click to reveal)
  - ☐ Multiple choice with images
  - ☐ Matching pairs
  - ☐ Listening comprehension (audio + transcription)

#### Review Settings
- **Keyboard Shortcuts** - Enable/disable quick key navigation
  - `Spacebar` = Show answer
  - `1` = Wrong
  - `2` = Hard
  - `3` = Good
  - `4` = Easy
- **Notification Settings**
  - ☐ Remind me daily at [time] (toggle OFF to disable - users hate coercion)
  - ☐ Show streak notifications
  - ☐ Encourage review notifications
  - *Default*: All OFF (let users enable what they want)

#### Data & Export
- **Statistics Dashboard**
  - Review history calendar (heatmap)
  - Retention rate graph
  - Time spent tracking
  - Card stability curve (FSRS)
  - Ease factor history
- **Export Options**
  - CSV download
  - Anki format (.apkg)
  - PDF flashcards
  - JSON (raw data)

---

## NOTES TOOL
*Based on: Notion, Obsidian, OneNote; Student survey data*

### ⚙️ MODES (Organization Styles)

#### Mode 1: **Structured Notes** (Organized & Hierarchical)
- Parent note → Child notes → Sub-sections
- Perfect for: Lecture notes, textbook chapters, hierarchical subjects
- **Why it works**: Students organize by module/week/topic

**Settings within Structured:**
- `Folder Structure`
  - ☐ Flat (all notes in one folder)
  - ☐ Nested (Course → Week → Lecture)
  - ☐ Subject-based (Chemistry → Organic → Chapter 5)
- `Show Breadcrumb Navigation` - Yes/No (shows path: Home > Biology > Genetics)
- `Auto-numbering Sections` - Yes/No (1., 1.1, 1.2)
- `Collapsible Sections` - Yes/No (hide subsections to reduce clutter)
- `Default New Note Template` - Choose template (blank, Cornell, outline)

#### Mode 2: **Cornell Notes** (For Lectures)
- Split screen: Notes on right, Questions on left, Summary at bottom
- Specifically designed for classroom note-taking
- **Why it works**: Forces active processing during lecture + review later

**Settings within Cornell:**
- `Question Width Ratio` - How much space for questions (default: 30%)
  - Range: 20-50%
- `Summary Height` - Space for summary section at bottom (default: 15%)
- `Show Time Stamps` - Add timestamp to each note section
  - Yes/No (helpful for finding where you were during lecture)
- `Auto-save Interval` - Save every X seconds (default: 30 sec)
  - *Why*: Prevents data loss in classroom interruptions

#### Mode 3: **Outline Notes** (Hierarchical Bullet Points)
- Nested bullet points with collapsible sections
- Perfect for: Textbooks, dense lectures, research compilation
- **Why it works**: Creates clear hierarchy of information importance

**Settings within Outline:**
- `Bullet Style` - Circle / Square / Dash / Number
- `Auto-indent Depth` - How many levels deep allowed (default: 10)
- `Show Block Numbers` - Timestamp or ID for each block
  - *Why*: Easy reference ("See block 3.2.1")
- `Fold All at Depth X` - Auto-collapse everything below level N when opening
  - Example: Fold at depth 2 = see only headings, subheadings
  - *Why*: Helps navigate dense notes
- `Link to Headings` - Auto-create internal anchor links
  - Click link → jumps to that section

#### Mode 4: **Knowledge Graph** (Obsidian-style)
- Visual network of interconnected notes
- Shows relationships between ideas
- **Why it works**: Students studying interconnected topics (biology, history, philosophy)

**Settings within Knowledge Graph:**
- `Show Connections By`
  - `[[wikilinks]]` - Manual links you create
  - `Tags` - Notes with same tag auto-connect
  - `Backlinks` - Show notes that link TO this note
  - `All of above` - Maximum connection visibility
- `Filter By Topic Tag` - Show only notes with tag #biology
- `Node Size By`
  - `Importance` (manually set)
  - `Number of connections` (highly connected = bigger)
  - `Date modified` (recent = bigger)
- `Force Physics Simulation` - Yes/No
  - Yes = nodes repel/attract (dynamic, pretty)
  - No = fixed layout (faster)

---

### 🎨 GLOBAL NOTES SETTINGS

#### Note Editor
- **Formatting Toolbar**
  - ☐ Bold, Italic, Underline (always visible)
  - ☐ Heading options (H1, H2, H3)
  - ☐ Lists (bullet, numbered)
  - ☐ Code blocks, tables, quotes
  - ☐ Insert image, link, file
  - ☐ Minimal (hide toolbar, use Markdown shortcuts instead)

- **Typography**
  - Font: Default / Serif / Monospace / Sans-serif
  - Size: Small (12px) / Medium (14px) / Large (16px)
  - Line spacing: Tight / Normal / Spacious
  - Paragraph spacing: Compact / Normal / Loose

- **Handwriting & Annotation** *(If stylus support)*
  - Pen tool: Always visible / Hidden by default
  - Pen pressure sensitivity: On/Off
  - Pen thickness: Thin / Medium / Thick
  - Pen colors: Quick access to 5 colors (user-selectable)
  - Background: Lined / Dotted / Blank / Graph paper

#### PDF Annotation *(If PDF upload)*
- **Annotation Tools**
  - ☐ Highlight (color: yellow/green/pink/blue/custom)
  - ☐ Underline
  - ☐ Strike-through
  - ☐ Notes/comments
  - ☐ Draw/freehand markup
- **PDF Display**
  - Zoom: Fit page / Fit width / Custom %
  - Single page / Double page view
  - Show/hide annotations by type

#### Organization
- **Search & Filtering**
  - Quick search (Cmd+K / Ctrl+K)
  - Filter by date, tag, type
  - Saved searches / favorites
- **Tags**
  - Auto-suggest tags you've used
  - Nested tags: #semester/fall2025
  - Color code by tag
- **Sort Options**
  - Name (A-Z)
  - Date created
  - Date modified
  - Size

#### AI Features (If Available)
- ☐ Auto-summarize this note
- ☐ Generate quiz from this note
- ☐ Auto-generate flashcards
- *Note*: These should be optional, not default

#### Collaboration (If Enabled)
- ☐ Share with specific users (read-only / can edit)
- ☐ Public link (read-only)
- ☐ Real-time collaboration notification
- Comment/discussion thread on notes

#### Backup & Export
- Auto-backup every X hours (default: 1 hour)
- Export as: PDF / Word / Markdown / HTML
- Cloud sync: On/Off with interval (Every 5 min / 15 min / 1 hour)

#### Offline Mode
- ☐ Available offline (keep notes synced locally)
- `Sync on reconnect` - Auto-upload when internet returns

---

## QUIZ TOOL
*Based on: Quizlet (before paywall), Duolingo, Kahoot; User preferences*

### ⚙️ MODES (Study Approaches)

#### Mode 1: **Learn Mode** (Adaptive)
- Shows question → you answer → immediate feedback
- Difficulty adapts based on your performance
- **Why it works**: Struggling questions appear more often; easy questions graduate faster**Settings within Learn:**
- `Difficulty Progression`
  - `Adaptive` (AI adjusts based on performance)
  - `Fixed Easy` (always easy questions)
  - `Fixed Medium` (same difficulty)
  - `Fixed Hard` (challenging)
- `Answer Format Variety`
  - ☐ Multiple choice (4 options)
  - ☐ True/False
  - ☐ Written answer (you type)
  - ☐ Matching pairs
  - ☐ Drag & drop
- `Show Hints`
  - ☐ No hints
  - ☐ Available (click "Hint" to see)
  - ☐ Auto show hint after X seconds
- `Feedback Timing`
  - `Immediate` - Tell you right/wrong after each question
  - `Delayed` - Wait until end of session
  - `Minimal` - Just show answer, no explanation
- `Question Randomization`
  - ☐ Sequential order
  - ☐ Fully random
  - ☐ Grouped by topic then random within group

#### Mode 2: **Test Mode** (Exam Simulation)
- Timed test with fixed difficulty
- No immediate feedback (shows score at end)
- **Why it works**: Simulates real exam pressure; high-stakes recall

**Settings within Test:**
- `Time Limit` - Minutes for test (0 = untimed)
  - *Recommendation*: Match your actual exam (AP exam = 50 min, etc.)
- `Number of Questions` - Fixed (e.g., 20 questions)
- `Answer Reveal`
  - `Never` - Self-grade at end (hardest, most realistic)
  - `Show at end` - See all answers after submitting
  - `Show immediately` - Learn with each answer (easier)
- `Penalty for Wrong Answers`
  - ☐ No penalty (points don't decrease)
  - ☐ 10% penalty per wrong answer
  - ☐ -50% correct points per wrong (SAT-style)
- `Passing Score` - Show green/red (e.g., 80% to pass)
  - Range: 0-100%
- `Show Difficulty` - Display "Easy/Medium/Hard" label per question
  - Yes/No (helps calibrate self-assessment)
- `Allow Review After**
  - ☐ Cannot review (like real SAT)
  - ☐ Can review answers (no changing)
  - ☐ Can change answers (easiest)

#### Mode 3: **Match Mode** (Speed Game)
- Rapidly match terms to definitions
- Timed challenge (race against clock)
- Score based on speed + accuracy
- **Why it works**: Builds automaticity; high engagement; gamified

**Settings within Match:**
- `Time Limit` - Seconds total (default: 180 sec)
- `Show Score Feedback` - Combo meter (2x, 3x multiplier for streaks)
  - Yes/No (users like this for motivation)
- `Sound Effects`
  - ☐ Correct/wrong sounds
  - ☐ Completion bell
  - ☐ Ambient background (timer tick)
  - *Default*: OFF (users find distracting)
- `Show Timer`
  - Yes (visible countdown)
  - No (hidden, surprise at end)

#### Mode 4: **Flashcard Quick Review**
- Simple flip cards in random order
- No right/wrong (just review)
- **Why it works**: Casual review, less pressure

**Settings:**
- `Card Speed`
  - You control (click to flip)
  - Auto-advance after X seconds (1-5 sec)
- `Show Question First` - Yes/No
  - Yes = try to remember answer before flipping
  - No = answer visible, you check yourself
- `Shuffle Cards` - Yes/No
- `Repeat Wrong Cards` - Yes/No
  - If yes: cards you say "wrong" to get recycled at end

---

### 🎨 GLOBAL QUIZ SETTINGS

#### Scoring & Feedback
- **Score Display**
  - Show/hide overall percentage
  - Show question-by-question breakdown
  - Show time per question
- **Explanations**
  - Show explanation after each wrong answer (if author provided)
  - Show sources/references
- **Streak Tracking**
  - ☐ Show current streak (2x, 3x bonuses)
  - ☐ Show best streak
  - *Note*: If enabled, also allow "Freeze" to prevent losing streak (burnout prevention)

#### Difficulty Settings
- **Difficulty Filter**
  - ☐ All questions
  - ☐ Only questions you've missed
  - ☐ Only recent questions
  - ☐ Only hard-rated questions
  - ☐ Only questions not yet attempted
- **Question Bank Size**
  - Default: All questions
  - Or: Last 25/50/100 questions added

#### Question Types
- **Text-based**
  - ☐ Multiple choice
  - ☐ True/False
  - ☐ Short answer (you type)
  - ☐ Matching
- **Visual-based** *(if supported)*
  - ☐ Image-based multiple choice
  - ☐ Drag-drop on image
  - ☐ Label diagram
- **Audio** *(if supported)*
  - ☐ Listen and answer
  - ☐ Listen and type transcription

#### Notifications & Reminders
- ☐ Daily reminder to study (time: set by user) **[TOGGLE OFF DEFAULT]**
- ☐ Notify when streak at risk (24h away)
- ☐ Notify when new questions added
- *Default*: All OFF to avoid coercion

#### Performance Tracking
- **Statistics Available**
  - Daily accuracy graph
  - Questions by difficulty (pie chart)
  - Time per question average
  - Mastery by topic
- **Export Reports**
  - PDF report (printable)
  - CSV (for teacher review)

#### Social & Gamification (Optional)
- **Leaderboards**
  - ☐ Disable entirely
  - ☐ Friends only (private)
  - ☐ Class-wide (if classroom feature)
  - ☐ Public (all users)
  - *Note*: Users report anxiety from public leaderboards; many disable
- **Sharing**
  - ☐ Allow sharing score
  - ☐ Show to friends only
  - ☐ Social media share option
  - *Default*: Disabled (privacy)

#### Challenge Mode (Optional Feature)
- **House/Team System**
  - Assign to house (Gryffindor-style)
  - Weekly team competition points
  - *Why it works*: Duolingo users increase engagement 3x with team
  - *But*: Make optional to prevent coercion

---

## MINDMAP TOOL
*Based on: MindMeister, Coggle, XMind, Preceden; User research*

### ⚙️ MODES (Map Types)

#### Mode 1: **Radial Mind Map** (Classic Center-Out)
- Central concept with branches radiating outward
- Perfect for: Brainstorming, concept analysis, study organization
- **Settings:**
  - `Max Depth` - How many levels deep (default: 5, range: 1-10)
  - `Branch Thickness` - Thin/Medium/Thick
  - `Auto-layout` - Yes/No (auto-arrange nodes)
    - Yes = automatic positioning (neat)
    - No = manual positioning (creative freedom)
  - `Show Connecting Lines` - Yes/No
  - `Curve Connections` - Straight / Curved / Bezier

#### Mode 2: **Fishbone Diagram** (Cause-Effect)
- Left side: causes, Right side: effects
- Perfect for: Problem analysis, biology (species traits), history causation
- **Settings:**
  - `Left Branch Label` - "Causes" / "Problems" / Custom
  - `Right Branch Label` - "Effects" / "Solutions" / Custom
  - `Show Main Spine` - Yes/No
  - `Branch Angle` - How steeply angled (45° / 60° / 90°)

#### Mode 3: **Timeline Map** (Chronological)
- Events arranged left-to-right chronologically
- Perfect for: History, project timelines, evolution of ideas
- **Settings:**
  - `Time Scale` - Years / Months / Weeks / Days
  - `Show Date Labels` - Yes/No
  - `Event Size` - Same size / Size by importance
  - `Vertical Stacking` - Stack events vertically or single line

#### Mode 4: **Organizational Chart** (Hierarchy Tree)
- Top-down hierarchy (CEO → departments → teams)
- Perfect for: Government structure, company org, classification
- **Settings:**
  - `Flow Direction` - Top-down / Left-right / Bottom-up
  - `Connector Type` - Straight / Curved / Angular
  - `Show Hierarchy Level** - Yes/No (label: L1, L2, L3)
  - `Box Style` - Rectangle / Circle / Rounded / Diamond

#### Mode 5: **Logic Diagram** (Flowchart)
- Boxes with Yes/No branches, decision points
- Perfect for: Study processes, troubleshooting, procedures
- **Settings:**
  - `Shape Library` - Rectangle / Diamond (decision) / Oval (start/end) / Parallelogram (input/output)
  - `Connector Types` - Straight / Curved with labels ("Yes"/"No")
  - `Show Grid** - Yes/No (helps alignment)
  - `Snap to Grid** - Yes/No

---

### 🎨 GLOBAL MINDMAP SETTINGS

#### Node Customization
- **Node Style**
  - Shape: Circle / Rectangle / Rounded / Diamond / Oval
  - Size: Auto / Small / Medium / Large / Custom
  - Font: Default / Serif / Monospace
  - Font size: 10px - 24px
- **Node Colors**
  - 1-Click color (20 presets)
  - Custom color picker
  - Auto-color by depth (gradients)
  - Auto-color by topic (tag-based)
- **Node Icons**
  - 4,600+ icon library (Preceden style)
  - Search icons: "biology" → 50 biology-related icons
  - Custom emoji support
  - No icon (text only)

#### Branching & Connections
- **Branch Styling**
  - Color: Auto / Pick color / Gradient
  - Thickness: Thin / Medium / Thick
  - Style: Solid / Dashed / Dotted
  - Connection curves: Straight / Smooth curves / Angular
- **Relationship Labels**
  - Label text on connections (e.g., "causes" "leads to")
  - Auto-hide small labels at zoom level
  - Font size for labels
- **Depth-Based Colors**
  - ☐ All same color
  - ☐ Color by depth (level 1 blue, level 2 green, etc.)
  - ☐ Custom color per topic

#### Layers & Organization
- **Multiple Layers**
  - Create separate layers (Civil War → Union perspective, Confederate perspective)
  - Toggle layers on/off
  - Each layer has own color
- **Filtering**
  - Show only nodes with tag #important
  - Hide nodes with tag #review
  - Show only depth 1-2

#### Zoom & Navigation
- **Zoom Options**
  - Fit to screen
  - Zoom to node (double-click)
  - Pan around map (click-drag)
  - Keyboard shortcuts (+ / - for zoom)
  - Minimap (small preview, click to jump)
- **Focus Mode**
  - Focus on one node, fade rest (helps with complexity)
  - Center selected node

#### Collaboration (If Enabled)
- **Real-time Editing**
  - ☐ Share link (read-only)
  - ☐ Share with edit permission
  - Show collaborators cursors (who's editing where)
  - Comment threads on nodes
- **Version History**
  - Save snapshots
  - Revert to previous version

#### Export & Presentation
- **Export Formats**
  - PNG image
  - PDF (fit to page)
  - SVG (vector, editable)
  - PowerPoint slide
  - CSV/JSON (raw data)
  - HTML interactive
- **Presentation Mode**
  - Full-screen slideshow
  - Reveal nodes one-by-one (for teaching)
  - Speaker notes per node
  - Timer (for timed presentations)

#### Background & Theme
- **Map Background**
  - White / Light gray / Dark
  - Image upload (custom background)
  - No background (transparent)
- **Grid**
  - ☐ Show grid
  - Grid size: Small / Medium / Large
  - Snap to grid: On/Off

---

## TIMELINE TOOL
*Based on: Preceden, Timeglider, TIMELINE.js; Educational use*

### ⚙️ CORE FEATURES

#### Timeline Display
- **Event Placement**
  - Drag-drop events on timeline
  - Adjust start/end dates
  - Auto-layout or manual positioning
- **Time Scale (Zoom Levels)**
  - Millennia (large history spans)
  - Centuries (ancient history)
  - Decades (20th century focus)
  - Years (detailed events)
  - Months (project timelines)
  - Weeks (sprint planning)
  - Days (daily event logs)
- **Navigation**
  - Horizontal timeline scroll
  - Jump to specific date (calendar picker)
  - First event / Last event buttons
  - Zoom in/out buttons

---

### 🎨 EVENT CUSTOMIZATION

#### Event Styling
- **Event Display**
  - Short title + description
  - Date range (start - end)
  - Icon selection (4,600+ icons like Preceden)
  - Color coding
  - Size indicator (important = bigger bubble)
  - Image thumbnail
  - Tags/categories
- **Event Details**
  - Expandable description (click to read more)
  - Attached images/media
  - Related documents/links
  - Historical sources/citations

#### Event Types
- **Category Tags**
  - ☐ Political
  - ☐ Military
  - ☐ Cultural
  - ☐ Scientific
  - ☐ Social
  - ☐ Economic
  - ☐ Custom tags
- **Color by Category**
  - Political = Red
  - Military = Blue
  - Cultural = Green
  - (User customizable)

---

### 🎯 FILTERING & LAYERS

#### Multiple Timelines (Layers)
- **Create Parallel Views**
  - Civil War: Union perspective (top track)
  - Civil War: Confederate perspective (middle track)
  - Civil War: Civilian impact (bottom track)
  - Toggle layers on/off
- **Filtering**
  - Show only events with tag #important
  - Hide tag #review
  - Filter by date range
  - Filter by category

#### Event Connections
- **Show Relationships**
  - Draw line between "Cause" → "Effect"
  - Label connection: "triggers", "causes", "leads to"
  - Show all connected events (highlight chain)

---

### 📊 TIMELINE DATA & EXPORT

#### Visualization Options
- **Standard Timeline** - Events on horizontal line
- **Vertical Timeline** - Events stacked vertically (mobile-friendly)
- **List View** - Chronological list with dates
- **Card View** - Grid of event cards
- **Map View** - Events placed on geographic map (if location data)

#### Display Settings
- **Label Density**
  - All labels visible
  - Automatic (hide overlapping labels)
  - Click to show label
- **Bubble Size**
  - Uniform size
  - Size by importance (user sets)
  - Size by duration
- **Background Shading**
  - By era (gray background for "Dark Ages")
  - By category color
  - No background

#### Export Formats
- PNG image
- PDF (print-friendly)
- CSV (dates, titles, descriptions)
- PowerPoint slide deck
- Interactive HTML
- JSON (raw data)

#### Sharing & Collaboration
- Public link (read-only)
- Share with specific users
- Embed timeline on website
- Download as presentation

---

## GLOBAL SETTINGS
*Applied across all tools*

### 🌙 THEME & APPEARANCE
- **Color Scheme**
  - ☐ Light mode
  - ☐ Dark mode
  - ☐ System default (follow device setting)
  - ☐ Auto dark mode (sunset-to-sunrise)
- **Accent Color** - Choose brand color for highlights
  - Blue / Green / Purple / Orange / Red / Custom
- **Font Family**
  - Default / Serif / Monospace / Sans-serif
- **Font Size**
  - Small (12px) / Normal (14px) / Large (16px) / XL (18px)
- **Reduce Motion**
  - ☐ Animate transitions
  - ☐ Reduce/disable animations (accessibility)
- **High Contrast Mode**
  - ☐ Standard
  - ☐ High contrast (better for dyslexia)

### ⏱️ STUDY REMINDERS & NOTIFICATIONS
**DEFAULT: ALL OFF** (let users opt-in; prevents dark patterns)
- ☐ Daily study reminder
  - Time: [picker]
  - Frequency: Daily / Weekdays only / Custom days
- ☐ Review due reminder
  - "You have 20 cards due today"
  - Time: Custom
- ☐ Streak notifications
  - "You're on a 5-day streak!"
  - Disable after X days (prevent obsession)
- ☐ Streak freeze warning
  - "Streak at risk in 24 hours"
  - Allow free "freeze" (1/week) to prevent losing streak
- ☐ Achievement notifications
  - "Mastered 50 flashcards!"

### 💾 BACKUP & SYNC
- **Auto-backup Frequency**
  - Every 5 minutes
  - Every 15 minutes
  - Every 1 hour
  - Manual only
- **Cloud Sync**
  - Continuous (real-time)
  - Interval-based (every X minutes)
  - Manual sync
  - Offline-first (sync when reconnected)
- **Offline Availability**
  - ☐ Sync some tools for offline
  - ☐ Sync all tools for offline
  - ☐ No offline (always-online requirement)

### 🔍 SEARCH & ORGANIZATION
- **Search Behavior**
  - Global search (Cmd+K / Ctrl+K)
  - Search recent / all
  - Fuzzy search (typo-tolerant)
- **Tags**
  - Display as: Pills / Badges / List
  - Auto-suggest used tags
  - Nested tags: #biology/genetics

### 📊 STATISTICS & TRACKING
- **Learning Analytics Dashboard**
  - Daily streak counter
  - Total time studied (this week/month)
  - Cards/notes created
  - Cards reviewed
  - Accuracy percentage
- **Detailed Metrics** (Per Tool)
  - Flashcards: Retention rate, ease factor, interval distribution
  - Notes: Words written, sections created
  - Quiz: Accuracy by topic, improvement over time
  - Mindmap: Nodes created, connections made
  - Timeline: Events created, date ranges

### 🎨 CUSTOMIZATION PRESETS
- **Study Presets** (Save common configurations)
  - "Medical School Prep" (FSRS + daily reminder)
  - "Language Learning" (Cloze cards + interleaving)
  - "SAT Prep" (timed tests, high difficulty)
  - "Casual Review" (no reminders, game mode)
  - Create custom preset

### 🔐 DATA & PRIVACY
- **Export My Data**
  - Download all study data (GDPR compliance)
  - Format: JSON, CSV
- **Delete Account**
  - Permanent deletion
  - 30-day recovery window
- **Data Sharing**
  - ☐ Share anonymous stats with researchers
  - ☐ Allow AI to improve from my data
  - ☐ Privacy mode (no tracking)

### 🔊 SOUND & FEEDBACK
- **Audio Settings**
  - ☐ Notification sounds
  - ☐ Achievement sounds
  - ☐ Correct/incorrect sounds
  - ☐ Background ambient sounds
  - Volume: 0-100%
  - Default: All OFF
- **Haptic Feedback** (Mobile)
  - ☐ Vibrate on correct answer
  - ☐ Vibrate on streak milestone
  - Default: OFF

### ⌨️ KEYBOARD SHORTCUTS
- **Enable Custom Shortcuts**
  - Show shortcut cheat-sheet (? key)
  - Customizable key bindings
  - Examples:
    - `Space` = Show answer / Next question
    - `1/2/3/4` = Rate difficulty (1=wrong, 4=easy)
    - `Esc` = Exit/Close
    - `S` = Skip card

---

## 📋 IMPLEMENTATION PRIORITY

### PHASE 1: MUST-HAVE (Non-negotiable)
1. **Spaced Repetition Algorithm** (FSRS) - highest impact on learning
2. **Active Recall Design** (force thinking before answers)
3. **Interleaving Support** (random card order, mixed topics)
4. **Dark Mode** (50%+ users request)
5. **Offline Availability** (kills UX without it)
6. **Simple, Fast Interface** (no spinners)
7. **Quiz Tool** (done right, like you did)

### PHASE 2: IMPORTANT (High engagement)
8. Statistics Dashboard (learning heatmap)
9. Export/Backup Features
10. Tags & Organization
11. Multiple study modes (Learn, Test, Review)
12. Collaboration (notes sharing)

### PHASE 3: NICE-TO-HAVE (Engagement boosters)
13. Gamification WITH CAUTION (streaks + freeze feature)
14. Advanced customization (adjust learning intervals)
15. AI features (summarize, generate quizzes)
16. Multiple note templates (Cornell, Outline, etc.)

### AVOID (Dark patterns Quizlet made):
- ❌ Paywalling core study modes
- ❌ Aggressive streak mechanics (cause burnout)
- ❌ Forced notifications
- ❌ Dark pattern dark patterns like "you lost your streak!" shame tactics
- ❌ Overwhelming settings (keep defaults simple)

---

## 📚 SOURCES & RESEARCH
- AnKing Deck (Medical Education) - 500K+ users
- Quizlet User Reviews (G2, Trustpilot) - 2M+ reviews
- Reddit: r/languagelearning, r/learnprogramming, r/MadeMeSmile (MedStudents)
- Anki Research Papers (Spaced Repetition effectiveness)
- Duolingo Case Study (Gamification Burnout)
- Notion Education Plan (3M+ student users)
- Obsidian Community (300K+ active users)
- Scientific studies on Active Recall, Interleaving, Elaboration

---

**NEXT STEPS:**
1. Review this document with your team
2. Prioritize PHASE 1 features
3. Implement ONE tool at a time (flashcards first)
4. Get user feedback before scaling to others
5. Avoid Quizlet's paywall mistakes - keep core free

# cautie Development Progress

This file tracks the major features that have been implemented and outlines the complete plan for future development based on the project blueprint in `README.md`.

---

## 🏁 **Completed Features**

### ✅ **TAB 1 — ADVANCED QUIZ SYSTEM**

*   **1. Quiz Modes**:
    *   [x] **Normal Mode**: The basic quiz functionality.
    *   [x] **Practice Mode**: Implemented with AI-powered explanations for incorrect answers.
    *   [x] **Exam Mode**: Timed mode with no hints or going back.
    *   [x] **Adaptive Mode**: AI adjusts question difficulty based on performance, with on-the-fly question generation.
    *   [x] **Speedrun Mode**: Timed mode with a "three strikes" system and a final score based on speed and accuracy.
    *   [x] **Survival Mode**: Incorrect answers add more questions to the queue.
    *   [x] **1.9 Duel Mode**: Implemented a mock 1v1 duel against an AI opponent.
*   **1.22 & 1.26 – Teacher & AI Features**:
    *   [x] **Teacher Dashboard Foundation**: Implemented the basic UI for the teacher dashboard, showing an overview of classes.
    *   [x] **1.26.4 – Teacher Helper Agent (Data Generation)**: Created an AI flow to generate realistic data for the teacher dashboard.
*   **1.27 – Import & Export System**:
    *   [x] **Import Sources (Partial)**: Implemented file/image upload directly within the Quiz and Flashcard tools. The AI processes the file to extract text for use in the tool.
*   **1.28 – Accessibility & UX**:
    *   [x] **Internationalization (i18n)**: Implemented a dictionary system for static UI text, with initial translations for English (en) and Dutch (nl). The UI language changes based on user settings.
    *   [x] **UI Polish**: Replaced subject placeholder images with cleaner, more professional `lucide-react` icons. Created a central "Tools" page and organized the sidebar for better navigation.
    *   [x] **Specific Accessibility Features**: Implemented toggles and logic for High-Contrast Mode, Dyslexia-Friendly Font, and Reduced Animations.
    *   [x] **Keyboard-only Mode (Partial)**: Implemented keyboard shortcuts for Quiz and Flashcard navigation.

### ✅ **TAB 2 — ADVANCED FLASHCARD SYSTEM**

*   **Core System & Study Modes**:
    *   [x] **Classic Flip Mode**: Basic front/back flashcard viewing.
    *   [x] **Type Mode (Active Recall)**: User must type the answer.
    *   [x] **Multiple Choice Mode**: AI generates MCQs from flashcards.
    *   [x] **AI Flashcard Generation**: Generate flashcards from text.
    *   [x] **Flashcard Editor**: Added a review/edit screen to modify AI-generated cards before studying.

### ✅ **TAB 3 — DASHBOARD & CORE PLATFORM**

*   **Student Dashboard**:
    *   [x] Implemented the initial layout, dynamically populated by an AI flow.
    *   [x] Created components for all major sections (Today's Plan, Deadlines, Alerts, Subjects, AI Suggestions, Quick Access, Statistics).
    *   [x] **Session Recap Card**: A card to display real-time analytics from the last quiz session.
*   **Teacher Dashboard**:
    *   [x] Implemented the initial layout for the Teacher Dashboard.
    *   [x] Created a `ClassCard` component to display summary information for each class.
    *   [x] Added a role switcher to toggle between Student and Teacher views.
    *   [x] **Create Class (UI & Frontend Logic)**: Implemented a multi-step, AI-assisted dialog for creating new classes.
    *   [x] **Class Details Foundation**: Created a details page for individual classes to display assignments and student lists.
    *   [x] **Create Assignment (UI & Frontend Logic)**: Implemented dialog and client-side logic for creating assignments, including attaching new/existing materials.
    *   [x] **Class Idea Agent**: Created an AI flow to help teachers brainstorm class names and descriptions.
*   **Core Data System**:
    *   [x] **Local-First Storage**: Guest user data (classes, assignments) is stored in `localStorage`.
    *   [x] **Supabase Integration**: Full login/signup flow with Supabase.
    *   [x] **Automatic Sync**: Local data is automatically synced to Supabase when a user logs in.
    *   [x] **Live Data Fetching**: Logged-in users fetch their classes and assignments directly from Supabase.
*   **Student Classroom Features**:
    *   [x] **Join a Class**: Students can join classes using a manual code or by scanning a QR code. The system now fully supports this via a dedicated API endpoint and updates the database.

---

# 🚀 **MASTER DEVELOPMENT PLAN**

This is the master checklist for all remaining features, compiled from `README.md`.

## **PHASE 1: QUIZ SYSTEM**

*   **1. Quiz Modes (Gameplay Styles)**
    *   [ ] **1.1 Survival Mode 2.0**: 1 fout = +3–5 nieuwe vragen toegevoegd; lives systeem (3 levens); correcte streak reduceert penalty’s; tijdsdruk: vraag moet binnen X seconden.
    *   [ ] **1.2 Speedrun Mode**: doel: quiz zo snel mogelijk afmaken; timer loopt af, je vergelijkt met je vrienden / klas / wereld; leaderboard per quiz.
    *   [ ] **1.3 Boss Fight Mode**: eindvraag = “boss”; fout = terug naar begin van een hoofdstuk; goed = badge + EXP.
    *   [ ] **1.4 “Short Exam” / “Long Exam” generator**: Je kiest: 10 vragen, 50 vragen, 100 vragen, “alles uit hoofdstuk X”.
    *   [ ] **1.5 Adaptive Difficulty AI**: makkelijke vragen worden langzaam vervangen door moeilijkere; AI detecteert zwaktes → meer vragen *alleen* over wat jij niet kan.
    *   [ ] **1.6 Mastery Mode**: Je moet elke categorie 100% “groen” krijgen. Elke fout zet die categorie terug naar 0%.
    *   [ ] **1.7 Hyperfocus Mode**: kies 1 subonderwerp → 20 vragen alleen daarover; AI maakt automatisch subonderwerpen.
    *   [ ] **1.8 Exam Simulation**: hele proefwerken nabootsen met: tijdslimiet (bijv 50 min); geen terugknop; docent kan echte examens importeren.
    *   [ ] **1.10 Team Battle**: teams → binnen een klas; elke vraag geeft team-score; leaderboard per dag/week.

*   **2. Quiz Creation UI (voor gebruikers & docenten)**
    *   [ ] **2.1 Drag & Drop Question Builder**: sleep losse blokken: Titel / Multiple choice / Open vraag / Matching / Image / Audio / Video; veel intuïtiever.
    *   [ ] **2.2 AI Question Generator 3 Levels**: 1. Basic: omzetting tekst → quiz; 2. Enhanced: AI maakt moeilijkheidsgraad; 3. Pro: AI maakt volledige toets + uitleg + feedback per vraag.
    *   [ ] **2.3 Quiz Templates**: “Toets”, “Huiswerk”, “Basiskennis check”, “Overhoring”, “Snelle 10 vragen”, “Examentraining”.
    *   [ ] **2.4 Custom Question Pools**: docent of gebruiker maakt meerdere *pools*; quiz kiest random X vragen uit elke pool.
    *   [ ] **2.5 Version Control**: quiz versie 1, versie 2, versie 3; docenten kunnen oude versies terugzetten.
    *   [ ] **2.6 Multi-language**: 1 quiz → automatisch vertaalbare versies; handig voor internationale scholen.
    *   [ ] **2.7 AI Rewriter**: moeilijke vraag → AI maakt simpelere versie; makkelijke vraag → AI maakt moeilijkere versie.
    *   [ ] **2.8 Duplicate Detector**: Detecteert of je dezelfde vraag 2x hebt gemaakt.

*   **3. Quiz UI / UX Features**
    *   [ ] **3.1 Quick Start Panel**: Bij quiz openen: recent gedaan; aanbevelingen; “continue last session”.
    *   [ ] **3.2 Real-Time Progress Map**: visualised progress zoals een routekaart; fout → rood pad; goed → groen pad.
    *   [ ] **3.3 Difficulty Indicator**: makkelijk / gemiddeld / moeilijk zichtbaar.
    *   [ ] **3.4 Image Zoom**: Bij vragen met afbeelding → pinch zoomen (web + mobiel).
    *   [ ] **3.6 Dark mode / Light mode automatisch**: Gebaseerd op systeeminstellingen.
    *   [ ] **3.8 Offline Queue**: Als je internet wegvalt: vragen lokaal opslaan; antwoorden worden later gesynchroniseerd.

*   **4. Analytics & Stats (per quiz)**
    *   [ ] **4.1 Heatmap van fouten**: “Op welke hoofdstukken gaat het slecht?”
    *   [ ] **4.2 Streak Tracker**: beste streak; gemiddelde speed; accuracy over tijd.
    *   [ ] **4.3 Retry System**: Na een quiz: “alle fouten opnieuw doen”; “alle vragen opnieuw”; “alleen moeilijke vragen opnieuw”.
    *   [ ] **4.4 Mastery %**: per hoofdstuk; per onderwerp; per categorie; gegamified zoals Duolingo “crowns".
    *   [ ] **4.5 Class Analytics (docent)**: gemiddelde van klas; wie 100% mastery heeft; wie achterloopt; welke vragen het slechtst worden gemaakt.

*   **5. Question Types Expansion**
    *   [ ] **5.1 Matching Lines (drag and drop)**: Verbind kolom A met kolom B.
    *   [ ] **5.2 Ordering**: Zet stappen in de juiste volgorde: volgorde van een proces; tijdlijn gebeurtenissen.
    *   [ ] **5.3 Fill in the Blank**: Tekst met lege woorden: De industriële revolutie begon in ____.
    *   [ ] **5.4 Label the Image**: Plaats labels op een foto / kaart.
    *   [ ] **5.5 Audio Questions**: Je hoort audio → je moet antwoord geven.
    *   [ ] **5.6 Video Questions**: Bijv. biologie video → vraag erover.
    *   [ ] **5.7 Diagram Builder**: AI maakt diagrammen → jij vult labels in.
    *   [ ] **5.8 Multi-Answer MC**: Meer dan één antwoord correct.
    *   [ ] **5.9 Highlight Text**: Dieper niveau: je krijgt een stuk tekst; je highlight het juiste antwoord.

*   **6. Storage Features (Saved Quizzes, Recents, Folders)**
    *   [ ] **6.1 Recents**: laatst geopend; laatst gehaald; laatst aangemaakt.
    *   [ ] **6.2 Collections / Folders**: Bijv: “Biologie Hoofdstuk 4”; “Toetsweek Voorbereiding”; “Examenbundel 2025”.
    *   [ ] **6.3 Favorites**: ⭐ favoriet zetten.
    *   [ ] **6.4 Tags**: Quiz tags: moeilijkheid; hoofdstuk; vakgebied; docent.
    *   [ ] **6.5 Import / Export**: importeren Quizlet → direct quiz; importeren Word → AI maakt quiz; export naar PDF (mooie layout); export naar JSON (ruwe data).

*   **7. Rewards & Gamification**
    *   [ ] **7.1 XP, Levels & Badges**: Level 1–100; Badges voor streaks; Badges voor mastery.
    *   [ ] **7.2 Weekly Challenge**: AI maakt elke week een quiz: 20 vragen over je vakken; leaderboard.
    *   [ ] **7.3 Quest System**: Bijv: “Doe 3 quizzen deze week”; “Master hoofdstuk 4”.
    *   [ ] **7.4 Quiz Pass**: Soort battle pass (gratis): elke week rewards; docent kan speciale rewards toevoegen.

*   **8. Social / Sharing Features**
    *   [ ] **8.1 Share Quiz via Link**: Privé of publiek.
    *   [ ] **8.2 Publish to Global Gallery**: Waar anderen je quiz kunnen gebruiken.
    *   [ ] **8.3 Class Quiz Sharing**: Docent → klas; Studenten → eigen foto’s / uitleg toevoegen.
    *   [ ] **8.4 Study Groups**: Quizzen in groep spelen met chatroom.

*   **9. Advanced AI Features**
    *   [ ] **9.1 Auto-Explain After Answer**: AI genereert uitleg: waarom dit antwoord klopt; waarom andere fout zijn.
    *   [ ] **9.2 Personal Weakness Detector**: AI vindt jouw 3 zwakke plekken; maakt mini-quiz ervoor.
    *   [ ] **9.3 Concept Graph**: AI bouwt een graf van begrippen en relaties → quiz focust op je zwakke nodes.
    *   [ ] **9.4 “Explain to Me Like I’m Dumb” Button**: 1 klik → vraag + antwoord uitgelegd op niveau 6-jarige.
    *   [ ] **9.5 Smart Repetition**: AI weet exact wanneer jij iets opnieuw moet oefenen; vergelijkbaar met Anki SRS, maar geïntegreerd in quiz.

*   **10. Integration Features (Agenda, Dashboard, Classes)**
    *   [ ] **10.1 Quiz Deadlines**: Uit agenda overgenomen.
    *   [ ] **10.2 Quiz Reminders**: “Je hebt nog 2 quizzen openstaan”; “Toets Biologie over 3 dagen → oefen nu 10 vragen”.
    *   [x] **10.3 Class Assigned Quiz**: Docent zet quiz open voor klas → jij ziet hem in je Dashboard. (Frontend logic implemented)
    *   [ ] **10.4 Auto-Suggested Quizzes**: Op basis van: agenda; je prestaties; je zwakke onderwerpen.

*   **11. Settings / Preferences (per quiz en globaal)**
    *   [ ] **11.2 Sounds (met mute button!)**: subtle click; correct ding; incorrect soft bump; NOT muziek; NOT ambient loops; alleen micro-audio cues zoals Apple UI.
    *   [ ] **11.3 Difficulty Slider**: normaal; moeilijk; ultra hard (minder tijd, zwaardere vragen).
    *   [ ] **11.4 Auto-Advance**: Gaat automatisch door na goed antwoord.
    *   [ ] **11.5 Font Size**: Klein / normaal / groot.
    *   [ ] **11.6 Timer Options**: timer aan; timer uit; countdown mode; stopwatch mode.
    *   [ ] **11.7 Answer Reveal Mode**: meteen laten zien; pas aan einde.

*   **12. Experiment Features (future)**
    *   [ ] **12.1 QuickCam Questions**: Je neemt een foto van je boek → AI maakt quiz.
    *   [ ] **12.2 AR Mode**: Plaats 3D model op tafel → AI stelt vragen.
    *   [ ] **12.3 “Explain My Wrong Answers” Video Generator**: AI maakt mini-video van 10 seconden die het fout uitlegt.
    *   [ ] **12.4 Peer Review Questions**: Studenten kunnen hun eigen vragen uploaden in peer-review systeem.
    *   [ ] **12.5 “Instructor AI”**: AI die optreedt als docent: geeft tips; geeft feedback; stelt volgvragen.

## **PHASE 2: FLASHCARD SYSTEM**

*   **1. CORE FLASHCARD SYSTEM**
    *   [ ] **1.1 Decks**: titel; beschrijving; kleur; icon; tags (AI genereert automatisch tags); vak; niveau; eigenaar; gedeeld met klas of privé.
    *   [ ] **1.2 Cards**: voorkant; achterkant; voorbeeldzin; afbeelding; multiple choice opties (optioneel); context blok (optioneel); AI gegenereerde extra uitleg (hidden tot klik).
    *   [x] **1.3 Card formats**: basic reversed; cloze deletion (AI genereert automatisch blanks); image occlusion; audio prompt; audio answer; comparison card (“vergelijk X vs Y”); label image (“wijs het juiste deel aan”). (Cloze is implemented via Type Mode).
    *   [ ] **1.4 Views**: list view; grid view; preview mode (zoals Quizlet); compact mode; high focus mode (fullscreen, minimal UI).

*   **2. AI FLASHCARD GENERATION**
    *   [ ] **2.1 AI from Text**: Plak tekst → AI maakt flashcards per: paragraaf; definitie; begrip; tijdlijn; oorzaak / gevolg; belangrijke namen; woordenlijst.
    *   [ ] **2.2 AI from PDF**: Import PDF → AI: splitst in onderwerpen; herkent belangrijke termen; maakt 3 moeilijkheidsniveaus uit dezelfde content.
    *   [ ] **2.3 AI from Website URL**: Je plakt een URL → AI: leest artikel; maakt 10–50 cards; bundelt cards in topics.
    *   [ ] **2.4 AI from Audio**: Je neemt zelf audio op → AI maakt cards: samenvatting; sleutelbegrippen; belangrijke definities.
    *   [ ] **2.5 AI Simplify/Expand Buttons**: Op elke card: simplificeer; uitbreiden; toevoegen van extra voorbeelden; ezelsbruggetje genereren; geheugenhack.
    *   [ ] **2.6 AI "Make It Stick"**: AI maakt: rare analogieën; ezelsbruggetjes; gekke zinnen; geheugen hacks; humoristische vergelijkingen; domme liedjes (maar effectief).

*   **3. STUDY MODES (15 MODES TOTAAL)**
    *   [ ] **3.4 Cloze Practice**: AI maakt automatisch invulzinnen.
    *   [ ] **3.5 Rapid Fire**: Elke kaart 1 seconde → of 3, of 5 → high intensity.
    *   [ ] **3.6 Survival Mode (flashcard versie)**: Elke fout = +3 nieuwe cards in de deck. Je ontsnapt pas als je alles goed hebt.
    *   [ ] **3.7 Exam Mode**: timer; geen hints; geen flip; type-only.
    *   [ ] **3.8 AI Teaching Mode**: AI doceert je inhoud alsof je les krijgt: jij stelt vragen; AI beantwoordt; AI maakt extra flashcards over wat jij niet snapt.
    *   [ ] **3.9 Story Mode**: AI bouwt een verhaaltje rond de cards zodat informatie beter blijft hangen. (Meest unieke feature ooit.)
    *   [ ] **3.10 Compare Cards**: Je krijgt telkens: twee cards; welke wist je beter?; AI bepaalt zwaktes.
    *   [ ] **3.11 Warm-Up Mode**: AI kiest 10 kaarten die het juiste brein-gebied “wakker maken”. Ideaal voor begin van een studiesessie.
    *   [ ] **3.12 Cool-Down Mode**: Einde sessie → AI laat je de 5 belangrijkste kaarten opnieuw doen.
    *   [ ] **3.13 Speed-Review**: Je moet binnen 0.7–1.5 seconden zeggen of je het weet. (Geen flip → alleen inschatting.)
    *   [ ] **3.14 Teacher Assignment Mode**: If teacher assigned: volgorde vast; niet skippen; deadline; minimum score; tijdslimiet.
    *   [ ] **3.15 Create Mode**: Je maakt nieuwe cards tijdens studeren (“Oh shit dit moet ik onthouden”) → 1 klik → nieuwe card.

*   **4. UI FEATURES**
    *   [ ] **4.1 Left Sidebar**: Decks; Folders; Recents; Favorites; Weakest cards; AI suggestions; Assigned decks (van docent).
    *   [ ] **4.2 Right Sidebar (per deck)**: Stats; Difficult cards; Recently added; AI analysis; Suggested study plan.
    *   [ ] **4.3 Flashcard Viewer**: Super clean Apple-like design: grote tekst; center alignment; subtiele animatie; flip in 0.18s; dark/light auto.
    *   [ ] **4.4 Quick Controls**: shuffle; reverse cards; autoplay; sound on flip; high contrast mode; enlarge text.
    *   [ ] **4.5 Card Search Engine**: Zoek cards op: keyword; difficulty; tag; creation date; AI-topic.
    *   [ ] **4.6 Favorites**: Je kunt cards liken → eigen lijst “Favorites”.
    *   [ ] **4.7 Voice Over**: Text → speech van kaarten.

*   **5. CLASSROOM FEATURES**
    *   [x] **5.1 Teacher Assigns Deck**: Docent kan: deck verplichten; timer zetten; deadline; minimum percentage; meerdere sessies; hard mode / easy mode. (Frontend logic implemented)
    *   [ ] **5.2 Teacher Stats**: Voor elke student: studied minutes; cards reviewed; accuracy; weak topics; skipped cards.
    *   [ ] **5.3 Class Decks**: Docenten maken decks beschikbaar aan hele klas.

*   **6. IMPORT FEATURES**
    *   [ ] **6.1 Import from Quizlet**: fast import; automatisch tags; automatisch AI verbeteringen.
    *   [ ] **6.2 Import CSV**: voorkant, achterkant, tag; AI vult dingen aan die ontbreken.
    *   [ ] **6.3 Import from Notion**: table → flashcards; synced updates.
    *   [ ] **6.4 Import from PDF**: AI extraheert definities → maakt flashcards.

*   **7. EXPORT FEATURES**
    *   [ ] **7.1 Export to PDF**: Maar dan mooi: front/back; overzicht; definities blok; kleurcodes.
    *   [ ] **7.2 Export to Anki (APKG)**: Volledig compatibel.
    *   [ ] **7.3 Export to CSV**: Standaard formaat.
    *   [ ] **7.4 Export to Quiz**: 1 klik → maak quiz van je flashcards.

*   **8. ANALYTICS**
    *   [ ] **8.1 Memory Score**: AI voorspelt hoe goed jij de deck onthoudt (0–100%).
    *   [ ] **8.2 Forgetting Curve Insights**: AI voorspelt wanneer je kaart gaat vergeten.
    *   [ ] **8.3 Review Heatmap**: Zoals GitHub commits → maar dan voor cards.
    *   [ ] **8.4 Strength Distribution**: Pie chart: mastered; medium; weak.

*   **9. SPACED REPETITION ENGINE**
    *   [ ] **9.1 Spaced Repetition Engine**: Gebaseerd op SM-2 (Anki) maar verbeterd: past zich aan per gebruiker; adaptive intervals; AI-bias correction; faster learning loops.

*   **10. LOCAL + CLOUD SYNC**
    *   [ ] **10.1 Offline Mode**: Alles werkt offline → synct naar Supabase wanneer online.
    *   [ ] **10.2 Local Backup**: Encrypted in browser.
    *   [ ] **10.3 Conflict Resolver**: Zijn er verschillen?: meest recente; hoogste master-score; of vraag gebruiker.

*   **11. SOUNDS / UX FEEDBACK**
    *   [ ] **11.1 optional subtle UI sounds**: flip-card soft click; correct = soft bell; incorrect = soft pulse; next = subtle whoosh; (met duidelijke mute button).

*   **12. AI MULTI-AGENT SETUP**
    *   [ ] **12.1 Agent 1: Card Parser**: Herkent begrippen & definities.
    *   [ ] **12.2 Agent 2: Card Builder**: Maakt flashcards en cloze versies.
    *   [ ] **12.3 Agent 3: Difficulty Analyzer**: Determineert wat makkelijk/moeilijk is.
    *   [ ] **12.4 Agent 4: Teacher Agent**: Maakt uitleg, voorbeelden & memory hacks.

*   **13. CARDS AS KNOWLEDGE OBJECTS**
    *   [ ] **13.1 Cards as knowledge objects**: Je cards kunnen ook worden gebruikt in: quizzes; studyplans; agenda deadlines; explain mode; whiteboard mode. Één bron → meerdere functies.

*   **14. ADD-ON FEATURES**
    *   [ ] **14.1 Merge Decks**: Combineer decks zonder duplicaten.
    *   [ ] **14.2 Remove Duplicates**: AI vindt dubbele kaarten.
    *   [ ] **14.3 Smart Sort**: Sorteer op: moeilijkheid; AI-score; onderwerp; tag.
    *   [ ] **14.4 Versions**: Vorige versies zien na edits.

*   **15. ANTI-CHEAT (SCHOOL MODE)**
    *   [ ] **15.1 Anti-cheat**: no skip; no reverse; no preview; detect switching tabs; forced pacing.

## **PHASE 3: PLATFORM-WIDE FEATURES**

*   **1.21 — “Smart Collections” (Automatische Bundelingen)**
    *   [ ] **1.21.1 Functionality**: Systeem detecteert patronen en bundelt content in Collections (e.g., “Biology — Nervous System”).
    *   [ ] **1.21.2 UI**: Dashboard tab ‘Collections’ met auto-gegenereerde kaarten.
    *   [ ] **1.21.3 Actions**: Study Now, Open, Export, Share, AI Summary.

*   **1.22 — AI Notes (Automatische Notities)**
    *   [ ] **122.1 Functionality**: AI maakt notities van tekst, foto's, PDF, YouTube, slides.
    *   [ ] **1.22.2 Options**: "Exam style", "Simple language", "Long & detailed", "Bullet points", "Vocabulary Glossary", "Flashcards genereren".
    *   [ ] **1.22.3 Storage**: Opslaan in user_id → notes → note_id.

*   **1.23 — AI Tutor (Volledige persoonlijke leraar)**
    *   [ ] **1.23.1 Functionality**: ChatGPT-like assistant met context van user history, tests, weak spots, classes, chats.
    *   [ ] **1.23.2 Capabilities**: Uitleg op 3 niveaus, quizzen, concepten uitleggen, voorbeelden genereren, studieplan optimaliseren.
    *   [ ] **1.23.3 Killer Feature**: Context-aware chat.

*   **1.24 — Cross-Mode Sync**
    *   [ ] **1.24.1 Functionality**: Maak quiz → automatisch flashcards button; Maak flashcards → automatisch quiz button; Note → summary → flashcards; etc.

*   **1.25 — Teacher → Student Automations**
    *   [ ] **1.25.1 Teacher Actions**: Quiz koppelen aan deadline, auto-reminders, AI feedback, auto-grade open vragen, statistieken, "weak students" detectie.
    *   [ ] **1.25.2 Student Experience**: Notificaties, openstaande taken, lage scores, AI suggesties.

*   **1.26 — Multi-Format Import (alles importeren)**
    *   [ ] **1.26.1 Sources**: Quizlet, Chegg/CourseHero, Word, PDF, YouTube, Website URL.

*   **1.27 — Multi-Format Export (alles exporteren)**
    *   [ ] **1.27.1 Formats**: PDF, DOCX, CSV, JSON, Clean printable view, Flashcards printable sheets, Quiz print mode, Export naar Google Drive, Export naar Notion.

*   **1.28 — Smart Reminders**
    *   [ ] **1.28.1 Context Reminders**: "Je hebt morgen toets", "weinig gedaan voor Biologie", "scoort laag op X", "docent heeft iets toegevoegd".
    *   [ ] **1.28.2 Delivery**: Email / push / in-app notificaties.

*   **1.29 — Learning Analytics**
    *   [ ] **1.29.1 Student Analytics**: Tijd besteed, learning heatmap, progressie per vak, accuracy, AI prediction "je haalt een 7.4".
    *   [ ] **1.29.2 Teacher Analytics**: Huiswerk tracking, klassegemiddelde, meest gemaakte fouten, leerlingen die achterlopen.

*   **1.30 — “Study Feed” (Zoals TikTok maar voor leren)**
    *   [ ] **1.30.1 Functionality**: AI serveert korte content-snippets (mini flashcards, micro-quiz, 10s uitleg). Swipe → nieuwe.

*   **1.31 — AI “Weak Spots Engine”**
    *   [ ] **1.31.1 Functionality**: Analyseert fouten, tijd, etc. en maakt `weak_spots` database.
    *   [ ] **1.31.2 Usage**: Input for AI Tutor, Quiz "Weak Spot Mode", Flashcards, Studyplan.
    *   [ ] **1.31.3 UI**: Dashboard widget to show critical weak spots.

*   **1.32 — Knowledge Graph**
    *   [ ] **1.32.1 Functionality**: AI bouwt visuele mindmap van concepten en relaties.
    *   [ ] **1.32.2 Usage**: Beter overzicht, verbanden snappen, gaten in kennis zien.
    *   [ ] **1.32.3 Features**: Click node → summary/quiz/flashcards; highlight weak nodes; timeline mode.

*   **1.33 — AI “Explain Like I’m 5 / 12 / 18”**
    *   [ ] **1.33.1 Functionality**: AI herschrijft notes, flashcards, feedback op ELI5, ELI12, ELI18, ELIExpert niveaus.

*   **1.34 — “Multiplayer Studying”**
    *   [ ] **1.34.1 Features**: Real-time quiz battle, samen flashcards oefenen, voice chat, AI-vragen voor duo's, Leaderboard, Random Matchmaking, Private Rooms, Teacher-Mode.
    *   [ ] **1.34.2 Quiz Arena**: 10 vragen, live score, power-ups (skip, double points, freeze).

*   **1.35 — “Smart Difficulty Scaling”**
    *   [ ] **1.35.1 Functionality**: AI past moeilijkheid aan op basis van prestaties. Vragen hebben metadata (difficulty, skills, topic).

*   **1.36 — Open-Answer Expert Grader**
    *   [ ] **1.36.1 AI Grading**: Beoordeelt open antwoorden (0/1/2 punten), geeft uitleg, alternatieven, suggesties.
    *   [ ] **1.36.2 Teacher View**: Ziet score, AI feedback, AI confidence score, en kan overrides doen.

*   **1.37 — Study Sessions (Pomodoro + AI begeleiding)**
    *   [ ] **1.37.1 Features**: 25/5 min blokken, AI suggereert taken, focus score, minimalistische animatie, optionele ambient sounds.
    *   [ ] **1.37.2 Gamification**: Badges for focus streaks.

*   **1.38 — Universal Search**
    *   [ ] **1.38.1 Functionality**: Topbar search doorzoekt quizzes, flashcards, docs, AI chats, classes, agenda, weak spots, graph nodes.
    *   [ ] **1.38.2 AI Ranking**: Zoals Spotlight Search, toont resultaten per categorie.

*   **1.39 — Offline “Local Cache” Mode**
    *   [ ] **1.39.1 Functionality**: localStorage + IndexedDB cachet geopende content (quizzes, cards, notes) voor offline oefenen; sync bij internet.

*   **1.40 — Settings & Personalization Mega Panel**
    *   [ ] **1.40.1 UI Settings**: Theme, accent color, animation toggle, loading style, font size, interface density.
    *   [ ] **1.40.2 Learning Settings**: Difficulty scaling on/off, AI grading strictness, weak spots help on/off, auto-show hints/explanations.
    *   [ ] **1.40.3 Notifications**: Daily reminder, assignment reminders, test reminders, weak spot push, email/push settings.
    *   [ ] **1.40.4 Privacy**: Agenda sync, class visibility, score visibility, multiplayer visibility, nickname mode.
    *   [ ] **1.40.5 Data**: Export everything, delete everything, reset weak spots, clear cache.

*   **1.41 — Plugin / App Marketplace**
    *   [ ] **1.41.1 Functionality**: Interne marktplaats voor extensies (Export plugins, Import adapters, UI-widgets).
    *   [ ] **1.41.2 Implementation**: Plugin manifest, Sandbox iframe, OAuth permissions, Admin review.

*   **1.42 — Organization / School Admin Console**
    *   [ ] **1.42.1 Functionality**: Admin-portal voor scholen met gebruikersbeheer, licenties, SSO, data export.
    *   [ ] **1.42.2 Implementation**: RBAC, CSV import jobs, audit logs.

*   **1.43 — White-Labeling / Theming Engine**
    *   [ ] **1.43.1 Functionality**: Laat scholen platform branden (logo, kleuren, custom domain, email templates).
    *   [ ] **1.43.2 Implementation**: Per-organization config, theme tokens in CSS variables, cert management.

*   **1.44 — Data Export & Compliance Toolkit**
    *   [ ] **1.44.1 Functionality**: Automatische data-export en GDPR tools (user data export, deletion requests, retention policies, consent logs).
    *   [ ] **1.44.2 Implementation**: Background jobs for exports, audit trail for deletions.

*   **1.45 — Rules Engine for Automations**
    *   [ ] **1.45.1 Functionality**: Visuele if-this-then-that builder for teachers/admins (triggers, actions, conditions).
    *   [ ] **1.45.2 Implementation**: Store rules as JSON DSL, evaluate server-side in sandbox.

*   **1.46 — A/B Testing & Experiments Platform**
    *   [ ] **1.46.1 Functionality**: Test varianten van UI flows, vraagstelling, reminders, algoritmes.
    *   [ ] **1.46.2 Implementation**: Assign users to cohorts, event tracking, analytics pipeline.

*   **1.47 — Content Moderation & Trust Signals**
    *   [ ] **1.47.1 Functionality**: Moderation voor profanity, plagiarism, PII; reputation score for UGC.
    *   [ ] **1.47.2 Implementation**: AI-moderatie + heuristieken, moderatie wachtrij UI.

*   **1.48 — Adaptive Pricing & Billing Engine**
    *   [ ] **1.48.1 Functionality**: SaaS billing (per-seat, tiered features, usage-based, coupons).
    *   [ ] **1.48.2 Implementation**: Integrate Stripe, metered billing, self-serve invoices.

*   **1.49 — Content Provenance & Versioning**
    *   [ ] **1.49.1 Functionality**: Volledige versiehistorie van quizzes, flashcard sets, AI-generated content.
    *   [ ] **1.49.2 Implementation**: Store change diffs, UI history viewer + revert button.

*   **1.50 — API-first Platform & Developer Portal**
    *   [ ] **1.50.1 Functionality**: Publieke/private API’s voor quizzes, flashcards, users, analytics.
    *   [ ] **1.50.2 Implementation**: OpenAPI spec + SDKs, API keys, rate limits, developer docs.

*   **1.51 — Advanced Notification Center**
    *   [ ] **1.51.1 Functionality**: Centrale inbox voor reminders, messages, alerts.
    *   [ ] **1.51.2 Features**: Silent hours, per-channel preferences, snooze.
    *   [ ] **1.51.3 Implementation**: Notification queue (Redis), push via FCM/APNs, mail via Postmark/SendGrid.

*   **152 — Enterprise SSO & Directory Sync**
    *   [ ] **1.52.1 Functionality**: LDAP / SAML / SCIM provisioning; auto-provision classes from SIS.
    *   [ ] **1.52.2 Implementation**: SCIM endpoints, scheduled sync jobs.

*   **1.53 — Intelligent Onboarding Flow**
    *   [ ] **1.53.1 Functionality**: Gepersonaliseerde onboarding (student vs teacher), auto-import schedule, suggest studyplan.
    *   [ ] **1.53.2 Implementation**: Step-by-step guided flow, sample data.

*   **1.54 — Role-based Dashboards & Shortcuts**
    *   [ ] **1.54.1 Functionality**: Verschillende dashboards per rol, power-user shortcuts.
    *   [ ] **154.2 Implementation**: Store UI shortcuts per user, keyboard shortcuts cheat sheet.

*   **1.55 — Real-time Collaboration SDK**
    *   [ ] **1.55.1 Functionality**: SDK voor collaborative annotations, live quiz sessions, shared whiteboards.
    *   [ ] **1.55.2 Implementation**: WebSocket/WebRTC, OT/CRDT, presence & cursors.

*   **1.56 — Learning Outcomes & Standards Mapping**
    *   [ ] **1.56.1 Functionality**: Map content to standards (national curriculums, CEFR), report coverage.
    *   [ ] **1.56.2 Implementation**: Standards table + mapping UI, auto-suggest mapping via AI.

*   **1.57 — Backup & Disaster Recovery Plan**
    *   [ ] **1.57.1 Functionality**: Nightly DB backups, point-in-time restore, replication, test DR runbook.
    *   [ ] **1.57.2 Implementation**: Automate with infra tools, documented playbooks.

*   **158 — Reusable Component Library (Design System)**
    *   [ ] **1.58.1 Functionality**: Single source of truth components (Buttons, Inputs, etc.) met docs & Storybook.
    *   [ ] **1.58.2 Implementation**: Monorepo package, storybook + accessibility checks.

*   **1.59 — Auto-Scaling & Observability Stack**
    *   [ ] **1.59.1 Functionality**: Production readiness (horizontal auto-scaling, metrics, logs, tracing).
    *   [ ] **1.59.2 Implementation**: Containerize (Docker), K8s/Cloud Run, SLO/SLA tracking.

*   **160 — Multi-tenant Isolation & Data Partitioning**
    *   [ ] **1.60.1 Functionality**: Support many schools safely (per-tenant data partitioning, resource quotas, billing scoping).
    *   [ ] **1.60.2 Implementation**: RLS row-level filters, stats per tenant, tenant-specific feature flags.

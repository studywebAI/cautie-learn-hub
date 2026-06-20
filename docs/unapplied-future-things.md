# Unapplied Future Things

Last updated: 2026-06-20

This file tracks features that are in codebase planning/partial state but are not fully shipped in UX yet.

## 1) School Schedule UI (hidden for now)
- Decision: hide school schedule from the class UI for now.
- UI status: hidden from class tabs (`schedule` tab removed from teacher tab list).
- Backend status: still implemented and available in API/routes:
  - `/api/classes/[classId]/school-schedule`
  - `/api/school-schedule`
- Estimated completeness:
  - backend/data: ~85%
  - UX for launch quality: ~35%
- Current direction: keep endpoints intact, re-introduce when design/system parity pass is complete.

## 2) Ideas Board (community polling)
- Goal: community-style intake where users submit ideas and vote.
- Implemented in this pass:
  - DB migration:
    - `supabase/migrations/20260429_ideas_board_v1.sql`
  - API:
    - `GET/POST /api/ideas-board`
    - `POST /api/ideas-board/[ideaId]/vote`
  - UI page:
    - `/ideas-board` via `app/(main)/ideas-board/page.tsx`
  - Sidebar profile menu entry:
    - added under account dropdown as `Ideas Board`.
- Seed poll ideas added:
  - Voice-first study mode (microphone input/output)
  - Source-backed deep questions
  - Auto timelines and custom diagrams
- Additional implementation completed:
  - Admin lifecycle control API:
    - `POST /api/ideas-board/[ideaId]/stage`
  - Admin poll status control API:
    - `POST /api/ideas-board/polls/[pollId]/status`
  - UI now supports:
    - submitted -> candidate promotion
    - candidate community voting
    - admin monthly poll creation from candidates
    - poll open/close/archive controls
    - roadmap stage updates (planned/shipped)
- Estimated completeness:
  - backend/data: ~92%
  - UX moderation/workflow: ~82%
- Remaining later iteration (not applied yet):
  - explicit monthly scheduler/auto-close
  - separate staff role model (beyond `subscription_type`)
  - richer moderation audit trail

## 3) Tools settings unification (planned, not fully applied)
- Requested direction:
  - real settings only (layout, prior knowledge level, visuals/photos toggle, source depth)
  - premium-gated advanced generation (source-backed outputs, diagrams, timelines)
  - remove low-value/no-op settings
- Current status:
  - mixed implementations across tools pages and editors
  - some controls exist but are inconsistent between notes/quiz/studyset flows
- Estimated completeness:
  - backend capability: ~60%
  - consistent UX layer: ~25%
- Next implementation wave:
  - single shared `ToolRuntimeSettings` schema + shared panel component
  - per-tier enforcement tied to subscription checks and upgrade CTA

## 4) Feature inventory from repository markers
- Existing broader backlog files already in repo:
  - `app/PROGRESS.md`
  - `docs/launch/launch-master-open-items.md`
  - `docs/launch/launch-closure-tracker.md`
- High-signal files with many future/placeholder markers from latest scan:
  - `app/lib/tool-i18n.ts`
  - `app/components/AssignmentEditor.tsx`
  - `app/components/dashboard/teacher/class-settings.tsx`
  - `app/(main)/settings/page.tsx`
  - `app/components/tools/source-input.tsx`

## 5) Current product direction notes
- Theme system:
  - keep strict surface hierarchy (`background` -> `panel` -> `interactive` -> `chip`) independent of theme palette.
  - themes should only swap color values, not layout/surface hierarchy.
- Group tab:
  - student rename flow should stay list-first, quick-select, and keyboard save.
- Schedule:
  - remain hidden in class UI until parity pass is signed off.

## 6) Advanced Tool Settings Backlog (requested spec)
- Scope note (important):
  - `Speedrun` is deferred and only valid for curated/fixed community sets later.
  - `Speedrun` is explicitly not for live-generated 1:1 quizzes (those are not route-stable/fair for speedrun ranking).

### 6.1 Speedrun (curated/fixed sets only, later)
- `Speedrun.mode_enabled`: enable dedicated speedrun mode with locked rules and separate ranking.
- `Speedrun.timer_start_rule`: choose when timer starts (`first_input`, `first_question_visible`, `first_interaction`).
- `Speedrun.timer_end_rule`: choose when timer ends (`last_answer_submitted`, `results_screen_open`, `manual_stop`).
- `Speedrun.global_timer_seconds`: set one total timer for full run.
- `Speedrun.per_question_timer_seconds`: set fixed per-question timer.
- `Speedrun.apply_timer_to_all_questions`: bulk apply timer rules to whole curated set.
- `Speedrun.unlimited_timer_mode`: disable timer for practice-only runs.
- `Speedrun.auto_pause_on_tab_blur`: auto pause when player leaves tab/window.
- `Speedrun.pause_budget_seconds`: finite pause budget for fair run validation.
- `Speedrun.quick_restart_hotkey`: restart run instantly without menu navigation.
- `Speedrun.segment_splits_enabled`: track per-section split times.
- `Speedrun.best_possible_time`: compute theoretical best from personal best splits.
- `Speedrun.input_display`: show live input/debug overlay for run transparency.
- `Speedrun.no_animation_mode`: remove transitions to reduce non-skill delay.
- `Speedrun.seed_lock`: lock randomized order by seed for comparable runs.
- `Speedrun.run_validation_level`: classify run as `casual`, `ranked`, `verified`.
- `Speedrun.ghost_replay_download`: allow downloading ghost traces from top runs.
- `Speedrun.dynamic_split_reorder`: auto reorder split points by time-loss hotspots.
- `Speedrun.fail_restart_policy`: auto restart run on first error for hardcore profile.
- `Speedrun.perfect_run_flag`: mark and filter no-error runs on leaderboard.
- `Speedrun.input_latency_compensation`: normalize measured client input latency across devices.
- `Speedrun.multi_attempt_session`: bundle many attempts into one analytics session.
- `Speedrun.route_variants`: support multiple fixed routes with separate leaderboards.

### 6.2 AdaptiveTimer
- `AdaptiveTimer.enabled`: switch from static timer to dynamic per-question timer.
- `AdaptiveTimer.base_seconds`: define baseline seconds before modifiers.
- `AdaptiveTimer.reading_speed_wpm`: adapt timer to measured personal reading speed.
- `AdaptiveTimer.known_topic_discount_pct`: reduce time for mastered topics.
- `AdaptiveTimer.uncertain_topic_bonus_pct`: add time on weak/new topics.
- `AdaptiveTimer.question_complexity_weight`: weight timer by reasoning complexity.
- `AdaptiveTimer.media_bonus_seconds`: add time for image/diagram/table questions.
- `AdaptiveTimer.min_max_bounds`: enforce lower/upper timer bounds.
- `AdaptiveTimer.confidence_feedback_loop`: use confidence input to adjust upcoming timers.
- `AdaptiveTimer.streak_acceleration`: gradually tighten timer on strong correct streaks.
- `AdaptiveTimer.fail_slowdown`: temporarily expand timer after errors.
- `AdaptiveTimer.preview_explanation`: show why timer changed for trust/clarity.
- `AdaptiveTimer.fatigue_detection`: detect fatigue patterns and reduce pressure.
- `AdaptiveTimer.session_phase_scaling`: start generous and end tighter over session.
- `AdaptiveTimer.user_goal_alignment`: align timing profile to selected goal (`speed` vs `mastery`).
- `AdaptiveTimer.hesitation_detection`: add time when prolonged pre-answer hesitation is detected.
- `AdaptiveTimer.reading_pattern_tracking`: detect skim vs deep-read and tune timer.
- `AdaptiveTimer.device_adjustment`: compensate for mobile interaction overhead.

### 6.3 Quiz
- `Quiz.question_mix_profile`: control composition across MCQ/open/cloze/matching.
- `Quiz.difficulty_curve`: define progression curve (easy->hard, hard-first, mixed).
- `Quiz.retry_policy`: configure immediate retry/end-of-run retry/no retry.
- `Quiz.hint_policy`: configure hint count, type, and scoring penalty.
- `Quiz.scoring_model`: choose `accuracy`, `speed_weighted`, `negative_marking`, `mastery_points`.
- `Quiz.answer_shuffle_level`: shuffle answers, questions, both, or none.
- `Quiz.question_source_policy`: enforce source-grounded generation behavior.
- `Quiz.explanation_timing`: show explanations per-question or end-of-run.
- `Quiz.red_flag_questions`: mark low-confidence AI questions for review.
- `Quiz.exam_lock_mode`: disable backtracking/skip for exam simulation.
- `Quiz.answer_revision_window`: allow answer change for X seconds after submit.
- `Quiz.partial_credit_model`: grant partial points for partially correct response.
- `Quiz.multi_answer_required`: require all correct options for full credit.
- `Quiz.confidence_scoring`: incorporate learner confidence into scoring.
- `Quiz.distraction_injection`: add plausible distractors for depth testing.
- `Quiz.timebank_system`: carry leftover time to later questions.
- `Quiz.progressive_unlock`: unlock harder questions after streak threshold.
- `Quiz.question_decay`: downrank poorly performing question items over time.

### 6.4 Sources
- `Sources.wikipedia_enabled`: allow Wikipedia as optional external source.
- `Sources.wikipedia_depth`: choose summary-only vs section-level extraction.
- `Sources.youtube_transcript_enabled`: include transcript context from video URLs.
- `Sources.pdf_extraction_mode`: choose `fast_text`, `layout_aware`, `ocr_strict`.
- `Sources.citation_required`: require citation trace for generated claims/questions.
- `Sources.max_sources_per_run`: cap source count for performance and cost control.
- `Sources.source_weighting`: prioritize source classes (class docs > web, etc.).
- `Sources.staleness_filter_days`: filter out stale web sources by age.
- `Sources.fact_conflict_detection`: detect and surface conflicting source claims.
- `Sources.cross_language_search`: include multilingual retrieval automatically.
- `Sources.contradiction_resolution_mode`: choose single-resolution vs multi-view output.
- `Sources.source_traceback`: click-through to exact originating source sentence span.
- `Sources.live_update_mode`: refresh downstream content when source changes.
- `Sources.bias_detection`: flag potentially biased or low-balance sources.
- `Sources.context_window_priority`: prioritize highest-value chunks first in model context.

### 6.5 Visuals
- `Visuals.images_in_questions`: include image assets in question flow.
- `Visuals.image_style`: set style (`photo`, `diagram`, `schematic`, `minimal`).
- `Visuals.timeline_embed_mode`: embed mini timelines inside relevant questions.
- `Visuals.custom_diagram_generation`: auto-generate diagrams from source structure.
- `Visuals.wordweb_density`: tune node/edge density for clarity.
- `Visuals.canvas_snap_grid`: snap movable items to grid for clean editing.
- `Visuals.color_accessibility_profile`: enforce contrast/color-blind-safe palettes.
- `Visuals.annotation_layers`: split annotations into user/teacher/shared layers.
- `Visuals.print_friendly_mode`: optimize visuals for print/export.
- `Visuals.focus_mode`: isolate only visual regions relevant to active question.
- `Visuals.progressive_reveal`: reveal visual complexity step-by-step.
- `Visuals.interaction_required`: require click/move interactions during explanation.
- `Visuals.memory_overlay`: overlay prior visuals for continuity.
- `Visuals.auto_simplification`: simplify visuals based on learner level.
- `Visuals.spatial_quiz_mode`: score answers based on spatial relationships in diagrams.

### 6.6 Timeline
- `Timeline.range_start_end`: force explicit timeline bounds (e.g., 1729-1829).
- `Timeline.scale_mode`: switch time scale (year/month/day/log).
- `Timeline.auto_cluster_events`: cluster dense periods to preserve readability.
- `Timeline.dependency_visibility`: show/hide relation arrows by type.
- `Timeline.lane_auto_assignment`: auto-assign events to semantic lanes.
- `Timeline.conflict_highlighting`: mark overlap/conflict events.
- `Timeline.era_presets`: apply era presets quickly.
- `Timeline.zoom_behavior`: define zoom semantics and snapping.
- `Timeline.date_precision_policy`: enforce known precision level by source quality.
- `Timeline.alt_hypothesis_layer`: enable alternate interpretation layers.
- `Timeline.causality_strength`: visualize strength/confidence of causal links.
- `Timeline.alt_paths`: show counterfactual timeline branches.
- `Timeline.event_importance_score`: rank by impact instead of chronology.
- `Timeline.zoom_focus_lock`: keep selected theme centered while zooming.
- `Timeline.multi_user_overlay`: compare timelines across users/groups.

### 6.7 Flashcards
- `Flashcards.time_per_card_seconds`: set timer per card for drill modes.
- `Flashcards.auto_flip_delay_ms`: auto-flip after configured delay.
- `Flashcards.bury_siblings_policy`: defer adjacent/similar cards.
- `Flashcards.leech_threshold`: auto suspend chronic-fail cards.
- `Flashcards.graduation_steps`: define new-card learning steps.
- `Flashcards.review_fuzz_level`: randomize intervals slightly to avoid rhythm bias.
- `Flashcards.audio_pronunciation_enabled`: play pronunciation where relevant.
- `Flashcards.reverse_card_ratio`: control ratio of reversed prompts.
- `Flashcards.context_sentence_required`: enforce contextual usage examples.
- `Flashcards.context_switch_penalty`: harden next card after topic switches.
- `Flashcards.memory_strength_meter`: show visual memory-strength indicator.
- `Flashcards.active_recall_only`: force typed recall instead of recognition.
- `Flashcards.interleaving_mode`: intentionally mix domains/topics.
- `Flashcards.semantic_linking`: link cards by meaning graph, not only tags.
- `Flashcards.error_tagging`: tag misses by error-type taxonomy.

### 6.8 Notes
- `Notes.capture_mode`: choose lecture/live/revision/research capture profile.
- `Notes.auto_outline_depth`: tune hierarchy depth.
- `Notes.keyterm_density`: tune key-term extraction frequency.
- `Notes.question_generation_inline`: inject check questions within notes.
- `Notes.claim_evidence_pairs`: pair each key claim with supporting evidence.
- `Notes.readability_target_grade`: enforce target readability level.
- `Notes.counterargument_injection`: inject counterpoints for deeper understanding.
- `Notes.summary_variants`: output short/medium/long summary variants.
- `Notes.to_quiz_strict_mapping`: map note blocks to generated questions.
- `Notes.live_collaboration`: real-time collaborative note editing.
- `Notes.auto_gap_detection`: detect missing or underdeveloped sections.
- `Notes.semantic_zoom`: move between macro overview and detail layer.
- `Notes.argument_map_mode`: represent reasoning chains visually.
- `Notes.redundancy_cleanup`: auto-remove duplicated content.
- `Notes.exam_prediction`: estimate likely exam-question clusters.

### 6.9 Community
- `Community.idea_to_poll_pipeline`: explicit lifecycle from idea to shipped.
- `Community.poll_window_days`: fixed voting windows with predictable cadence.
- `Community.vote_weight_model`: select vote weighting policy.
- `Community.admin_curation_queue`: moderation queue with duplicate handling.
- `Community.public_roadmap_link`: connect winning ideas to roadmap visibility.
- `Community.feedback_after_ship`: collect post-ship feedback on implemented polls.
- `Community.experiment_flags`: release winning ideas behind gradual flags first.
- `Community.challenge_creation`: users create structured challenges with rules.
- `Community.leaderboard_decay`: decay old scores to keep leaderboard fresh.
- `Community.content_forking`: fork and improve existing shared sets/notes.
- `Community.trending_topics`: show what subjects/features trend now.
- `Community.skill_matching`: match users by ability/goal compatibility.
- `Community.review_rewards`: reward high-quality reviews and feedback.

### 6.10 Safety / System
- `Safety.mode_guardrails`: hide settings irrelevant to active tool/mode.
- `Safety.plan_limit_awareness`: clearly show plan limits without disruptive flow breaks.
- `Safety.session_recovery`: recover exact session state after refresh/crash.
- `Safety.audit_log_detail`: log active settings snapshot per run.
- `Safety.cheat_detection_signals`: detect suspicious timing/accuracy patterns.
- `Safety.teacher_override_pack`: class-level enforced setting packs.
- `Safety.anomaly_session_flag`: flag statistically abnormal sessions.
- `Safety.rollback_state`: revert to previous stable state after failure.
- `Safety.setting_conflict_detector`: warn on conflicting/invalid setting combos.
- `Safety.performance_budget`: disable heavy features on low-end devices.
- `Safety.offline_mode`: support cached offline study path.

## 7) Deferred quiz grading + source-citation architecture (PROPOSED — NOT implemented, needs decision)

Requested 2026-06-20. User considers this very important: "if the answers/questions
aren't good, the quiz is completely pointless." Do NOT implement until the user
explicitly picks an approach below — they asked for alternatives before building.

### Problem with current behavior
Quiz generation grades/produces answers eagerly at the same time questions are
generated. User wants this deferred to end-of-run grading for 3 reasons:
1. No security risk from exposing grading info early (less surface for leaking
   correct answers to the client before the run is over).
2. Open/short-answer questions can be graded by AI at the end just as well.
3. Sending plain input text is far cheaper than doing a full grading round-trip
   per question at generation time.

### Exception: immediate-feedback mode
The existing `answerFeedback` setting (`'end' | 'immediate'`, quiz/page.tsx) already
controls this. If `answerFeedback === 'immediate'`, grade that one question
right away (per-question), not batched. If `'end'`, batch all grading to the
final results screen.

### Core flow (as proposed by user)
- At generation time, every question carries one of two things depending on quiz mode:
  - **Literal mode** (questions must literally come from the source): the AI
    does NOT write an answer. Instead, the source text is pre-split into numbered
    chunks before generation (see chunking scheme below), and the AI returns which
    chunk number(s) are relevant to the answer, e.g. `relevant: [1, 2]`. At grading
    time, the system looks up the literal text of those chunks and sends
    `question + cited chunk text + student's answer` to a grading LLM call.
  - **Research mode** (answer may go beyond the literal source): chunk citation
    isn't enough since the answer isn't confined to one passage. The AI instead
    writes a `suggested_answer` at generation time — as short as possible while
    still being a complete, understandable reference — carried alongside the
    question to the deferred grading step. Purpose: stop the grading AI from
    hallucinating what's correct.
  - User is NOT fully sold on `suggested_answer` as the right shape for this and
    explicitly asked for alternatives before building (see "Alternatives" below).

### Chunking scheme (literal mode source numbering)
Example given by user: split input into numbered parts, e.g. every ~2 sentences,
one photo, or one uploaded file = one chunk:
```
1(Netherlands is a beautiful country. Netherlands loves football)2(John loves pizza. Lisa loves fries)
```
`1` = everything between its parens, `2` = everything between its parens, etc.
User flagged that "every 2 sentences" is an arbitrary guess and asked to find a
better chunking heuristic — recommendation: chunk by semantic/paragraph boundary
up to a token budget (e.g. ~40-60 tokens per chunk) instead of a fixed sentence
count, so chunks are neither too granular (excess citation overhead) nor too
coarse (citing irrelevant surrounding text). Non-text sources (1 photo, 1 file)
each get their own chunk number regardless of size.

### Grading must resist manipulation, but allow legitimate leniency
- The grading prompt must be hardened so it can NEVER be swayed by surface-level
  appeals in the student's answer text (e.g. "I learned this so just mark it
  right"). This must be explicit and emphatic in the system prompt.
- Minor non-substantive mistakes (e.g. spelling) CAN be forgiven — grading should
  be semantic/subjective, not exact-string-match, governed by a careful rubric
  prompt.
- Language-mismatch leniency: if a student answers in a different language than
  expected and the quiz subject is NOT about that language itself (e.g. a quiz
  about Dutch geography), that's acceptable, and the app should surface the
  existing "switch app language to X?" notification (already built — just needs
  to deep-link into Settings → Language). If the quiz IS about a language (e.g.
  a German-vocabulary quiz) answering in French must NOT be auto-accepted, since
  the language itself is the thing being tested. Implementation idea: a short,
  explicit rule appended to the grading prompt when the quiz topic is
  language-itself, e.g. "this test is about a language — do not grade answers
  written in a different language as correct." Not foolproof, but better than
  nothing.

### Detailed chunking & input encoding scheme (literal mode)

Pre-process source text into numbered chunks before generation. Each chunk is ~40–60 tokens
(semantic/paragraph boundaries, not fixed sentence counts). Non-text inputs (photos, files)
each get their own chunk number regardless of size. Chunks are encoded as:

```
1(Netherlands is a beautiful country. Netherlands loves football)
2(John loves pizza. Lisa loves fries)
...
```

Where:
- `1`, `2`, etc. are chunk identifiers.
- Everything between parentheses is the chunk content.
- Chunks are identified by exact parenthesis-pair boundaries.
- Length/semantic coherence of each chunk is important; algorithmic chunking (token
  budget + paragraph boundaries) should be favored over "every 2 sentences."

**During question generation (literal mode):**
When the AI generates a question whose correct answer must come literally from the source,
instead of writing a `suggested_answer`, the AI returns chunk indices, e.g.:
```json
{
  "question": "Which countries does this text mention?",
  "relevant": [1, 2],
  "answer_type": "short"
}
```

**System behavior:**
When the student submits an answer, the system retrieves the chunks cited in `relevant`
(e.g., chunks 1 and 2) and sends them verbatim to the grading LLM along with the student's
answer and the question. This ensures grading stays grounded in source text.

**During question generation (research mode):**
The AI writes a `suggested_answer` — as short as possible while still being a complete,
understandable reference — because the answer extends beyond a single passage and chunking
won't suffice. This is carried to the grading step to anchor grading and prevent the grader
from hallucinating what's "correct."

### Alternatives to `suggested_answer` (user asked for these before deciding)

- **(A) User's original proposal** — research mode: free-text `suggested_answer`
  string carried to grading. Literal mode: chunk-citation indices only.
  Risk: a single canonical phrasing can bias the grader against a correct
  answer phrased differently, and if the generation-time AI got the
  `suggested_answer` itself subtly wrong, that error propagates uncorrected
  into every grading call for that question.

- **(B) Always cite + short "reasoning notes"** — use chunk citations in both
  modes (research mode chunks may just be empty/sparse since the answer extends
  beyond source), and replace `suggested_answer` with a short, internal-only
  `reasoning_notes` field that explains why a fact is true rather than asserting
  one canonical phrasing. The grading LLM uses cited source text + reasoning
  notes + rubric, never a single fixed "the answer is X" string.

- **(C, recommended) Acceptance-criteria list instead of one suggested answer** —
  at generation time, instead of one `suggested_answer` string, produce a short
  list of 1–3 required facts/keywords the answer must contain (e.g.
  `criteria: ["mentions 1842", "mentions the Treaty of ..."]`). Grading checks each
  criterion against the student's answer rather than fuzzy-matching one
  reference phrasing. More robust for open/short-answer grading, more resistant
  to "trust me" social engineering (correctness is criteria-based, not
  plausibility-based), and combines cleanly with literal-mode chunk citations for
  full traceability (teacher review / audit later).

- **Decision pending:** User must pick (A), (B), (C), or a hybrid before implementation.
  Until then, current (eager, non-deferred) grading behavior stays as-is.

### Grading rubric & anti-manipulation hardening

**Semantic vs. literal grading:**
- Grading must be **subjective**, not exact-match. If a student spells "Netherlands" as
  "Ntherlands" but clearly means the same country, mark it correct.
- Minor non-substantive mistakes (spelling, grammar, punctuation) CAN be forgiven.
- The grading prompt must be explicit and emphatic: it can NEVER be swayed by
  surface-level appeals like "I learned this so mark it right." This is a critical
  anti-manipulation safeguard.

**Language-mismatch leniency:**
- If all answers are in a different language than expected, and the quiz subject is NOT
  about that language itself (e.g., "Geography of the Netherlands"), surface an in-app
  notification: "Detected answers in [language]. Switch app language?" Clicking this
  deep-links to Settings → Language Preferences. This UX already exists.
- **Exception:** If the quiz IS about a language (e.g., "German Vocabulary"), answering in
  French must NOT be auto-accepted since the language itself is the thing being tested.
  Add a rule to the grading prompt: "This test is about [language] — do not grade answers
  written in a different language as correct unless they are quotes or proper nouns."
  (Not foolproof, but better than nothing.)

### Special cases for `answerFeedback` setting

- If `answerFeedback === 'immediate'`: Grade and return feedback for that one question
  right away, per-question, not batched.
- If `answerFeedback === 'end'` (default): Collect all answers and defer grading to the
  final results screen. Batch-grade all questions in one API call to reduce cost and
  improve consistency.

## 8) Analytics for students AND teachers (reminder — not specced yet)

Requested 2026-06-20, to revisit once the end-of-quiz results/analytics layout
pass is done. User wants:
- Students to be able to revisit their own past results for a quiz/flashcards
  run later (re-see the end screen), not just immediately after finishing.
- Some way to act on that historical result afterward — user's words: "build
  new tools about that to finish it 100%" — vague/aspirational, not yet
  specced. Needs a follow-up conversation before scoping.
- Applies to both the student-facing and teacher-facing analytics views.

## 9) Typography rules: bold, caps, font-weight (living standard)

**Status:** Partially applied (main user-facing pages cleaned); full enforcement is a living
rule applied incrementally as files are touched.

**Rule (clarified 2026-06-20):**
- **No `font-bold`, `font-semibold`, `uppercase` Tailwind classes** as emphasis signals
  (visual weight/caps should not be the only way to show emphasis).
- **Exception for semantic/logical uses:**
  - Individual capitals mid-word (e.g., `iPhone`, `JavaScript`, `macOS`) are fine; these
    are not Tailwind classes and happen naturally in content.
  - Whole words in CAPS (e.g., "API", "PDF") are acceptable only if they are acronyms
    or standard abbreviations that are conventionally capitalized.
  - CAPS at the start of sentences or in proper nouns are fine (standard grammar).
- **When bold/caps WAS the emphasis signal:** bump text size one step (e.g.,
  `text-[13px]` → `text-[14px]` or `text-[15px]`) instead. Larger, clearer text is
  the preferred emphasis method app-wide.
- **Files still containing these classes (2026-06-20):**
  - `export-toolbar.tsx` and `grade-export.ts`: contain raw CSS strings (PDF export);
    Tailwind classes don't apply. Left as-is.
  - Other files: sweep is ongoing; rule is applied per-file-touch.


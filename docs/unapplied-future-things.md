# Unapplied Future Things

Last updated: 2026-04-29

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

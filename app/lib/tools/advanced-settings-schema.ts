import { z } from "zod";

export const ToolKeys = ["quiz", "notes", "flashcards", "wordweb", "timeline"] as const;
export type ToolKey = (typeof ToolKeys)[number];

const SpeedrunSchema = z.object({
  mode_enabled: z.boolean().default(false),
  curated_only: z.boolean().default(true),
  timer_start_rule: z.enum(["first_input", "first_question_visible", "first_interaction"]).default("first_interaction"),
  timer_end_rule: z.enum(["last_answer_submitted", "results_screen_open", "manual_stop"]).default("last_answer_submitted"),
  global_timer_seconds: z.number().int().min(10).max(7200).default(300),
  per_question_timer_seconds: z.number().int().min(3).max(600).default(25),
  unlimited_timer_mode: z.boolean().default(false),
  auto_pause_on_tab_blur: z.boolean().default(true),
  pause_budget_seconds: z.number().int().min(0).max(600).default(30),
  seed_lock: z.boolean().default(true),
  run_validation_level: z.enum(["casual", "ranked", "verified"]).default("casual"),
  ghost_replay_download: z.boolean().default(false),
  dynamic_split_reorder: z.boolean().default(false),
  fail_restart_policy: z.boolean().default(false),
  perfect_run_flag: z.boolean().default(true),
  input_latency_compensation: z.boolean().default(true),
  multi_attempt_session: z.boolean().default(true),
  route_variants: z.boolean().default(false),
});

const AdaptiveTimerSchema = z.object({
  enabled: z.boolean().default(false),
  base_seconds: z.number().int().min(3).max(300).default(30),
  reading_speed_wpm: z.number().int().min(60).max(500).default(220),
  known_topic_discount_pct: z.number().int().min(0).max(80).default(20),
  uncertain_topic_bonus_pct: z.number().int().min(0).max(150).default(35),
  question_complexity_weight: z.number().min(0).max(3).default(1),
  media_bonus_seconds: z.number().int().min(0).max(180).default(8),
  min_seconds: z.number().int().min(2).max(180).default(8),
  max_seconds: z.number().int().min(5).max(600).default(90),
  confidence_feedback_loop: z.boolean().default(true),
  streak_acceleration: z.boolean().default(true),
  fail_slowdown: z.boolean().default(true),
  fatigue_detection: z.boolean().default(true),
  session_phase_scaling: z.boolean().default(true),
  user_goal_alignment: z.enum(["balanced", "speed", "mastery"]).default("balanced"),
  hesitation_detection: z.boolean().default(true),
  reading_pattern_tracking: z.boolean().default(true),
  device_adjustment: z.boolean().default(true),
});

const QuizSchema = z.object({
  answer_revision_window_seconds: z.number().int().min(0).max(60).default(5),
  partial_credit_model: z.boolean().default(false),
  multi_answer_required: z.boolean().default(false),
  confidence_scoring: z.boolean().default(false),
  distraction_injection: z.boolean().default(false),
  timebank_system: z.boolean().default(false),
  progressive_unlock: z.boolean().default(false),
  progressive_unlock_streak: z.number().int().min(2).max(20).default(4),
  question_decay: z.boolean().default(true),
  question_mix_profile: z.enum(["balanced", "mcq_heavy", "open_heavy", "mixed"]).default("balanced"),
  difficulty_curve: z.enum(["mixed", "easy_to_hard", "hard_to_easy"]).default("mixed"),
  retry_policy: z.enum(["immediate", "end_of_round", "none"]).default("end_of_round"),
  hint_policy: z.enum(["off", "limited", "full"]).default("limited"),
  scoring_model: z.enum(["accuracy", "speed_weighted", "negative_marking", "mastery_points"]).default("accuracy"),
  answer_shuffle_level: z.enum(["none", "answers", "questions", "both"]).default("both"),
  exam_lock_mode: z.boolean().default(false),
  source_policy: z.enum(["normal", "source_required"]).default("normal"),
});

const SourcesSchema = z.object({
  wikipedia_enabled: z.boolean().default(false),
  wikipedia_depth: z.enum(["summary_only", "section_level", "full_article_chunks"]).default("summary_only"),
  youtube_transcript_enabled: z.boolean().default(true),
  cross_language_search: z.boolean().default(false),
  contradiction_resolution_mode: z.enum(["single_resolution", "multi_interpretation"]).default("single_resolution"),
  source_traceback: z.boolean().default(true),
  live_update_mode: z.boolean().default(false),
  bias_detection: z.boolean().default(true),
  context_window_priority: z.enum(["balanced", "highest_value_first"]).default("highest_value_first"),
  max_sources_per_run: z.number().int().min(1).max(30).default(8),
});

const VisualsSchema = z.object({
  images_in_questions: z.boolean().default(false),
  image_style: z.enum(["photo", "diagram", "schematic", "minimal"]).default("diagram"),
  timeline_embed_mode: z.boolean().default(false),
  custom_diagram_generation: z.boolean().default(false),
  wordweb_density: z.number().int().min(8).max(240).default(80),
  focus_mode: z.boolean().default(false),
  progressive_reveal: z.boolean().default(false),
  interaction_required: z.boolean().default(false),
  memory_overlay: z.boolean().default(false),
  auto_simplification: z.boolean().default(true),
  spatial_quiz_mode: z.boolean().default(false),
});

const TimelineSchema = z.object({
  range_start_year: z.number().int().min(-5000).max(5000).default(1800),
  range_end_year: z.number().int().min(-5000).max(5000).default(2100),
  scale_mode: z.enum(["year", "month", "day", "log"]).default("year"),
  causality_strength: z.boolean().default(true),
  alt_paths: z.boolean().default(false),
  event_importance_score: z.boolean().default(false),
  zoom_focus_lock: z.boolean().default(true),
  multi_user_overlay: z.boolean().default(false),
});

const FlashcardsSchema = z.object({
  time_per_card_seconds: z.number().int().min(0).max(600).default(0),
  auto_flip_delay_ms: z.number().int().min(0).max(30000).default(0),
  active_recall_only: z.boolean().default(false),
  interleaving_mode: z.boolean().default(true),
  semantic_linking: z.boolean().default(true),
  error_tagging: z.boolean().default(true),
  memory_strength_meter: z.boolean().default(true),
});

const NotesSchema = z.object({
  live_collaboration: z.boolean().default(false),
  auto_gap_detection: z.boolean().default(true),
  semantic_zoom: z.boolean().default(false),
  argument_map_mode: z.boolean().default(false),
  redundancy_cleanup: z.boolean().default(true),
  exam_prediction: z.boolean().default(false),
});

const SafetySchema = z.object({
  setting_conflict_detector: z.boolean().default(true),
  anomaly_session_flag: z.boolean().default(true),
  rollback_state: z.boolean().default(true),
  performance_budget: z.enum(["auto", "low", "medium", "high"]).default("auto"),
  offline_mode: z.boolean().default(false),
});

export const AdvancedToolSettingsSchema = z.object({
  version: z.literal(1).default(1),
  updatedAt: z.string().optional(),
  speedrun: SpeedrunSchema.default({}),
  adaptiveTimer: AdaptiveTimerSchema.default({}),
  quiz: QuizSchema.default({}),
  sources: SourcesSchema.default({}),
  visuals: VisualsSchema.default({}),
  timeline: TimelineSchema.default({}),
  flashcards: FlashcardsSchema.default({}),
  notes: NotesSchema.default({}),
  safety: SafetySchema.default({}),
});

export type AdvancedToolSettings = z.infer<typeof AdvancedToolSettingsSchema>;

export const DEFAULT_ADVANCED_TOOL_SETTINGS: AdvancedToolSettings = AdvancedToolSettingsSchema.parse({});

function deepMerge(base: any, patch: any): any {
  if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base;
  if (typeof base !== "object" || base === null) return patch ?? base;
  if (typeof patch !== "object" || patch === null) return base;
  const out: Record<string, any> = { ...base };
  for (const key of Object.keys(patch)) {
    out[key] = deepMerge(base[key], patch[key]);
  }
  return out;
}

export function mergeAdvancedToolSettings(
  current: AdvancedToolSettings | null | undefined,
  patch: Partial<AdvancedToolSettings>
): AdvancedToolSettings {
  const merged = deepMerge(current || DEFAULT_ADVANCED_TOOL_SETTINGS, patch || {});
  return AdvancedToolSettingsSchema.parse({
    ...merged,
    version: 1,
    updatedAt: new Date().toISOString(),
  });
}

export type SettingsConflict = {
  key: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export function detectAdvancedSettingsConflicts(
  settings: AdvancedToolSettings,
  context?: { isLiveGeneratedQuiz?: boolean; tool?: ToolKey }
): SettingsConflict[] {
  const conflicts: SettingsConflict[] = [];

  if (settings.speedrun.mode_enabled && settings.speedrun.curated_only && context?.isLiveGeneratedQuiz) {
    conflicts.push({
      key: "speedrun.mode_enabled",
      severity: "error",
      message: "Speedrun is restricted to curated/fixed sets and cannot run on live-generated quizzes.",
    });
  }
  if (settings.speedrun.unlimited_timer_mode && settings.speedrun.run_validation_level !== "casual") {
    conflicts.push({
      key: "speedrun.unlimited_timer_mode",
      severity: "warning",
      message: "Unlimited timer is only fair in casual validation mode.",
    });
  }
  if (settings.adaptiveTimer.enabled && settings.quiz.scoring_model === "speed_weighted" && settings.adaptiveTimer.user_goal_alignment === "mastery") {
    conflicts.push({
      key: "adaptiveTimer.user_goal_alignment",
      severity: "info",
      message: "Mastery-aligned adaptive timer may conflict with speed-weighted scoring goals.",
    });
  }
  if (settings.visuals.spatial_quiz_mode && !settings.visuals.images_in_questions) {
    conflicts.push({
      key: "visuals.spatial_quiz_mode",
      severity: "warning",
      message: "Spatial quiz mode requires images/diagrams enabled.",
    });
  }
  if (settings.timeline.range_end_year < settings.timeline.range_start_year) {
    conflicts.push({
      key: "timeline.range_end_year",
      severity: "error",
      message: "Timeline end year must be greater than or equal to start year.",
    });
  }
  if (context?.tool === "wordweb" && settings.flashcards.time_per_card_seconds > 0) {
    conflicts.push({
      key: "flashcards.time_per_card_seconds",
      severity: "info",
      message: "Flashcard timer does not apply to Wordweb mode.",
    });
  }

  return conflicts;
}

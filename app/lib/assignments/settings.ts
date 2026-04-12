export type AssignmentType = 'homework' | 'small_test' | 'big_test' | 'other';

export type FeedbackReleaseMode = 'per_question' | 'after_submit' | 'after_deadline';
export type AttemptScoreMode = 'best' | 'latest';
export type TimerMode = 'deadline' | 'per_student';
export type GradeDisplayMode = 'score' | 'points';

export interface AssignmentSettings {
  time: {
    startAt: string | null;
    endAt: string | null;
    durationMinutes: number | null;
    autoSubmitOnTimeout: boolean;
    timerMode: TimerMode;
    showTimer: boolean;
  };
  attempts: {
    maxAttempts: number | null;
    scoreMode: AttemptScoreMode;
    cooldownMinutes: number;
  };
  access: {
    allowedClassIds: string[];
    accessCode: string | null;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    shuffleQuestionsPerStudent: boolean;
  };
  grading: {
    autoGrade: boolean;
    manualReviewOpenQuestions: boolean;
    feedbackReleaseMode: FeedbackReleaseMode;
    showCorrectAnswers: boolean;
    showPoints: boolean;
    totalPoints: number;
    weight: number;
    gradeDisplayMode: GradeDisplayMode;
    roundingDecimals: number;
  };
  antiCheat: {
    requireFullscreen: boolean;
    detectTabSwitch: boolean;
    perQuestionTimeLimitSeconds: number | null;
    restrictIpOrDevice: boolean;
  };
  delivery: {
    autosave: boolean;
    allowResume: boolean;
    instructionText: string;
  };
  advanced: {
    questionPoolSize: number | null;
    adaptiveEnabled: boolean;
    adaptiveRules: Array<{ when: string; then: string }>;
    reviewModeEnabled: boolean;
    reflectionEnabled: boolean;
    improvementAttemptEnabled: boolean;
  };
}

export interface BlockRubricCriterion {
  id: string;
  label: string;
  points: number;
}

export interface BlockSettings {
  points: number;
  required: boolean;
  feedbackText: string;
  hints: string[];
  timeLimitSeconds: number | null;
  randomPosition: boolean;
  tags: string[];
  openQuestion: {
    modelAnswer: string;
    maxWords: number | null;
    maxChars: number | null;
    spellcheck: boolean;
    allowFileUpload: boolean;
    plagiarismCheck: boolean;
    rubric: BlockRubricCriterion[];
  };
  multipleChoice: {
    allowMultipleCorrect: boolean;
    shuffleOptions: boolean;
    partialCredit: boolean;
    negativeScoring: boolean;
    feedbackPerOption: boolean;
    scoringMode: 'all_or_nothing' | 'partial';
  };
  numeric: {
    exactMatch: boolean;
    tolerance: number;
    requiredUnit: string | null;
    alternateAnswers: string[];
    roundingDecimals: number | null;
  };
  matching: {
    shuffleItems: boolean;
    partialScoring: boolean;
    maxAttemptsInQuestion: number | null;
  };
  media: {
    mustWatchBeforeAnswer: boolean;
    revealDelaySeconds: number;
    interactionCheckpoints: number[];
  };
}

export const DEFAULT_ASSIGNMENT_SETTINGS: AssignmentSettings = {
  time: {
    startAt: null,
    endAt: null,
    durationMinutes: null,
    autoSubmitOnTimeout: true,
    timerMode: 'deadline',
    showTimer: true,
  },
  attempts: {
    maxAttempts: 1,
    scoreMode: 'best',
    cooldownMinutes: 0,
  },
  access: {
    allowedClassIds: [],
    accessCode: null,
    shuffleQuestions: false,
    shuffleAnswers: false,
    shuffleQuestionsPerStudent: false,
  },
  grading: {
    autoGrade: true,
    manualReviewOpenQuestions: true,
    feedbackReleaseMode: 'after_submit',
    showCorrectAnswers: true,
    showPoints: true,
    totalPoints: 100,
    weight: 1,
    gradeDisplayMode: 'score',
    roundingDecimals: 1,
  },
  antiCheat: {
    requireFullscreen: false,
    detectTabSwitch: false,
    perQuestionTimeLimitSeconds: null,
    restrictIpOrDevice: false,
  },
  delivery: {
    autosave: true,
    allowResume: true,
    instructionText: '',
  },
  advanced: {
    questionPoolSize: null,
    adaptiveEnabled: false,
    adaptiveRules: [],
    reviewModeEnabled: true,
    reflectionEnabled: false,
    improvementAttemptEnabled: false,
  },
};

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  points: 1,
  required: false,
  feedbackText: '',
  hints: [],
  timeLimitSeconds: null,
  randomPosition: false,
  tags: [],
  openQuestion: {
    modelAnswer: '',
    maxWords: null,
    maxChars: null,
    spellcheck: true,
    allowFileUpload: false,
    plagiarismCheck: false,
    rubric: [],
  },
  multipleChoice: {
    allowMultipleCorrect: false,
    shuffleOptions: false,
    partialCredit: true,
    negativeScoring: false,
    feedbackPerOption: false,
    scoringMode: 'partial',
  },
  numeric: {
    exactMatch: true,
    tolerance: 0,
    requiredUnit: null,
    alternateAnswers: [],
    roundingDecimals: null,
  },
  matching: {
    shuffleItems: false,
    partialScoring: true,
    maxAttemptsInQuestion: null,
  },
  media: {
    mustWatchBeforeAnswer: false,
    revealDelaySeconds: 0,
    interactionCheckpoints: [],
  },
};

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, input: unknown): T {
  if (!isObject(base) || !isObject(input)) return base;
  const output: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      output[key] = value;
      continue;
    }
    if (isObject(value) && isObject((output as any)[key])) {
      output[key] = mergeDeep((output as any)[key], value);
      continue;
    }
    output[key] = value;
  }
  return output as T;
}

export function normalizeAssignmentSettings(input: unknown): AssignmentSettings {
  const merged = mergeDeep(DEFAULT_ASSIGNMENT_SETTINGS, input);
  merged.time.durationMinutes = numberOrNull(merged.time.durationMinutes);
  merged.attempts.maxAttempts = numberOrNull(merged.attempts.maxAttempts);
  merged.attempts.cooldownMinutes = numberOrZero(merged.attempts.cooldownMinutes);
  merged.grading.totalPoints = numberOr(merged.grading.totalPoints, 100);
  merged.grading.weight = numberOr(merged.grading.weight, 1);
  merged.grading.roundingDecimals = numberOr(merged.grading.roundingDecimals, 1);
  merged.antiCheat.perQuestionTimeLimitSeconds = numberOrNull(merged.antiCheat.perQuestionTimeLimitSeconds);
  merged.advanced.questionPoolSize = numberOrNull(merged.advanced.questionPoolSize);
  merged.access.allowedClassIds = Array.isArray(merged.access.allowedClassIds) ? merged.access.allowedClassIds.filter(Boolean) : [];
  return merged;
}

export function normalizeBlockSettings(input: unknown): BlockSettings {
  const merged = mergeDeep(DEFAULT_BLOCK_SETTINGS, input);
  merged.points = numberOr(merged.points, 1);
  merged.timeLimitSeconds = numberOrNull(merged.timeLimitSeconds);
  merged.openQuestion.maxWords = numberOrNull(merged.openQuestion.maxWords);
  merged.openQuestion.maxChars = numberOrNull(merged.openQuestion.maxChars);
  merged.numeric.tolerance = numberOr(merged.numeric.tolerance, 0);
  merged.numeric.roundingDecimals = numberOrNull(merged.numeric.roundingDecimals);
  merged.media.revealDelaySeconds = numberOr(merged.media.revealDelaySeconds, 0);
  merged.matching.maxAttemptsInQuestion = numberOrNull(merged.matching.maxAttemptsInQuestion);
  merged.hints = Array.isArray(merged.hints) ? merged.hints.filter((v) => typeof v === 'string') : [];
  merged.tags = Array.isArray(merged.tags) ? merged.tags.filter((v) => typeof v === 'string') : [];
  merged.numeric.alternateAnswers = Array.isArray(merged.numeric.alternateAnswers)
    ? merged.numeric.alternateAnswers.filter((v) => typeof v === 'string')
    : [];
  merged.media.interactionCheckpoints = Array.isArray(merged.media.interactionCheckpoints)
    ? merged.media.interactionCheckpoints.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
    : [];
  merged.openQuestion.rubric = Array.isArray(merged.openQuestion.rubric)
    ? merged.openQuestion.rubric
      .filter((r) => isObject(r))
      .map((r: any) => ({
        id: String(r.id || cryptoRandomId()),
        label: String(r.label || ''),
        points: Number.isFinite(Number(r.points)) ? Number(r.points) : 0,
      }))
    : [];
  return merged;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type AssignmentAvailabilityState = {
  available: boolean;
  reason: 'ok' | 'not_started' | 'ended';
};

export function getAssignmentAvailabilityState(settings: AssignmentSettings, nowIso = new Date().toISOString()): AssignmentAvailabilityState {
  const now = new Date(nowIso).getTime();
  if (settings.time.startAt) {
    const start = new Date(settings.time.startAt).getTime();
    if (Number.isFinite(start) && now < start) return { available: false, reason: 'not_started' };
  }
  if (settings.time.endAt) {
    const end = new Date(settings.time.endAt).getTime();
    if (Number.isFinite(end) && now > end) return { available: false, reason: 'ended' };
  }
  return { available: true, reason: 'ok' };
}

export function canReleaseFeedback(settings: AssignmentSettings, hasSubmitted: boolean, nowIso = new Date().toISOString()): boolean {
  const mode = settings.grading.feedbackReleaseMode;
  if (mode === 'per_question') return true;
  if (mode === 'after_submit') return hasSubmitted;
  if (!settings.time.endAt) return false;
  const now = new Date(nowIso).getTime();
  const end = new Date(settings.time.endAt).getTime();
  return Number.isFinite(end) && now >= end;
}

export function calculateMcqScore(
  selectedOptionIds: string[],
  options: Array<{ id: string; correct?: boolean }>,
  settings: BlockSettings,
): { score: number; isCorrect: boolean } {
  const correctIds = new Set(options.filter((o) => !!o.correct).map((o) => o.id));
  const selected = new Set(selectedOptionIds);
  const selectedCorrect = [...selected].filter((id) => correctIds.has(id)).length;
  const selectedIncorrect = [...selected].filter((id) => !correctIds.has(id)).length;
  const totalCorrect = correctIds.size;

  if (settings.multipleChoice.scoringMode === 'all_or_nothing') {
    const allCorrect = selectedCorrect === totalCorrect && selectedIncorrect === 0;
    return { score: allCorrect ? settings.points : 0, isCorrect: allCorrect };
  }

  const basePerCorrect = totalCorrect > 0 ? settings.points / totalCorrect : settings.points;
  let score = selectedCorrect * basePerCorrect;
  if (settings.multipleChoice.negativeScoring) {
    score -= selectedIncorrect * basePerCorrect;
  }
  if (!settings.multipleChoice.partialCredit) {
    const allCorrect = selectedCorrect === totalCorrect && selectedIncorrect === 0;
    score = allCorrect ? settings.points : 0;
  }
  score = Math.max(0, Math.round(score * 1000) / 1000);
  const isCorrect = selectedCorrect === totalCorrect && selectedIncorrect === 0;
  return { score, isCorrect };
}

export function calculateFillInBlankScore(
  answers: string[],
  accepted: string[],
  caseSensitive: boolean,
  settings: BlockSettings,
): { score: number; isCorrect: boolean } {
  const normalize = (v: string) => caseSensitive ? v.trim() : v.trim().toLowerCase();
  const safeAnswers = answers.map((a) => normalize(String(a || '')));
  const safeAccepted = accepted.map((a) => normalize(String(a || '')));
  if (safeAccepted.length === 0) return { score: 0, isCorrect: false };
  let correct = 0;
  for (let i = 0; i < safeAccepted.length; i += 1) {
    if (safeAnswers[i] && safeAnswers[i] === safeAccepted[i]) correct += 1;
  }
  const fraction = correct / safeAccepted.length;
  const score = settings.multipleChoice.partialCredit ? settings.points * fraction : (fraction === 1 ? settings.points : 0);
  return { score: Math.round(score * 1000) / 1000, isCorrect: fraction === 1 };
}

export function calculateOrderingScore(
  selectedOrder: number[],
  correctOrder: number[],
  settings: BlockSettings,
): { score: number; isCorrect: boolean } {
  if (!Array.isArray(correctOrder) || correctOrder.length === 0) return { score: 0, isCorrect: false };
  let correct = 0;
  for (let i = 0; i < correctOrder.length; i += 1) {
    if (selectedOrder[i] === correctOrder[i]) correct += 1;
  }
  const fraction = correct / correctOrder.length;
  const score = settings.matching.partialScoring ? settings.points * fraction : (fraction === 1 ? settings.points : 0);
  return { score: Math.round(score * 1000) / 1000, isCorrect: fraction === 1 };
}

export function calculateDragDropScore(
  matches: Array<{ left: string; right: string }>,
  correctPairs: Array<{ left: string; right: string }>,
  settings: BlockSettings,
): { score: number; isCorrect: boolean } {
  if (!Array.isArray(correctPairs) || correctPairs.length === 0) return { score: 0, isCorrect: false };
  const normalizedMatches = new Set(matches.map((p) => `${String(p.left)}=>${String(p.right)}`));
  const normalizedCorrect = correctPairs.map((p) => `${String(p.left)}=>${String(p.right)}`);
  const correct = normalizedCorrect.filter((k) => normalizedMatches.has(k)).length;
  const fraction = correct / normalizedCorrect.length;
  const score = settings.matching.partialScoring ? settings.points * fraction : (fraction === 1 ? settings.points : 0);
  return { score: Math.round(score * 1000) / 1000, isCorrect: fraction === 1 };
}

export function calculateNumericScore(
  answer: string | number,
  expected: string | number,
  settings: BlockSettings,
): { score: number; isCorrect: boolean } {
  const ans = Number(answer);
  const exp = Number(expected);
  if (!Number.isFinite(ans) || !Number.isFinite(exp)) return { score: 0, isCorrect: false };
  const tolerance = settings.numeric.exactMatch ? 0 : Number(settings.numeric.tolerance || 0);
  const diff = Math.abs(ans - exp);
  const isCorrect = diff <= tolerance;
  return { score: isCorrect ? settings.points : 0, isCorrect };
}

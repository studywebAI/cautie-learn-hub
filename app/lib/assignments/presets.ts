import type { AssignmentSettings, AssignmentType } from '@/lib/assignments/settings';

export type AssignmentCreateKind = 'homework' | 'test';

export type AssignmentPreset = {
  id: string;
  kind: AssignmentCreateKind;
  key: string;
  estimatedTimeMin: number;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended: boolean;
  blockMix: Array<{
    type:
      | 'open_question'
      | 'multiple_choice'
      | 'fill_in_blank'
      | 'matching'
      | 'ordering'
      | 'text';
    count: number;
  }>;
  applyDefaults: (settings: AssignmentSettings) => AssignmentSettings;
};

function withHomeworkDefaults(settings: AssignmentSettings): AssignmentSettings {
  return {
    ...settings,
    time: {
      ...settings.time,
      durationMinutes: null,
      timerMode: 'deadline',
      showTimer: false,
    },
    attempts: {
      ...settings.attempts,
      maxAttempts: 3,
      scoreMode: 'best',
    },
    antiCheat: {
      ...settings.antiCheat,
      requireFullscreen: false,
      detectTabSwitch: false,
    },
    access: {
      ...settings.access,
      shuffleQuestions: false,
      shuffleAnswers: false,
    },
  };
}

function withTestDefaults(
  settings: AssignmentSettings,
  options?: {
    durationMinutes?: number;
    attemptLimit?: number;
    randomizeQuestions?: boolean;
    randomizeAnswers?: boolean;
    integrityMode?: boolean;
  }
): AssignmentSettings {
  const durationMinutes = options?.durationMinutes ?? 45;
  const attemptLimit = options?.attemptLimit ?? 1;
  const randomizeQuestions = options?.randomizeQuestions ?? true;
  const randomizeAnswers = options?.randomizeAnswers ?? true;
  const integrityMode = options?.integrityMode ?? true;

  return {
    ...settings,
    time: {
      ...settings.time,
      durationMinutes,
      timerMode: 'per_student',
      showTimer: true,
      autoSubmitOnTimeout: true,
    },
    attempts: {
      ...settings.attempts,
      maxAttempts: attemptLimit,
      scoreMode: 'latest',
      cooldownMinutes: 0,
    },
    access: {
      ...settings.access,
      shuffleQuestions: randomizeQuestions,
      shuffleAnswers: randomizeAnswers,
      shuffleQuestionsPerStudent: randomizeQuestions,
    },
    antiCheat: {
      ...settings.antiCheat,
      requireFullscreen: integrityMode,
      detectTabSwitch: integrityMode,
    },
    delivery: {
      ...settings.delivery,
      allowResume: !integrityMode,
    },
  };
}

export const ASSIGNMENT_PRESETS: AssignmentPreset[] = [
  {
    id: 'hw-concept-check',
    kind: 'homework',
    key: 'conceptCheck',
    estimatedTimeMin: 20,
    difficulty: 'easy',
    recommended: true,
    blockMix: [
      { type: 'open_question', count: 8 },
      { type: 'multiple_choice', count: 2 },
    ],
    applyDefaults: withHomeworkDefaults,
  },
  {
    id: 'hw-practice-mix',
    kind: 'homework',
    key: 'practiceMix',
    estimatedTimeMin: 30,
    difficulty: 'medium',
    recommended: true,
    blockMix: [
      { type: 'fill_in_blank', count: 6 },
      { type: 'open_question', count: 4 },
    ],
    applyDefaults: withHomeworkDefaults,
  },
  {
    id: 'test-quiz-20',
    kind: 'test',
    key: 'quiz20',
    estimatedTimeMin: 20,
    difficulty: 'medium',
    recommended: true,
    blockMix: [
      { type: 'multiple_choice', count: 12 },
      { type: 'open_question', count: 2 },
    ],
    applyDefaults: (settings) => withTestDefaults(settings, { durationMinutes: 20 }),
  },
  {
    id: 'test-chapter-45',
    kind: 'test',
    key: 'chapter45',
    estimatedTimeMin: 45,
    difficulty: 'hard',
    recommended: true,
    blockMix: [
      { type: 'multiple_choice', count: 15 },
      { type: 'open_question', count: 5 },
      { type: 'ordering', count: 2 },
    ],
    applyDefaults: (settings) => withTestDefaults(settings, { durationMinutes: 45 }),
  },
];

export function toAssignmentType(kind: AssignmentCreateKind): AssignmentType {
  return kind === 'test' ? 'small_test' : 'homework';
}

export function getPresetById(presetId: string | null | undefined): AssignmentPreset | null {
  if (!presetId) return null;
  return ASSIGNMENT_PRESETS.find((preset) => preset.id === presetId) || null;
}


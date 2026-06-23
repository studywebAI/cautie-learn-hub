// Shared types/constants for the quiz tool page and its code-split panels.
// Kept separate from page.tsx so dynamically-imported panels don't pull the
// whole page module (and its client-component bundle) back into their chunk.

export type QuizMode = 'classic' | 'assisted' | 'adaptive';
export type AnswerFeedback = 'immediate' | 'end';
export type Phase = 'input' | 'analyzing' | 'options' | 'study';

export type QuizVariant = { id: string; label: string; difficulty: 'easy' | 'medium' | 'hard' };
export type QuizTypeDefinition = {
  value: string;
  label: string;
  description: string;
  variants: QuizVariant[];
  requiresFlag?: string; // content classifier flag that must be 'y'
};

export const QUIZ_TYPE_DEFINITIONS: QuizTypeDefinition[] = [
  {
    value: 'multiple-choice',
    label: 'Multiple Choice',
    description: 'Pick the correct answer from options',
    variants: [
      { id: 'card-grid', label: 'Card Grid', difficulty: 'hard' },
      { id: 'radio-list', label: 'Radio List', difficulty: 'medium' },
      { id: 'color-blocks', label: 'Color Blocks', difficulty: 'easy' },
    ],
  },
  {
    value: 'true-false',
    label: 'True / False',
    description: 'Is the statement true or false?',
    variants: [
      { id: 'big-buttons', label: 'Big Buttons', difficulty: 'easy' },
    ],
  },
  {
    value: 'fill-blank',
    label: 'Fill in the Blank',
    description: 'Complete the missing word or phrase',
    variants: [
      { id: 'inline-type', label: 'Type Answer', difficulty: 'hard' },
    ],
  },
  {
    value: 'short-answer',
    label: 'Short Answer',
    description: 'Write a brief answer in your own words',
    variants: [
      { id: 'plain', label: 'Open Answer', difficulty: 'hard' },
      { id: 'guided', label: 'With Hints', difficulty: 'medium' },
    ],
  },
  {
    value: 'matching',
    label: 'Matching',
    description: 'Connect related items from two columns',
    variants: [
      { id: 'click-pairs', label: 'Click Pairs', difficulty: 'easy' },
      { id: 'drag-to-slot', label: 'Drag to Slot', difficulty: 'medium' },
    ],
  },
  {
    value: 'ordering',
    label: 'Ordering',
    description: 'Arrange items in the correct sequence',
    variants: [
      { id: 'click-number', label: 'Click to Number', difficulty: 'easy' },
      { id: 'drag-handles', label: 'Drag to Order', difficulty: 'medium' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'cloze',
    label: 'Cloze Test',
    description: 'Fill in the blanks within a passage',
    variants: [
      { id: 'word-bank', label: 'Word Bank', difficulty: 'easy' },
      { id: 'open', label: 'Open Type', difficulty: 'hard' },
    ],
  },
  {
    value: 'comparison-matrix',
    label: 'Comparison Matrix',
    description: 'Check which attributes apply to which items',
    variants: [
      { id: 'checkbox-grid', label: 'Checkbox Grid', difficulty: 'medium' },
    ],
  },
  {
    value: 'argument-analysis',
    label: 'Argument Analysis',
    description: 'Tag statements with their role (claim, evidence…)',
    variants: [
      { id: 'tag-statements', label: 'Tag Statements', difficulty: 'hard' },
    ],
  },
  {
    value: 'scenario',
    label: 'Scenario / Case Study',
    description: 'Read a scenario and answer the best-option question',
    variants: [
      { id: 'mcq', label: 'Multiple Choice', difficulty: 'medium' },
    ],
  },
  {
    value: 'timeline',
    label: 'Timeline',
    description: 'Place events on a chronological timeline',
    variants: [
      { id: 'multiple-choice', label: 'Timeline MCQ', difficulty: 'easy' },
      { id: 'sort', label: 'Sort Events', difficulty: 'medium' },
    ],
    requiresFlag: 'timeline',
  },
  {
    value: 'ranking',
    label: 'Ranking',
    description: 'Rank items from first to last by a given criterion',
    variants: [
      { id: 'drag-rank', label: 'Drag to Rank', difficulty: 'hard' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'drag-drop',
    label: 'Drag & Drop',
    description: 'Sort items into the correct categories (or cause → effect)',
    variants: [
      { id: 'categorize', label: 'Categorize', difficulty: 'medium' },
      { id: 'cause-effect', label: 'Cause & Effect', difficulty: 'hard' },
    ],
    requiresFlag: 'processes',
  },
  {
    value: 'venn',
    label: 'Venn Diagram',
    description: 'Place items in the correct regions of overlapping circles',
    variants: [
      { id: 'zones', label: 'Zone Assignment', difficulty: 'hard' },
    ],
    requiresFlag: 'diagrams',
  },
  {
    value: 'spot-error',
    label: 'Spot the Error',
    description: 'Click on the part of the statement that contains an error',
    variants: [
      { id: 'click-segment', label: 'Click the Error', difficulty: 'hard' },
    ],
  },
];

// Legacy flat list for backward-compat with generation input
export const QUIZ_TYPES = QUIZ_TYPE_DEFINITIONS.map((d) => ({ value: d.value, label: d.label })) as readonly { value: string; label: string }[];

export const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

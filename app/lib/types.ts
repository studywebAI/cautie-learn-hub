
import { z } from 'zod';

export type Task = {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
};

export type Alert = {
  id: string;
  title: string;
  description: string;
  variant: "destructive" | "warning" | "info" | "success";
  icon: "AlertTriangle" | "Info" | "CheckCircle2";
};

export type Deadline = {
  id: string;
  subject: string;
  title: string;
  date: string;
  workload: string;
  status: "on-track" | "risk" | "behind";
  material_id: string | null;
  class_id: string;
};

export type Subject = {
  id: string;
  name: string;
  title?: string;
  progress: number;
  classes?: { id: string; name: string }[];
  cover_image_url?: string;
  cover_type?: string;
  description?: string;
};

export type AiSuggestion = {
  id:string;
  title: string;
  content: string;
  icon: "BrainCircuit" | "FileText" | "Calendar";
};

export type QuickAccessItem = {
  id: string;
  title: string;
  type: "summary" | "quiz" | "file" | "notes";
  icon: "Notebook" | "File" | "BrainCircuit" | "FileText";
};

export type ProgressData = {
  day: string;
  'Study Time': number;
};

// Types for process-material flow
export type SuggestedAction = {
  id: 'create-a-summary' | 'generate-a-quiz' | 'make-flashcards';
  label: string;
  description: string;
  icon: 'FileText' | 'BrainCircuit' | 'BookCopy';
}

export type MaterialAnalysis = {
    title: string;
    topic: string;
    summary: string;
    sourceText: string;
}

export type ProcessMaterialResult = {
    analysis: MaterialAnalysis;
    suggestedActions: SuggestedAction[];
}

// Types for generate-quiz flow
export const QuizOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (e.g., "a", "b", "c").'),
  text: z.string().describe('The text of the answer option.'),
  isCorrect: z.boolean().optional().describe('Whether this option is the correct answer.'),
});

export const QuizQuestionTypeSchema = z.enum([
  'multiple-choice',
  'true-false',
  'fill-blank',
  'short-answer',
  'matching',
  'ordering',
  'numeric',
  'cloze',
  'hotspot',
  'comparison-matrix',
  'argument-analysis',
  'scenario',
  'internet-photo',
  'video-fragment',
  'timeline',
  'image-analysis',
  'video-analysis',
  'drawing-analysis',
  'ranking',
  'drag-drop',
  'venn',
  'spot-error',
]);

export const QuizQuestionMediaSchema = z.object({
  kind: z.enum(['image', 'video', 'drawing']),
  url: z.string(),
  title: z.string().optional(),
  source: z.string().optional(),
  startSec: z.number().int().nonnegative().optional(),
  endSec: z.number().int().positive().optional(),
});

export const QuizQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  question: z.string().describe('The text of the question.'),
  type: QuizQuestionTypeSchema.optional(),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  options: z.array(QuizOptionSchema).optional().default([]).describe('An array of possible answer options.'),
  correctOptionId: z.string().optional(),
  acceptableAnswers: z.array(z.string()).optional(),
  media: QuizQuestionMediaSchema.optional(),
  matchingPairs: z.array(z.object({
    left: z.string(),
    right: z.string(),
  })).optional(),
  orderingItems: z.array(z.string()).optional(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  // Cloze test
  clozeWordBank: z.array(z.string()).optional().describe('Word pool for cloze word-bank variant (correct answers + distractors).'),
  // Hotspot
  hotspotZones: z.array(z.object({
    id: z.string(),
    label: z.string(),
    x: z.number().describe('Left offset as % of image width (0-100).'),
    y: z.number().describe('Top offset as % of image height (0-100).'),
    width: z.number().describe('Width as % of image width (0-100).'),
    height: z.number().describe('Height as % of image height (0-100).'),
    isCorrect: z.boolean(),
  })).optional(),
  // Comparison matrix
  comparisonRows: z.array(z.string()).optional().describe('Items being compared (rows).'),
  comparisonColumns: z.array(z.string()).optional().describe('Attributes being compared (columns).'),
  comparisonCorrect: z.record(z.array(z.string())).optional().describe('Map of rowName → list of column names that apply.'),
  comparisonSingleSelect: z.boolean().optional().describe('If true each row allows only one column selection (radio). If false multiple columns can be selected (checkbox).'),
  // Argument analysis
  argumentStatements: z.array(z.object({
    id: z.string(),
    text: z.string(),
  })).optional(),
  argumentTags: z.array(z.string()).optional().describe('Tag options the user assigns to each statement.'),
  argumentCorrect: z.record(z.string()).optional().describe('Map of statement id → correct tag.'),
  // Scenario / case study
  scenarioContext: z.string().optional().describe('Scenario or case study text shown above the question.'),
  // Ranking
  rankingCriteria: z.string().optional().describe('Criterion for ranking (e.g., chronological, by importance, by size).'),
  // Drag & Drop Categorization
  dragDropCategories: z.array(z.string()).optional().describe('Category labels (2-4) for drag-drop categorization.'),
  dragDropItems: z.array(z.object({
    id: z.string(),
    text: z.string(),
    correctCategory: z.string(),
  })).optional().describe('Items to sort into categories.'),
  dragDropVariant: z.enum(['categorize', 'cause-effect']).optional().describe('UI variant: categorize (default) or cause-effect.'),
  // Venn Diagram
  vennCircles: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })).optional().describe('Circles in the Venn diagram (2-3), e.g. [{id:"A",label:"Mammals"},{id:"B",label:"Marine animals"}].'),
  vennItems: z.array(z.object({
    id: z.string(),
    text: z.string(),
    correctZone: z.string().describe('Zone id: "A", "B", "C", "AB", "BC", "AC", "ABC", or "outside".'),
  })).optional().describe('Items to place in Venn zones.'),
  // Spot the Error
  spotErrorSegments: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isError: z.boolean(),
  })).optional().describe('Sentence broken into 3-6 clickable segments; exactly one has isError: true.'),
  // Timeline (visual horizontal track)
  timelineStart: z.string().optional().describe('Label for the start of the timeline (e.g. "1550", "January", "Week 1"). No restrictions.'),
  timelineEnd: z.string().optional().describe('Label for the end of the timeline (e.g. "1648", "December", "Week 32"). No restrictions.'),
  timelineEvents: z.array(z.object({
    id: z.string(),
    label: z.string().describe('Short event label.'),
    position: z.number().int().min(1).max(100).describe('Position on the timeline from 1 (start) to 100 (end).'),
  })).optional().describe('Events to place on the timeline. Each has a label and a position 1-100.'),
});

export const QuizSchema = z.object({
  title: z.string().describe('Topic-only title based on the source text — just the subject matter, e.g. "Start of WW1" or "Cell Division". Never include the word "Quiz", "Test", "Flashcard", or any tool name.'),
  description: z.string().describe('A brief description of the quiz content.'),
  questions: z.array(QuizQuestionSchema).describe('An array of questions.'),
});

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

// Types for Flashcards
export const FLASHCARD_TYPES = [
  'term-definition',
  'multiple-choice',
  'image-card',
  'cloze',
  'example-sentence',
  'true-false',
  'compare-pair',
  'mnemonic',
  'formula',
  'process-step',
  'date-event',
  'reversed-direction'
] as const;
export const FlashcardMcqOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (e.g., "a", "b", "c").'),
  text: z.string().describe('The text of the answer option.'),
});
export const FlashcardSchema = z.object({
  id: z.string().describe('A unique, short, kebab-case identifier for the flashcard.'),
  type: z.enum(FLASHCARD_TYPES).default('term-definition').describe('Card format: term-definition (front/back fragments), multiple-choice (front + 3 choices), image-card (front term + back description), cloze (fill-blank sentence), example-sentence (context + word), true-false (statement + correctness), compare-pair (2 items to compare), mnemonic (memory aid), formula (math/science expression), process-step (sequential instruction), date-event (date/event pair), reversed-direction (front/back swappable).'),
  front: z.string().describe('The front side of the flashcard: a short term or cue fragment. Never phrase this as a question.'),
  back: z.string().describe('The back side of the flashcard: a matching definition or fact fragment. Never phrase this as an answer to a question — it should read as a fragment, not a sentence responding to "front".'),
  cloze: z.string().optional().describe('A fill-in-the-blank sentence where the "back" of the card is the missing word. The blank should be represented by "____". Only relevant when "type" is "cloze".'),
  mcqOptions: z.array(FlashcardMcqOptionSchema).max(3).optional().describe('Exactly 3 answer choices (one with text identical to "back", two plausible same-domain distractors), only present when "type" is "multiple-choice".'),
  correctAnswer: z.boolean().optional().describe('For true-false type: whether the statement on front is correct (true) or incorrect (false).'),
  imageUrl: z.string().optional().describe('URL of a representative photo for "front". Only relevant when "type" is "image-card" — leave empty when generating, it is filled in automatically afterward from a real image search. Never invent a URL.'),
  citation: z.string().optional().describe('A short, literal reference to where in the Source Text this card\'s information came from (e.g. a quoted fragment or a short section description). Omit this field entirely if no specific passage can be pointed to.'),
  assistedHint: z.string().optional().describe('A short, logical memory aid for assisted mode only — a brief association, pattern, or contextual connection that helps recall the back without revealing it. Keep it to a few words. Only generated and shown when learner selects "assisted" mode. Must be simple and help thinking, not a riddle.'),
  groundingNote: z.string().optional().describe('A brief (1-2 sentence) note explaining why this card was written this way and how its content relates to or derives from the Source Text. This is shown to the learner in "Research" mode to make the AI\'s reasoning transparent.'),
});
export type FlashcardType = (typeof FLASHCARD_TYPES)[number];
export type Flashcard = z.infer<typeof FlashcardSchema>;


// Types for MCQ from flashcard
export const McqOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option (e.g., "a", "b", "c").'),
  text: z.string().describe('The text of the answer option.'),
});

export const McqQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  question: z.string().describe('The text of the question, derived from the flashcard front.'),
  options: z.array(McqOptionSchema).describe('An array of 3 to 4 possible answer options.'),
  correctOptionId: z.string().describe('The ID of the correct answer option.'),
});

export type McqOption = z.infer<typeof McqOptionSchema>;
export type McqQuestion = z.infer<typeof McqQuestionSchema>;


export type SessionRecapData = {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: number;
};

// Types for Agenda
export type CalendarEvent = {
  id: string;
  title: string;
  subject: string;
  date: Date;
  type: 'assignment' | 'study_plan' | 'personal' | 'agenda_item';
  href: string;
  class_id?: string;
  class_name?: string;
  subject_id?: string | null;
  item_type?: 'assignment' | 'quiz' | 'studyset' | 'event' | 'other';
  task_category?: 'homework' | 'small_test' | 'big_test' | 'other';
  custom_category_label?: string | null;
  visibility_state?: 'visible' | 'hidden' | 'scheduled';
  publish_at?: string | null;
  links?: Array<{
    id?: string;
    link_type: string;
    link_ref_id?: string | null;
    label: string;
    metadata_json?: Record<string, any>;
    position?: number;
  }>;
  chapter_id?: string;
  chapter_title?: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_duration?: number;
  tags?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string; // Teacher's instructions
  linked_path?: string; // Display path for linked content
  completed?: boolean; // For student task completion
};

// Types for Analytics
export type QuizPerformance = {
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
};

export type StudentAnalytics = {
  weeklyStudyTime: ProgressData[];
  totalStudyTime: number;
  avgProgress: number;
  assignmentCompletionRate: number;
  completedAssignments: number;
  totalAssignments: number;
  quizPerformance: QuizPerformance;
  recommendations: string[];
  lastUpdated: string;
};

// Types for Class Analytics
export type EngagementMetrics = {
  averageStudyTime: number;
  attendanceRate: number;
  assignmentParticipation: number;
  quizParticipation: number;
  activeStudentsCount: number;
};

export type PerformanceTrend = {
  date: string;
  averageScore: number;
  completionRate: number;
  submissionsCount: number;
};

export type AtRiskStudent = {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  engagementScore: number;
  performanceScore: number;
  lastActivity: string;
};

export type ComparativeData = {
  className: string;
  averageScore: number;
  completionRate: number;
  engagementRate: number;
  studentCount: number;
};

export type AnalyticsWarningSeverity = 'low' | 'medium' | 'high';
export type AnalyticsWarningType = 'speed' | 'paste' | 'plagiarism' | 'ai_plagiarism';

export type AnalyticsWarning = {
  id: string;
  studentId: string;
  studentName: string;
  severity: AnalyticsWarningSeverity;
  type: AnalyticsWarningType;
  assignmentId?: string;
  assignmentTitle?: string;
  subjectId?: string;
  subjectTitle?: string;
  message: string;
  ratio?: number;
  studentSeconds?: number;
  classAverageSeconds?: number;
  createdAt?: string;
};

export type ClassAnalyticsSubject = {
  subjectId: string;
  subjectTitle: string;
  submissionsCount: number;
  activeStudents: number;
  totalStudyMinutes: number;
};

export type ClassAnalyticsAssignmentSpeed = {
  assignmentId: string;
  assignmentTitle: string;
  subjectId?: string;
  subjectTitle?: string;
  averageSeconds: number;
  submissionCount: number;
};

export type ClassAnalyticsStudentRow = {
  studentId: string;
  studentName: string;
  subjectsWorked: string[];
  submissionsCount: number;
  totalStudyMinutes: number;
  completionRate: number;
  averageGrade: number | null;
  pendingOpenReviews: number;
  averageSubmissionSeconds: number | null;
  warningCount: number;
  lastActivityAt: string | null;
  lastSubmissionAt: string | null;
  recentTool: {
    toolType: string;
    title: string | null;
    usedAt: string | null;
  } | null;
};

export type ClassAnalytics = {
  engagementMetrics: EngagementMetrics;
  performanceTrends: PerformanceTrend[];
  atRiskStudents: AtRiskStudent[];
  comparativeAnalysis: ComparativeData[];
  subjects: ClassAnalyticsSubject[];
  assignmentSpeeds: ClassAnalyticsAssignmentSpeed[];
  studentRows: ClassAnalyticsStudentRow[];
  warnings: AnalyticsWarning[];
  plagiarismIntegration: {
    provider: string;
    configured: boolean;
    note?: string;
  };
  classOverview: {
    totalStudents: number;
    activeStudents: number;
    totalAssignments: number;
    averageClassScore: number;
    overallCompletionRate: number;
    pendingOpenReviews?: number;
  };
  attendanceSignals?: {
    recordsCount: number;
    absentRate: number;
    lateRate: number;
    homeworkIssueRate: number;
  };
  scheduleSignals?: {
    slotsCount: number;
    todaySlotsCount: number;
    hasLiveClassNow: boolean;
    nextClassAt: string | null;
  };
  insights: string[];
  lastUpdated: string;
};

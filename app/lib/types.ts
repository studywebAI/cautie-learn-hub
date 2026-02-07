
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
  isCorrect: z.boolean().describe('Whether this option is the correct answer.'),
});

export const QuizQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  question: z.string().describe('The text of the question.'),
  options: z.array(QuizOptionSchema).describe('An array of 3 to 4 possible answer options.'),
});

export const QuizSchema = z.object({
  title: z.string().describe('A suitable title for the quiz, based on the source text.'),
  description: z.string().describe('A brief description of the quiz content.'),
  questions: z.array(QuizQuestionSchema).describe('An array of questions.'),
});

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;

// Types for Flashcards
export const FlashcardSchema = z.object({
  id: z.string().describe('A unique, short, kebab-case identifier for the flashcard.'),
  front: z.string().describe('The front side of the flashcard, containing a key term or a question.'),
  back: z.string().describe('The back side of the flashcard, containing the definition or answer.'),
  cloze: z.string().describe('A fill-in-the-blank sentence where the "back" of the card is the missing word. The blank should be represented by "____".'),
});
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
  type: 'assignment' | 'study_plan' | 'personal';
  href: string;
  chapter_id?: string;
  chapter_title?: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_duration?: number;
  tags?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string; // Teacher's instructions
  linked_path?: string; // Display path for linked content
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

export type ClassAnalytics = {
  engagementMetrics: EngagementMetrics;
  performanceTrends: PerformanceTrend[];
  atRiskStudents: AtRiskStudent[];
  comparativeAnalysis: ComparativeData[];
  classOverview: {
    totalStudents: number;
    activeStudents: number;
    totalAssignments: number;
    averageClassScore: number;
    overallCompletionRate: number;
  };
  insights: string[];
  lastUpdated: string;
};

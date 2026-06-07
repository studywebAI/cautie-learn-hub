// Studyset Core Types & Interfaces

export type StudysetStatus = 'draft' | 'active' | 'archived' | 'completed';
export type UploadType = 'agenda' | 'subject' | 'custom';
export type OutputDepth = 'kort' | 'gemiddeld' | 'uitgebreid';
export type Difficulty = 'basis' | 'gemiddeld' | 'examen';
export type Tone = 'tutor' | 'samenvatting' | 'trainer';
export type SRSAlgorithm = 'sm2' | 'lightweight';
export type ShareType = 'privé' | 'publiek';

export interface Studyset {
  id: string;
  userId: string;
  name: string;
  subject: string;
  description?: string;
  status: StudysetStatus;
  color: string; // hex color for today view (#9d7eb8, #87ceeb, etc.)

  // Timeline
  createdAt: Date;
  updatedAt: Date;
  examDate?: Date;
  studyDays: string[]; // ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

  // Upload & Sources
  uploadType: UploadType;
  sources: Source[];

  // Settings
  settings: StudysetSettings;

  // Progress & Analytics
  totalCards: number;
  completedCards: number;
  currentStreak: number;
  longestStreak: number;
  avgRetention: number;
  lastStudiedAt?: Date;

  // Sharing
  shareType: ShareType;
  sharedWith?: string[]; // user IDs
}

export interface Source {
  id: string;
  type: 'file' | 'url' | 'youtube' | 'audio' | 'recorded';
  name: string;
  url?: string;
  fileUrl?: string;
  language?: string;
  isActive: boolean;
  focusRange?: { start: number; end: number }; // pages or timestamps
  uploadedAt: Date;
}

export interface StudysetSettings {
  // Grounding
  groundingOnly: boolean;
  showCitations: boolean;
  confidenceIndicator: boolean;

  // Output
  outputDepth: OutputDepth;
  difficulty: Difficulty;
  outputLanguage: string;
  tone: Tone;
  doelgroep: string;
  voorbeelden: boolean;
  formaliteit: 'beknopt' | 'standaard' | 'uitleggerig';

  // SRS
  newCardsPerDay: number;
  srsAlgorithm: SRSAlgorithm;
  dailyLimit: number;

  // Organization
  folder: string;
  tags: string[];
  isPinned: boolean;

  // Accessibility
  darkMode: boolean;
  textSize: 'klein' | 'normaal' | 'groot';
  offlineMode: boolean;

  // Export & Share
  exportFormats: string[];
  allowCollaboration: boolean;
  autoSync: boolean;
  autoBackup: boolean;
}

export interface StudyCard {
  id: string;
  studysetId: string;
  type: 'flashcard' | 'quiz' | 'note' | 'mindmap';
  front: string;
  back?: string;
  difficulty: number; // 1-5
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  // SRS data
  interval: number; // days until next review
  easeFactor: number; // 1.3 - 2.5
  repetitions: number;
  nextReviewDate: Date;

  // Progress
  views: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt?: Date;
}

export interface GeneratedPlan {
  id: string;
  studysetId: string;
  tasks: PlanTask[];
  totalEstimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  tool: 'quiz' | 'flashcards' | 'notes' | 'video' | 'mindmap';
  order: number;
  estimatedMinutes: number;
  dueDate?: Date;
  completed: boolean;
}

export interface StudysetAnalytics {
  id: string;
  studysetId: string;

  // Retention
  retentionPercentage: number;
  weakPoints: string[]; // topics with < 60% retention

  // Activity
  studyStreak: number;
  totalMinutesSpent: number;
  sessionsCompleted: number;
  lastSessionDate?: Date;

  // Performance
  averageResponseTime: number; // seconds
  accuracyPercentage: number;

  // Goals
  dailyGoal: number;
  weeklyProgress: number; // %

  // Heatmap (activity per day)
  heatmapData: { date: string; count: number }[];
}

export interface CreateWizardState {
  step: 1 | 2 | 3 | 4 | 5;

  // Step 1
  name: string;
  subject: string;
  studyDays: string[];
  examDate?: string;

  // Step 2
  uploadType: UploadType;
  sources: Source[];

  // Step 3
  settings: Partial<StudysetSettings>;
  selectedTools: string[];

  // Step 4
  generatedPlan?: GeneratedPlan;

  // Step 5
  finalPlan?: GeneratedPlan;
}

export interface DashboardData {
  totalCards: number;
  avgRetention: number;
  activeSetCount: number;
  archivedSetCount: number;
  activeStudysets: Studyset[];
  todayTasks: TodayTask[];
  analytics: StudysetAnalytics[];
}

export interface TodayTask {
  studyset: Studyset;
  cardsToReview: number;
  totalCards: number;
  percentComplete: number;
  color: string;
}

export interface ChangeLog {
  id: string;
  studysetId: string;
  timestamp: Date;
  userId: string;
  field: string;
  before: any;
  after: any;
  changeType: 'edit' | 'ai-suggestion' | 'system';
}

export interface AIRecommendation {
  id: string;
  studysetId: string;
  type: 'difficulty' | 'focus' | 'schedule' | 'tool-usage' | 'retention';
  title: string;
  description: string;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  applied: boolean;
}

export interface MindmapTool {
  id: string;
  name: 'quiz' | 'flashcards' | 'notes' | 'mindmap';
  label: string;
  icon: string;
  enabled: boolean;
  settings: Record<string, any>;
}

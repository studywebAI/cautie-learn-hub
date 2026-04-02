export type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';

export type SourceArchetype =
  | 'textbook'
  | 'study_notes'
  | 'article'
  | 'report'
  | 'pitch'
  | 'image_set'
  | 'tutorial'
  | 'spreadsheet'
  | 'existing_deck'
  | 'mixed';

export type ContentMode = 'text_heavy' | 'image_heavy' | 'balanced' | 'data_heavy';

export type VisualPotential = 'low' | 'medium' | 'high';

export type RelevantControlKey =
  | 'audience'
  | 'goal'
  | 'tone'
  | 'slideCount'
  | 'density'
  | 'imageRichness'
  | 'speakerNotes'
  | 'agenda'
  | 'summary'
  | 'qa'
  | 'quiz'
  | 'citations'
  | 'stepByStep'
  | 'chartPreference'
  | 'captionStyle'
  | 'layoutStyle'
  | 'references'
  | 'appendix';

export type PresentationUiConfig = {
  platform: PresentationPlatform;
  tone: 'academic' | 'professional' | 'simple' | 'persuasive';
  audience: 'middle_school' | 'high_school' | 'university' | 'professional' | 'general';
  goal: 'teach' | 'pitch' | 'report' | 'summarize' | 'study' | 'training' | 'demo';
  density: 'light' | 'balanced' | 'dense';
  imageRichness: 'none' | 'low' | 'medium' | 'high' | 'source_only' | 'internet_allowed';
  slideCount: number;
  includeAgenda: boolean;
  includeSummary: boolean;
  includeQA: boolean;
  includeQuiz: boolean;
  includeReferences: boolean;
  includeAppendix: boolean;
  includeSpeakerNotes: boolean;
  citations: 'off' | 'minimal' | 'strict';
  stepByStep: boolean;
  chartPreference: 'auto' | 'chart_first' | 'table_first';
  captionStyle: 'short' | 'balanced' | 'detailed';
  layoutStyle: 'mixed' | 'visual_first' | 'text_first';
};

export type SourceAnalysis = {
  dominantArchetype: SourceArchetype;
  contentMode: ContentMode;
  audienceGuess?: string;
  goalGuess?: string;
  visualPotential: VisualPotential;
  recommendedSlideCountMin: number;
  recommendedSlideCountMax: number;
  recommendedSettings: Partial<PresentationUiConfig>;
  relevantControls: RelevantControlKey[];
  hiddenControls: RelevantControlKey[];
  warnings: string[];
  reasons: string[];
};

export type SlideQualityCheck = {
  slideId: string;
  passed: boolean;
  score: number;
  issues: string[];
};

export type PresentationSlide = {
  id: string;
  index: number;
  type:
    | 'title'
    | 'agenda'
    | 'concept_explanation'
    | 'summary'
    | 'qa'
    | 'quiz'
    | 'references';
  heading: string;
  bullets: string[];
  imageHints: string[];
  speakerNotes?: string;
};

export type PresentationBlueprint = {
  presentation: {
    title: string;
    language: string;
    platform: PresentationPlatform;
    audience: PresentationUiConfig['audience'];
    goal: PresentationUiConfig['goal'];
  };
  settings: PresentationUiConfig & {
    aiGeneratedImagesAllowed: false;
  };
  slides: PresentationSlide[];
};

export type PreviewManifest = {
  title: string;
  slideCount: number;
  aspectRatio: '16:9';
  slides: Array<{
    slideId: string;
    index: number;
    imageUrl: string;
    thumbUrl: string;
    width: number;
    height: number;
    notesPreview?: string;
  }>;
};

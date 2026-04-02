import {
  PresentationBlueprint,
  PresentationSlide,
  PresentationUiConfig,
  PreviewManifest,
  RelevantControlKey,
  SourceAnalysis,
  SourceArchetype,
} from '@/lib/presentation/types';

const DEFAULT_CONFIG: PresentationUiConfig = {
  platform: 'powerpoint',
  tone: 'professional',
  audience: 'general',
  goal: 'teach',
  density: 'balanced',
  imageRichness: 'medium',
  slideCount: 10,
  includeAgenda: true,
  includeSummary: true,
  includeQA: false,
  includeQuiz: false,
  includeReferences: false,
  includeAppendix: false,
  includeSpeakerNotes: false,
  citations: 'minimal',
  stepByStep: false,
  chartPreference: 'auto',
  captionStyle: 'balanced',
  layoutStyle: 'mixed',
};

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

const stripTags = (input: string): string =>
  input
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\[(?:file|type|text|header|bullet|font|image|link|link-count|slide)\s*[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sentenceSplit = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/g)
    .map((line) => clean(line))
    .filter(Boolean);

const truncateWords = (value: string, maxWords: number): string => {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const toTitle = (value: string): string => {
  const stripped = value
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[:;,.\-\s]+$/, '')
    .trim();
  return truncateWords(stripped || 'Slide', 8);
};

function inferArchetype(sourceText: string): SourceArchetype {
  const lower = sourceText.toLowerCase();
  const hasSpreadsheetSignals = /(csv|xlsx|spreadsheet|table|kpi|revenue|dataset)/i.test(lower);
  const hasTutorialSignals = /(step|stap|how to|procedure|handleiding|instruction|troubleshoot)/i.test(lower);
  const hasPitchSignals = /(investor|pitch|go to market|pricing|roi|business model)/i.test(lower);
  const hasReportSignals = /(report|quarter|analysis|executive summary|findings)/i.test(lower);
  const hasStudySignals = /(chapter|hoofdstuk|quiz|exam|school|lesson|class)/i.test(lower);
  const hasDeckSignals = /(\.ppt|slide deck|slides)/i.test(lower);
  const imageMentions = (lower.match(/\b(image|photo|screenshot|diagram|figure)\b/g) || []).length;
  const wordCount = sourceText.trim().split(/\s+/).filter(Boolean).length;

  if (hasSpreadsheetSignals) return 'spreadsheet';
  if (hasTutorialSignals) return 'tutorial';
  if (hasPitchSignals) return 'pitch';
  if (hasReportSignals) return 'report';
  if (hasDeckSignals) return 'existing_deck';
  if (imageMentions > 16 && wordCount < 220) return 'image_set';
  if (hasStudySignals) return 'textbook';
  if (wordCount < 80) return 'study_notes';
  if (wordCount > 1400) return 'article';
  return 'mixed';
}

function relevantControlsFor(archetype: SourceArchetype): RelevantControlKey[] {
  switch (archetype) {
    case 'textbook':
    case 'study_notes':
      return ['audience', 'tone', 'density', 'slideCount', 'summary', 'quiz', 'speakerNotes', 'citations'];
    case 'tutorial':
      return ['stepByStep', 'captionStyle', 'layoutStyle', 'speakerNotes', 'slideCount', 'summary'];
    case 'image_set':
      return ['imageRichness', 'captionStyle', 'layoutStyle', 'slideCount', 'summary'];
    case 'spreadsheet':
    case 'report':
      return ['goal', 'chartPreference', 'references', 'appendix', 'speakerNotes', 'slideCount', 'density'];
    case 'pitch':
      return ['goal', 'tone', 'layoutStyle', 'slideCount', 'qa', 'summary'];
    case 'existing_deck':
      return ['tone', 'density', 'slideCount', 'summary', 'qa', 'speakerNotes'];
    case 'article':
      return ['audience', 'goal', 'density', 'slideCount', 'summary', 'citations'];
    default:
      return ['audience', 'goal', 'tone', 'slideCount', 'density', 'imageRichness', 'speakerNotes', 'summary'];
  }
}

const ALL_CONTROLS: RelevantControlKey[] = [
  'audience',
  'goal',
  'tone',
  'slideCount',
  'density',
  'imageRichness',
  'speakerNotes',
  'agenda',
  'summary',
  'qa',
  'quiz',
  'citations',
  'stepByStep',
  'chartPreference',
  'captionStyle',
  'layoutStyle',
  'references',
  'appendix',
];

export function analyzeSources(input: {
  sourceText: string;
  currentConfig?: Partial<PresentationUiConfig>;
}): SourceAnalysis {
  const normalized = stripTags(input.sourceText || '');
  const lower = normalized.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const archetype = inferArchetype(normalized);
  const contentMode = /(table|dataset|metric|kpi|%)/i.test(lower)
    ? 'data_heavy'
    : wordCount > 900
      ? 'text_heavy'
      : (lower.match(/\b(image|photo|screenshot|figure)\b/g) || []).length > 10
        ? 'image_heavy'
        : 'balanced';
  const visualPotential = contentMode === 'image_heavy' ? 'high' : contentMode === 'text_heavy' ? 'medium' : 'high';

  const slideMin = Math.max(6, Math.round(wordCount / 140));
  const slideMax = Math.min(24, Math.max(slideMin + 2, Math.round(wordCount / 90)));
  const recommendedSlideCount = Math.round((slideMin + slideMax) / 2);
  const relevantControls = relevantControlsFor(archetype);

  const recommendedSettings: Partial<PresentationUiConfig> = {
    slideCount: recommendedSlideCount,
    density: contentMode === 'text_heavy' ? 'balanced' : contentMode === 'data_heavy' ? 'balanced' : 'light',
    imageRichness:
      contentMode === 'image_heavy'
        ? 'source_only'
        : contentMode === 'data_heavy'
          ? 'low'
          : visualPotential === 'high'
            ? 'medium'
            : 'low',
    includeSummary: true,
    includeSpeakerNotes: archetype === 'tutorial' || archetype === 'report',
    includeQuiz: archetype === 'textbook' || archetype === 'study_notes',
    includeReferences: archetype === 'report' || archetype === 'article',
    includeAppendix: archetype === 'report' || archetype === 'spreadsheet',
    goal: archetype === 'pitch' ? 'pitch' : archetype === 'report' ? 'report' : 'teach',
    audience:
      archetype === 'textbook' || archetype === 'study_notes'
        ? 'high_school'
        : archetype === 'report' || archetype === 'pitch'
          ? 'professional'
          : 'general',
  };

  if (input.currentConfig?.platform) recommendedSettings.platform = input.currentConfig.platform;
  const warnings: string[] = [];
  if (wordCount < 45) warnings.push('Very little source text detected; results may be generic.');
  warnings.push('AI-generated images are disabled by policy. Only source and internet visuals are allowed.');

  return {
    dominantArchetype: archetype,
    contentMode,
    audienceGuess: recommendedSettings.audience,
    goalGuess: recommendedSettings.goal,
    visualPotential,
    recommendedSlideCountMin: slideMin,
    recommendedSlideCountMax: slideMax,
    recommendedSettings,
    relevantControls,
    hiddenControls: ALL_CONTROLS.filter((key) => !relevantControls.includes(key)),
    warnings,
    reasons: [
      `Detected archetype: ${archetype.replace(/_/g, ' ')}`,
      `Content mode: ${contentMode.replace(/_/g, ' ')}`,
      `Recommended slide range: ${slideMin}-${slideMax}`,
    ],
  };
}

export function getDefaultConfig(): PresentationUiConfig {
  return { ...DEFAULT_CONFIG };
}

export function resolveEffectiveConfig(input: {
  analysis: SourceAnalysis;
  userConfig?: Partial<PresentationUiConfig>;
  autoMode?: boolean;
}): PresentationUiConfig {
  const autoMode = input.autoMode !== false;
  const start = { ...DEFAULT_CONFIG };
  const merged = autoMode ? { ...start, ...input.analysis.recommendedSettings } : start;
  const withUser = { ...merged, ...(input.userConfig || {}) };
  withUser.slideCount = Math.max(3, Math.min(30, Number(withUser.slideCount || DEFAULT_CONFIG.slideCount)));
  return withUser;
}

export function buildBlueprint(input: {
  sourceText: string;
  title?: string;
  language?: string;
  config: PresentationUiConfig;
}): PresentationBlueprint {
  const normalized = stripTags(input.sourceText || '');
  const sentences = sentenceSplit(normalized);
  const effectiveSentences = sentences.length > 0 ? sentences : [clean(normalized || 'Presentation content')];
  const bulletsPerSlide = input.config.density === 'light' ? 3 : input.config.density === 'dense' ? 6 : 4;
  const slides: PresentationSlide[] = [];

  const requestedTitle = clean(input.title || '');
  const deckTitle = truncateWords(requestedTitle || toTitle(effectiveSentences[0] || 'Presentation'), 10);

  if (input.config.includeAgenda) {
    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: 'agenda',
      heading: 'Agenda',
      bullets: ['Context', 'Core points', 'Examples', 'Wrap-up'],
      imageHints: ['agenda timeline'],
      speakerNotes: input.config.includeSpeakerNotes ? 'Introduce the structure in less than 45 seconds.' : undefined,
    });
  }

  for (let i = 0; i < input.config.slideCount; i += 1) {
    const start = i * bulletsPerSlide;
    const chunk = effectiveSentences.slice(start, start + bulletsPerSlide + 1);
    if (chunk.length === 0) break;

    const heading = toTitle(chunk[0]);
    const bullets = (chunk.slice(1).length > 0 ? chunk.slice(1) : chunk)
      .map((line) => truncateWords(clean(line), 18))
      .filter(Boolean)
      .slice(0, bulletsPerSlide);

    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: slides.length === 0 ? 'title' : 'concept_explanation',
      heading,
      bullets,
      imageHints: [`${heading} source visual`, `${heading} internet visual`],
      speakerNotes: input.config.includeSpeakerNotes
        ? `Explain "${heading}" with one concrete example.`
        : undefined,
    });
  }

  if (input.config.includeSummary) {
    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: 'summary',
      heading: 'Summary',
      bullets: ['Key takeaways', 'Main definitions', 'What to remember'],
      imageHints: ['summary board'],
      speakerNotes: input.config.includeSpeakerNotes ? 'Close with the top three takeaways.' : undefined,
    });
  }

  if (input.config.includeQuiz) {
    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: 'quiz',
      heading: 'Knowledge Check',
      bullets: ['Question 1', 'Question 2', 'Question 3'],
      imageHints: ['quiz prompt card'],
      speakerNotes: input.config.includeSpeakerNotes ? 'Pause and let the audience answer first.' : undefined,
    });
  }

  if (input.config.includeQA) {
    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: 'qa',
      heading: 'Q&A',
      bullets: ['Open questions', 'Clarifications', 'Next steps'],
      imageHints: ['questions icon'],
      speakerNotes: input.config.includeSpeakerNotes ? 'Invite questions and capture action points.' : undefined,
    });
  }

  if (input.config.includeReferences) {
    slides.push({
      id: `slide_${slides.length + 1}`,
      index: slides.length + 1,
      type: 'references',
      heading: 'References',
      bullets: ['Source material uploaded by user', 'Additional references where needed'],
      imageHints: ['references'],
    });
  }

  const normalizedSlides = slides.slice(0, 60).map((slide, idx) => ({
    ...slide,
    id: `slide_${idx + 1}`,
    index: idx + 1,
  }));

  return {
    presentation: {
      title: deckTitle,
      language: input.language || 'en',
      platform: input.config.platform,
      audience: input.config.audience,
      goal: input.config.goal,
    },
    settings: {
      ...input.config,
      aiGeneratedImagesAllowed: false,
    },
    slides: normalizedSlides,
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderSlideToSvg(title: string, heading: string, bullets: string[], index: number) {
  const bulletLines = bullets
    .slice(0, 6)
    .map((line, i) => `<text x="92" y="${228 + i * 58}" font-size="34" fill="#1c1c1c">• ${escapeXml(line)}</text>`)
    .join('');
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#f5f4ef"/>
    <text x="78" y="66" font-size="24" fill="#666760">${escapeXml(title)}</text>
    <text x="78" y="146" font-size="56" font-weight="700" fill="#121212">${escapeXml(heading)}</text>
    ${bulletLines}
    <text x="1510" y="860" text-anchor="end" font-size="20" fill="#7c7d76">Slide ${index}</text>
  </svg>`;
}

export function buildPreviewManifest(blueprint: PresentationBlueprint): PreviewManifest {
  const slides = blueprint.slides.map((slide) => {
    const svg = renderSlideToSvg(
      blueprint.presentation.title,
      slide.heading,
      slide.bullets,
      slide.index
    );
    const imageUrl = svgDataUri(svg);
    return {
      slideId: slide.id,
      index: slide.index,
      imageUrl,
      thumbUrl: imageUrl,
      width: 1600,
      height: 900,
      notesPreview: slide.speakerNotes ? truncateWords(slide.speakerNotes, 18) : undefined,
    };
  });

  return {
    title: blueprint.presentation.title,
    slideCount: slides.length,
    aspectRatio: '16:9',
    slides,
  };
}

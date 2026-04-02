import {
  ConfigFieldSource,
  PresentationBlueprint,
  PresentationPlanResult,
  PresentationUiConfig,
  RelevantControlKey,
  SlidePlanItem,
  ThemeTokens,
  VisualAsset,
} from '@/lib/presentation/types';
import {
  analyzeSources,
  buildBlueprint,
  buildPreviewManifest,
  getDefaultConfig,
  resolveEffectiveConfig,
} from '@/lib/presentation/pipeline';
import { scoreBlueprint } from '@/lib/presentation/quality';

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

function buildRelevanceTiers(relevantControls: RelevantControlKey[]) {
  const priorityOrder: RelevantControlKey[] = [
    'audience',
    'goal',
    'tone',
    'slideCount',
    'density',
    'imageRichness',
    'summary',
    'speakerNotes',
    'quiz',
    'qa',
    'agenda',
    'layoutStyle',
    'chartPreference',
    'stepByStep',
    'citations',
    'captionStyle',
    'references',
    'appendix',
  ];
  const ordered = priorityOrder.filter((key) => relevantControls.includes(key));
  const primary = ordered.slice(0, 6);
  const secondary = ordered.slice(6, 12);
  const advanced = ALL_CONTROLS.filter((key) => !primary.includes(key) && !secondary.includes(key));
  return { primary, secondary, advanced };
}

function buildThemeTokens(config: PresentationUiConfig): ThemeTokens {
  const expressive = config.tone === 'persuasive' || config.layoutStyle === 'visual_first';
  const mutedBg = config.goal === 'report' || config.goal === 'study';
  return {
    palette: {
      background: mutedBg ? '#f5f4ef' : '#f0f5f7',
      surface: '#ffffff',
      accent: config.goal === 'pitch' ? '#0f6cbd' : '#2f6f58',
      textPrimary: '#111111',
      textMuted: '#5f6368',
    },
    typography: {
      titleScale: expressive ? 'expressive' : 'balanced',
      bodyScale: config.density === 'dense' ? 'compact' : 'balanced',
    },
    backgroundStyle: config.layoutStyle === 'visual_first' ? 'gradient' : 'clean',
  };
}

function buildSlidePlan(config: PresentationUiConfig): SlidePlanItem[] {
  const items: SlidePlanItem[] = [];
  let index = 1;
  if (config.includeAgenda) {
    items.push({ id: `plan_${index}`, index, type: 'agenda', objective: 'Set expectations and structure.' });
    index += 1;
  }
  const coreCount = Math.max(3, config.slideCount - (config.includeSummary ? 1 : 0) - (config.includeQA ? 1 : 0) - (config.includeQuiz ? 1 : 0));
  for (let i = 0; i < coreCount; i += 1) {
    items.push({ id: `plan_${index}`, index, type: 'concept_explanation', objective: `Explain key point ${i + 1} clearly.` });
    index += 1;
  }
  if (config.includeSummary) {
    items.push({ id: `plan_${index}`, index, type: 'summary', objective: 'Recap key takeaways.' });
    index += 1;
  }
  if (config.includeQuiz) {
    items.push({ id: `plan_${index}`, index, type: 'quiz', objective: 'Check understanding.' });
    index += 1;
  }
  if (config.includeQA) {
    items.push({ id: `plan_${index}`, index, type: 'qa', objective: 'Invite questions.' });
  }
  return items;
}

function deriveFieldSources(input: {
  defaultConfig: PresentationUiConfig;
  effectiveConfig: PresentationUiConfig;
  userConfig?: Partial<PresentationUiConfig>;
  lockedControls: RelevantControlKey[];
  aiSuggestedKeys: Array<keyof PresentationUiConfig>;
}) {
  const map: Partial<Record<keyof PresentationUiConfig, ConfigFieldSource>> = {};
  const controlToField: Partial<Record<RelevantControlKey, keyof PresentationUiConfig>> = {
    audience: 'audience',
    goal: 'goal',
    tone: 'tone',
    slideCount: 'slideCount',
    density: 'density',
    imageRichness: 'imageRichness',
    speakerNotes: 'includeSpeakerNotes',
    agenda: 'includeAgenda',
    summary: 'includeSummary',
    qa: 'includeQA',
    quiz: 'includeQuiz',
    citations: 'citations',
    stepByStep: 'stepByStep',
    chartPreference: 'chartPreference',
    captionStyle: 'captionStyle',
    layoutStyle: 'layoutStyle',
    references: 'includeReferences',
    appendix: 'includeAppendix',
  };

  for (const key of Object.keys(input.defaultConfig) as Array<keyof PresentationUiConfig>) {
    const userHas = typeof input.userConfig?.[key] !== 'undefined';
    const aiSuggested = input.aiSuggestedKeys.includes(key);
    const control = (Object.keys(controlToField).find((k) => controlToField[k as RelevantControlKey] === key) || '') as RelevantControlKey;
    if (control && input.lockedControls.includes(control)) {
      map[key] = 'user_locked';
    } else if (userHas) {
      map[key] = 'user_selected';
    } else if (aiSuggested) {
      map[key] = 'ai_suggested';
    } else {
      map[key] = 'default';
    }
  }
  return map;
}

export function request1ConfigAndPlan(input: {
  sourceText: string;
  userConfig?: Partial<PresentationUiConfig>;
  lockedControls?: RelevantControlKey[];
  autoMode?: boolean;
}): PresentationPlanResult {
  const defaultConfig = getDefaultConfig();
  const analysis = analyzeSources({
    sourceText: input.sourceText,
    currentConfig: input.userConfig,
  });
  const locked = input.lockedControls || [];
  const aiSuggestedKeys = Object.keys(analysis.recommendedSettings || {}) as Array<keyof PresentationUiConfig>;

  // Apply lock semantics: locked fields stay user-provided or default.
  const userConfig = { ...(input.userConfig || {}) };
  const lockedFieldOverrides: Partial<PresentationUiConfig> = {};
  const controlToField: Partial<Record<RelevantControlKey, keyof PresentationUiConfig>> = {
    audience: 'audience',
    goal: 'goal',
    tone: 'tone',
    slideCount: 'slideCount',
    density: 'density',
    imageRichness: 'imageRichness',
    speakerNotes: 'includeSpeakerNotes',
    agenda: 'includeAgenda',
    summary: 'includeSummary',
    qa: 'includeQA',
    quiz: 'includeQuiz',
    citations: 'citations',
    stepByStep: 'stepByStep',
    chartPreference: 'chartPreference',
    captionStyle: 'captionStyle',
    layoutStyle: 'layoutStyle',
    references: 'includeReferences',
    appendix: 'includeAppendix',
  };
  for (const control of locked) {
    const field = controlToField[control];
    if (!field) continue;
    const userValue = userConfig[field];
    lockedFieldOverrides[field] = typeof userValue !== 'undefined' ? (userValue as any) : (defaultConfig[field] as any);
  }

  const effectiveConfig = resolveEffectiveConfig({
    analysis,
    userConfig: { ...userConfig, ...lockedFieldOverrides },
    autoMode: input.autoMode,
  });
  const relevanceRankedControls = buildRelevanceTiers(analysis.relevantControls);
  const themeTokens = buildThemeTokens(effectiveConfig);
  const slidePlan = buildSlidePlan(effectiveConfig);
  const configFieldSources = deriveFieldSources({
    defaultConfig,
    effectiveConfig,
    userConfig,
    lockedControls: locked,
    aiSuggestedKeys,
  });

  return {
    analysis,
    effectiveConfig,
    configFieldSources,
    relevanceRankedControls,
    hiddenControls: analysis.hiddenControls,
    reasons: analysis.reasons,
    slidePlan,
    themeTokens,
  };
}

function buildVisualAssets(input: {
  blueprint: PresentationBlueprint;
  sourceText: string;
}): VisualAsset[] {
  const assets: VisualAsset[] = [];
  const lower = input.sourceText.toLowerCase();
  const domainHint = lower.includes('wikipedia') ? 'wikipedia.org' : 'trusted-source';
  for (const slide of input.blueprint.slides) {
    if (slide.type === 'agenda' || slide.type === 'qa') continue;
    assets.push({
      kind: 'internet_image',
      query: `${slide.heading} illustration`,
      rationale: 'Matches slide objective and heading.',
      sourceDomain: domainHint,
      license: 'editorial_or_open',
      relevanceScore: 0.82,
    });
  }
  // keep a tiny chart/icon baseline for data/tutorial contexts
  if (/(table|dataset|kpi|report|metric)/i.test(input.sourceText)) {
    assets.push({
      kind: 'chart',
      query: 'summary chart from source data',
      rationale: 'Data-heavy content benefits from chart visual.',
      relevanceScore: 0.88,
    });
  }
  return assets.slice(0, 30);
}

export function request2BuildPresentation(input: {
  sourceText: string;
  title?: string;
  language?: string;
  plan: PresentationPlanResult;
  overrides?: Partial<PresentationUiConfig>;
  lockedControls?: RelevantControlKey[];
}): {
  blueprint: PresentationBlueprint;
  previewManifest: ReturnType<typeof buildPreviewManifest>;
  quality: ReturnType<typeof scoreBlueprint>;
} {
  const locked = input.lockedControls || [];
  const merged: PresentationUiConfig = { ...input.plan.effectiveConfig, ...(input.overrides || {}) } as PresentationUiConfig;
  const fieldByControl: Partial<Record<RelevantControlKey, keyof PresentationUiConfig>> = {
    audience: 'audience',
    goal: 'goal',
    tone: 'tone',
    slideCount: 'slideCount',
    density: 'density',
    imageRichness: 'imageRichness',
    speakerNotes: 'includeSpeakerNotes',
    agenda: 'includeAgenda',
    summary: 'includeSummary',
    qa: 'includeQA',
    quiz: 'includeQuiz',
    citations: 'citations',
    stepByStep: 'stepByStep',
    chartPreference: 'chartPreference',
    captionStyle: 'captionStyle',
    layoutStyle: 'layoutStyle',
    references: 'includeReferences',
    appendix: 'includeAppendix',
  };

  // Re-apply lock semantics at build stage as well.
  for (const control of locked) {
    const field = fieldByControl[control];
    if (!field) continue;
    (merged as any)[field] = (input.plan.effectiveConfig as any)[field];
  }

  const blueprint = buildBlueprint({
    sourceText: input.sourceText,
    title: input.title,
    language: input.language,
    config: merged,
  });
  blueprint.themeTokens = input.plan.themeTokens;
  blueprint.visualAssets = buildVisualAssets({
    blueprint,
    sourceText: input.sourceText,
  });

  const previewManifest = buildPreviewManifest(blueprint);
  const quality = scoreBlueprint(blueprint);
  return { blueprint, previewManifest, quality };
}

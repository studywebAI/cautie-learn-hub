'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { SourceInput } from '@/components/tools/source-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PresentationPlanResult, PresentationUiConfig, PreviewManifest, SourceAnalysis } from '@/lib/presentation/types';
import { AdaptiveSettingsSidebar } from '@/components/presentation/adaptive-settings-sidebar';
import { SourceAnalysisCard } from '@/components/presentation/source-analysis-card';
import { PresentationPreview } from '@/components/presentation/presentation-preview';
import { SlideshowView } from '@/components/presentation/slideshow-view';
import { ActionBar } from '@/components/presentation/action-bar';
import { OneDriveExportFolderPicker } from '@/components/presentation/onedrive-export-folder-picker';

type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';
type WorkflowStage = 'upload' | 'subjects' | 'style' | 'building' | 'result';

type PresentationSlide = {
  id: string;
  index: number;
  heading: string;
  bullets: string[];
  speakerNotes?: string;
};

type PresentationPrototype = {
  platform: PresentationPlatform;
  title: string;
  slideCount: number;
  analysis: SourceAnalysis;
  effectiveConfig: PresentationUiConfig;
  slides: PresentationSlide[];
  previewManifest: PreviewManifest;
};

const THEME_PRESETS = [
  { id: 'clean-classic', label: 'Clean Classic' },
  { id: 'vibrant-gradient', label: 'Vibrant Gradient' },
  { id: 'studio-editorial', label: 'Studio Editorial' },
  { id: 'academic-focus', label: 'Academic Focus' },
] as const;

const FONT_PRESETS = [
  { id: 'modern-sans', label: 'Modern Sans' },
  { id: 'business-serif', label: 'Business Serif' },
  { id: 'classroom-readable', label: 'Classroom Readable' },
] as const;

const LAYOUT_PRESETS = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'visual-first', label: 'Visual First' },
  { id: 'text-first', label: 'Text First' },
] as const;

const BULLET_PRESETS = [
  { id: 'concise', label: 'Concise bullets' },
  { id: 'expanded', label: 'Expanded bullets' },
  { id: 'mixed', label: 'Mixed bullets + callouts' },
] as const;

function mapBuildToPrototype(payload: any): PresentationPrototype {
  const blueprint = payload?.blueprint || {};
  const slides = Array.isArray(blueprint?.slides) ? blueprint.slides : [];
  const previewManifest = payload?.previewManifest || {
    slides: [],
    slideCount: 0,
    title: blueprint?.presentation?.title || 'Presentation',
    aspectRatio: '16:9',
  };
  const plan: PresentationPlanResult | undefined = payload?.plan;
  return {
    platform: (blueprint?.presentation?.platform || 'powerpoint') as PresentationPlatform,
    title: String(blueprint?.presentation?.title || 'Presentation'),
    slideCount: Number(previewManifest?.slideCount || slides.length || 0),
    analysis: (plan?.analysis || payload?.analysis || {}) as SourceAnalysis,
    effectiveConfig: (plan?.effectiveConfig || payload?.effectiveConfig || {}) as PresentationUiConfig,
    slides: slides.map((slide: any, idx: number) => ({
      id: String(slide?.id || `slide_${idx + 1}`),
      index: Number(slide?.index || idx + 1),
      heading: String(slide?.heading || slide?.title || `Slide ${idx + 1}`),
      bullets: Array.isArray(slide?.bullets) ? slide.bullets.map((b: any) => String(b)) : [],
      speakerNotes: typeof slide?.speakerNotes === 'string' ? slide.speakerNotes : undefined,
    })),
    previewManifest,
  };
}

function normalizeSubject(input: string, fallbackIndex: number) {
  const trimmed = input.trim();
  return trimmed || `Slide ${fallbackIndex + 1}`;
}

function defaultSubjectSeed(count: number) {
  return Array.from({ length: Math.max(4, Math.min(12, count || 8)) }, (_, i) => `Subject ${i + 1}`);
}

function StageProgress({ stage }: { stage: WorkflowStage }) {
  const steps: WorkflowStage[] = ['upload', 'subjects', 'style', 'result'];
  const currentIndex = stage === 'building' ? 2 : Math.max(0, steps.indexOf(stage));
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <p>Presentation builder</p>
        <p>{stage === 'building' ? 'Building...' : steps[currentIndex]}</p>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full bg-foreground transition-all duration-500 ${
            stage === 'building' ? 'animate-pulse' : ''
          }`}
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {steps.map((item, idx) => (
          <Badge key={item} variant={idx <= currentIndex ? 'secondary' : 'outline'}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromParams = searchParams.get('projectId');
  const sourceTextFromParams = searchParams.get('sourceText');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';

  const [stage, setStage] = useState<WorkflowStage>('upload');
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [autoMode, setAutoMode] = useState(true);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [plan, setPlan] = useState<PresentationPlanResult | null>(null);
  const [uiConfig, setUiConfig] = useState<Partial<PresentationUiConfig>>({
    includeSpeakerNotes: false,
    includeAgenda: true,
    includeSummary: true,
    includeQA: false,
    includeQuiz: false,
    includeReferences: false,
    includeAppendix: false,
    density: 'balanced',
    tone: 'professional',
    audience: 'general',
    goal: 'teach',
    imageRichness: 'medium',
    citations: 'minimal',
    slideCount: 10,
    chartPreference: 'auto',
    captionStyle: 'balanced',
    layoutStyle: 'mixed',
  });

  const [slideSubjects, setSlideSubjects] = useState<string[]>(defaultSubjectSeed(8));
  const [presetTitle, setPresetTitle] = useState('My preset');
  const [themePreset, setThemePreset] = useState<(typeof THEME_PRESETS)[number]['id']>('clean-classic');
  const [fontPreset, setFontPreset] = useState<(typeof FONT_PRESETS)[number]['id']>('modern-sans');
  const [layoutPreset, setLayoutPreset] = useState<(typeof LAYOUT_PRESETS)[number]['id']>('balanced');
  const [bulletPreset, setBulletPreset] = useState<(typeof BULLET_PRESETS)[number]['id']>('mixed');

  const [prototype, setPrototype] = useState<PresentationPrototype | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lastSyncedSourceText, setLastSyncedSourceText] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExportingCloud, setIsExportingCloud] = useState(false);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [activeShareUrl, setActiveShareUrl] = useState<string | null>(null);
  const [onedriveExportFolder, setOnedriveExportFolder] = useState<{
    folderId: string;
    folderName: string;
    driveId?: string;
  } | null>(null);
  const { toast } = useToast();

  const persistWorkflowSnapshot = useCallback(
    async (overrides?: Partial<{
      stage: WorkflowStage;
      slideSubjects: string[];
      setupPreset: {
        title?: string;
        themePreset?: string;
        fontPreset?: string;
        layoutPreset?: string;
        bulletPreset?: string;
      };
      uiConfig: Partial<PresentationUiConfig>;
      title: string;
      platform: PresentationPlatform;
      prompt: string;
    }>) => {
      if (!projectId) return;
      const body = {
        stage: overrides?.stage ?? stage,
        slideSubjects: overrides?.slideSubjects ?? slideSubjects,
        setupPreset: overrides?.setupPreset ?? {
          title: presetTitle.trim() || 'Custom preset',
          themePreset,
          fontPreset,
          layoutPreset,
          bulletPreset,
        },
        uiConfig: overrides?.uiConfig ?? { ...uiConfig, platform },
        title: overrides?.title ?? (customTitle.trim() || 'Untitled presentation'),
        platform: overrides?.platform ?? platform,
        prompt: overrides?.prompt ?? sourceText,
      };
      await fetch(`/api/presentation/${projectId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    [
      projectId,
      stage,
      slideSubjects,
      presetTitle,
      themePreset,
      fontPreset,
      layoutPreset,
      bulletPreset,
      uiConfig,
      platform,
      customTitle,
      sourceText,
    ]
  );

  const goToStage = useCallback(
    (nextStage: WorkflowStage) => {
      setStage(nextStage);
      void persistWorkflowSnapshot({ stage: nextStage });
    },
    [persistWorkflowSnapshot]
  );

  const applyConfig = useCallback((patch: Partial<PresentationUiConfig>) => {
    setUiConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const target = Math.max(4, Math.min(20, uiConfig.slideCount || 10));
    setSlideSubjects((prev) => {
      if (prev.length === target) return prev;
      if (prev.length > target) return prev.slice(0, target);
      return [...prev, ...Array.from({ length: target - prev.length }, (_, i) => `Subject ${prev.length + i + 1}`)];
    });
  }, [uiConfig.slideCount]);

  useEffect(() => {
    if (!projectIdFromParams) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/presentation/${projectIdFromParams}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.project) return;
        if (cancelled) return;

        const project = payload.project;
        const workflow = project.workflow_state || {};
        setProjectId(project.id);
        setCustomTitle(typeof project.title === 'string' ? project.title : '');
        setPlatform((project.selected_platform || 'powerpoint') as PresentationPlatform);
        setSourceText(typeof project.prompt === 'string' ? project.prompt : '');
        setLastSyncedSourceText(typeof project.prompt === 'string' ? project.prompt : '');
        if (project.ui_config && typeof project.ui_config === 'object') {
          setUiConfig((prev) => ({ ...prev, ...(project.ui_config || {}) }));
        }
        if (Array.isArray(workflow.slideSubjects) && workflow.slideSubjects.length > 0) {
          setSlideSubjects(workflow.slideSubjects.map((item: any, idx: number) => normalizeSubject(String(item || ''), idx)));
        }
        if (workflow.setupPreset && typeof workflow.setupPreset === 'object') {
          const preset = workflow.setupPreset;
          if (typeof preset.title === 'string' && preset.title) setPresetTitle(preset.title);
          if (typeof preset.themePreset === 'string' && THEME_PRESETS.some((item) => item.id === preset.themePreset)) {
            setThemePreset(preset.themePreset as (typeof THEME_PRESETS)[number]['id']);
          }
          if (typeof preset.fontPreset === 'string' && FONT_PRESETS.some((item) => item.id === preset.fontPreset)) {
            setFontPreset(preset.fontPreset as (typeof FONT_PRESETS)[number]['id']);
          }
          if (typeof preset.layoutPreset === 'string' && LAYOUT_PRESETS.some((item) => item.id === preset.layoutPreset)) {
            setLayoutPreset(preset.layoutPreset as (typeof LAYOUT_PRESETS)[number]['id']);
          }
          if (typeof preset.bulletPreset === 'string' && BULLET_PRESETS.some((item) => item.id === preset.bulletPreset)) {
            setBulletPreset(preset.bulletPreset as (typeof BULLET_PRESETS)[number]['id']);
          }
        }
        if (typeof workflow.stage === 'string') {
          setStage(workflow.stage as WorkflowStage);
        }
      } catch {
        // Keep local defaults if loading persisted project fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIdFromParams]);

  useEffect(() => {
    if (!projectId) return;
    const handle = window.setTimeout(() => {
      void persistWorkflowSnapshot();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [
    projectId,
    stage,
    slideSubjects,
    presetTitle,
    themePreset,
    fontPreset,
    layoutPreset,
    bulletPreset,
    uiConfig,
    customTitle,
    platform,
    sourceText,
    persistWorkflowSnapshot,
  ]);

  const ensureProjectAndSources = useCallback(async () => {
    const normalized = sourceText.trim();
    if (!normalized) throw new Error('Add source material first.');
    let currentProjectId = projectId;

    if (!currentProjectId) {
      const createResponse = await fetch('/api/presentation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || 'Untitled presentation',
          prompt: normalized,
          language,
          platform,
          uiConfig: { ...uiConfig, platform },
          workflowState: {
            stage,
            slideSubjects,
            setupPreset: {
              title: presetTitle.trim() || 'Custom preset',
              themePreset,
              fontPreset,
              layoutPreset,
              bulletPreset,
            },
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      const createPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(String(createPayload?.error || `Failed to create project (${createResponse.status})`));
      }
      currentProjectId = String(createPayload?.project?.id || '');
      if (!currentProjectId) throw new Error('Project creation returned no id');
      setProjectId(currentProjectId);
    }

    if (normalized !== lastSyncedSourceText) {
      const sourceResponse = await fetch(`/api/presentation/${currentProjectId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replaceExistingTextSources: true,
          sources: [
            {
              sourceType: 'text',
              content: normalized,
              extractedText: normalized,
              parsedMetadata: { origin: 'presentation_input' },
            },
          ],
        }),
      });
      const sourcePayload = await sourceResponse.json().catch(() => ({}));
      if (!sourceResponse.ok) {
        throw new Error(String(sourcePayload?.error || `Failed to sync sources (${sourceResponse.status})`));
      }
      setLastSyncedSourceText(normalized);
    }

    return currentProjectId;
  }, [
    bulletPreset,
    customTitle,
    fontPreset,
    language,
    lastSyncedSourceText,
    layoutPreset,
    platform,
    presetTitle,
    projectId,
    slideSubjects,
    sourceText,
    stage,
    themePreset,
    uiConfig,
  ]);

  const runPlanningStep = useCallback(async () => {
    const pid = await ensureProjectAndSources();
    const response = await fetch(`/api/presentation/${pid}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: sourceText,
        autoMode,
        uiConfig: { ...uiConfig, platform },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || `Failed to plan presentation (${response.status})`));
    }
    const nextPlan = payload?.plan as PresentationPlanResult | undefined;
    if (nextPlan) {
      setPlan(nextPlan);
      setAnalysis(nextPlan.analysis || null);
      setUiConfig((prev) => ({ ...prev, ...nextPlan.effectiveConfig }));
      if (Array.isArray(nextPlan.slidePlan) && nextPlan.slidePlan.length > 0) {
        setSlideSubjects(
          nextPlan.slidePlan.map((item, idx) =>
            normalizeSubject(item.objective?.replace(/^Explain\s*/i, '').replace(/\.$/, ''), idx)
          )
        );
      }
    }
    return pid;
  }, [autoMode, ensureProjectAndSources, platform, sourceText, uiConfig]);

  const continueToSubjects = useCallback(async () => {
    if (!sourceText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Add source material first',
        description: 'Upload or paste your source material before continuing.',
      });
      return;
    }
    setIsPlanning(true);
    try {
      await runPlanningStep();
      goToStage('subjects');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not prepare setup',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsPlanning(false);
    }
  }, [goToStage, runPlanningStep, sourceText, toast]);

  const buildPresentation = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsBuilding(true);
    goToStage('building');
    try {
      const pid = await ensureProjectAndSources();
      const response = await fetch(`/api/presentation/${pid}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || undefined,
          prompt: sourceText,
          language,
          autoMode,
          uiConfig: {
            ...uiConfig,
            platform,
            layoutStyle: layoutPreset === 'visual-first' ? 'visual_first' : layoutPreset === 'text-first' ? 'text_first' : 'mixed',
            captionStyle: bulletPreset === 'concise' ? 'short' : bulletPreset === 'expanded' ? 'detailed' : 'balanced',
          },
          slideSubjects: slideSubjects.map((s, i) => normalizeSubject(s, i)),
          setupPreset: {
            title: presetTitle.trim() || 'Custom preset',
            themePreset,
            fontPreset,
            layoutPreset,
            bulletPreset,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || `Failed to build presentation (${response.status})`));
      }
      const nextPlan = payload?.plan as PresentationPlanResult | undefined;
      setPlan(nextPlan || null);
      setAnalysis(nextPlan?.analysis || null);
      setPrototype(mapBuildToPrototype(payload));
      setSelectedSlideIndex(0);
      goToStage('result');
      toast({ title: 'Presentation built', description: 'Deck generated with your slide subjects and style setup.' });
    } catch (error: any) {
      goToStage('style');
      toast({
        variant: 'destructive',
        title: 'Could not build presentation',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsBuilding(false);
    }
  }, [
    autoMode,
    bulletPreset,
    customTitle,
    ensureProjectAndSources,
    fontPreset,
    language,
    layoutPreset,
    platform,
    presetTitle,
    slideSubjects,
    sourceText,
    themePreset,
    toast,
    uiConfig,
    goToStage,
  ]);

  const downloadPresentation = useCallback(async () => {
    if (!prototype || !projectId) return;
    try {
      const response = await fetch(`/api/presentation/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: { kind: 'download' } }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to export PPTX (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const safeTitle = (prototype.title || 'presentation').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeTitle || 'presentation'}.pptx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not export presentation',
        description: error?.message || 'Please try again.',
      });
    }
  }, [projectId, prototype, toast]);

  const exportToCloud = useCallback(async () => {
    if (!prototype || !projectId) return;
    setIsExportingCloud(true);
    try {
      const destinationKind =
        platform === 'google-slides' ? 'google' : platform === 'powerpoint' ? 'microsoft' : 'download';
      if (destinationKind === 'download') {
        await downloadPresentation();
        return;
      }
      const response = await fetch(`/api/presentation/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination:
            destinationKind === 'google'
              ? { kind: 'google', targetApp: 'google-slides' }
              : {
                  kind: 'microsoft',
                  targetApp: 'powerpoint',
                  microsoftFolder: onedriveExportFolder
                    ? { folderId: onedriveExportFolder.folderId, driveId: onedriveExportFolder.driveId }
                    : undefined,
                },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || `Export failed (${response.status})`));
      if (payload?.webUrl) window.open(payload.webUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: destinationKind === 'google' ? 'Exported to Google' : 'Exported to Microsoft',
        description:
          payload?.webUrl
            ? destinationKind === 'google'
              ? 'Opening in Google Slides / Drive.'
              : 'Opening in PowerPoint / OneDrive.'
            : 'Export complete.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: platform === 'google-slides' ? 'Google export failed' : 'Microsoft export failed',
        description: `${error?.message || 'Could not export to cloud.'} Download is still available.`,
      });
    } finally {
      setIsExportingCloud(false);
    }
  }, [downloadPresentation, onedriveExportFolder, platform, projectId, prototype, toast]);

  const sharePreview = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/presentation/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInHours: 72 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || `Share failed (${response.status})`));
      if (payload?.shareUrl) {
        await navigator.clipboard.writeText(payload.shareUrl);
        setActiveShareToken(typeof payload?.token === 'string' ? payload.token : null);
        setActiveShareUrl(payload.shareUrl);
      }
      toast({ title: 'Preview link copied', description: 'Public snapshot link copied to clipboard.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not publish preview',
        description: error?.message || 'Please try again.',
      });
    }
  }, [projectId, toast]);

  const revokeSharePreview = useCallback(async () => {
    if (!activeShareToken) return;
    try {
      const response = await fetch(`/api/tools/presentation/share/${activeShareToken}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Failed to revoke share link'));
      setActiveShareToken(null);
      setActiveShareUrl(null);
      toast({ title: 'Share link revoked', description: 'Public preview access has been disabled.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not revoke share link',
        description: error?.message || 'Please try again.',
      });
    }
  }, [activeShareToken, toast]);

  useEffect(() => {
    if (!isSlideshow || !prototype) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSlideshow(false);
      if (event.key === 'ArrowRight') setSelectedSlideIndex((prev) => Math.min(prev + 1, prototype.previewManifest.slides.length - 1));
      if (event.key === 'ArrowLeft') setSelectedSlideIndex((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSlideshow, prototype]);

  const sidebar = (
    <AdaptiveSettingsSidebar
      analysis={analysis}
      autoMode={autoMode}
      onAutoModeChange={setAutoMode}
      customTitle={customTitle}
      onTitleChange={setCustomTitle}
      platform={platform}
      onPlatformChange={setPlatform}
      uiConfig={uiConfig}
      onPatch={applyConfig}
      controlTiers={plan?.relevanceRankedControls || null}
      disabled={isPlanning || isBuilding}
    />
  );

  const previewMeta = useMemo(() => {
    if (!prototype) return null;
    return `${prototype.slideCount} slides - ${prototype.analysis.dominantArchetype?.replace(/_/g, ' ') || 'presentation'}`;
  }, [prototype]);

  const cloudLabel = useMemo(() => {
    if (platform === 'google-slides') return 'Export + open Google Slides';
    if (platform === 'powerpoint') return 'Export + open PowerPoint';
    return 'Download .pptx';
  }, [platform]);

  return (
    <WorkbenchShell title="Presentation" description="Upload > slide setup > style presets > generate." sidebar={sidebar}>
      <div className="relative flex h-full flex-col gap-4">
        {(isPlanning || isBuilding) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        <StageProgress stage={stage} />

        {prototype && (
          <Card className="border border-border/70">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{prototype.title}</p>
                  <p className="text-xs text-muted-foreground">{previewMeta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platform === 'powerpoint' && (
                    <OneDriveExportFolderPicker value={onedriveExportFolder} onChange={setOnedriveExportFolder} />
                  )}
                  <ActionBar
                    onDownload={() => void downloadPresentation()}
                    onExportCloud={() => void exportToCloud()}
                    onShare={() => void sharePreview()}
                    exportingCloud={isExportingCloud}
                    cloudLabel={cloudLabel}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeShareUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/35 p-2">
            <Badge variant="secondary">Public preview active</Badge>
            <a href={activeShareUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">
              {activeShareUrl}
            </a>
            <Button size="sm" variant="outline" onClick={() => void revokeSharePreview()}>
              Revoke link
            </Button>
          </div>
        )}

        {stage === 'upload' && (
          <SourceInput
            toolId="presentation"
            value={sourceText}
            onChange={setSourceText}
            onSubmit={() => void continueToSubjects()}
            placeholder="Upload or paste all source material: files, notes, links, screenshots, media..."
            topContent={<MicrosoftAppStrip returnTo="/tools/presentation" />}
            speechLanguage={language}
            enableMic={false}
            enableCaptions={false}
            sourceMergeMode="append_labeled"
            submitLabel="Continue to slide setup"
          />
        )}

        {stage === 'subjects' && (
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Slide setup</CardTitle>
              <CardDescription>
                Define subject/title per slide. Press Enter to jump to the next slide input.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
              <div className="max-h-[560px] overflow-auto rounded-xl border border-border/60 bg-muted/35 p-2">
                {slideSubjects.map((subject, idx) => (
                  <button
                    key={`subject-${idx}`}
                    type="button"
                    onClick={() => setActiveSubjectIndex(idx)}
                    className={`mb-2 w-full rounded-lg border p-2 text-left ${
                      idx === activeSubjectIndex ? 'border-foreground/50 bg-background' : 'border-border/50 bg-card/70 hover:bg-background/70'
                    }`}
                  >
                    <p className="text-[11px] text-muted-foreground">Slide {idx + 1}</p>
                    <p className="truncate text-xs font-medium">{normalizeSubject(subject, idx)}</p>
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setSlideSubjects((prev) => [...prev, `Subject ${prev.length + 1}`])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add slide
                </Button>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Slide {activeSubjectIndex + 1} subject</p>
                  <Input
                    value={slideSubjects[activeSubjectIndex] || ''}
                    onChange={(e) =>
                      setSlideSubjects((prev) => prev.map((item, idx) => (idx === activeSubjectIndex ? e.target.value : item)))
                    }
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      if (activeSubjectIndex < slideSubjects.length - 1) {
                        setActiveSubjectIndex((prev) => prev + 1);
                      } else {
                        goToStage('style');
                      }
                    }}
                    placeholder="Type the specific topic for this slide..."
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => goToStage('upload')}>
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSlideSubjects((prev) => prev.filter((_, idx) => idx !== activeSubjectIndex));
                      setActiveSubjectIndex((prev) => Math.max(0, Math.min(prev, slideSubjects.length - 2)));
                    }}
                    disabled={slideSubjects.length <= 1}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove current slide
                  </Button>
                  <Button onClick={() => goToStage('style')}>
                    Continue to style setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'style' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Preset identity</CardTitle>
                  <CardDescription>Name and reuse your setup style.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={presetTitle} onChange={(e) => setPresetTitle(e.target.value)} placeholder="Preset name" />
                  <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={themePreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setThemePreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Typography & layout</CardTitle>
                  <CardDescription>Control fonts, bullet style, and structure behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {FONT_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={fontPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFontPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUT_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={layoutPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLayoutPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BULLET_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={bulletPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBulletPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {analysis && <SourceAnalysisCard analysis={analysis} />}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => goToStage('subjects')}>
                Back to slide setup
              </Button>
              <Button onClick={() => void buildPresentation()}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate presentation
              </Button>
            </div>
          </div>
        )}

        {stage === 'building' && (
          <Card className="border border-border/70">
            <CardContent className="py-10">
              <div className="mx-auto max-w-xl space-y-4 text-center">
                <p className="text-sm text-muted-foreground">Building presentation in 2 AI steps (plan to generate)...</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'result' && prototype && (
          <PresentationPreview
            manifest={prototype.previewManifest}
            selectedSlideIndex={selectedSlideIndex}
            onSelectSlide={setSelectedSlideIndex}
            onStartSlideshow={() => setIsSlideshow(true)}
            onDownload={() => void downloadPresentation()}
            onExportCloud={() => void exportToCloud()}
            onShare={() => void sharePreview()}
            exportingCloud={isExportingCloud}
            cloudLabel={cloudLabel}
          />
        )}
      </div>

      {isSlideshow && prototype && (
        <SlideshowView
          manifest={prototype.previewManifest}
          selectedIndex={selectedSlideIndex}
          onSelect={setSelectedSlideIndex}
          onClose={() => setIsSlideshow(false)}
        />
      )}
    </WorkbenchShell>
  );
}

export default function PresentationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <PresentationPageContent />
    </Suspense>
  );
}






'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  ExternalLink,
  Loader2,
  PanelsLeftRight,
  Play,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PresentationUiConfig, PreviewManifest, RelevantControlKey, SourceAnalysis } from '@/lib/presentation/types';

type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';

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
  estimatedCostHint: {
    strategy: string;
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    note: string;
  };
  timeline: Array<{ step: string; status: 'done' | 'pending' }>;
};

const platformOptions = [
  { value: 'powerpoint', label: 'PowerPoint' },
  { value: 'google-slides', label: 'Google Slides' },
  { value: 'keynote', label: 'Keynote' },
];

const toneOptions = [
  { value: 'academic', label: 'Academic' },
  { value: 'professional', label: 'Professional' },
  { value: 'simple', label: 'Simple' },
  { value: 'persuasive', label: 'Persuasive' },
];

const densityOptions = [
  { value: 'light', label: 'Light' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
];

const audienceOptions = [
  { value: 'middle_school', label: 'Middle school' },
  { value: 'high_school', label: 'High school' },
  { value: 'university', label: 'University' },
  { value: 'professional', label: 'Professional' },
  { value: 'general', label: 'General' },
];

const goalOptions = [
  { value: 'teach', label: 'Teach' },
  { value: 'study', label: 'Study' },
  { value: 'report', label: 'Report' },
  { value: 'pitch', label: 'Pitch' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'training', label: 'Training' },
  { value: 'demo', label: 'Demo' },
];

const imageOptions = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'source_only', label: 'Source only' },
  { value: 'internet_allowed', label: 'Internet allowed' },
];

const citationOptions = [
  { value: 'off', label: 'Off' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'strict', label: 'Strict' },
];

const chartOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'chart_first', label: 'Chart first' },
  { value: 'table_first', label: 'Table first' },
];

const captionOptions = [
  { value: 'short', label: 'Short' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];

const layoutOptions = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'visual_first', label: 'Visual first' },
  { value: 'text_first', label: 'Text first' },
];

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [autoMode, setAutoMode] = useState(true);
  const [showComposer, setShowComposer] = useState(true);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
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
  const [prototype, setPrototype] = useState<PresentationPrototype | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingMicrosoft, setIsExportingMicrosoft] = useState(false);
  const { toast } = useToast();

  const relevantControls = useMemo(() => new Set(analysis?.relevantControls || []), [analysis]);
  const hasAnalysis = Boolean(analysis);

  const applyConfig = useCallback((patch: Partial<PresentationUiConfig>) => {
    setUiConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const analyzeSources = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/tools/presentation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          currentConfig: { ...uiConfig, platform },
          autoMode,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to analyze sources (${response.status})`);
      }
      const payload = await response.json();
      setAnalysis(payload.analysis || null);
      if (payload?.effectiveConfig) {
        setUiConfig(payload.effectiveConfig);
      }
      toast({
        title: 'Sources analyzed',
        description: 'Adaptive settings are now available.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not analyze sources',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [autoMode, platform, sourceText, toast, uiConfig]);

  const generatePresentation = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/tools/presentation/prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          title: customTitle.trim() || undefined,
          language,
          autoMode,
          analysis,
          uiConfig: { ...uiConfig, platform },
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to generate presentation (${response.status})`);
      }
      const payload = await response.json();
      const next = payload?.prototype || null;
      setPrototype(next ? { ...next, slides: next.blueprint?.slides || [] } : null);
      setSelectedSlideIndex(0);
      setShowComposer(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not build presentation',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [analysis, autoMode, customTitle, language, platform, sourceText, toast, uiConfig]);

  useEffect(() => {
    if (sourceTextFromParams?.trim()) void analyzeSources();
  }, [analyzeSources, sourceTextFromParams]);

  const downloadPresentation = useCallback(async () => {
    if (!prototype) return;
    try {
      const response = await fetch('/api/tools/presentation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prototype.title,
          slides: prototype.slides,
          includeSpeakerNotes: prototype.effectiveConfig.includeSpeakerNotes,
          destination: { kind: 'download' },
        }),
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
  }, [prototype, toast]);

  const exportToMicrosoft = useCallback(async () => {
    if (!prototype) return;
    setIsExportingMicrosoft(true);
    try {
      const response = await fetch('/api/tools/presentation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prototype.title,
          slides: prototype.slides,
          includeSpeakerNotes: prototype.effectiveConfig.includeSpeakerNotes,
          destination: { kind: 'microsoft', targetApp: 'powerpoint' },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(payload?.error || `Export failed (${response.status})`);
        throw new Error(message);
      }
      if (payload?.webUrl) {
        window.open(payload.webUrl, '_blank', 'noopener,noreferrer');
      }
      toast({
        title: 'Exported to Microsoft',
        description: payload?.webUrl ? 'Opening in PowerPoint / OneDrive.' : 'Export complete.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Microsoft export failed',
        description: `${error?.message || 'Could not export to Microsoft.'} Download is still available.`,
      });
    } finally {
      setIsExportingMicrosoft(false);
    }
  }, [prototype, toast]);

  const sharePreview = useCallback(async () => {
    if (!prototype?.previewManifest) return;
    try {
      const response = await fetch('/api/tools/presentation/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prototype.title,
          previewManifest: prototype.previewManifest,
          expiresInHours: 72,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || `Share failed (${response.status})`));
      }
      if (payload?.shareUrl) {
        await navigator.clipboard.writeText(payload.shareUrl);
      }
      toast({
        title: 'Preview link copied',
        description: 'Public snapshot link copied to clipboard.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not publish preview',
        description: error?.message || 'Please try again.',
      });
    }
  }, [prototype, toast]);

  useEffect(() => {
    if (!isSlideshow || !prototype) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSlideshow(false);
      if (event.key === 'ArrowRight') {
        setSelectedSlideIndex((prev) => Math.min(prev + 1, prototype.previewManifest.slides.length - 1));
      }
      if (event.key === 'ArrowLeft') {
        setSelectedSlideIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSlideshow, prototype]);

  const activePreviewSlide = useMemo(() => {
    if (!prototype?.previewManifest?.slides?.length) return null;
    return prototype.previewManifest.slides[Math.max(0, Math.min(selectedSlideIndex, prototype.previewManifest.slides.length - 1))];
  }, [prototype, selectedSlideIndex]);

  const showControl = useCallback(
    (key: RelevantControlKey) => !hasAnalysis || relevantControls.has(key),
    [hasAnalysis, relevantControls]
  );

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="e.g. Biology Chapter 3"
          className="h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isAnalyzing || isGenerating}
        />
      </div>

      <PillSelector
        label="Platform"
        options={platformOptions}
        value={platform}
        onChange={(v) => setPlatform(v as PresentationPlatform)}
        disabled={isAnalyzing || isGenerating}
      />

      <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/40 p-2.5">
        <div>
          <p className="text-xs">Auto mode</p>
          <p className="text-[11px] text-muted-foreground">AI tunes settings from source material</p>
        </div>
        <Switch checked={autoMode} onCheckedChange={setAutoMode} />
      </div>

      {analysis && (
        <Card className="border border-sidebar-border/60 bg-sidebar-accent/45">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI analysis</CardTitle>
            <CardDescription>
              {analysis.dominantArchetype.replace(/_/g, ' ')} • {analysis.contentMode.replace(/_/g, ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <p>Audience: {analysis.audienceGuess || 'general'}</p>
            <p>Recommended slides: {analysis.recommendedSlideCountMin}-{analysis.recommendedSlideCountMax}</p>
            <p>Visual potential: {analysis.visualPotential}</p>
          </CardContent>
        </Card>
      )}

      {showControl('audience') && (
        <PillSelector
          label="Audience"
          options={audienceOptions}
          value={String(uiConfig.audience || 'general')}
          onChange={(v) => applyConfig({ audience: v as PresentationUiConfig['audience'] })}
          disabled={isAnalyzing || isGenerating}
        />
      )}
      {showControl('goal') && (
        <PillSelector
          label="Goal"
          options={goalOptions}
          value={String(uiConfig.goal || 'teach')}
          onChange={(v) => applyConfig({ goal: v as PresentationUiConfig['goal'] })}
          disabled={isAnalyzing || isGenerating}
        />
      )}
      {showControl('tone') && (
        <PillSelector
          label="Tone"
          options={toneOptions}
          value={String(uiConfig.tone || 'professional')}
          onChange={(v) => applyConfig({ tone: v as PresentationUiConfig['tone'] })}
          disabled={isAnalyzing || isGenerating}
        />
      )}
      {showControl('density') && (
        <PillSelector
          label="Content density"
          options={densityOptions}
          value={String(uiConfig.density || 'balanced')}
          onChange={(v) => applyConfig({ density: v as PresentationUiConfig['density'] })}
          disabled={isAnalyzing || isGenerating}
        />
      )}
      {showControl('imageRichness') && (
        <PillSelector
          label="Image richness"
          options={imageOptions}
          value={String(uiConfig.imageRichness || 'medium')}
          onChange={(v) => applyConfig({ imageRichness: v as PresentationUiConfig['imageRichness'] })}
          disabled={isAnalyzing || isGenerating}
        />
      )}
      {showControl('slideCount') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Slides</p>
            <span className="text-xs font-mono tabular-nums">{uiConfig.slideCount || 10}</span>
          </div>
          <Slider
            value={[uiConfig.slideCount || 10]}
            onValueChange={([v]) => applyConfig({ slideCount: v })}
            min={3}
            max={30}
            step={1}
            disabled={isAnalyzing || isGenerating}
          />
        </div>
      )}

      <div className="space-y-2 rounded-xl bg-sidebar-accent/40 p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs">Include speaker notes</p>
          <Switch
            checked={Boolean(uiConfig.includeSpeakerNotes)}
            onCheckedChange={(v) => applyConfig({ includeSpeakerNotes: v })}
          />
        </div>
        {showControl('agenda') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include agenda</p>
            <Switch checked={Boolean(uiConfig.includeAgenda)} onCheckedChange={(v) => applyConfig({ includeAgenda: v })} />
          </div>
        )}
        {showControl('summary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include summary</p>
            <Switch checked={Boolean(uiConfig.includeSummary)} onCheckedChange={(v) => applyConfig({ includeSummary: v })} />
          </div>
        )}
        {showControl('qa') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include Q&A</p>
            <Switch checked={Boolean(uiConfig.includeQA)} onCheckedChange={(v) => applyConfig({ includeQA: v })} />
          </div>
        )}
        {showControl('quiz') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include quiz</p>
            <Switch checked={Boolean(uiConfig.includeQuiz)} onCheckedChange={(v) => applyConfig({ includeQuiz: v })} />
          </div>
        )}
      </div>

      {hasAnalysis && (
        <div className="space-y-2 rounded-xl bg-sidebar-accent/30 p-2.5">
          <p className="text-xs text-muted-foreground">More options</p>
          {showControl('citations') && (
            <PillSelector
              label="Citations"
              options={citationOptions}
              value={String(uiConfig.citations || 'minimal')}
              onChange={(v) => applyConfig({ citations: v as PresentationUiConfig['citations'] })}
            />
          )}
          {showControl('chartPreference') && (
            <PillSelector
              label="Chart preference"
              options={chartOptions}
              value={String(uiConfig.chartPreference || 'auto')}
              onChange={(v) => applyConfig({ chartPreference: v as PresentationUiConfig['chartPreference'] })}
            />
          )}
          {showControl('captionStyle') && (
            <PillSelector
              label="Caption style"
              options={captionOptions}
              value={String(uiConfig.captionStyle || 'balanced')}
              onChange={(v) => applyConfig({ captionStyle: v as PresentationUiConfig['captionStyle'] })}
            />
          )}
          {showControl('layoutStyle') && (
            <PillSelector
              label="Layout style"
              options={layoutOptions}
              value={String(uiConfig.layoutStyle || 'mixed')}
              onChange={(v) => applyConfig({ layoutStyle: v as PresentationUiConfig['layoutStyle'] })}
            />
          )}
          {showControl('references') && (
            <div className="flex items-center justify-between">
              <p className="text-xs">Include references</p>
              <Switch checked={Boolean(uiConfig.includeReferences)} onCheckedChange={(v) => applyConfig({ includeReferences: v })} />
            </div>
          )}
          {showControl('appendix') && (
            <div className="flex items-center justify-between">
              <p className="text-xs">Include appendix</p>
              <Switch checked={Boolean(uiConfig.includeAppendix)} onCheckedChange={(v) => applyConfig({ includeAppendix: v })} />
            </div>
          )}
          {showControl('stepByStep') && (
            <div className="flex items-center justify-between">
              <p className="text-xs">Step-by-step mode</p>
              <Switch checked={Boolean(uiConfig.stepByStep)} onCheckedChange={(v) => applyConfig({ stepByStep: v })} />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <WorkbenchShell
      title="Presentation"
      description="Source-first adaptive presentation builder with Microsoft export."
      sidebar={sidebar}
    >
      <div className="relative flex h-full flex-col gap-4">
        {(isAnalyzing || isGenerating) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {prototype && (
          <Card className="border border-border/70">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{prototype.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {prototype.slideCount} slides • {prototype.analysis.dominantArchetype.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void downloadPresentation()}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .pptx
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void exportToMicrosoft()} disabled={isExportingMicrosoft}>
                    {isExportingMicrosoft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    Open in PowerPoint (Microsoft)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void sharePreview()}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowComposer((prev) => !prev)}>
                    {showComposer ? 'Hide setup' : 'Show setup'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showComposer && (
          <SourceInput
            toolId="presentation"
            value={initialSourceSeed}
            onChange={setSourceText}
            onSubmit={() => (hasAnalysis ? void generatePresentation() : void analyzeSources())}
            placeholder="Add your source material: notes, docs, screenshots, links, or cloud files..."
            topContent={<MicrosoftAppStrip returnTo="/tools/presentation" />}
            speechLanguage={language}
            enableMic={false}
            enableCaptions={false}
            sourceMergeMode="append_labeled"
            submitLabel={hasAnalysis ? 'Generate presentation' : 'Analyze sources'}
          />
        )}

        {analysis && !prototype && (
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Source analysis ready</CardTitle>
              <CardDescription>
                Relevant options are now shown in the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Type: {analysis.dominantArchetype.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">Audience: {analysis.audienceGuess || 'general'}</Badge>
                <Badge variant="outline">Slides: {analysis.recommendedSlideCountMin}-{analysis.recommendedSlideCountMax}</Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {analysis.reasons.map((reason) => (
                  <p key={reason}>- {reason}</p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void generatePresentation()}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate presentation
                </Button>
                <Button variant="outline" onClick={() => void analyzeSources()}>
                  Re-analyze
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {prototype && activePreviewSlide && (
          <Card className="border border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Read-only slide preview. Editing happens in PowerPoint/Slides.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{prototype.estimatedCostHint.strategy}</Badge>
                  <Badge variant="outline">
                    ~{prototype.estimatedCostHint.estimatedPromptTokens + prototype.estimatedCostHint.estimatedCompletionTokens} tokens
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {prototype.timeline.map((entry) => (
                  <Badge key={entry.step} variant={entry.status === 'done' ? 'secondary' : 'outline'}>
                    {entry.step}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="max-h-[540px] overflow-auto rounded-xl bg-muted/35 p-2">
                  {prototype.previewManifest.slides.map((slide, idx) => (
                    <button
                      key={slide.slideId}
                      type="button"
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`mb-2 w-full rounded-lg border p-2 text-left ${idx === selectedSlideIndex ? 'border-foreground/50 bg-background' : 'border-border/50 bg-card/70 hover:bg-background/70'}`}
                    >
                      <p className="text-[11px] text-muted-foreground">Slide {slide.index}</p>
                      <img src={slide.thumbUrl} alt={`Slide ${slide.index}`} className="mt-1 w-full rounded border" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center rounded-xl bg-muted/35 p-3">
                  <img
                    src={activePreviewSlide.imageUrl}
                    alt={`Slide ${activePreviewSlide.index}`}
                    className="w-full max-w-[940px] rounded-xl border border-border/60 bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void downloadPresentation()}>
                  <Download className="mr-2 h-4 w-4" />
                  Download .pptx
                </Button>
                <Button variant="outline" onClick={() => void exportToMicrosoft()} disabled={isExportingMicrosoft}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Export + open Microsoft
                </Button>
                <Button variant="outline" onClick={() => setIsSlideshow(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start slideshow
                </Button>
                <Button variant="outline" onClick={() => void sharePreview()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share preview
                </Button>
                <Button variant="ghost" onClick={() => setShowComposer(true)}>
                  <PanelsLeftRight className="mr-2 h-4 w-4" />
                  Tune and regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isSlideshow && prototype && activePreviewSlide && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedSlideIndex((v) => Math.max(v - 1, 0))}>
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedSlideIndex((v) => Math.min(v + 1, prototype.previewManifest.slides.length - 1))}
            >
              Next
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setIsSlideshow(false)}>
              <X className="mr-2 h-4 w-4" />
              Exit
            </Button>
          </div>
          <div className="flex h-full items-center justify-center p-8">
            <img src={activePreviewSlide.imageUrl} alt={`Slide ${activePreviewSlide.index}`} className="max-h-full max-w-full rounded-lg" />
          </div>
        </div>
      )}
    </WorkbenchShell>
  );
}

export default function PresentationPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <PresentationPageContent />
    </Suspense>
  );
}

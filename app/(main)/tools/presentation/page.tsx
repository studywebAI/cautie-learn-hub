'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Loader2, PanelsLeftRight, Sparkles } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { SourceInput } from '@/components/tools/source-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PresentationUiConfig, PreviewManifest, SourceAnalysis } from '@/lib/presentation/types';
import { AdaptiveSettingsSidebar } from '@/components/presentation/adaptive-settings-sidebar';
import { SourceAnalysisCard } from '@/components/presentation/source-analysis-card';
import { PresentationPreview } from '@/components/presentation/presentation-preview';
import { SlideshowView } from '@/components/presentation/slideshow-view';
import { ActionBar } from '@/components/presentation/action-bar';

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
  quality?: {
    averageScore: number;
    totalIssues: number;
    passed: boolean;
  };
};

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
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [activeShareUrl, setActiveShareUrl] = useState<string | null>(null);
  const { toast } = useToast();

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
        setActiveShareToken(typeof payload?.token === 'string' ? payload.token : null);
        setActiveShareUrl(payload.shareUrl);
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

  const revokeSharePreview = useCallback(async () => {
    if (!activeShareToken) return;
    try {
      const response = await fetch(`/api/tools/presentation/share/${activeShareToken}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Failed to revoke share link'));
      }
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
      disabled={isAnalyzing || isGenerating}
    />
  );

  const previewMeta = useMemo(() => {
    if (!prototype) return null;
    return `${prototype.slideCount} slides • ${prototype.analysis.dominantArchetype.replace(/_/g, ' ')}`;
  }, [prototype]);

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
                  <p className="text-xs text-muted-foreground">{previewMeta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionBar
                    onDownload={() => void downloadPresentation()}
                    onExportMicrosoft={() => void exportToMicrosoft()}
                    onShare={() => void sharePreview()}
                    exportingMicrosoft={isExportingMicrosoft}
                  />
                  <Button size="sm" variant="ghost" onClick={() => setShowComposer((prev) => !prev)}>
                    {showComposer ? 'Hide setup' : 'Show setup'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!prototype && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">AI images: disabled</Badge>
            <Badge variant="outline">Canonical output: .pptx</Badge>
            <Badge variant="outline">Cloud export: Microsoft</Badge>
          </div>
        )}

        {prototype && activeShareUrl && (
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
          <>
            <SourceAnalysisCard analysis={analysis} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void generatePresentation()}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate presentation
              </Button>
              <Button variant="outline" onClick={() => void analyzeSources()}>
                Re-analyze
              </Button>
            </div>
          </>
        )}

        {prototype && (
          <PresentationPreview
            manifest={prototype.previewManifest}
            timeline={prototype.timeline}
            selectedSlideIndex={selectedSlideIndex}
            onSelectSlide={setSelectedSlideIndex}
            onStartSlideshow={() => setIsSlideshow(true)}
            onDownload={() => void downloadPresentation()}
            onExportMicrosoft={() => void exportToMicrosoft()}
            onShare={() => void sharePreview()}
            exportingMicrosoft={isExportingMicrosoft}
            costHint={prototype.estimatedCostHint}
            quality={prototype.quality}
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

      {prototype?.platform === 'google-slides' && (
        <div className="mt-2 rounded-md border border-amber-300/40 bg-amber-100/40 p-2 text-xs text-amber-900">
          Google cloud export is not configured in this workspace yet. Use Microsoft export or download.
          <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
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

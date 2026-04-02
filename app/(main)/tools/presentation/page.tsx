'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Loader2,
  Monitor,
  PanelsLeftRight,
  Play,
  Presentation,
  Sparkles,
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

type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';

type PresentationSlide = {
  index: number;
  heading: string;
  bullets: string[];
  imageHints: string[];
};

type PresentationPrototype = {
  platform: PresentationPlatform;
  title: string;
  slideCount: number;
  slides: PresentationSlide[];
  estimatedCostHint: {
    strategy: string;
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
    note: string;
  };
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

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [slideCount, setSlideCount] = useState(10);
  const [tone, setTone] = useState('professional');
  const [density, setDensity] = useState('balanced');
  const [imageRichness, setImageRichness] = useState(45);
  const [includeAgenda, setIncludeAgenda] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeQnA, setIncludeQnA] = useState(false);
  const [prototype, setPrototype] = useState<PresentationPrototype | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(true);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const { toast } = useToast();

  const generatePrototype = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/tools/presentation/prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          title: customTitle.trim() || undefined,
          platform,
          slideCount,
          options: {
            tone,
            density,
            includeAgenda,
            includeSummary,
            includeQnA,
            imageRichness,
          },
          language,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to generate prototype (${response.status})`);
      }
      const payload = await response.json();
      const next = payload?.prototype || null;
      setPrototype(next);
      setSelectedSlideIndex(0);
      setShowComposer(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not build presentation',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    customTitle,
    density,
    imageRichness,
    includeAgenda,
    includeQnA,
    includeSummary,
    language,
    platform,
    slideCount,
    sourceText,
    tone,
    toast,
  ]);

  useEffect(() => {
    if (sourceTextFromParams?.trim()) void generatePrototype();
  }, [generatePrototype, sourceTextFromParams]);

  const downloadPresentation = useCallback(
    async (openAfterDownload: boolean) => {
      if (!prototype) return;
      try {
        const response = await fetch('/api/tools/presentation/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: prototype.title, slides: prototype.slides }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to export PPTX (${response.status})`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const safeTitle = (prototype.title || 'presentation')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${safeTitle || 'presentation'}.pptx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        if (openAfterDownload) {
          window.open(url, '_blank', 'noopener,noreferrer');
          toast({ title: `Opened download`, description: `Open the file in ${platformOptions.find((p) => p.value === platform)?.label}.` });
        }

        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Could not export presentation',
          description: error?.message || 'Please try again.',
        });
      }
    },
    [platform, prototype, toast]
  );

  const activeSlide = useMemo(() => {
    if (!prototype || prototype.slides.length === 0) return null;
    return prototype.slides[Math.max(0, Math.min(selectedSlideIndex, prototype.slides.length - 1))];
  }, [prototype, selectedSlideIndex]);

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="e.g. Biology Chapter 3"
          className="w-full h-8 rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
        />
      </div>

      <PillSelector label="Platform" options={platformOptions} value={platform} onChange={(v) => setPlatform(v as PresentationPlatform)} disabled={isLoading} />
      <PillSelector label="Tone" options={toneOptions} value={tone} onChange={setTone} disabled={isLoading} />
      <PillSelector label="Content Density" options={densityOptions} value={density} onChange={setDensity} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Slides</p>
          <span className="text-xs font-mono tabular-nums">{slideCount}</span>
        </div>
        <Slider value={[slideCount]} onValueChange={([v]) => setSlideCount(v)} min={3} max={30} step={1} disabled={isLoading} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Image Richness</p>
          <span className="text-xs font-mono tabular-nums">{imageRichness}%</span>
        </div>
        <Slider value={[imageRichness]} onValueChange={([v]) => setImageRichness(v)} min={0} max={100} step={5} disabled={isLoading} />
      </div>

      <div className="space-y-2 rounded-xl bg-sidebar-accent/40 p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs">Include agenda slide</p>
          <Switch checked={includeAgenda} onCheckedChange={setIncludeAgenda} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs">Include summary slide</p>
          <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs">Include Q and A slide</p>
          <Switch checked={includeQnA} onCheckedChange={setIncludeQnA} />
        </div>
      </div>
    </>
  );

  return (
    <WorkbenchShell title="Presentation" description="Build, preview, and export slide decks." sidebar={sidebar}>
      <div className="relative h-full flex flex-col gap-4">
        {isLoading && (
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
                  <p className="text-xs text-muted-foreground">{prototype.slideCount} slides ready</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void downloadPresentation(false)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .pptx
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void downloadPresentation(true)}>
                    <Presentation className="mr-2 h-4 w-4" />
                    Open in {platformOptions.find((p) => p.value === platform)?.label}
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
            onSubmit={() => void generatePrototype()}
            placeholder="Paste or type your source material for slides..."
            topContent={<MicrosoftAppStrip returnTo="/tools/presentation" />}
            speechLanguage={language}
            enableMic={false}
            enableCaptions={false}
            sourceMergeMode="append_labeled"
          />
        )}

        {prototype && activeSlide && (
          <Card className="border border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Replica style preview before export.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{prototype.estimatedCostHint.strategy}</Badge>
                  <Badge variant="outline">~{prototype.estimatedCostHint.estimatedPromptTokens + prototype.estimatedCostHint.estimatedCompletionTokens} tokens</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="max-h-[540px] overflow-auto rounded-xl bg-muted/35 p-2">
                  {prototype.slides.map((slide, idx) => (
                    <button
                      key={slide.index}
                      type="button"
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`mb-2 w-full rounded-lg border p-2 text-left ${idx === selectedSlideIndex ? 'border-foreground/50 bg-background' : 'border-border/50 bg-card/70 hover:bg-background/70'}`}
                    >
                      <p className="text-[11px] text-muted-foreground">Slide {slide.index}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium">{slide.heading}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center rounded-xl bg-muted/35 p-3">
                  <div className="relative w-full max-w-[940px] aspect-[16/9] rounded-xl border border-border/60 bg-white shadow-sm">
                    <div className="absolute inset-0 p-6 md:p-8">
                      <div className="mb-5 flex items-center justify-between">
                        <p className="text-xs text-[#666]">{prototype.title}</p>
                        <Monitor className="h-4 w-4 text-[#888]" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-semibold text-[#141414]">{activeSlide.heading}</h3>
                      <ul className="mt-5 space-y-2 md:space-y-3">
                        {activeSlide.bullets.map((bullet, index) => (
                          <li key={`${activeSlide.index}-${index}`} className="text-sm md:text-base text-[#2a2a2a] leading-snug">
                            - {bullet}
                          </li>
                        ))}
                      </ul>
                      <div className="absolute bottom-4 right-6 text-[11px] text-[#888]">Slide {activeSlide.index}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void downloadPresentation(false)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download .pptx
                </Button>
                <Button variant="outline" onClick={() => void downloadPresentation(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  Open in {platformOptions.find((p) => p.value === platform)?.label}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(prototype, null, 2)).then(() => {
                    toast({ title: 'Copied', description: 'Prototype JSON copied.' });
                  })}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Copy JSON
                </Button>
                <Button variant="ghost" onClick={() => setShowComposer(true)}>
                  <PanelsLeftRight className="mr-2 h-4 w-4" />
                  Tune options and regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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

'use client';

import React, { Suspense, useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2, MonitorPlay, Presentation, Sparkles } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { SourceInput } from '@/components/tools/source-input';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [slideCount, setSlideCount] = useState(8);
  const [prototype, setPrototype] = useState<PresentationPrototype | null>(null);
  const [showComposer, setShowComposer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
          language,
        }),
      });
      if (!response.ok) throw new Error(`Failed to generate prototype (${response.status})`);
      const payload = await response.json();
      setPrototype(payload?.prototype || null);
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
  }, [customTitle, language, platform, slideCount, sourceText, toast]);

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
          body: JSON.stringify({
            title: prototype.title || customTitle.trim() || 'Presentation',
            slides: prototype.slides,
          }),
        });
        if (!response.ok) throw new Error(`Failed to export PPTX (${response.status})`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const safeTitle = (prototype.title || customTitle || 'presentation')
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
    [customTitle, prototype, toast]
  );

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="e.g. Biology Ch3 Deck"
          className="w-full h-8 rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
        />
      </div>

      <PillSelector label="Platform" options={platformOptions} value={platform} onChange={(v) => setPlatform(v as PresentationPlatform)} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Slides</p>
          <span className="text-xs font-mono tabular-nums">{slideCount}</span>
        </div>
        <Slider
          value={[slideCount]}
          onValueChange={([v]) => setSlideCount(v)}
          min={3}
          max={30}
          step={1}
          disabled={isLoading}
        />
      </div>
    </>
  );

  return (
    <WorkbenchShell title="Presentation" description="Generate and export slide decks." sidebar={sidebar}>
      <div className="relative h-full flex flex-col gap-4">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {prototype && (
          <Card className="border border-border/70">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{prototype.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {prototype.slideCount} slides ready for export
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void downloadPresentation(false)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .pptx
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void downloadPresentation(true)}>
                    <Presentation className="mr-2 h-4 w-4" />
                    Open in PowerPoint
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComposer((prev) => !prev)}
                  >
                    {showComposer ? 'Hide source' : 'Edit source'}
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

        {prototype && (
          <div className="space-y-4">
            <Card className="border border-border/70">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{prototype.title}</CardTitle>
                    <CardDescription>
                      {prototype.slideCount} slides - {platformOptions.find((option) => option.value === prototype.platform)?.label}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{prototype.estimatedCostHint.strategy}</Badge>
                    <Badge variant="outline">
                      ~{prototype.estimatedCostHint.estimatedPromptTokens + prototype.estimatedCostHint.estimatedCompletionTokens} tokens
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {prototype.slides.map((slide) => (
                    <div key={slide.index} className="rounded-xl border border-border/60 bg-card/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">Slide {slide.index}</p>
                        <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-1 text-sm font-medium">{slide.heading}</p>
                      <ul className="mt-2 space-y-1">
                        {slide.bullets.map((bullet, bulletIndex) => (
                          <li key={`${slide.index}-${bulletIndex}`} className="text-xs text-muted-foreground">
                            - {bullet}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {slide.imageHints.map((hint) => (
                          <Badge key={`${slide.index}-${hint}`} variant="secondary">{hint}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  {prototype.estimatedCostHint.note}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void downloadPresentation(false)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .pptx
                  </Button>
                  <Button variant="outline" onClick={() => void downloadPresentation(true)}>
                    <Presentation className="mr-2 h-4 w-4" />
                    Open in PowerPoint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigator.clipboard.writeText(JSON.stringify(prototype, null, 2)).then(() => {
                        toast({ title: 'Copied', description: 'Presentation prototype JSON copied.' });
                      })
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Copy Prototype JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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

import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PreviewManifest } from '@/lib/presentation/types';
import { ActionBar } from '@/components/presentation/action-bar';

type PresentationPreviewProps = {
  manifest: PreviewManifest;
  timeline: Array<{ step: string; status: 'done' | 'pending' }>;
  selectedSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onStartSlideshow: () => void;
  onDownload: () => void;
  onExportMicrosoft: () => void;
  onShare: () => void;
  exportingMicrosoft?: boolean;
  costHint?: {
    strategy: string;
    estimatedPromptTokens: number;
    estimatedCompletionTokens: number;
  };
};

export function PresentationPreview({
  manifest,
  timeline,
  selectedSlideIndex,
  onSelectSlide,
  onStartSlideshow,
  onDownload,
  onExportMicrosoft,
  onShare,
  exportingMicrosoft = false,
  costHint,
}: PresentationPreviewProps) {
  const active = manifest.slides[Math.max(0, Math.min(selectedSlideIndex, manifest.slides.length - 1))];

  return (
    <Card className="border border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Read-only slide preview. Editing happens in external apps.</CardDescription>
          </div>
          {costHint && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{costHint.strategy}</Badge>
              <Badge variant="outline">~{costHint.estimatedPromptTokens + costHint.estimatedCompletionTokens} tokens</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2">
          {timeline.map((entry) => (
            <Badge key={entry.step} variant={entry.status === 'done' ? 'secondary' : 'outline'}>
              {entry.step}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="max-h-[540px] overflow-auto rounded-xl bg-muted/35 p-2">
            {manifest.slides.map((slide, idx) => (
              <button
                key={slide.slideId}
                type="button"
                onClick={() => onSelectSlide(idx)}
                className={`mb-2 w-full rounded-lg border p-2 text-left ${idx === selectedSlideIndex ? 'border-foreground/50 bg-background' : 'border-border/50 bg-card/70 hover:bg-background/70'}`}
              >
                <p className="text-[11px] text-muted-foreground">Slide {slide.index}</p>
                <img src={slide.thumbUrl} alt={`Slide ${slide.index}`} className="mt-1 w-full rounded border" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center rounded-xl bg-muted/35 p-3">
            <img
              src={active.imageUrl}
              alt={`Slide ${active.index}`}
              className="w-full max-w-[940px] rounded-xl border border-border/60 bg-white shadow-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionBar
            onDownload={onDownload}
            onExportMicrosoft={onExportMicrosoft}
            onShare={onShare}
            exportingMicrosoft={exportingMicrosoft}
          />
          <Button variant="outline" onClick={onStartSlideshow}>
            <Play className="mr-2 h-4 w-4" />
            Start slideshow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

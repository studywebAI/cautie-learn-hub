import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PreviewManifest } from '@/lib/presentation/types';
import { ActionBar } from '@/components/presentation/action-bar';

type PresentationPreviewProps = {
  manifest: PreviewManifest;
  selectedSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onStartSlideshow: () => void;
  onDownload: () => void;
  onExportCloud: () => void;
  onShare: () => void;
  exportingCloud?: boolean;
  cloudLabel: string;
};

export function PresentationPreview({
  manifest,
  selectedSlideIndex,
  onSelectSlide,
  onStartSlideshow,
  onDownload,
  onExportCloud,
  onShare,
  exportingCloud = false,
  cloudLabel,
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="max-h-[540px] overflow-auto rounded-xl surface-interactive p-2">
            {manifest.slides.map((slide, idx) => (
              <button
                key={slide.slideId}
                type="button"
                onClick={() => onSelectSlide(idx)}
                className={`mb-2 w-full rounded-lg border p-2 text-left ${idx === selectedSlideIndex ? 'border-foreground/50 bg-background' : 'border-border/50 surface-panel hover:bg-background/70'}`}
              >
                <p className="text-[11px] text-muted-foreground">Slide {slide.index}</p>
                <img src={slide.thumbUrl} alt={`Slide ${slide.index}`} className="mt-1 w-full rounded border" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center rounded-xl surface-interactive p-3">
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
            onExportCloud={onExportCloud}
            onShare={onShare}
            exportingCloud={exportingCloud}
            cloudLabel={cloudLabel}
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

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreviewManifest } from '@/lib/presentation/types';

type SlideshowViewProps = {
  manifest: PreviewManifest;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
};

export function SlideshowView({ manifest, selectedIndex, onSelect, onClose }: SlideshowViewProps) {
  const active = manifest.slides[Math.max(0, Math.min(selectedIndex, manifest.slides.length - 1))];

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onSelect(Math.max(selectedIndex - 1, 0))}>
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSelect(Math.min(selectedIndex + 1, manifest.slides.length - 1))}
        >
          Next
        </Button>
        <Button variant="destructive" size="sm" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Exit
        </Button>
      </div>
      <div className="flex h-full items-center justify-center p-8">
        <img src={active.imageUrl} alt={`Slide ${active.index}`} className="max-h-full max-w-full rounded-lg" />
      </div>
    </div>
  );
}

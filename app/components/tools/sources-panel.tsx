'use client';

import { FileText, Image as ImageIcon, Video, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export type SourceMedia = {
  kind: 'image' | 'video' | 'drawing';
  url: string;
  title?: string;
  source?: string;
};

export type SourcesPanelData = {
  citation?: string;
  media?: SourceMedia;
  imageUrl?: string;
  groundingNote?: string;
};

function hasSources(data: SourcesPanelData): boolean {
  return Boolean(data.citation?.trim()) || Boolean(data.media?.url) || Boolean(data.imageUrl?.trim());
}

const ICON_BY_KIND: Record<'text' | 'image' | 'video', typeof FileText> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
};

function SourceIcon({ kind }: { kind: 'text' | 'image' | 'video' }) {
  const Icon = ICON_BY_KIND[kind];
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
      <Icon className="h-3 w-3" />
    </span>
  );
}

export function SourcesPill({ data, onOpen }: { data: SourcesPanelData; onOpen: () => void }) {
  if (!hasSources(data)) return null;
  const kinds: Array<'text' | 'image' | 'video'> = [];
  if (data.citation?.trim()) kinds.push('text');
  if (data.media?.kind === 'image' || data.imageUrl?.trim()) kinds.push('image');
  if (data.media?.kind === 'video') kinds.push('video');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[var(--accent-brand)]/40 hover:text-foreground transition-colors"
    >
      <span>Sources:</span>
      <span className="flex items-center gap-1">
        {kinds.map((kind) => <SourceIcon key={kind} kind={kind} />)}
      </span>
    </button>
  );
}

export function SourcesSidebar({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SourcesPanelData;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Sources</SheetTitle>
          <SheetDescription>What this question was grounded in.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto">
          {data.citation?.trim() ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-foreground">
                <SourceIcon kind="text" />
                Text
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/80">
                "{data.citation.trim()}"
              </p>
              {data.groundingNote?.trim() ? (
                <>
                  <p className="mt-3 text-[11px] text-muted-foreground">Why / how it relates</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{data.groundingNote.trim()}</p>
                </>
              ) : null}
            </div>
          ) : null}

          {data.imageUrl?.trim() ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-foreground">
                <SourceIcon kind="image" />
                Photo
              </div>
              <img
                src={data.imageUrl.trim()}
                alt="Source image"
                className="max-h-48 w-full rounded-lg object-cover"
              />
            </div>
          ) : null}

          {data.media?.kind === 'image' && data.media.url ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-foreground">
                <SourceIcon kind="image" />
                Photo
              </div>
              <img
                src={data.media.url}
                alt={data.media.title || 'Source image'}
                className="mb-2 max-h-48 w-full rounded-lg object-cover"
              />
              {data.media.source ? (
                <a
                  href={data.media.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-brand)] hover:underline"
                >
                  {data.media.title || data.media.source}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          ) : null}

          {data.media?.kind === 'video' && data.media.url ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-foreground">
                <SourceIcon kind="video" />
                Video
              </div>
              <a
                href={data.media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-brand)] hover:underline"
              >
                {data.media.title || data.media.source || data.media.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { hasSources };

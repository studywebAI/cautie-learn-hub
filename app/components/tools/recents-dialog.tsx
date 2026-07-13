'use client';

import React, { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSignature, ChevronRight } from 'lucide-react';
import { CircleCheck } from '@/components/animate-ui/icons/circle-check';
import { Layers } from '@/components/animate-ui/icons/layers';
import { Brush } from '@/components/animate-ui/icons/brush';

type RecentItem = {
  id: string;
  title: string;
  type: 'quiz' | 'flashcards' | 'notes' | 'subject' | 'assignment' | 'studyset';
  date: string;
  source: 'tool_run' | 'material' | 'studyset';
  toolRunId?: string;
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flashcards: Layers,
  notes: Brush,
  quiz: CircleCheck,
};

const RECENTS_CACHE_KEY = 'studyweb-recents-cache-v1';
const RECENTS_CACHE_TTL_MS = 60_000;

type RecentsDialogProps = {
  toolId: string;
  onSelect: (sourceText: string) => void;
  onClose: () => void;
};

export function RecentsDialog({ toolId, onSelect, onClose }: RecentsDialogProps) {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        if (typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(RECENTS_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.updatedAt && Date.now() - parsed.updatedAt < RECENTS_CACHE_TTL_MS && Array.isArray(parsed?.items)) {
              const filtered = parsed.items.filter((item: RecentItem) => item.source === 'tool_run');
              setRecents(filtered);
              setIsLoading(false);
              return;
            }
          }
        }

        const runsRes = await fetch('/api/tools/v2/runs').then((r) => (r.ok ? r.json() : []));
        const toolItems: RecentItem[] = (Array.isArray(runsRes) ? runsRes : [])
          .filter((r: any) => r?.options_payload?.saveToRecents !== false)
          .filter((r: any) => r.status === 'succeeded')
          .map((r: any) => ({
            id: r.id,
            title:
              String(r?.output_payload?.title || '').trim() ||
              String(r?.input_payload?.title || '').trim() ||
              String(r?.options_payload?.customTitle || r?.options_payload?.title || '').trim() ||
              String(r?.context?.materialTitle || r?.context?.source_title || '').trim() ||
              `${r.tool_id} - ${new Date(r.created_at).toLocaleDateString()}`,
            type: r.tool_id as RecentItem['type'],
            date: r.finished_at || r.created_at,
            source: 'tool_run' as const,
            toolRunId: r.id,
          }));

        setRecents(toolItems);
      } catch (error) {
        console.error('Failed to fetch recents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchRecents();
  }, []);

  const handleSelectRecent = async (item: RecentItem) => {
    if (!item.toolRunId) return;
    try {
      const res = await fetch(`/api/tools/v2/runs/${item.toolRunId}`);
      if (!res.ok) return;
      const data = await res.json();
      const sourceText = String(data?.input_payload?.sourceText || '').trim();
      if (sourceText) {
        onSelect(sourceText);
      }
    } catch (error) {
      console.error('Failed to load recent item:', error);
    }
  };

  const filteredRecents = recents.filter((item) => item.type === toolId || toolId === 'all');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl tracking-tight">Recent {toolId === 'quiz' ? 'Quizzes' : 'Flashcards'}</h1>
          <p className="text-sm text-muted-foreground">
            Select a recent item to load its content
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : filteredRecents.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No recent items found</p>
            <Button variant="outline" onClick={onClose}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border">
                {filteredRecents.map((item) => {
                  const Icon = TYPE_ICONS[item.type] || FileSignature;
                  const dateObj = new Date(item.date);
                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectRecent(item)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateStr} at {timeStr}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

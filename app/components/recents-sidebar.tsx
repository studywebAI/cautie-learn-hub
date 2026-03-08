'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BrainCircuit,
  Copy,
  FileSignature,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from 'lucide-react';
import { format } from 'date-fns';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';

type RecentItem = {
  id: string;
  title: string;
  type: 'quiz' | 'flashcards' | 'notes' | 'subject' | 'assignment';
  date: string;
  source: 'tool_run' | 'material';
};

const TYPE_ICONS: Record<string, typeof BrainCircuit> = {
  flashcards: Copy,
  notes: StickyNote,
  quiz: BrainCircuit,
  subject: BookOpen,
  assignment: FileSignature,
};

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  notes: 'Notes',
  quiz: 'Quiz',
  subject: 'Subject',
  assignment: 'Assignment',
};

export function RecentsSidebar() {
  const { session } = useContext(AppContext) as AppContextType;
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { state } = useSidebar();
  const router = useRouter();

  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    const fetchRecents = async () => {
      try {
        // Fetch both tool runs and materials in parallel
        const [runsRes, materialsRes] = await Promise.all([
          fetch('/api/tools/v2/runs').then(r => r.ok ? r.json() : []),
          fetch('/api/materials?limit=10').then(r => r.ok ? r.json() : { materials: [] }),
        ]);

        const toolItems: RecentItem[] = (Array.isArray(runsRes) ? runsRes : [])
          .filter((r: any) => r.status === 'succeeded')
          .map((r: any) => ({
            id: r.id,
            title: r.mode
              ? `${TYPE_LABELS[r.tool_id] || r.tool_id} · ${r.mode}`
              : TYPE_LABELS[r.tool_id] || r.tool_id,
            type: r.tool_id as RecentItem['type'],
            date: r.finished_at || r.created_at,
            source: 'tool_run' as const,
          }));

        const materialItems: RecentItem[] = (materialsRes.materials || [])
          .map((m: any) => ({
            id: m.id,
            title: m.title || TYPE_LABELS[m.type] || m.type,
            type: (m.type?.toLowerCase()) as RecentItem['type'],
            date: m.updated_at,
            source: 'material' as const,
          }));

        // Merge, deduplicate, sort by date
        const all = [...toolItems, ...materialItems]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecents(all);
      } catch (error) {
        console.error('Failed to fetch recents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecents();
  }, [session]);

  const handleClick = (item: RecentItem) => {
    if (item.source === 'tool_run') {
      // Navigate to tool page with runId to reload saved output
      const toolPath = `/tools/${item.type}`;
      router.push(`${toolPath}?runId=${item.id}`);
    } else {
      router.push(`/material/${item.id}`);
    }
  };

  if (isCollapsed) return null;

  const displayCount = expanded ? recents.length : 3;
  const displayItems = recents.slice(0, displayCount);
  const hasMore = recents.length > 3;

  if (isLoading) {
    return (
      <div className="px-2">
        <p className="text-[11px] tracking-[0.06em] text-muted-foreground/70 flex items-center gap-1 mb-2 px-1 lowercase">
          <Clock className="h-3 w-3" />
          recents
        </p>
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-5 bg-muted/55 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (recents.length === 0) {
    return (
      <div className="px-2">
        <p className="text-[11px] tracking-[0.06em] text-muted-foreground/70 flex items-center gap-1 mb-2 px-1 lowercase">
          <Clock className="h-3 w-3" />
          recents
        </p>
        <p className="text-xs text-muted-foreground text-center py-1.5 rounded-md bg-muted/30">
          no recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="px-2">
      <p className="text-[11px] tracking-[0.06em] text-muted-foreground/70 flex items-center gap-1 mb-2 px-1 lowercase">
        <Clock className="h-3 w-3" />
        recents
      </p>
      <div className="rounded-md bg-transparent space-y-0.5">
        {displayItems.map((item) => {
          const Icon = TYPE_ICONS[item.type] || FileSignature;
          const dateStr = format(new Date(item.date), 'MMM d');

          return (
            <div
              key={`${item.source}-${item.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/45 transition-colors cursor-pointer group"
              onClick={() => handleClick(item)}
            >
              <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs flex-1 truncate">
                {item.title}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                {dateStr}
              </span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              show {recents.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

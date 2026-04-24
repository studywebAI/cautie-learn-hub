'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BrainCircuit,
  Copy,
  FileSignature,
  BookOpen,
  Route,
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
  type: 'quiz' | 'flashcards' | 'notes' | 'subject' | 'assignment' | 'studyset';
  date: string;
  source: 'tool_run' | 'material' | 'studyset';
  nextTaskHref?: string | null;
  analyticsHref?: string | null;
  progressLabel?: string | null;
  progressPercent?: number | null;
  isComplete?: boolean;
  pendingInterventions?: number | null;
  weakestTool?: string | null;
};

const TYPE_ICONS: Record<string, typeof BrainCircuit> = {
  flashcards: Copy,
  notes: StickyNote,
  quiz: BrainCircuit,
  subject: BookOpen,
  assignment: FileSignature,
  studyset: Route,
};

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  notes: 'Notes',
  quiz: 'Quiz',
  subject: 'Subject',
  assignment: 'Assignment',
  studyset: 'Studyset',
};
const RECENTS_CACHE_KEY = 'studyweb-recents-cache-v1';
const RECENTS_CACHE_TTL_MS = 60_000;

export function RecentsSidebar() {
  const { session, language } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';
  const t = {
    noLocalRecent: isDutch ? 'geen lokale recente activiteit' : 'no local recent activity',
    showLess: isDutch ? 'minder tonen' : 'show less',
    showMore: isDutch ? 'toon' : 'show',
    more: isDutch ? 'meer' : 'more',
  };
  const userId = session?.user?.id ?? null;
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'studysets'>('all');
  const { state } = useSidebar();
  const router = useRouter();

  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    if (!userId) {
      setRecents([]);
      setIsLoading(false);
      return;
    }

    const fetchRecents = async () => {
      try {
        if (typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(RECENTS_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.updatedAt && Date.now() - parsed.updatedAt < RECENTS_CACHE_TTL_MS && Array.isArray(parsed?.items)) {
              setRecents(parsed.items);
              return;
            }
          }
        }

        // Fetch both tool runs and materials in parallel with partial-failure tolerance.
        const [runsResult, materialsResult, studysetsResult] = await Promise.allSettled([
          fetch('/api/tools/v2/runs').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/materials?limit=10').then((r) => (r.ok ? r.json() : { materials: [] })),
          fetch('/api/studysets/launchpad?limit=16').then((r) => (r.ok ? r.json() : { items: [] })),
        ]);
        const runsRes = runsResult.status === 'fulfilled' ? runsResult.value : [];
        const materialsRes = materialsResult.status === 'fulfilled' ? materialsResult.value : { materials: [] };
        const studysetsRes = studysetsResult.status === 'fulfilled' ? studysetsResult.value : { items: [] };

        const toolItems: RecentItem[] = (Array.isArray(runsRes) ? runsRes : [])
          .filter((r: any) => r?.options_payload?.saveToRecents !== false)
          .filter((r: any) => r.status === 'succeeded')
          .map((r: any) => ({
            id: r.id,
            title: r.mode
              ? `${TYPE_LABELS[r.tool_id] || r.tool_id} - ${r.mode}`
              : TYPE_LABELS[r.tool_id] || r.tool_id,
            type: r.tool_id as RecentItem['type'],
            date: r.finished_at || r.created_at,
            source: 'tool_run' as const,
          }));

        const materialItems: RecentItem[] = (materialsRes.materials || [])
          .filter((m: any) => String(m?.type || '').toLowerCase() !== 'onedrive')
          .map((m: any) => ({
            id: m.id,
            title: m.title || TYPE_LABELS[m.type] || m.type,
            type: (m.type?.toLowerCase()) as RecentItem['type'],
            date: m.updated_at,
            source: 'material' as const,
          }));

        const studysetItems: RecentItem[] = (studysetsRes.items || [])
          .slice(0, 10)
          .map((s: any) => ({
            id: String(s.id),
            title: String(s.title || 'Studyset'),
            type: 'studyset' as const,
            date: String(s.updated_at || new Date().toISOString()),
            source: 'studyset' as const,
            nextTaskHref: typeof s?.next_action_href === 'string' ? s.next_action_href : null,
            analyticsHref: typeof s?.analytics_href === 'string' ? s.analytics_href : `/tools/studyset/${String(s.id)}`,
            progressLabel:
              typeof s?.progress?.completed_tasks === 'number' && typeof s?.progress?.total_tasks === 'number'
                ? `${s.progress.completed_tasks}/${s.progress.total_tasks}`
                : null,
            progressPercent:
              typeof s?.progress?.percent === 'number' ? Number(s.progress.percent) : null,
            pendingInterventions:
              typeof s?.pending_interventions === 'number'
                ? Number(s.pending_interventions)
                : null,
            weakestTool:
              typeof s?.pulse_weakest_tool === 'string'
                ? String(s.pulse_weakest_tool)
                : null,
            isComplete:
              typeof s?.progress?.total_tasks === 'number' &&
              Number(s?.progress?.total_tasks || 0) > 0 &&
              Number(s?.progress?.completed_tasks || 0) === Number(s?.progress?.total_tasks || 0),
          }));

        // Merge, deduplicate, sort by date
        const all = [...studysetItems, ...toolItems, ...materialItems]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecents(all);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            RECENTS_CACHE_KEY,
            JSON.stringify({ updatedAt: Date.now(), items: all })
          );
        }
      } catch (error) {
        console.error('Failed to fetch recents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecents();
  }, [userId]);

  const handleClick = (item: RecentItem) => {
    if (item.source === 'tool_run') {
      // Navigate to tool page with runId to reload saved output
      const toolPath = `/tools/${item.type}`;
      router.push(`${toolPath}?runId=${item.id}`);
    } else if (item.source === 'studyset') {
      if (item.isComplete && item.analyticsHref) {
        router.push(item.analyticsHref);
      } else if (item.nextTaskHref) {
        router.push(item.nextTaskHref);
      } else {
        router.push(`/tools/studyset/${item.id}`);
      }
    } else {
      router.push(`/material/${item.id}`);
    }
  };

  if (isCollapsed) return null;

  const visibleRecents = activeTab === 'studysets'
    ? recents.filter((item) => item.source === 'studyset')
    : recents;
  const displayCount = expanded ? visibleRecents.length : 3;
  const displayItems = visibleRecents.slice(0, displayCount);
  const hasMore = visibleRecents.length > 3;
  const enableScroll = expanded && visibleRecents.length > 10;

  if (isLoading) {
    return (
      <div className="px-2">
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
        <p className="text-[12px] text-muted-foreground text-center py-1.5 rounded-md bg-muted/30">
          {t.noLocalRecent}
        </p>
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <button
          type="button"
          className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'all' ? 'bg-sidebar-accent/70 text-sidebar-foreground' : 'bg-sidebar-accent/30 text-sidebar-foreground/80'}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === 'studysets' ? 'bg-sidebar-accent/70 text-sidebar-foreground' : 'bg-sidebar-accent/30 text-sidebar-foreground/80'}`}
          onClick={() => setActiveTab('studysets')}
        >
          Studysets
        </button>
      </div>
      <div
        className={`rounded-md bg-transparent space-y-0.5 ${enableScroll ? 'max-h-[300px] overflow-y-auto pr-1' : ''}`}
      >
        {displayItems.map((item) => {
          const Icon = TYPE_ICONS[item.type] || FileSignature;
          const dateStr = format(new Date(item.date), 'MMM d, HH:mm');

          return (
            <div
              key={`${item.source}-${item.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/45 transition-colors cursor-pointer group"
              onClick={() => handleClick(item)}
            >
              <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
              {item.source === 'studyset' ? (
                <button
                  type="button"
                  className="text-[12px] font-normal flex-1 truncate text-left hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(item.analyticsHref || `/tools/studyset/${item.id}`);
                  }}
                >
                  {item.title}
                </button>
              ) : (
                <span className="text-[12px] font-normal flex-1 truncate">{item.title}</span>
              )}
              {item.source === 'studyset' && item.progressLabel ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground/90">
                    {item.progressLabel}
                  </span>
                  {typeof item.progressPercent === 'number' ? (
                    <span className="text-[10px] text-muted-foreground/75">
                      {item.progressPercent}%
                    </span>
                  ) : null}
                </div>
              ) : null}
              {item.source === 'studyset' && typeof item.pendingInterventions === 'number' && item.pendingInterventions > 0 ? (
                <span
                  className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300"
                  title={`Priority queue: ${item.pendingInterventions} intervention${item.pendingInterventions === 1 ? '' : 's'} to address first.`}
                >
                  Queue {item.pendingInterventions}
                </span>
              ) : null}
              {item.source === 'studyset' && item.weakestTool ? (
                <span
                  className="rounded bg-sidebar-accent/40 px-1.5 py-0.5 text-[10px] text-sidebar-foreground/90"
                  title="Current weakest tool based on recent performance."
                >
                  Focus {item.weakestTool}
                </span>
              ) : null}
              {item.source === 'studyset' && item.nextTaskHref && !item.isComplete ? (
                <button
                  type="button"
                  className="rounded bg-sidebar-accent/40 px-1.5 py-0.5 text-[10px] text-sidebar-foreground/90 hover:bg-sidebar-accent/65"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(item.nextTaskHref || `/tools/studyset/${item.id}`);
                  }}
                >
                  Keep going
                </button>
              ) : null}
              <span className="text-[11px] text-muted-foreground/85 shrink-0">
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
          className="flex items-center gap-1 w-full px-2 py-1 text-[11px] text-muted-foreground/85 hover:text-foreground transition-colors mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              {t.showLess}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              {t.showMore} {visibleRecents.length - 3} {t.more}
            </>
          )}
        </button>
      )}
    </div>
  );
}

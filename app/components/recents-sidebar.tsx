'use client';

import * as React from 'react';
import { useState, useEffect, useContext } from 'react';
import {
  ChevronRight,
  FileSignature,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { CircleCheck } from '@/components/animate-ui/icons/circle-check';
import { Layers } from '@/components/animate-ui/icons/layers';
import { Brush } from '@/components/animate-ui/icons/brush';
import { SquareArrowOutUpRight } from '@/components/animate-ui/icons/square-arrow-out-up-right';
import { GalleryVerticalEnd } from '@/components/animate-ui/icons/gallery-vertical-end';
import { AnimateIcon } from '@/components/animate-ui/icons/icon-base';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type ClassOption = {
  id: string;
  name: string;
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string; animateOnHover?: boolean }>> = {
  flashcards: Layers,
  notes: Brush,
  quiz: CircleCheck,
  subject: SquareArrowOutUpRight,
  assignment: FileSignature,
  studyset: GalleryVerticalEnd,
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

const formatRecentTimestamp = (value?: string) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) {
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString();
};

export function RecentsSidebar() {
  const { session, language } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';
  const t = {
    showLess: isDutch ? 'Minder tonen' : 'Show less',
    showMore: isDutch ? 'Toon' : 'Show',
    more: isDutch ? 'meer' : 'more',
  };
  const userId = session?.user?.id ?? null;
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'studysets'>('all');
  const [isShareToUserOpen, setIsShareToUserOpen] = useState(false);
  const [isShareToClassOpen, setIsShareToClassOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState<RecentItem | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classAudience, setClassAudience] = useState<'all' | 'teacher'>('all');
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [isRecentsSettingsOpen, setIsRecentsSettingsOpen] = useState(false);
  const [shareLinkDays, setShareLinkDays] = useState('30');
  const [shareStatus, setShareStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const { state } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();

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
          .map((r: any) => {
            const rawArtifactTitle = String(r?.artifact_title || '').trim();
            const isGenericArtifactTitle = !rawArtifactTitle || /^(quiz|flashcards|notes|wordweb|timeline|presentation|studyset)\s*(output)?$/i.test(rawArtifactTitle);
            const specificTitle = isGenericArtifactTitle
              ? (
                  String(r?.output_payload?.title || '').trim() ||
                  String(r?.input_payload?.title || '').trim() ||
                  String(r?.options_payload?.customTitle || r?.options_payload?.title || '').trim() ||
                  String(r?.context?.materialTitle || r?.context?.source_title || '').trim() ||
                  ''
                )
              : rawArtifactTitle;
            return {
              id: r.id,
              title: specificTitle || TYPE_LABELS[r.tool_id] || r.tool_id,
              type: r.tool_id as RecentItem['type'],
              date: r.finished_at || r.created_at,
              source: 'tool_run' as const,
            };
          });

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
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecents();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchClasses = async () => {
      try {
        const response = await fetch('/api/classes');
        if (!response.ok) return;
        const data = await response.json();
        const options: ClassOption[] = Array.isArray(data)
          ? data
              .filter((c: any) => c?.id && c?.name)
              .map((c: any) => ({ id: String(c.id), name: String(c.name) }))
          : [];
        setClasses(options);
      } catch (error) {
      }
    };
    fetchClasses();
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('studyweb-recents-share-days');
    if (saved && ['1', '7', '30'].includes(saved)) {
      setShareLinkDays(saved);
    }
  }, []);

  const handleClick = (item: RecentItem) => {
    router.push(getOpenHref(item));
  };

  const getOpenHref = (item: RecentItem) => {
    if (item.source === 'tool_run') {
      return `/tools/${item.type}?runId=${item.id}`;
    }
    if (item.source === 'studyset') {
      if (item.isComplete && item.analyticsHref) return item.analyticsHref;
      if (item.nextTaskHref) return item.nextTaskHref;
      return `/tools/studyset/${item.id}`;
    }
    return `/material/${item.id}`;
  };

  const handleCopyLink = async (item: RecentItem) => {
    try {
      const safeUrl = await createSafeShareLink(item);
      await navigator.clipboard.writeText(safeUrl);
      toast({ title: isDutch ? 'Veilige share-link gekopieerd' : 'Safe share link copied' });
      return;
    } catch {}
    const href = getOpenHref(item);
    const absolute = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;
    await navigator.clipboard.writeText(absolute);
    toast({ title: isDutch ? 'Link gekopieerd' : 'Link copied' });
  };

  const createSafeShareLink = async (item: RecentItem) => {
    const href = getOpenHref(item);
    const absolute = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;
    const response = await fetch('/api/share/public-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: item.source,
        id: item.id,
        title: item.title,
        href: absolute,
        expiresInDays: Number(shareLinkDays || 30),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload?.url && typeof window !== 'undefined') {
      return `${window.location.origin}${String(payload.url)}`;
    }
    return absolute;
  };

  const handleShareViaApp = async (item: RecentItem) => {
    const safeUrl = await createSafeShareLink(item);
    if (navigator.share) {
      await navigator.share({ title: item.title, url: safeUrl });
      return;
    }
    await navigator.clipboard.writeText(safeUrl);
    toast({ title: isDutch ? 'Deel-link gekopieerd' : 'Share link copied' });
  };

  const handleSendToUser = async (item: RecentItem, recipient: string) => {
    const safeUrl = await createSafeShareLink(item);
    const response = await fetch('/api/share/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: recipient.trim(),
        title: item.title,
        url: safeUrl,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || 'Share failed'));
    }
    toast({
      title: isDutch ? 'Gedeeld via Cautie' : 'Shared via Cautie',
      description: isDutch ? 'De gebruiker krijgt nu een melding.' : 'The user will now receive a notification.',
    });
  };

  const handleShareToClass = async (item: RecentItem, classId: string, audience: 'all' | 'teacher') => {
    const safeUrl = await createSafeShareLink(item);
    const response = await fetch(`/api/classes/${classId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: item.title,
        attachmentLabel: item.title,
        audience,
        source: {
          link_type: item.source,
          link_ref_id: item.id,
          metadata_json: { href: safeUrl },
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(payload?.error || 'Share to class failed'));
    toast({
      title: isDutch ? 'Gedeeld met class' : 'Shared to class',
      description: isDutch ? 'Item staat nu in class shared feed.' : 'Item is now in class shared feed.',
    });
  };

  const openShareToUserDialog = (item: RecentItem) => {
    setShareTargetItem(item);
    setRecipientInput('');
    setShareStatus(null);
    setIsShareToUserOpen(true);
  };

  const openShareToClassDialog = (item: RecentItem) => {
    setShareTargetItem(item);
    setSelectedClassId(classes[0]?.id || '');
    setClassAudience('all');
    setShareStatus(null);
    setIsShareToClassOpen(true);
  };

  const submitShareToUser = async () => {
    if (!shareTargetItem) return;
    const trimmedRecipient = recipientInput.trim();
    if (!trimmedRecipient) {
      toast({
        title: isDutch ? 'Ontvanger ontbreekt' : 'Recipient missing',
        description: isDutch ? 'Vul een gebruiker in.' : 'Enter a user name or email.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmittingShare(true);
    try {
      await handleSendToUser(shareTargetItem, trimmedRecipient);
      setShareStatus({ type: 'success', text: isDutch ? 'Verzonden.' : 'Sent.' });
      setIsShareToUserOpen(false);
      setShareTargetItem(null);
    } catch (error: any) {
      setShareStatus({ type: 'error', text: error?.message || 'Share failed.' });
      toast({
        title: isDutch ? 'Delen mislukt' : 'Share failed',
        description: error?.message || (isDutch ? 'Kon niet delen.' : 'Could not share.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingShare(false);
    }
  };

  const submitShareToClass = async () => {
    if (!shareTargetItem) return;
    if (!selectedClassId) {
      toast({
        title: isDutch ? 'Class ontbreekt' : 'Class missing',
        description: isDutch ? 'Kies eerst een class.' : 'Select a class first.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmittingShare(true);
    try {
      await handleShareToClass(shareTargetItem, selectedClassId, classAudience);
      setShareStatus({ type: 'success', text: isDutch ? 'Gedeeld met class.' : 'Shared to class.' });
      setIsShareToClassOpen(false);
      setShareTargetItem(null);
    } catch (error: any) {
      setShareStatus({ type: 'error', text: error?.message || 'Share to class failed.' });
      toast({
        title: isDutch ? 'Delen met class mislukt' : 'Share to class failed',
        description: error?.message || (isDutch ? 'Kon niet delen.' : 'Could not share.'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingShare(false);
    }
  };

  const filteredRecents = recents.filter((item) => String(item.title || '').trim().toLowerCase() !== 'keep going');

  if (isCollapsed) {
    const compactItems = filteredRecents.slice(0, 4);
    if (isLoading || compactItems.length === 0) return null;
    return (
      <div className="px-1">
        <div className="flex flex-col items-center gap-1">
          {compactItems.map((item) => {
            const Icon = TYPE_ICONS[item.type] || FileSignature;
            return (
              <AnimateIcon key={`${item.source}-${item.id}`} animateOnHover={item.type !== 'assignment'} asChild>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent/55 hover:text-foreground"
                  title={item.title}
                  onClick={() => handleClick(item)}
                >
                  <Icon className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                </button>
              </AnimateIcon>
            );
          })}
        </div>
      </div>
    );
  }

  const visibleRecentsRaw = activeTab === 'studysets'
    ? filteredRecents.filter((item) => item.source === 'studyset')
    : filteredRecents;
  const visibleRecents = visibleRecentsRaw.filter((item) => String(item.title || '').trim().toLowerCase() !== 'keep going');
  const displayCount = expanded ? visibleRecents.length : 3;
  const displayItems = visibleRecents.slice(0, displayCount);
  const hasMore = visibleRecents.length > 3;
  const enableScroll = expanded && visibleRecents.length > 10;

  if (isLoading) {
    return (
      <div className="px-2">
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-5 surface-interactive rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (filteredRecents.length === 0) {
    return null;
  }

  return (
    <div className="px-2">
      <div className="rounded-xl border border-border/50 bg-background/80 shadow-sm backdrop-blur-sm p-1.5">
      <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeTab === 'all' ? 'bg-foreground text-background' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeTab === 'studysets' ? 'bg-foreground text-background' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'}`}
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
          const dateStr = formatRecentTimestamp(item.date);

          return (
            <AnimateIcon key={`${item.source}-${item.id}`} animateOnHover={item.type !== 'assignment'} asChild>
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/45 transition-colors cursor-pointer group"
              onClick={() => handleClick(item)}
            >
              <Icon className="h-3 w-3 text-sidebar-foreground/70 shrink-0" />
              {item.source === 'studyset' ? (
                <button
                  type="button"
                  className="text-[12.5px] font-medium flex-1 truncate text-left hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(item.analyticsHref || `/tools/studyset/${item.id}`);
                  }}
                >
                  {item.title}
                </button>
              ) : (
                <span className="text-[12.5px] font-medium flex-1 truncate">{item.title}</span>
              )}
              {item.source === 'studyset' && item.progressLabel ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-foreground/75">
                    {item.progressLabel}
                  </span>
                  {typeof item.progressPercent === 'number' ? (
                    <span className="text-[10px] text-foreground/65">
                      {item.progressPercent}%
                    </span>
                  ) : null}
                </div>
              ) : null}
              <span suppressHydrationWarning className="text-[11px] text-foreground/65 shrink-0">
                {dateStr}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded-md"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenuItem onClick={() => router.push(getOpenHref(item))}>
                      <span>Open</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsRecentsSettingsOpen(true)}>
                      <span>Settings</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleCopyLink(item)}>
                      <span>Copy link</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openShareToUserDialog(item)}>
                      <span>Share to user</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void handleShareViaApp(item)}>
                      <span>Share via</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openShareToClassDialog(item)} disabled={classes.length === 0}>
                      <span>Share to class</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </AnimateIcon>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 text-[11px] text-foreground/70 hover:text-foreground transition-colors mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 text-sidebar-foreground/70" />
              {t.showLess}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/70" />
              {t.showMore} {visibleRecents.length - 3} {t.more}
            </>
          )}
        </button>
      )}
      </div>
      <Dialog
        open={isShareToUserOpen}
        onOpenChange={(open) => {
          setIsShareToUserOpen(open);
          if (!open) setShareTargetItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Stuur naar Cautie gebruiker' : 'Send to Cautie user'}</DialogTitle>
            <DialogDescription>{shareTargetItem?.title}</DialogDescription>
          </DialogHeader>
          {shareStatus?.type === 'error' ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {shareStatus.text}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="share-user-recipient">{isDutch ? 'Gebruiker (display name of email)' : 'User (display name or email)'}</Label>
            <Input
              id="share-user-recipient"
              value={recipientInput}
              onChange={(event) => setRecipientInput(event.target.value)}
              placeholder={isDutch ? 'bijv. maarten@example.com' : 'e.g. maarten@example.com'}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsShareToUserOpen(false)}>
              {isDutch ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button type="button" onClick={() => void submitShareToUser()} disabled={isSubmittingShare}>
              {isSubmittingShare ? (isDutch ? 'Versturen...' : 'Sending...') : (isDutch ? 'Versturen' : 'Send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isRecentsSettingsOpen}
        onOpenChange={setIsRecentsSettingsOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Recents share settings' : 'Recents share settings'}</DialogTitle>
            <DialogDescription>
              {isDutch
                ? 'Bepaal hoe lang veilige deel-links geldig blijven.'
                : 'Choose how long safe share links stay valid.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{isDutch ? 'Link geldigheid' : 'Link validity'}</Label>
            <Select
              value={shareLinkDays}
              onValueChange={(value) => {
                setShareLinkDays(value);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('studyweb-recents-share-days', value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsRecentsSettingsOpen(false)}>
              {isDutch ? 'Klaar' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isShareToClassOpen}
        onOpenChange={(open) => {
          setIsShareToClassOpen(open);
          if (!open) setShareTargetItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isDutch ? 'Deel met class' : 'Share to class'}</DialogTitle>
            <DialogDescription>{shareTargetItem?.title}</DialogDescription>
          </DialogHeader>
          {shareStatus?.type === 'error' ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {shareStatus.text}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{isDutch ? 'Class' : 'Class'}</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder={isDutch ? 'Kies een class' : 'Choose a class'} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classOption) => (
                  <SelectItem key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isDutch ? 'Geen class beschikbaar om mee te delen.' : 'No class available to share to yet.'}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>{isDutch ? 'Publiek' : 'Audience'}</Label>
            <Select value={classAudience} onValueChange={(value) => setClassAudience(value === 'teacher' ? 'teacher' : 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isDutch ? 'Iedereen in class' : 'Everyone in class'}</SelectItem>
                <SelectItem value="teacher">{isDutch ? 'Alleen teachers' : 'Teachers only'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsShareToClassOpen(false)}>
              {isDutch ? 'Annuleren' : 'Cancel'}
            </Button>
            <Button type="button" onClick={() => void submitShareToClass()} disabled={isSubmittingShare}>
              {isSubmittingShare ? (isDutch ? 'Delen...' : 'Sharing...') : (isDutch ? 'Delen' : 'Share')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

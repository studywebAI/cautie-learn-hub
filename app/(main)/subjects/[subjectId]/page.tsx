'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Settings2, BookOpen, FlaskConical, Calculator, Globe, Atom, PenTool, Microscope, Music, ListChecks, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHAPTER_COVER_ICONS = [BookOpen, FlaskConical, Calculator, Globe, Atom, PenTool, Microscope, Music];
const CHAPTER_COVER_TINTS = [
  'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  'bg-rose-500/12 text-rose-600 dark:text-rose-400',
  'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400',
  'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400',
];
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
  assignment_count: number;
  progress_percent: number;
  answers_enabled?: boolean;
  is_pending?: boolean;
  prerequisite_paragraph_id?: string | null;
  locked?: boolean;
};

type Chapter = {
  id: string;
  title: string;
  chapter_number: number;
  paragraphs?: Paragraph[];
  is_pending?: boolean;
  is_tests_chapter?: boolean;
};

type Subject = {
  id: string;
  name: string;
  description: string | null;
};

type LastActivity = {
  chapterId: string;
  chapterNumber: number;
  paragraphId: string;
  paragraphNumber: number;
  paragraphTitle: string;
};

export default function SubjectDetailPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
  const [isCreateParagraphOpen, setIsCreateParagraphOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [lockSelectedChapter, setLockSelectedChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [chapterReorderMode, setChapterReorderMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newParagraphTitle, setNewParagraphTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedParagraphs, setExpandedParagraphs] = useState<Set<string>>(new Set());
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingParagraph, setIsCreatingParagraph] = useState(false);
  const { toast } = useToast();
  const { role, language } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';
  const isDutch = language === 'nl';

  const loadSubjectOverview = async () => {
    const response = await fetch(`/api/subjects/${subjectId}/overview`, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.error || `Failed to fetch subject overview (${response.status})`;
      throw new Error(message);
    }
    const data = await response.json();
    setSubject(data.subject || null);
    setChapters(Array.isArray(data.chapters) ? data.chapters : []);
    return Array.isArray(data.chapters) ? data.chapters : [];
  };

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const chaptersWithParagraphs = await loadSubjectOverview();

        const storageKey = `lastActivity_${subjectId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as LastActivity;
            const paragraphStillExists = chaptersWithParagraphs.some((chapter: Chapter) =>
              (chapter.paragraphs || []).some((paragraph: Paragraph) => paragraph.id === parsed.paragraphId)
            );
            if (paragraphStillExists) {
              setLastActivity(parsed);
            } else {
              localStorage.removeItem(storageKey);
              setLastActivity(null);
            }
          } catch {
            setLastActivity(null);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load subject';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjectData();
  }, [subjectId]);

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return;
    if (isCreatingChapter) return;

    const tempId = `temp-chapter-${Date.now()}`;
    const nextNumber = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapter_number || 0)) + 1 : 1;
    const optimisticChapter: Chapter = {
      id: tempId,
      title: newChapterTitle.trim(),
      chapter_number: nextNumber,
      paragraphs: [],
      is_pending: true,
    };

    setIsCreatingChapter(true);
    setChapters((prev) => [...prev, optimisticChapter]);
    setNewChapterTitle('');
    setIsCreateChapterOpen(false);

    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: optimisticChapter.title }),
      });
      if (!response.ok) {
        throw new Error('Failed to create chapter');
      }
      const newChapter = await response.json();
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === tempId ? { ...newChapter, paragraphs: [], is_pending: false } : chapter
        )
      );
    } catch (error) {
      setChapters((prev) => prev.filter((chapter) => chapter.id !== tempId));
      toast({ title: 'Error', description: 'Failed to create chapter', variant: 'destructive' });
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const persistChapterOrder = async (reordered: Chapter[]) => {
    const previous = chapters;
    const withNumbers = reordered.map((c, i) => ({ ...c, chapter_number: i + 1 }));
    setChapters(withNumbers);
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: withNumbers.map((c) => c.id) }),
      });
      if (!response.ok) throw new Error('Failed to save order');
    } catch {
      setChapters(previous);
      toast({ title: 'Error', description: 'Failed to save chapter order', variant: 'destructive' });
    }
  };

  // Entered via a ~3s press-and-hold on a chapter row instead of a
  // permanently-visible drag handle icon.
  const handleChapterMove = async (chapterId: string, direction: 'up' | 'down') => {
    const currentOrder = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
    const index = currentOrder.findIndex((c) => c.id === chapterId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const reordered = [...currentOrder];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await persistChapterOrder(reordered);
  };

  const startChapterLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => setChapterReorderMode(true), 3000);
  };
  const cancelChapterLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCreateParagraph = async () => {
    if (!selectedChapterId) return;
    const resolvedTitle = newParagraphTitle.trim();
    if (!resolvedTitle) return;
    if (isCreatingParagraph) return;

    const requestChapterId = selectedChapterId;
    const targetChapter = chapters.find((chapter) => chapter.id === requestChapterId);
    const nextNumber = targetChapter?.paragraphs?.length
      ? Math.max(...targetChapter.paragraphs.map((p) => p.paragraph_number || 0)) + 1
      : 1;
    const tempId = `temp-paragraph-${Date.now()}`;
    const optimisticParagraph: Paragraph = {
      id: tempId,
      title: resolvedTitle,
      paragraph_number: nextNumber,
      assignment_count: 0,
      progress_percent: 0,
      answers_enabled: false,
      is_pending: true,
    };

    setIsCreatingParagraph(true);
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === requestChapterId
          ? { ...chapter, paragraphs: [...(chapter.paragraphs || []), optimisticParagraph] }
          : chapter
      )
    );
    setNewParagraphTitle('');
    setSelectedChapterId(null);
    setIsCreateParagraphOpen(false);

    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${requestChapterId}/paragraphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: resolvedTitle }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.details || errorData?.error || 'Failed to create paragraph');
      }
      const createdParagraph = await response.json();
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === requestChapterId
            ? {
                ...chapter,
                paragraphs: (chapter.paragraphs || []).map((paragraph) =>
                  paragraph.id === tempId
                    ? {
                        ...paragraph,
                        ...createdParagraph,
                        assignment_count: createdParagraph.assignment_count ?? 0,
                        progress_percent: createdParagraph.progress_percent ?? 0,
                        is_pending: false,
                      }
                    : paragraph
                ),
              }
            : chapter
        )
      );
    } catch (error) {
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter.id === requestChapterId
            ? {
                ...chapter,
                paragraphs: (chapter.paragraphs || []).filter((paragraph) => paragraph.id !== tempId),
              }
            : chapter
        )
      );
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create paragraph',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingParagraph(false);
    }
  };

  const handleParagraphClick = (chapter: Chapter, paragraph: Paragraph) => {
    const activity: LastActivity = {
      chapterId: chapter.id,
      chapterNumber: chapter.chapter_number,
      paragraphId: paragraph.id,
      paragraphNumber: paragraph.paragraph_number,
      paragraphTitle: paragraph.title,
    };
    localStorage.setItem(`lastActivity_${subjectId}`, JSON.stringify(activity));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 surface-interactive rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 surface-interactive rounded w-1/3" />
                  <div className="h-3 surface-interactive rounded w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (loadError) {
    return <div className="page-content text-center py-8 text-foreground/80">Failed to load subject: {loadError}</div>;
  }

  if (!subject) {
    return <div className="page-content text-center py-8 text-foreground/80">Subject not found</div>;
  }

  return (
    <div className="page-content rounded-2xl surface-panel p-4">
      <div className="mb-2 text-xs text-foreground/65">
        {`Subjects / ${subject?.name || 'Subject'} / Chapters`}
      </div>
      {/* Last activity banner */}
      {lastActivity && (
        <Link prefetch={false}
          href={`/subjects/${subjectId}/chapters/${lastActivity.chapterId}/paragraphs/${lastActivity.paragraphId}`}
          className="mb-4 block rounded-xl border border-transparent bg-sidebar-accent/42 p-3 transition-colors hover:bg-sidebar-accent/62"
        >
          <p className="text-sm">
            <span className="text-foreground/65">Last active in </span>
            <span>{lastActivity.chapterNumber}.{lastActivity.paragraphNumber} {lastActivity.paragraphTitle}</span>
          </p>
        </Link>
      )}

      <PageHeader
        title={subject.name}
        subtitle={subject.description || undefined}
        actions={
          isTeacher && (
            <>
              {chapters.length > 0 && (
                <Button
                  onClick={() => {
                    setLockSelectedChapter(false);
                    setSelectedChapterId(chapters[0]?.id || null);
                    setNewParagraphTitle('');
                    setIsCreateParagraphOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="border-transparent bg-sidebar-accent/45 hover:bg-sidebar-accent/62"
                >
                  + Add Paragraph
                </Button>
              )}
              <Button onClick={() => setIsCreateChapterOpen(true)} size="sm" variant="outline" className="border-transparent bg-sidebar-accent/45 hover:bg-sidebar-accent/62">
                + Add Chapter
              </Button>
            </>
          )
        }
      />

      {chapterReorderMode && (
        <div className="mb-3 flex items-center justify-between rounded-xl surface-interactive px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {isDutch ? 'Herordenmodus: gebruik de pijltjes om hoofdstukken te verplaatsen.' : 'Reorder mode: use the arrows to move chapters.'}
          </p>
          <Button size="sm" variant="outline" onClick={() => setChapterReorderMode(false)}>
            {isDutch ? 'Klaar' : 'Done'}
          </Button>
        </div>
      )}

      {/* Flat chapter + paragraph list */}
      {chapters.length === 0 ? (
        <div className="py-12">
          {isTeacher ? (
            <div className="flex justify-center">
              <Button onClick={() => setIsCreateChapterOpen(true)} size="sm">
                Create First Chapter
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, chapterIndex) => {
            const maxVisible = 10;
            const allParagraphs = chapter.paragraphs || [];
            const isFullyExpanded = expandedParagraphs.has(chapter.id);
            const visibleParagraphs = isFullyExpanded ? allParagraphs : allParagraphs.slice(0, maxVisible);
            const hasMore = allParagraphs.length > maxVisible && !isFullyExpanded;
            const remainingCount = allParagraphs.length - maxVisible;
            const chapterProgress = allParagraphs.length > 0
              ? Math.round(allParagraphs.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / allParagraphs.length)
              : 0;

            return (
              <div
                key={chapter.id}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-sidebar-accent/12 transition-colors',
                  chapterReorderMode ? 'border-foreground/25' : 'border-transparent'
                )}
                onPointerDown={isTeacher ? startChapterLongPress : undefined}
                onPointerUp={isTeacher ? cancelChapterLongPress : undefined}
                onPointerLeave={isTeacher ? cancelChapterLongPress : undefined}
                onPointerCancel={isTeacher ? cancelChapterLongPress : undefined}
                title={isTeacher ? (isDutch ? 'Ingedrukt houden om te herordenen' : 'Press and hold to reorder') : undefined}
              >
                <div className="flex min-h-[108px] items-stretch">
                  {isTeacher && chapterReorderMode && (
                    <div className="flex flex-col items-center justify-center gap-1 px-1">
                      <button
                        type="button"
                        disabled={chapterIndex === 0}
                        onClick={() => void handleChapterMove(chapter.id, 'up')}
                        className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground disabled:opacity-30"
                        title={isDutch ? 'Omhoog' : 'Move up'}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={chapterIndex === chapters.length - 1}
                        onClick={() => void handleChapterMove(chapter.id, 'down')}
                        className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground disabled:opacity-30"
                        title={isDutch ? 'Omlaag' : 'Move down'}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Link prefetch={false}
                    href={`/subjects/${subjectId}/chapters/${chapter.id}`}
                    className={cn(
                      'relative w-32 shrink-0 transition-colors',
                      chapter.is_tests_chapter
                        ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
                        : CHAPTER_COVER_TINTS[(chapter.chapter_number - 1) % CHAPTER_COVER_TINTS.length]
                    )}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      {(() => {
                        const CoverIcon = chapter.is_tests_chapter
                          ? ListChecks
                          : CHAPTER_COVER_ICONS[(chapter.chapter_number - 1) % CHAPTER_COVER_ICONS.length];
                        return <CoverIcon className="h-6 w-6" />;
                      })()}
                      <span className="text-xs font-medium tabular-nums opacity-80">{chapter.chapter_number}</span>
                      {allParagraphs.length > 0 && (
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-current/15">
                          <div className="h-full rounded-full bg-current/70" style={{ width: `${chapterProgress}%` }} />
                        </div>
                      )}
                    </div>
                  </Link>
                    <div className="flex flex-1 items-start justify-between gap-3 p-4">
                      <Link prefetch={false}
                        href={`/subjects/${subjectId}/chapters/${chapter.id}`}
                        className="text-sm text-[hsl(var(--sidebar-active-foreground))] hover:underline"
                      >
                        {chapter.title}
                        {chapter.is_tests_chapter && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 align-middle">Toetsen</span>
                        )}
                        {chapter.is_pending ? (
                          <span className="ml-2 text-xs text-muted-foreground">(creating...)</span>
                        ) : null}
                      </Link>
                    {isTeacher && (
                      <button
                        className="rounded-md bg-sidebar-accent/35 px-2 py-1 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent/55"
                        onClick={() => {
                          setLockSelectedChapter(true);
                          setSelectedChapterId(chapter.id);
                          setNewParagraphTitle('');
                          setIsCreateParagraphOpen(true);
                        }}
                      >
                        + Add Paragraph
                      </button>
                    )}
                  </div>
                </div>

                {allParagraphs.length > 0 ? (
                  <>
                    {visibleParagraphs.map((paragraph) => {
                      const roundedProgress = Math.ceil(paragraph.progress_percent || 0);

                      if (paragraph.locked) {
                        const prereq = allParagraphs.find((p) => p.id === paragraph.prerequisite_paragraph_id);
                        return (
                          <div
                            key={paragraph.id}
                            className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-3 opacity-60 cursor-not-allowed"
                            title={prereq ? `${isDutch ? 'Rond eerst af' : 'Finish first'}: ${prereq.title}` : undefined}
                          >
                            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="w-11 text-xs text-muted-foreground tabular-nums">
                              {chapter.chapter_number}.{paragraph.paragraph_number}
                            </span>
                            <span className="flex-1 truncate text-sm text-muted-foreground">{paragraph.title}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={paragraph.id}
                          className="mx-2 mb-2 flex items-center gap-1 rounded-xl border border-transparent bg-sidebar-accent/20 pr-2 transition-colors hover:bg-sidebar-accent/35"
                        >
                          <Link prefetch={false}
                            href={`/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`}
                            onClick={() => handleParagraphClick(chapter, paragraph)}
                            className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3"
                          >
                            <span className="w-14 text-xs text-sidebar-foreground tabular-nums">
                              {chapter.chapter_number}.{paragraph.paragraph_number}
                            </span>
                            <span className="flex-1 truncate text-sm text-[hsl(var(--sidebar-active-foreground))]">{paragraph.title}</span>
                            {paragraph.is_pending ? (
                              <span className="text-xs text-muted-foreground">(creating...)</span>
                            ) : null}
                            <span className="w-10 text-right text-xs text-sidebar-foreground tabular-nums">
                              {roundedProgress}%
                            </span>
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-sidebar-accent">
                              <div
                                className="h-full rounded-full bg-[hsl(var(--sidebar-active-foreground))] transition-all"
                                style={{ width: `${roundedProgress}%` }}
                              />
                            </div>
                          </Link>
                          {isTeacher && !paragraph.is_pending && (
                            <ParagraphPrerequisitePopover
                              subjectId={subjectId}
                              chapter={chapter}
                              paragraph={paragraph}
                              allParagraphs={allParagraphs}
                              isDutch={isDutch}
                              onSaved={(prerequisiteId) => {
                                setChapters((prev) =>
                                  prev.map((c) =>
                                    c.id !== chapter.id
                                      ? c
                                      : {
                                          ...c,
                                          paragraphs: (c.paragraphs || []).map((p) =>
                                            p.id === paragraph.id ? { ...p, prerequisite_paragraph_id: prerequisiteId } : p
                                          ),
                                        }
                                  )
                                );
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                    {hasMore && (
                      <button
                        onClick={() => setExpandedParagraphs(prev => {
                          const next = new Set(prev);
                          next.add(chapter.id);
                          return next;
                        })}
                        className="w-full rounded-lg bg-sidebar-accent/28 py-3 px-4 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/45"
                      >
                        +{remainingCount} more paragraph{remainingCount > 1 ? 's' : ''}
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Chapter Dialog */}
      <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
      <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Chapter</DialogTitle>
            <DialogDescription>Create a new chapter for this subject.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapter-title">Title</Label>
            <Input
              id="chapter-title"
              placeholder=""
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateChapterOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChapter} disabled={!newChapterTitle.trim() || isCreatingChapter}>
              {isCreatingChapter ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Paragraph Dialog */}
      <Dialog
        open={isCreateParagraphOpen}
        onOpenChange={(open) => {
          setIsCreateParagraphOpen(open);
          if (!open) {
            setLockSelectedChapter(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Paragraph</DialogTitle>
            <DialogDescription>Select a Chapter and create a new paragraph.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <Label htmlFor="paragraph-chapter">Chapter</Label>
              {lockSelectedChapter && selectedChapterId ? (
                <div className="mt-2 h-9 w-full rounded-md border border-input surface-interactive px-3 text-sm flex items-center">
                  {(() => {
                    const chapter = chapters.find((item) => item.id === selectedChapterId);
                    return chapter ? `${chapter.chapter_number}. ${chapter.title}` : '';
                  })()}
                </div>
              ) : (
                <select
                  id="paragraph-chapter"
                  value={selectedChapterId || ''}
                  onChange={(e) => {
                    const nextChapterId = e.target.value || null;
                    setSelectedChapterId(nextChapterId);
                  }}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select Chapter</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.chapter_number}. {chapter.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Label htmlFor="paragraph-title">Title</Label>
            <Input
              id="paragraph-title"
              placeholder=""
              value={newParagraphTitle}
              onChange={(e) => setNewParagraphTitle(e.target.value)}
              className="mt-2"
            />
            <p className="text-[11px] text-muted-foreground">
              {isDutch
                ? 'Je kunt een vereiste paragraaf later instellen via het instellingen-icoon naast de paragraaf.'
                : 'You can set a required paragraph later via the settings icon next to the paragraph.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateParagraphOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateParagraph} disabled={!selectedChapterId || !newParagraphTitle.trim() || isCreatingParagraph}>
              {isCreatingParagraph ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParagraphPrerequisitePopover({
  subjectId,
  chapter,
  paragraph,
  allParagraphs,
  isDutch,
  onSaved,
}: {
  subjectId: string;
  chapter: Chapter;
  paragraph: Paragraph;
  allParagraphs: Paragraph[];
  isDutch: boolean;
  onSaved: (prerequisiteId: string | null) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(paragraph.prerequisite_paragraph_id || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prerequisite_paragraph_id: value || null }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to save');
      }
      onSaved(value || null);
      setOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: isDutch ? 'Opslaan mislukt' : 'Save failed', description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={isDutch ? 'Paragraafinstellingen' : 'Paragraph settings'}
          onClick={(e) => e.preventDefault()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3" onClick={(e) => e.stopPropagation()}>
        <Label htmlFor={`prereq-${paragraph.id}`} className="text-xs">
          {isDutch ? 'Vereist eerst (optioneel)' : 'Requires first (optional)'}
        </Label>
        <select
          id={`prereq-${paragraph.id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{isDutch ? 'Geen' : 'None'}</option>
          {allParagraphs
            .filter((p) => p.id !== paragraph.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {chapter.chapter_number}.{p.paragraph_number} {p.title}
              </option>
            ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          {isDutch
            ? 'Leerlingen zien deze paragraaf pas na 100% voortgang op de gekozen paragraaf.'
            : 'Students only see this paragraph once the chosen one is 100% complete.'}
        </p>
        <Button size="sm" className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (isDutch ? 'Opslaan...' : 'Saving...') : isDutch ? 'Opslaan' : 'Save'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}


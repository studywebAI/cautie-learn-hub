'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
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
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [chapterReorderMode, setChapterReorderMode] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newParagraphTitle, setNewParagraphTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingParagraph, setIsCreatingParagraph] = useState(false);
  const { toast } = useToast();
  const { role, subjects: contextSubjects } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
  const isTeacher = role === 'teacher';
  // Class-linked subjects already have attendance via the class's Manage
  // tab -- this entry point only makes sense for standalone (class-less)
  // subjects, which have no other way to reach it.
  const contextSubject = (contextSubjects || []).find((s: any) => s.id === subjectId);
  const isStandaloneSubject = !Array.isArray(contextSubject?.classes) || contextSubject.classes.length === 0;
  const s = dictionary.subjects;
  const c = dictionary.common;
  const t = {
    chapters: s.chapters,
    addChapter: s.addChapter,
    addParagraph: s.addParagraph,
    lastActiveIn: s.lastActiveIn,
    reorderHint: s.reorderHint,
    done: s.reorderDone,
    createFirstChapter: s.createFirstChapter,
    addChapterTitle: s.addChapterTitle,
    addChapterDescription: s.addChapterDescription,
    title: s.fieldTitle,
    cancel: c.cancel,
    creating: s.creatingEllipsis,
    create: c.create,
    addParagraphTitle: s.addParagraphTitle,
    addParagraphDescription: s.addParagraphDescription,
    chapter: s.chapterLabel,
    selectChapter: s.selectChapter,
    paragraphsWord: s.paragraphs,
    assignmentsWord: s.assignments,
    testsBadge: s.testsBadge,
    reorderTitle: s.pressHoldReorder,
    moveUp: s.moveUp,
    moveDown: s.moveDown,
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 surface-interactive rounded-full" />
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
    <div className="page-content">
      <PageHeader
        title={subject.name}
        subtitle={`${dictionary.sidebar.subjects} / ${t.chapters}`}
        actions={
          isTeacher && (
            <>
              {isStandaloneSubject && (
                <Link href={`/subjects/${subjectId}/attendance`}>
                  <Button size="sm" variant="outline">Attendance</Button>
                </Link>
              )}
              {chapters.length > 0 && (
                <Button
                  onClick={() => {
                    setSelectedChapterId(chapters[0]?.id || null);
                    setNewParagraphTitle('');
                    setIsCreateParagraphOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t.addParagraph}
                </Button>
              )}
              <Button onClick={() => setIsCreateChapterOpen(true)} size="sm" variant="outline">
                {t.addChapter}
              </Button>
            </>
          )
        }
      />

      {/* Last activity banner */}
      {lastActivity && (
        <Link prefetch={false}
          href={`/subjects/${subjectId}/chapters/${lastActivity.chapterId}/paragraphs/${lastActivity.paragraphId}`}
          className="mb-3 block rounded-xl border border-transparent bg-sidebar-accent/42 p-3 transition-colors hover:bg-sidebar-accent/62"
        >
          <p className="text-sm">
            <span className="text-foreground/65">{t.lastActiveIn}</span>
            <span>{lastActivity.chapterNumber}.{lastActivity.paragraphNumber} {lastActivity.paragraphTitle}</span>
          </p>
        </Link>
      )}

      {chapterReorderMode && (
        <div className="mb-3 flex items-center justify-between rounded-xl surface-interactive px-4 py-2">
          <p className="text-xs text-muted-foreground">{t.reorderHint}</p>
          <Button size="sm" variant="outline" onClick={() => setChapterReorderMode(false)}>
            {t.done}
          </Button>
        </div>
      )}

      {/* Numbered chapter list — clicking a chapter navigates to its own
          paragraphs page instead of expanding inline, so this view stays a
          single flat, scannable list rather than a nested accordion. */}
      {chapters.length === 0 ? (
        <div className="py-12">
          {isTeacher ? (
            <div className="flex justify-center">
              <Button onClick={() => setIsCreateChapterOpen(true)} size="sm">
                {t.createFirstChapter}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          {chapters.map((chapter, chapterIndex) => {
            const allParagraphs = chapter.paragraphs || [];
            const chapterProgress = allParagraphs.length > 0
              ? Math.round(allParagraphs.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / allParagraphs.length)
              : 0;
            const totalAssignments = allParagraphs.reduce((sum, p) => sum + (p.assignment_count || 0), 0);

            const chapterDisplayTitle = chapter.is_tests_chapter ? t.testsBadge : chapter.title;

            const row = (
              <div
                className={cn(
                  'flex items-center gap-3 py-3.5 px-1 border-b border-border transition-colors',
                  chapterReorderMode ? '' : 'hover:bg-accent/40 rounded-lg'
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted-foreground tabular-nums">
                  {chapter.is_tests_chapter ? 'T' : chapter.chapter_number}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
                  {chapterDisplayTitle}
                  {chapter.is_pending ? (
                    <span className="ml-2 text-xs text-muted-foreground">({t.creating})</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {allParagraphs.length} {t.paragraphsWord} · {totalAssignments} {t.assignmentsWord}
                </span>
                <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full bg-[hsl(var(--sidebar-active-foreground))] transition-all" style={{ width: `${chapterProgress}%` }} />
                </div>
              </div>
            );

            return (
              <div
                key={chapter.id}
                onPointerDown={isTeacher ? startChapterLongPress : undefined}
                onPointerUp={isTeacher ? cancelChapterLongPress : undefined}
                onPointerLeave={isTeacher ? cancelChapterLongPress : undefined}
                onPointerCancel={isTeacher ? cancelChapterLongPress : undefined}
                title={isTeacher ? t.reorderTitle : undefined}
              >
                {chapterReorderMode ? (
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={chapterIndex === 0}
                        onClick={() => void handleChapterMove(chapter.id, 'up')}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                        title={t.moveUp}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={chapterIndex === chapters.length - 1}
                        onClick={() => void handleChapterMove(chapter.id, 'down')}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                        title={t.moveDown}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex-1">{row}</div>
                  </div>
                ) : (
                  <Link prefetch={false} href={`/subjects/${subjectId}/chapters/${chapter.id}`}>
                    {row}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Chapter Dialog */}
      <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
      <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.addChapterTitle}</DialogTitle>
            <DialogDescription>{t.addChapterDescription}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapter-title">{t.title}</Label>
            <Input
              id="chapter-title"
              placeholder=""
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateChapterOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateChapter} disabled={!newChapterTitle.trim() || isCreatingChapter}>
              {isCreatingChapter ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Paragraph Dialog */}
      <Dialog open={isCreateParagraphOpen} onOpenChange={setIsCreateParagraphOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addParagraphTitle}</DialogTitle>
            <DialogDescription>{t.addParagraphDescription}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <Label htmlFor="paragraph-chapter">{t.chapter}</Label>
              <Select value={selectedChapterId || 'none'} onValueChange={(v) => setSelectedChapterId(v === 'none' ? null : v)}>
                <SelectTrigger id="paragraph-chapter" className="mt-2 h-9 text-sm">
                  <SelectValue placeholder={t.selectChapter} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.is_tests_chapter ? 'T' : chapter.chapter_number}. {chapter.is_tests_chapter ? t.testsBadge : chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label htmlFor="paragraph-title">{t.title}</Label>
            <Input
              id="paragraph-title"
              placeholder=""
              value={newParagraphTitle}
              onChange={(e) => setNewParagraphTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateParagraphOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateParagraph} disabled={!selectedChapterId || !newParagraphTitle.trim() || isCreatingParagraph}>
              {isCreatingParagraph ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

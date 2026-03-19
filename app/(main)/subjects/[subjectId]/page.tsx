'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
};

type Chapter = {
  id: string;
  title: string;
  chapter_number: number;
  paragraphs?: Paragraph[];
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
  const [newParagraphTitle, setNewParagraphTitle] = useState('');
  const [paragraphTitleTouched, setParagraphTitleTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedParagraphs, setExpandedParagraphs] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';

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
        console.error('Error fetching subject data:', error);
        const message = error instanceof Error ? error.message : 'Failed to load subject';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjectData();
  }, [subjectId]);

  const getDefaultParagraphTitle = useMemo(() => {
    return (chapterId: string | null) => {
      if (!chapterId) return '';
      const chapter = chapters.find((item) => item.id === chapterId);
      const nextNumber = (chapter?.paragraphs?.length || 0) + 1;
      return `Paragraph ${nextNumber}`;
    };
  }, [chapters]);

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChapterTitle.trim() }),
      });
      if (response.ok) {
        const newChapter = await response.json();
        setChapters(prev => [...prev, { ...newChapter, paragraphs: [] }]);
        setNewChapterTitle('');
        setIsCreateChapterOpen(false);
        toast({ title: 'Chapter created' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create chapter', variant: 'destructive' });
    }
  };

  const handleCreateParagraph = async () => {
    if (!selectedChapterId) return;
    const resolvedTitle = newParagraphTitle.trim() || getDefaultParagraphTitle(selectedChapterId) || 'Paragraph';
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${selectedChapterId}/paragraphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: resolvedTitle }),
      });
      if (response.ok) {
        await loadSubjectOverview();
        setNewParagraphTitle('');
        setParagraphTitleTouched(false);
        setSelectedChapterId(null);
        setIsCreateParagraphOpen(false);
        toast({ title: 'Paragraph created' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: 'Error',
          description: errorData?.details || errorData?.error || 'Failed to create paragraph',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create paragraph', variant: 'destructive' });
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
                <div className="w-20 h-20 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (loadError) {
    return <div className="text-center py-8 text-muted-foreground">Failed to load subject: {loadError}</div>;
  }

  if (!subject) {
    return <div className="text-center py-8 text-muted-foreground">Subject not found</div>;
  }

  return (
    <div className="space-y-0">
      {/* Last activity banner */}
      {lastActivity && (
        <Link prefetch={false}
          href={`/subjects/${subjectId}/chapters/${lastActivity.chapterId}/paragraphs/${lastActivity.paragraphId}`}
          className="mb-4 block rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3 transition-colors hover:bg-sidebar-accent/65"
        >
          <p className="text-sm">
            <span className="text-muted-foreground">Last active in </span>
            <span>{lastActivity.chapterNumber}.{lastActivity.paragraphNumber} {lastActivity.paragraphTitle}</span>
          </p>
        </Link>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-lg lowercase">{subject.name}</h1>
          {subject.description && (
            <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
          )}
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setSelectedChapterId(chapters[0]?.id || null);
                setParagraphTitleTouched(false);
                setNewParagraphTitle(getDefaultParagraphTitle(chapters[0]?.id || null));
                setIsCreateParagraphOpen(true);
              }}
              size="sm"
              variant="outline"
            >
              + Add Paragraph
            </Button>
            <Button onClick={() => setIsCreateChapterOpen(true)} size="sm">
              + Add Chapter
            </Button>
          </div>
        )}
      </div>

      {/* Flat chapter + paragraph list */}
      {chapters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm mb-4">No chapters yet</p>
          {isTeacher && (
            <Button onClick={() => setIsCreateChapterOpen(true)} size="sm">
              Create First Chapter
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter) => {
            const maxVisible = 10;
            const allParagraphs = chapter.paragraphs || [];
            const isFullyExpanded = expandedParagraphs.has(chapter.id);
            const visibleParagraphs = isFullyExpanded ? allParagraphs : allParagraphs.slice(0, maxVisible);
            const hasMore = allParagraphs.length > maxVisible && !isFullyExpanded;
            const remainingCount = allParagraphs.length - maxVisible;

            return (
              <div key={chapter.id} className="overflow-hidden rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/30">
                <div className="flex min-h-[108px] items-stretch">
                  <Link prefetch={false}
                    href={`/subjects/${subjectId}/chapters/${chapter.id}`}
                    className="relative w-32 shrink-0 bg-sidebar-accent/80 transition-colors hover:bg-sidebar-accent"
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-2xl text-muted-foreground/60">
                      {chapter.chapter_number}
                    </div>
                  </Link>
                    <div className="flex flex-1 items-start justify-between gap-3 p-4">
                      <Link prefetch={false}
                        href={`/subjects/${subjectId}/chapters/${chapter.id}`}
                        className="text-sm text-[hsl(var(--sidebar-active-foreground))] hover:underline"
                      >
                        {chapter.title}
                      </Link>
                    {isTeacher && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          setSelectedChapterId(chapter.id);
                          setParagraphTitleTouched(false);
                          setNewParagraphTitle(getDefaultParagraphTitle(chapter.id));
                          setIsCreateParagraphOpen(true);
                        }}
                      >
                        + paragraph
                      </button>
                    )}
                  </div>
                </div>

                {allParagraphs.length > 0 ? (
                  <>
                    {visibleParagraphs.map((paragraph) => {
                      const roundedProgress = Math.ceil(paragraph.progress_percent || 0);

                      return (
                        <Link prefetch={false}
                          key={paragraph.id}
                          href={`/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`}
                          onClick={() => handleParagraphClick(chapter, paragraph)}
                          className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/45 px-4 py-3 transition-colors hover:bg-sidebar-accent/70"
                        >
                          <span className="w-14 text-xs text-sidebar-foreground tabular-nums">
                            {chapter.chapter_number}.{paragraph.paragraph_number}
                          </span>
                          <span className="flex-1 truncate text-sm text-[hsl(var(--sidebar-active-foreground))]">{paragraph.title}</span>
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
                      );
                    })}
                    {hasMore && (
                      <button
                        onClick={() => setExpandedParagraphs(prev => {
                          const next = new Set(prev);
                          next.add(chapter.id);
                          return next;
                        })}
                        className="w-full py-3 px-4 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                      >
                        +{remainingCount} more paragraph{remainingCount > 1 ? 's' : ''}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 px-4">no paragraphs yet</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Chapter Dialog */}
      <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Chapter</DialogTitle>
            <DialogDescription>Create a new chapter for this subject.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="chapter-title">Title</Label>
            <Input
              id="chapter-title"
              placeholder="e.g., Introduction"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateChapterOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChapter} disabled={!newChapterTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Paragraph Dialog */}
      <Dialog open={isCreateParagraphOpen} onOpenChange={setIsCreateParagraphOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Paragraph</DialogTitle>
            <DialogDescription>Select a chapter and create a new paragraph. A title is auto-generated by default.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <Label htmlFor="paragraph-chapter">Chapter</Label>
              <select
                id="paragraph-chapter"
                value={selectedChapterId || ''}
                onChange={(e) => {
                  const nextChapterId = e.target.value || null;
                  setSelectedChapterId(nextChapterId);
                  if (!paragraphTitleTouched) {
                    setNewParagraphTitle(getDefaultParagraphTitle(nextChapterId));
                  }
                }}
                className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.chapter_number}. {chapter.title}
                  </option>
                ))}
              </select>
            </div>
            <Label htmlFor="paragraph-title">Title</Label>
            <Input
              id="paragraph-title"
              placeholder="Auto-generated from chapter"
              value={newParagraphTitle}
              onChange={(e) => {
                setParagraphTitleTouched(true);
                setNewParagraphTitle(e.target.value);
              }}
              className="mt-2"
            />
            {!paragraphTitleTouched && selectedChapterId && (
              <p className="text-xs text-muted-foreground">Auto title: {getDefaultParagraphTitle(selectedChapterId)}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateParagraphOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateParagraph} disabled={!selectedChapterId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


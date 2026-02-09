'use client';

import { useState, useEffect, useContext } from 'react';
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
import { Check, X } from 'lucide-react';

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
  description: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [expandedParagraphs, setExpandedParagraphs] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        setIsLoading(true);
        const subjectResponse = await fetch(`/api/subjects/${subjectId}`);
        if (subjectResponse.ok) {
          const subjectData = await subjectResponse.json();
          setSubject({
            id: subjectData.id,
            name: subjectData.title || subjectData.name,
            description: subjectData.description || null,
          });
        }

        const chaptersResponse = await fetch(`/api/subjects/${subjectId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          const chaptersWithParagraphs = await Promise.all(
            chaptersData.map(async (chapter: any) => {
              try {
                const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapter.id}/paragraphs`);
                if (paragraphsResponse.ok) {
                  const paragraphs = await paragraphsResponse.json();
                  return { ...chapter, paragraphs };
                }
                return { ...chapter, paragraphs: [] };
              } catch {
                return { ...chapter, paragraphs: [] };
              }
            })
          );
          setChapters(chaptersWithParagraphs);

          const storageKey = `lastActivity_${subjectId}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try { setLastActivity(JSON.parse(stored)); } catch {}
          }
        }
      } catch (error) {
        console.error('Error fetching subject data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjectData();
  }, [subjectId]);

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
    if (!newParagraphTitle.trim() || !selectedChapterId) return;
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${selectedChapterId}/paragraphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newParagraphTitle.trim() }),
      });
      if (response.ok) {
        const chaptersResponse = await fetch(`/api/subjects/${subjectId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          const chaptersWithParagraphs = await Promise.all(
            chaptersData.map(async (chapter: any) => {
              try {
                const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapter.id}/paragraphs`);
                if (paragraphsResponse.ok) {
                  const paragraphs = await paragraphsResponse.json();
                  return { ...chapter, paragraphs };
                }
                return { ...chapter, paragraphs: [] };
              } catch {
                return { ...chapter, paragraphs: [] };
              }
            })
          );
          setChapters(chaptersWithParagraphs);
        }
        setNewParagraphTitle('');
        setSelectedChapterId(null);
        setIsCreateParagraphOpen(false);
        toast({ title: 'Paragraph created' });
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

  if (!subject) {
    return <div className="text-center py-8 text-muted-foreground">Subject not found</div>;
  }

  return (
    <div className="space-y-0">
      {/* Last activity banner */}
      {lastActivity && (
        <Link
          href={`/subjects/${subjectId}/chapters/${lastActivity.chapterId}/paragraphs/${lastActivity.paragraphId}`}
          className="block p-3 bg-muted/50 rounded-lg border hover:bg-muted transition-colors mb-4"
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
          <h1 className="text-lg">{subject.name}</h1>
          {subject.description && (
            <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
          )}
        </div>
        {isTeacher && (
          <Button onClick={() => setIsCreateChapterOpen(true)} size="sm">
            + Add Chapter
          </Button>
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
        <div className="space-y-0">
          {chapters.map((chapter) => {
            const maxVisible = 10;
            const allParagraphs = chapter.paragraphs || [];
            const isFullyExpanded = expandedParagraphs.has(chapter.id);
            const visibleParagraphs = isFullyExpanded ? allParagraphs : allParagraphs.slice(0, maxVisible);
            const hasMore = allParagraphs.length > maxVisible && !isFullyExpanded;
            const remainingCount = allParagraphs.length - maxVisible;

            return (
              <div key={chapter.id}>
                {/* Chapter header - black bar, NOT collapsible */}
                <div className="flex items-center justify-between px-5 py-3 bg-foreground text-background text-base rounded-r-xl">
                  <span className="font-medium">{chapter.chapter_number}. {chapter.title}</span>
                  {isTeacher && (
                    <button
                      className="text-xs text-background/70 hover:text-background transition-colors"
                      onClick={() => {
                        setSelectedChapterId(chapter.id);
                        setIsCreateParagraphOpen(true);
                      }}
                    >
                      + Paragraph
                    </button>
                  )}
                </div>

                {/* Paragraphs - always visible, no accordion */}
                <div className="border-2 border-foreground border-l-0 border-t-0 rounded-br-xl overflow-hidden">
                  {allParagraphs.length > 0 ? (
                    <>
                      {visibleParagraphs.map((paragraph) => {
                        const progress = paragraph.progress_percent || 0;
                        const roundedProgress = Math.ceil(progress);
                        const answersOn = paragraph.answers_enabled ?? false;

                        return (
                          <Link
                            key={paragraph.id}
                            href={`/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`}
                            onClick={() => handleParagraphClick(chapter, paragraph)}
                            className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                          >
                            {/* Rounded number badge */}
                            <span className="bg-foreground text-background px-2.5 py-1 rounded-full text-xs font-medium shrink-0 min-w-[2.5rem] text-center">
                              {chapter.chapter_number}.{paragraph.paragraph_number}
                            </span>

                            {/* Title */}
                            <span className="text-sm flex-1 truncate">{paragraph.title}</span>

                            {/* Answers check/X */}
                            <span className="shrink-0">
                              {answersOn ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground/40" />
                              )}
                            </span>

                            {/* Progress bar + percentage */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                                {roundedProgress}%
                              </span>
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-foreground/30 rounded-full transition-all"
                                  style={{ width: `${roundedProgress}%` }}
                                />
                              </div>
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
                          className="w-full py-3 px-4 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-t border-border flex items-center justify-center gap-1"
                        >
                          <span>+{remainingCount} more paragraph{remainingCount > 1 ? 's' : ''}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 px-4 text-center">No paragraphs yet</p>
                  )}
                </div>
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
            <DialogDescription>Create a new paragraph for this chapter.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="paragraph-title">Title</Label>
            <Input
              id="paragraph-title"
              placeholder="e.g., Basic Concepts"
              value={newParagraphTitle}
              onChange={(e) => setNewParagraphTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateParagraphOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateParagraph} disabled={!newParagraphTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

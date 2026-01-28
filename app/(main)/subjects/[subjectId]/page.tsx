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

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
  assignment_count: number;
  progress_percent: number;
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

// Placeholder cover with emojis
function ChapterCover({ chapterNumber }: { chapterNumber: number }) {
  return (
    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center relative shrink-0">
      <span className="text-2xl">📚</span>
      <div className="absolute -top-1 -left-1 bg-foreground text-background rounded w-6 h-6 flex items-center justify-center text-xs">
        {chapterNumber}
      </div>
    </div>
  );
}

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
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';

  useEffect(() => {
    const fetchSubjectData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch subject info
        const subjectResponse = await fetch(`/api/subjects/${subjectId}`);
        if (subjectResponse.ok) {
          const subjectData = await subjectResponse.json();
          setSubject({
            id: subjectData.id,
            name: subjectData.title || subjectData.name,
            description: subjectData.description || null,
          });
        }

        // Fetch chapters with paragraphs
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
          
          // Try to get last activity from localStorage
          const storageKey = `lastActivity_${subjectId}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              setLastActivity(JSON.parse(stored));
            } catch {}
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
        // Refresh chapters
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

  // Track paragraph click for last activity
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

  return (
    <div className="space-y-6">
      {/* Last activity banner */}
      {lastActivity && (
        <Link
          href={`/subjects/${subjectId}/chapters/${lastActivity.chapterId}/paragraphs/${lastActivity.paragraphId}`}
          className="block p-3 bg-muted/50 rounded border hover:bg-muted transition-colors"
        >
          <p className="text-sm">
            <span className="text-muted-foreground">Last active in </span>
            <span>{lastActivity.chapterNumber}.{lastActivity.paragraphNumber} {lastActivity.paragraphTitle}</span>
          </p>
        </Link>
      )}

      {/* Header - minimal */}
      <div className="flex justify-between items-start">
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

      {/* Chapters */}
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
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <Card key={chapter.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Chapter cover with number */}
                  <ChapterCover chapterNumber={chapter.chapter_number} />
                  
                  {/* Right side - title and paragraphs */}
                  <div className="flex-1 min-w-0">
                    {/* Chapter title */}
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-sm">{chapter.title}</h2>
                      {isTeacher && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedChapterId(chapter.id);
                            setIsCreateParagraphOpen(true);
                          }}
                        >
                          + Paragraph
                        </Button>
                      )}
                    </div>
                    
                    {/* Paragraphs list */}
                    <div className="space-y-1">
                      {chapter.paragraphs && chapter.paragraphs.length > 0 ? (
                        <>
                          {chapter.paragraphs.slice(0, 10).map((paragraph) => (
                            <Link
                              key={paragraph.id}
                              href={`/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`}
                              onClick={() => handleParagraphClick(chapter, paragraph)}
                              className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-muted transition-colors cursor-pointer"
                            >
                              {/* Paragraph number */}
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0 w-10 text-center">
                                {chapter.chapter_number}.{paragraph.paragraph_number}
                              </span>
                              
                              {/* Title */}
                              <span className="text-sm flex-1 truncate">
                                {paragraph.title}
                              </span>
                              
                              {/* Progress */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground w-8 text-right">
                                  {paragraph.progress_percent || 0}%
                                </span>
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${paragraph.progress_percent || 0}%` }}
                                  />
                                </div>
                              </div>
                            </Link>
                          ))}
                          {chapter.paragraphs.length > 10 && (
                            <p className="text-xs text-muted-foreground py-1">
                              +{chapter.paragraphs.length - 10} more paragraphs
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">No paragraphs yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

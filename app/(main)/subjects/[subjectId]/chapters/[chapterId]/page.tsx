'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
}

interface Paragraph {
  id: string;
  title: string;
  paragraph_number: number;
  completion_percent: number;
}

export default function ChapterOverviewPage() {
  const params = useParams();
  const { subjectId, chapterId } = params as {
    subjectId: string;
    chapterId: string;
  };

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adjacentChapters, setAdjacentChapters] = useState<{prev?: Chapter, next?: Chapter}>({});

  const { toast } = useToast();
  const { user } = useContext(AppContext) as any;

  useEffect(() => {
    const fetchChapterData = async () => {
      if (!subjectId || !chapterId) return;

      setIsLoading(true);

      try {
        // Fetch subject info
        const subjectResponse = await fetch(`/api/subjects/${subjectId}`);
        if (subjectResponse.ok) {
          const subjectData = await subjectResponse.json();
          setSubject(subjectData);
        }

        // Fetch chapter info
        const chapterResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}`);
        if (!chapterResponse.ok) return;
        const chapterData = await chapterResponse.json();
        setChapter(chapterData);

        // Fetch paragraphs for this chapter
        const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (!paragraphsResponse.ok) return;
        const paragraphsData = await paragraphsResponse.json();

        // Fetch progress for each paragraph if user is student
        const paragraphsWithProgress = await Promise.all(
          paragraphsData.map(async (paragraph: any) => {
            try {
              if (!user || user.role === 'teacher') {
                return { ...paragraph, completion_percent: 0 };
              }

              const progressResponse = await fetch(
                `/api/progress/${paragraph.id}?studentId=${user.id}`
              );

              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                return {
                  ...paragraph,
                  completion_percent: progressData.completion_percent || 0,
                };
              }
            } catch {}

            return { ...paragraph, completion_percent: 0 };
          })
        );

        setParagraphs(paragraphsWithProgress);

        // Fetch adjacent chapters
        const chaptersResponse = await fetch(`/api/subjects/${subjectId}/chapters`);
        if (chaptersResponse.ok) {
          const chaptersData = await chaptersResponse.json();
          const currentIndex = chaptersData.findIndex((c: Chapter) => c.id === chapterId);

          setAdjacentChapters({
            prev: currentIndex > 0 ? chaptersData[currentIndex - 1] : undefined,
            next: currentIndex < chaptersData.length - 1 ? chaptersData[currentIndex + 1] : undefined
          });
        }

      } catch (error) {
        console.error('Error fetching chapter data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapterData();
  }, [subjectId, chapterId, user]);

  const handleParagraphClick = (paragraphId: string, paragraphNumber: number, paragraphTitle: string) => {
    // Track activity for "last active in" banner
    if (chapter) {
      const activity = {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        paragraphId,
        paragraphNumber,
        paragraphTitle,
      };
      localStorage.setItem(`lastActivity_${subjectId}`, JSON.stringify(activity));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 mt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!chapter) {
    return <div className="p-6 text-muted-foreground">Chapter not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Minimal header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/subjects/${subjectId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {subject?.title || 'Back'}
          </Link>
          <p className="text-sm mt-1">
            {chapter.chapter_number}. {chapter.title}
          </p>
        </div>
        
        {/* Minimal chapter navigation */}
        <div className="flex gap-4 text-sm">
          {adjacentChapters.prev && (
            <Link
              href={`/subjects/${subjectId}/chapters/${adjacentChapters.prev.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← {adjacentChapters.prev.chapter_number}
            </Link>
          )}
          {adjacentChapters.next && (
            <Link
              href={`/subjects/${subjectId}/chapters/${adjacentChapters.next.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {adjacentChapters.next.chapter_number} →
            </Link>
          )}
        </div>
      </div>

      {/* Paragraphs list */}
      {paragraphs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No paragraphs yet</p>
      ) : (
        <div className="space-y-1">
          {paragraphs.map((paragraph) => (
            <Link
              key={paragraph.id}
              href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraph.id}`}
              onClick={() => handleParagraphClick(paragraph.id, paragraph.paragraph_number, paragraph.title)}
              className="flex items-center justify-between py-2 px-3 -mx-3 rounded hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-8">
                  {chapter.chapter_number}.{paragraph.paragraph_number}
                </span>
                <span className="text-sm">{paragraph.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-10 text-right">
                  {paragraph.completion_percent}%
                </span>
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/30 rounded-full transition-all"
                    style={{ width: `${paragraph.completion_percent}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
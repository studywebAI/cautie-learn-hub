'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    const fetchChapterData = async () => {
      if (!subjectId || !chapterId) return;

      setIsLoading(true);

      try {
        const response = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/overview`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json();
        setSubject(payload.subject || null);
        setChapter(payload.chapter || null);
        setParagraphs(Array.isArray(payload.paragraphs) ? payload.paragraphs : []);
        setAdjacentChapters(payload.adjacentChapters || {});
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapterData();
  }, [subjectId, chapterId]);

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
      <div className="flex min-h-[55vh] items-center justify-center">
        <CautieLoader label="Loading chapter" sublabel="Fetching paragraphs" size="lg" />
      </div>
    );
  }

  if (!chapter) {
    return <div className="page-content text-muted-foreground">Chapter not found</div>;
  }

  return (
      <div className="page-content">
      <PageHeader
        title={`${chapter.chapter_number}. ${chapter.title}`}
        subtitle={`${subject?.title || 'Subjects'} / ${chapter.title} / Paragraphs`}
        actions={
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2">
              <Link prefetch={false} href={`/subjects/${subjectId}`}>
                <ChevronLeft className="h-3.5 w-3.5" />
                {subject?.title || 'Subjects'}
              </Link>
            </Button>
            {adjacentChapters.prev && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={`${adjacentChapters.prev.chapter_number}. ${adjacentChapters.prev.title}`}>
                <Link prefetch={false} href={`/subjects/${subjectId}/chapters/${adjacentChapters.prev.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {adjacentChapters.next && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={`${adjacentChapters.next.chapter_number}. ${adjacentChapters.next.title}`}>
                <Link prefetch={false} href={`/subjects/${subjectId}/chapters/${adjacentChapters.next.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Paragraphs list */}
      {paragraphs.length > 0 ? (
        <div className="space-y-2">
          {paragraphs.map((paragraph) => (
            <Link prefetch={false}
              key={paragraph.id}
              href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraph.id}`}
              onClick={() => handleParagraphClick(paragraph.id, paragraph.paragraph_number, paragraph.title)}
            className="flex items-center justify-between rounded-xl border border-transparent bg-sidebar-accent/25 px-3 py-3 transition-colors hover:bg-sidebar-accent/45"
            >
              <div className="flex items-center gap-3">
                <span className="w-14 text-sm text-sidebar-foreground tabular-nums">
                  {chapter.chapter_number}.{paragraph.paragraph_number}
                </span>
                <span className="text-sm text-[hsl(var(--sidebar-active-foreground))]">{paragraph.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 text-right text-sm text-sidebar-foreground tabular-nums">
                  {paragraph.completion_percent}%
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-sidebar-accent">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--sidebar-active-foreground))] transition-all"
                    style={{ width: `${paragraph.completion_percent}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}


'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/app-context';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Chapter {
  id: string;
  title: string;
  ai_summary?: string;
  chapter_number: number;
}

interface Paragraph {
  id: string;
  title: string;
  paragraph_number: number;
  completion_percent: number;
  assignment_count: number;
  completed_assignments: number;
}

interface ChapterOverviewPageProps {}

export default function ChapterOverviewPage({}: ChapterOverviewPageProps) {
  const params = useParams();
  const { subjectId, chapterId } = params as {
    subjectId: string;
    chapterId: string;
  };

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjacentChapters, setAdjacentChapters] = useState<{prev?: Chapter, next?: Chapter}>({});

  const { toast } = useToast();
  const { user } = useContext(AppContext) as any;

  useEffect(() => {
    const fetchChapterData = async () => {
      if (!subjectId || !chapterId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch subject info
        const subjectResponse = await fetch(`/api/subjects/${subjectId}`);
        if (subjectResponse.ok) {
          const subjectData = await subjectResponse.json();
          setSubject(subjectData);
        }

        // Fetch chapter info
        const chapterResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}`);
        if (!chapterResponse.ok) {
          throw new Error('Failed to fetch chapter');
        }
        const chapterData = await chapterResponse.json();
        setChapter(chapterData);

        // Fetch paragraphs for this chapter
        const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (!paragraphsResponse.ok) {
          throw new Error('Failed to fetch paragraphs');
        }
        const paragraphsData = await paragraphsResponse.json();

        // Fetch progress for each paragraph if user is student
        const paragraphsWithProgress = await Promise.all(
          paragraphsData.map(async (paragraph: any) => {
            try {
              if (!user || user.role === 'teacher') {
                return {
                  ...paragraph,
                  completion_percent: 0,
                  assignment_count: 0,
                  completed_assignments: 0
                };
              }

              // Fetch paragraph progress
              const progressResponse = await fetch(
                `/api/progress/${paragraph.id}?studentId=${user.id}`
              );

              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                return {
                  ...paragraph,
                  completion_percent: progressData.completion_percent || 0,
                  assignment_count: progressData.total_assignments || 0,
                  completed_assignments: progressData.completed_assignments || 0
                };
              }
            } catch (error) {
              console.error(`Failed to fetch progress for paragraph ${paragraph.id}:`, error);
            }

            return {
              ...paragraph,
              completion_percent: 0,
              assignment_count: 0,
              completed_assignments: 0
            };
          })
        );

        setParagraphs(paragraphsWithProgress);

        // Generate AI summary if not exists
        if (!chapterData.ai_summary && chapterData.id) {
          generateChapterSummary(chapterData.id);
        }

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

      } catch (err) {
        console.error('Error fetching chapter data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapterData();
  }, [subjectId, chapterId, user]);

  const generateChapterSummary = async (chapterId: string) => {
    try {
      // This would call an AI service to generate the summary
      // For now, we'll set a placeholder
      const summary = "This chapter covers fundamental concepts essential for understanding the subject matter. Students will explore key principles through interactive assignments and practical exercises.";

      // Update chapter with AI summary
      await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_summary: summary })
      });

      setChapter(prev => prev ? { ...prev, ai_summary: summary } : null);
    } catch (error) {
      console.error('Failed to generate chapter summary:', error);
    }
  };

  const handleParagraphClick = (paragraphId: string) => {
    window.location.href = `/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`;
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    const targetChapter = direction === 'prev' ? adjacentChapters.prev : adjacentChapters.next;
    if (targetChapter) {
      window.location.href = `/subjects/${subjectId}/chapters/${targetChapter.id}`;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Chapter not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const overallProgress = paragraphs.length > 0
    ? Math.round(paragraphs.reduce((sum, p) => sum + p.completion_percent, 0) / paragraphs.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/subjects/${subjectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
            📚
          </div>
          <div className="flex-1">
            <h1 className="text-base">
              {chapter.chapter_number}
            </h1>
            <p className="text-sm">
              {chapter.title}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleNavigation('prev')}
            disabled={!adjacentChapters.prev}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous Chapter
          </Button>
          <Button
            variant="outline"
            onClick={() => handleNavigation('next')}
            disabled={!adjacentChapters.next}
          >
            Next Chapter
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      {user?.role === 'student' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={overallProgress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {overallProgress}% complete • {paragraphs.filter(p => p.completion_percent === 100).length} of {paragraphs.length} paragraphs finished
                </p>
              </div>
              {overallProgress === 100 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Paragraphs Grid */}
      <div>
        <h2 className="text-sm mb-4">Paragraphs</h2>

        {paragraphs.length === 0 ? (
          <Card className="p-12 text-center">
            <h3 className="mb-2">No paragraphs yet</h3>
            <p className="text-muted-foreground">
              This chapter doesn't have any paragraphs yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {paragraphs.map((paragraph) => (
              <div
                key={paragraph.id}
                className="cursor-pointer hover:bg-muted p-3 rounded flex items-center justify-between"
                onClick={() => handleParagraphClick(paragraph.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {chapter.chapter_number}.{paragraph.paragraph_number} {paragraph.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${paragraph.completion_percent}%` }}
                    />
                  </div>
                  <span className="text-sm">{paragraph.completion_percent}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
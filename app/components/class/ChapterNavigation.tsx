'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chapter {
  id: string;
  title: string;
  description?: string;
  order_index: number;
}

interface ChapterNavigationProps {
  classId: string;
  selectedChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  onCreateChapter?: () => void;
  isTeacher?: boolean;
  className?: string;
}

export function ChapterNavigation({
  classId,
  selectedChapterId,
  onChapterSelect,
  onCreateChapter,
  isTeacher = false,
  className
}: ChapterNavigationProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!classId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/classes/${classId}/chapters`);
        if (!response.ok) {
          throw new Error('Failed to fetch chapters');
        }
        const data = await response.json();
        setChapters(data.chapters || []);
      } catch (err) {
        console.error('Error fetching chapters:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapters();
  }, [classId]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Chapters
          </CardTitle>
          {isTeacher && onCreateChapter && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateChapter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chapters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No chapters yet</p>
            {isTeacher && (
              <p className="text-xs">Create your first chapter to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {chapters.map((chapter) => (
              <Button
                key={chapter.id}
                variant={selectedChapterId === chapter.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-auto p-3",
                  selectedChapterId === chapter.id && "bg-secondary"
                )}
                onClick={() => onChapterSelect(chapter.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <ChevronRight className={cn(
                    "h-4 w-4 mt-0.5 flex-shrink-0",
                    selectedChapterId === chapter.id && "rotate-90"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {chapter.title}
                    </div>
                    {chapter.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {chapter.description}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
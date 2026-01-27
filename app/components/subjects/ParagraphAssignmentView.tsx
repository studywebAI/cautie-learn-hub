'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/app-context';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  title: string;
  assignment_index: number;
  letter_index: string;
  answers_enabled: boolean;
  completion_percent: number;
  is_completed: boolean;
}

interface Paragraph {
  id: string;
  title: string;
  chapter_id: string;
}

interface Chapter {
  id: string;
  title: string;
  subject_id: string;
}

interface ParagraphAssignmentViewProps {
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  onAssignmentSelect?: (assignmentId: string) => void;
  onNavigateToParagraph?: (paragraphId: string) => void;
  className?: string;
}

export function ParagraphAssignmentView({
  subjectId,
  chapterId,
  paragraphId,
  onAssignmentSelect,
  onNavigateToParagraph,
  className = ''
}: ParagraphAssignmentViewProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [paragraph, setParagraph] = useState<Paragraph | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjacentParagraphs, setAdjacentParagraphs] = useState<{prev?: Paragraph, next?: Paragraph}>({});

  const { toast } = useToast();
  const { user } = useContext(AppContext) as any;

  useEffect(() => {
    const fetchParagraphData = async () => {
      if (!subjectId || !chapterId || !paragraphId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch paragraph details
        const paragraphResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`);
        if (!paragraphResponse.ok) {
          throw new Error('Failed to fetch paragraph details');
        }
        const paragraphData = await paragraphResponse.json();
        setParagraph(paragraphData);

        // Fetch chapter details
        const chapterResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}`);
        if (chapterResponse.ok) {
          const chapterData = await chapterResponse.json();
          setChapter(chapterData);
        }

        // Fetch assignments for this paragraph
        const assignmentsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`);
        if (!assignmentsResponse.ok) {
          throw new Error('Failed to fetch assignments');
        }
        const assignmentsData = await assignmentsResponse.json();

        // Fetch progress for each assignment if user is student
        const assignmentsWithProgress = await Promise.all(
          assignmentsData.map(async (assignment: any) => {
            try {
              // Fetch progress for this assignment
              const progressResponse = await fetch(
                `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignment.id}/progress`
              );

              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                return {
                  ...assignment,
                  completion_percent: progressData.completion_percent || 0,
                  is_completed: progressData.is_completed || false
                };
              }
            } catch (error) {
              console.error(`Failed to fetch progress for assignment ${assignment.id}:`, error);
            }

            // Fallback: return assignment with no progress
            return {
              ...assignment,
              completion_percent: 0,
              is_completed: false
            };
          })
        );

        setAssignments(assignmentsWithProgress);

        // Fetch adjacent paragraphs for navigation
        const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (paragraphsResponse.ok) {
          const paragraphsData = await paragraphsResponse.json();
          const currentIndex = paragraphsData.findIndex((p: any) => p.id === paragraphId);

          setAdjacentParagraphs({
            prev: currentIndex > 0 ? paragraphsData[currentIndex - 1] : undefined,
            next: currentIndex < paragraphsData.length - 1 ? paragraphsData[currentIndex + 1] : undefined
          });
        }

      } catch (err) {
        console.error('Error fetching paragraph data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchParagraphData();
  }, [subjectId, chapterId, paragraphId, user]);

  const handleAssignmentClick = (assignmentId: string) => {
    if (onAssignmentSelect) {
      onAssignmentSelect(assignmentId);
    }
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    const targetParagraph = direction === 'prev' ? adjacentParagraphs.prev : adjacentParagraphs.next;
    if (targetParagraph && onNavigateToParagraph) {
      onNavigateToParagraph(targetParagraph.id);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('prev')}
            disabled={!adjacentParagraphs.prev}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-center">
            <h2 className="text-base">
              {chapter?.title} - {paragraph?.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigation('next')}
            disabled={!adjacentParagraphs.next}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Assignments list */}
      <div className="space-y-2">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="mb-2">No assignments yet</h3>
                <p className="text-sm text-muted-foreground">
                  This paragraph doesn't have any assignments.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="cursor-pointer hover:bg-muted p-3 rounded flex items-center justify-between"
              onClick={() => handleAssignmentClick(assignment.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {assignment.letter_index} {assignment.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${assignment.completion_percent}%` }}
                  />
                </div>
                <span className="text-sm">{assignment.completion_percent}%</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => handleNavigation('prev')}
          disabled={!adjacentParagraphs.prev}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {adjacentParagraphs.prev ? adjacentParagraphs.prev.title : 'Previous Paragraph'}
        </Button>

        <span className="text-sm text-muted-foreground">
          {assignments.filter(a => a.is_completed).length} of {assignments.length} completed
        </span>

        <Button
          variant="outline"
          onClick={() => handleNavigation('next')}
          disabled={!adjacentParagraphs.next}
          className="flex items-center gap-2"
        >
          {adjacentParagraphs.next ? adjacentParagraphs.next.title : 'Next Paragraph'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
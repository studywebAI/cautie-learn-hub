'use client';

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/app-context';
import { StudentBlockRenderer } from '@/components/blocks/StudentBlockRenderer';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface Block {
  id: string;
  type: string;
  position: number;
  data: any;
  created_at?: string;
  updated_at?: string;
}

interface Assignment {
  id: string;
  title: string;
  assignment_index: number;
  letter_index: string;
  answers_enabled: boolean;
  paragraph_id: string;
  instructions?: string;
}

interface StudentAssignmentViewProps {
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  assignmentId: string;
  instructions?: string;
  onNavigateBack?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  className?: string;
}

export function StudentAssignmentView({
  subjectId,
  chapterId,
  paragraphId,
  assignmentId,
  instructions,
  onNavigateBack,
  onNavigateNext,
  onNavigatePrev,
  className = ''
}: StudentAssignmentViewProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionPercent, setCompletionPercent] = useState(0);

  const { user } = useContext(AppContext) as any;

  // Auto-save queue
  const pendingSaves = useRef<Record<string, any>>({});
  const saveTimer = useRef<NodeJS.Timeout>();

  const flushSaves = useCallback(async () => {
    const toSave = { ...pendingSaves.current };
    pendingSaves.current = {};

    const entries = Object.entries(toSave);
    if (entries.length === 0) return;

    await Promise.allSettled(
      entries.map(async ([blockId, answerData]) => {
        try {
          await fetch(
            `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${blockId}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ answer_data: answerData })
            }
          );
        } catch (err) {
          // Re-queue failed saves
          pendingSaves.current[blockId] = answerData;
          console.error('Auto-save failed for block', blockId, err);
        }
      })
    );
  }, [subjectId, chapterId, paragraphId, assignmentId]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Fire-and-forget final flush
      const toSave = { ...pendingSaves.current };
      if (Object.keys(toSave).length > 0) {
        const entries = Object.entries(toSave);
        entries.forEach(async ([blockId, answerData]) => {
          try {
            await fetch(
              `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${blockId}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer_data: answerData })
              }
            );
          } catch {}
        });
      }
    };
  }, [subjectId, chapterId, paragraphId, assignmentId]);

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (!assignmentId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch assignment details
        const assignmentResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}`);
        if (!assignmentResponse.ok) {
          throw new Error('Failed to fetch assignment');
        }
        const assignmentData = await assignmentResponse.json();
        setAssignment(assignmentData);

        // Fetch blocks for this assignment
        const blocksResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`);
        if (!blocksResponse.ok) {
          throw new Error('Failed to fetch assignment blocks');
        }
        const blocksData = await blocksResponse.json();
        const sortedBlocks = blocksData.sort((a: Block, b: Block) => a.position - b.position);
        setBlocks(sortedBlocks);

        // Fetch existing student answers
        if (user) {
          const answersResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/answers`);
          if (answersResponse.ok) {
            const answersData = await answersResponse.json();
            const answersMap: Record<string, any> = {};
            answersData.forEach((answer: any) => {
              answersMap[answer.block_id] = {
                answer_data: answer.answer_data,
                gradingResult: answer.score !== null ? {
                  score: answer.score,
                  feedback: answer.feedback,
                  graded_by_ai: answer.graded_by_ai,
                  graded_at: answer.graded_at
                } : undefined,
                isSubmitted: true
              };
            });
            setStudentAnswers(answersMap);

            // Calculate completion percentage
            const answeredBlocks = Object.keys(answersMap).length;
            const totalBlocks = sortedBlocks.length;
            setCompletionPercent(totalBlocks > 0 ? Math.round((answeredBlocks / totalBlocks) * 100) : 0);
          }
        }

      } catch (err) {
        console.error('Error fetching assignment data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignmentData();
  }, [subjectId, chapterId, paragraphId, assignmentId, user]);

  const handleAnswerChange = (blockId: string, answer: any) => {
    const newAnswers = {
      ...studentAnswers,
      [blockId]: answer
    };
    setStudentAnswers(newAnswers);

    // Queue for auto-save
    pendingSaves.current[blockId] = answer;

    // Debounce the save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSaves(), 2000);

    // Update completion percentage
    const answeredBlocks = Object.keys(newAnswers).length;
    const totalBlocks = blocks.length;
    setCompletionPercent(totalBlocks > 0 ? Math.round((answeredBlocks / totalBlocks) * 100) : 0);
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
            <Skeleton key={i} className="h-32 w-full" />
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
      {/* Professor's Instructions Banner */}
      {instructions && (
        <div className="mb-6 p-4 rounded-lg bg-muted border-l-4 border-primary">
          <p className="text-sm text-muted-foreground mb-1">Instructions from your teacher:</p>
          <p className="text-base">{instructions}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateBack}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div>
            <h2 className="text-base">
              {assignment?.letter_index}. {assignment?.title}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Progress value={completionPercent} className="w-24 h-2" />
                <span className="text-sm text-muted-foreground">{completionPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {onNavigatePrev && (
            <Button variant="outline" size="sm" onClick={onNavigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {onNavigateNext && (
            <Button variant="outline" size="sm" onClick={onNavigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Assignment Content */}
      <div className="space-y-6">
        {blocks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="mb-2">No content yet</h3>
                <p className="text-sm text-muted-foreground">
                  This assignment doesn't have any content blocks.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          blocks.map((block, index) => (
            <Card key={block.id} className="relative">
              <CardContent className="pt-6">
                {/* Block number */}
                <div className="absolute -left-4 top-6 text-muted-foreground font-medium text-sm">
                  {index + 1}.
                </div>

                {/* Block content */}
                <StudentBlockRenderer
                  block={block as any}
                  onSubmit={(answerData: any) => handleAnswerChange(block.id, answerData)}
                  gradingResult={studentAnswers[block.id]?.gradingResult}
                  isSubmitted={!!studentAnswers[block.id]}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onNavigateBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Assignments
        </Button>

        <span className="text-sm text-muted-foreground">
          {Object.keys(studentAnswers).length} of {blocks.length} answered
        </span>
      </div>
    </div>
  );
}

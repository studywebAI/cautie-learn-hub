'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AppContext } from '@/contexts/app-context';
import { StudentBlockRenderer } from '@/components/blocks/StudentBlockRenderer';
import { BaseBlock } from '@/components/blocks/types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Save,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutosave } from '@/hooks/use-autosave';

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
  instructions?: string; // Professor's instructions from agenda
}

interface StudentAssignmentViewProps {
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  assignmentId: string;
  instructions?: string; // Professor's instructions passed from agenda link
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(0);

  const { toast } = useToast();
  const { user } = useContext(AppContext) as any;
  const { autosave } = useAutosave();

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

    // Auto-save answers
    autosave({ assignmentAnswers: newAnswers });

    // Update completion percentage
    const answeredBlocks = Object.keys(newAnswers).length;
    const totalBlocks = blocks.length;
    setCompletionPercent(totalBlocks > 0 ? Math.round((answeredBlocks / totalBlocks) * 100) : 0);
  };

  const handleSubmit = async () => {
    if (!user || !assignment) return;

    setIsSubmitting(true);
    try {
      // Submit all answers
      const submitPromises = blocks.map(async (block) => {
        const answer = studentAnswers[block.id];
        if (answer !== undefined) {
          const response = await fetch(
            `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${block.id}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ answer_data: answer })
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to submit answer for block ${block.id}`);
          }
        }
      });

      await Promise.all(submitPromises);

      toast({
        title: 'Assignment Submitted',
        description: 'Your answers have been saved successfully.',
      });

      // Refresh progress
      const progressResponse = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/progress`
      );
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setCompletionPercent(progressData.completion_percent);
      }

    } catch (err) {
      console.error('Error submitting assignment:', err);
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Failed to submit assignment.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
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
            Back to Paragraph
          </Button>

          <div>
            <h2 className="text-base">
              {assignment?.letter_index}. {assignment?.title}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <Progress value={completionPercent} className="w-24 h-2" />
                <span className="text-sm font-medium">{completionPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {onNavigatePrev && (
            <Button variant="outline" size="sm" onClick={onNavigatePrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(studentAnswers).length === 0}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </Button>

          {onNavigateNext && (
            <Button variant="outline" size="sm" onClick={onNavigateNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
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
                <div className="absolute -left-4 top-6 text-gray-400 font-medium">
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

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {Object.keys(studentAnswers).length} of {blocks.length} questions answered
          </span>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(studentAnswers).length === 0}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </Button>
        </div>
      </div>
    </div>
  );
}
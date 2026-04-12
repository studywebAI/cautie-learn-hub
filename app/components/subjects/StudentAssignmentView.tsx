'use client';

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppContext } from '@/contexts/app-context';
import { StudentBlockRenderer } from '@/components/blocks/StudentBlockRenderer';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  BookOpen,
  Timer,
} from 'lucide-react';
import { AssignmentSettings, getAssignmentAvailabilityState, normalizeAssignmentSettings } from '@/lib/assignments/settings';

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
  description?: string;
  linked_content?: Array<{
    type: 'material' | 'subject' | 'assignment';
    url: string;
    title: string;
    path?: string;
  }>;
  settings?: AssignmentSettings | null;
}

interface SubmitResult {
  ok: boolean;
  error?: string;
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
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [providedAccessCode, setProvidedAccessCode] = useState('');
  const [accessUnlocked, setAccessUnlocked] = useState(false);
  const assignmentOpenedAtRef = useRef<number>(Date.now());

  const { user } = useContext(AppContext) as any;
  const settings = normalizeAssignmentSettings(assignment?.settings || {});

  const sendAssignmentEvent = useCallback(async (eventType: string, eventPayload: Record<string, any> = {}) => {
    try {
      await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: eventType,
            event_payload: eventPayload,
          }),
        }
      );
    } catch {
      // Silent on purpose.
    }
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
        const normalizedSettings = normalizeAssignmentSettings(assignmentData?.settings || {});
        const availability = getAssignmentAvailabilityState(normalizedSettings);
        if (!availability.available) {
          throw new Error(availability.reason === 'not_started' ? 'Assignment is not available yet' : 'Assignment deadline has passed');
        }
        assignmentOpenedAtRef.current = Date.now();
        void sendAssignmentEvent('assignment_open', {
          assignment_id: assignmentId,
          opened_at: new Date().toISOString(),
        });
        void fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: 'assignment',
            paragraph_id: paragraphId,
            subject_id: subjectId,
            time_spent_seconds: 1,
            metadata: {
              event: 'assignment_opened',
              assignment_id: assignmentId,
              assignment_title: assignmentData?.title || null,
              class_id: assignmentData?.class_id || null,
              chapter_id: chapterId,
              paragraph_id: paragraphId,
              subject_id: subjectId,
            },
          }),
        }).catch(() => {});

        // Fetch blocks for this assignment
        const blocksResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`);
        let blocksData: Block[] = [];
        if (blocksResponse.ok) {
          blocksData = await blocksResponse.json();
        } else {
          console.warn('Blocks fetch returned non-OK status, using empty array');
        }
        const sortedBlocks = (Array.isArray(blocksData) ? blocksData : []).sort((a: Block, b: Block) => a.position - b.position);
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
  }, [subjectId, chapterId, paragraphId, assignmentId, user, sendAssignmentEvent]);

  useEffect(() => {
    if (!assignment) return;
    const s = normalizeAssignmentSettings(assignment.settings || {});
    if (!s.time.showTimer) {
      setTimeLeftSeconds(null);
      return;
    }
    const getTimeLeft = () => {
      if (s.time.endAt) {
        return Math.max(0, Math.floor((new Date(s.time.endAt).getTime() - Date.now()) / 1000));
      }
      if (s.time.durationMinutes) {
        return Math.max(0, Math.floor(s.time.durationMinutes * 60 - (Date.now() - assignmentOpenedAtRef.current) / 1000));
      }
      return null;
    };
    setTimeLeftSeconds(getTimeLeft());
    const timer = setInterval(() => {
      setTimeLeftSeconds(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [assignment]);

  useEffect(() => {
    if (!assignment) return;
    if (timeLeftSeconds === null || timeLeftSeconds > 0) return;
    if (hasAutoSubmitted) return;
    if (!settings.time.autoSubmitOnTimeout) return;

    const runAutoSubmit = async () => {
      setHasAutoSubmitted(true);
      const answersPayload = Object.entries(studentAnswers).map(([blockId, value]) => ({
        block_id: blockId,
        answer_data: (value as any)?.answer_data ?? value,
      }));
      try {
        await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: answersPayload,
              access_code: providedAccessCode || undefined,
            }),
          }
        );
      } catch (err) {
        console.error('Auto submit failed', err);
      }
    };

    void runAutoSubmit();
  }, [
    assignment,
    timeLeftSeconds,
    hasAutoSubmitted,
    settings.time.autoSubmitOnTimeout,
    studentAnswers,
    subjectId,
    chapterId,
    paragraphId,
    assignmentId,
    providedAccessCode,
  ]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && settings.antiCheat.detectTabSwitch) {
        void sendAssignmentEvent('tab_switch', {
          at: new Date().toISOString(),
          hidden: true,
        });
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && settings.antiCheat.requireFullscreen) {
        void sendAssignmentEvent('fullscreen_exit', {
          at: new Date().toISOString(),
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [settings.antiCheat.detectTabSwitch, settings.antiCheat.requireFullscreen, sendAssignmentEvent]);

  useEffect(() => {
    if (!settings.antiCheat.requireFullscreen) return;
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen().catch(() => undefined);
  }, [settings.antiCheat.requireFullscreen]);

  const handleAnswerChange = async (blockId: string, answer: any): Promise<SubmitResult> => {
    const previousAnswers = { ...studentAnswers };
    const newAnswers = {
      ...studentAnswers,
      [blockId]: answer
    };
    setStudentAnswers(newAnswers);

    // Track assignment interaction for analytics and warning signals.
    void fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_type: 'assignment',
        paragraph_id: paragraphId,
        subject_id: subjectId,
        time_spent_seconds: Math.max(1, Math.round((Date.now() - assignmentOpenedAtRef.current) / 1000)),
        metadata: {
          event: 'assignment_block_submit',
          block_id: blockId,
          assignment_id: assignmentId,
          assignment_title: assignment?.title || null,
          class_id: (assignment as any)?.class_id || null,
          chapter_id: chapterId,
          paragraph_id: paragraphId,
          subject_id: subjectId,
          paste_count: Number(answer?.paste_count || 0),
          paste_chars: Number(answer?.paste_chars || 0),
          typed_chars: Number(answer?.typed_chars || 0),
        },
      }),
    }).catch(() => {});

    // Update completion percentage
    const answeredBlocks = Object.keys(newAnswers).length;
    const totalBlocks = blocks.length;
    setCompletionPercent(totalBlocks > 0 ? Math.round((answeredBlocks / totalBlocks) * 100) : 0);

    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${blockId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer_data: {
              ...answer,
              fullscreen_active: !!document.fullscreenElement,
            },
            access_code: providedAccessCode || undefined,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStudentAnswers(previousAnswers);
        const restoredAnswered = Object.keys(previousAnswers).length;
        setCompletionPercent(blocks.length > 0 ? Math.round((restoredAnswered / blocks.length) * 100) : 0);
        return {
          ok: false,
          error: payload?.error || 'Failed to submit answer',
        };
      }

      setStudentAnswers((prev) => ({
        ...prev,
        [blockId]: {
          answer_data: {
            ...answer,
            fullscreen_active: !!document.fullscreenElement,
          },
          gradingResult: payload?.feedback_visible && payload?.answer?.score !== null ? {
            score: payload.answer.score,
            feedback: payload.answer.feedback,
            graded_by_ai: !!payload.answer.graded_by_ai,
            graded_at: payload.answer.graded_at,
          } : undefined,
          isSubmitted: true,
        },
      }));

      if (payload?.adaptive_next_block_id) {
        const nextEl = document.getElementById(`assignment-block-${payload.adaptive_next_block_id}`);
        if (nextEl) {
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      return { ok: true };
    } catch (err) {
      console.error('Answer submit failed:', err);
      setStudentAnswers(previousAnswers);
      const restoredAnswered = Object.keys(previousAnswers).length;
      setCompletionPercent(blocks.length > 0 ? Math.round((restoredAnswered / blocks.length) * 100) : 0);
      return { ok: false, error: 'Network error while submitting answer' };
    }
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;
    const response = await fetch(
      `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'reflection_submitted',
          event_payload: {
            text: reflectionText.trim(),
            submitted_at: new Date().toISOString(),
          },
        }),
      }
    );
    if (response.ok) {
      setReflectionSaved(true);
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

  const requiresAccessCode = !!settings.access.accessCode;
  if (requiresAccessCode && !accessUnlocked) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-base">access code required</h3>
          <Input
            value={providedAccessCode}
            onChange={(e) => setProvidedAccessCode(e.target.value)}
            type="password"
            className="h-10"
          />
          <Button
            onClick={() => setAccessUnlocked(true)}
            disabled={!providedAccessCode.trim()}
          >
            unlock assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Deadline Context Banner - shows when coming from a deadline link */}
      {(assignment?.description || instructions || settings.delivery.instructionText) && (
        <div className="mb-6 p-4 rounded-lg bg-muted border-l-4 border-primary">
          <p className="text-sm text-muted-foreground mb-1">assignment instructions:</p>
          <p className="text-base">{settings.delivery.instructionText || assignment?.description || instructions}</p>
        </div>
      )}

      {/* Linked Content - quick access to related materials */}
      {assignment?.linked_content && Array.isArray(assignment.linked_content) && assignment.linked_content.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium mb-3">quick links:</p>
          <div className="space-y-2">
            {assignment.linked_content.map((link: any, idx: number) => (
              <a
                key={idx}
                href={link.url}
                className="flex items-center gap-2 p-2 rounded-md bg-background border hover:bg-muted transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.type === 'material' ? (
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{link.title}</span>
                <Badge variant="outline" className="text-xs">
                  {link.type}
                </Badge>
              </a>
            ))}
          </div>
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
            back
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
              {timeLeftSeconds !== null && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {Math.floor(timeLeftSeconds / 60)}:{String(timeLeftSeconds % 60).padStart(2, '0')}
                </div>
              )}
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
                <h3 className="mb-2">no content yet</h3>
                <p className="text-sm text-muted-foreground">
                  this assignment has no content blocks.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          blocks.map((block, index) => (
            <Card id={`assignment-block-${block.id}`} key={block.id} className="relative">
              <CardContent className="pt-6">
                {/* Block number. */}
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
          back to assignments
        </Button>

        <span className="text-sm text-muted-foreground">
          {Object.keys(studentAnswers).length} of {blocks.length} answered
        </span>
      </div>

      {settings.advanced.reflectionEnabled && (
        <div className="mt-6 rounded-lg border p-4 space-y-3">
          <div className="text-sm font-medium">Reflection</div>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm"
            disabled={reflectionSaved}
          />
          {!reflectionSaved ? (
            <Button onClick={handleSaveReflection} disabled={!reflectionText.trim()}>
              Save reflection
            </Button>
          ) : (
            <div className="text-sm text-green-600">Reflection saved.</div>
          )}
        </div>
      )}
    </div>
  );
}

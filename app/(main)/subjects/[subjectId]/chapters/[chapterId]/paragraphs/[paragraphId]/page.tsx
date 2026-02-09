'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionTracking } from '@/lib/hooks/useSessionTracking';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';
import { Settings, Check, X, Eye, EyeOff, Lock } from 'lucide-react';
import { AssignmentSettingsOverlay } from '@/components/AssignmentSettingsOverlay';

type Assignment = {
  id: string;
  title: string;
  letter_index: string;
  assignment_index: number;
  block_count: number;
  answers_enabled: boolean;
  is_visible: boolean;
  is_locked: boolean;
  answer_mode: 'view_only' | 'editable' | 'self_grade';
  ai_grading_enabled: boolean;
  progress_percent?: number;
  correct_percent?: number;
};

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
};

// Convert index to letter (0=a, 1=b, 26=aa, etc.)
function indexToLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(97 + index);
  }
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

export default function ParagraphDetailPage() {
  const params = useParams();
  const { subjectId, chapterId, paragraphId } = params as {
    subjectId: string;
    chapterId: string;
    paragraphId: string;
  };
  
  const [paragraph, setParagraph] = useState<Paragraph | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allParagraphs, setAllParagraphs] = useState<Paragraph[]>([]);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const [bulkSettingsOpen, setBulkSettingsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';

  // Auto-track study session for students
  useSessionTracking(paragraphId, !isTeacher);

  // Get adjacent paragraphs
  const currentIndex = allParagraphs.findIndex(p => p.id === paragraphId);
  const prevParagraph = currentIndex > 0 ? allParagraphs[currentIndex - 1] : null;
  const nextParagraph = currentIndex < allParagraphs.length - 1 ? allParagraphs[currentIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (paragraphsResponse.ok) {
          const paragraphs = await paragraphsResponse.json();
          setAllParagraphs(paragraphs);
          const currentParagraph = paragraphs.find((p: Paragraph) => p.id === paragraphId);
          if (currentParagraph) setParagraph(currentParagraph);
        }

        const assignmentsResponse = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`
        );
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          const normalizedAssignments = (assignmentsData || []).map((a: any) => ({
            ...a,
            is_visible: a.is_visible ?? true,
            is_locked: a.is_locked ?? false,
            answer_mode: a.answer_mode ?? 'view_only',
            ai_grading_enabled: a.ai_grading_enabled ?? false,
          }));
          setAssignments(normalizedAssignments);
        }
      } catch (error) {
        console.error('Error fetching paragraph data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId]);

  const handleUpdateAssignment = async (assignmentId: string, updates: Partial<Assignment>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setAssignments(prev => prev.map(a => 
          a.id === assignmentId ? { ...a, ...updates } : a
        ));
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpdate = async (updates: Partial<Assignment>) => {
    setIsUpdating(true);
    try {
      await Promise.all(
        assignments.map(a =>
          fetch(`/api/assignments/${a.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
        )
      );
      setAssignments(prev => prev.map(a => ({ ...a, ...updates })));
      toast({ title: 'All assignments updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignmentTitle.trim()) return;

    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newAssignmentTitle.trim(), answers_enabled: false }),
        }
      );

      if (response.ok) {
        const newAssignment = await response.json();
        setAssignments(prev => [...prev, {
          ...newAssignment,
          is_visible: true,
          is_locked: false,
          answer_mode: 'view_only' as const,
          ai_grading_enabled: false,
        }]);
        setNewAssignmentTitle('');
        setIsCreateAssignmentOpen(false);
        toast({ title: 'Assignment created' });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast({ title: 'Error', description: errorData.error || 'Failed to create assignment', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create assignment', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!paragraph) {
    return <div className="text-center py-8 text-muted-foreground">Paragraph not found</div>;
  }

  // Compute bulk defaults from first assignment or defaults
  const bulkDefaults = assignments.length > 0
    ? {
        is_visible: assignments.every(a => a.is_visible),
        answers_enabled: assignments.every(a => a.answers_enabled),
        is_locked: assignments.every(a => a.is_locked),
        answer_mode: assignments[0].answer_mode,
        ai_grading_enabled: assignments.every(a => a.ai_grading_enabled),
      }
    : {
        is_visible: true,
        answers_enabled: false,
        is_locked: false,
        answer_mode: 'view_only' as const,
        ai_grading_enabled: false,
      };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link
            href={`/subjects/${subjectId}`}
            className="text-xs text-muted-foreground hover:text-foreground mb-1 block"
          >
            ← Back to chapters
          </Link>
          <h1 className="text-lg">
            {paragraph.paragraph_number}. {paragraph.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk settings for all assignments */}
          {isTeacher && assignments.length > 0 && (
            <Popover open={bulkSettingsOpen} onOpenChange={setBulkSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="text-xs">All Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0 w-auto">
                <AssignmentSettingsOverlay
                  isBulk
                  isVisible={bulkDefaults.is_visible}
                  answersEnabled={bulkDefaults.answers_enabled}
                  isLocked={bulkDefaults.is_locked}
                  answerMode={bulkDefaults.answer_mode}
                  aiGradingEnabled={bulkDefaults.ai_grading_enabled}
                  onVisibilityChange={(v) => handleBulkUpdate({ is_visible: v })}
                  onAnswersEnabledChange={(v) => handleBulkUpdate({ answers_enabled: v })}
                  onLockedChange={(v) => handleBulkUpdate({ is_locked: v })}
                  onAnswerModeChange={(m) => handleBulkUpdate({ answer_mode: m })}
                  onAiGradingChange={(v) => handleBulkUpdate({ ai_grading_enabled: v })}
                  isLoading={isUpdating}
                />
              </PopoverContent>
            </Popover>
          )}
          {isTeacher && (
            <Button onClick={() => setIsCreateAssignmentOpen(true)} size="sm" className="h-8">
              + Add Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm mb-4">No assignments yet</p>
          {isTeacher && (
            <Button onClick={() => setIsCreateAssignmentOpen(true)} size="sm">
              Create First Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="border-2 border-foreground border-l-0 rounded-br-xl overflow-hidden">
          {assignments.map((assignment, index) => {
            // For students, hide invisible assignments
            if (!isTeacher && !assignment.is_visible) return null;

            const letter = assignment.letter_index || indexToLetter(assignment.assignment_index || index);
            const progress = assignment.progress_percent || 0;
            const roundedProgress = Math.ceil(progress);
            const correctPct = assignment.correct_percent ?? 0;
            const incorrectPct = roundedProgress > 0 ? roundedProgress - correctPct : 0;

            return (
              <div
                key={assignment.id}
                className={`flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                  !assignment.is_visible ? 'opacity-50' : ''
                }`}
              >
                {/* Letter badge */}
                <span className="bg-foreground text-background px-2.5 py-1 rounded-full text-xs font-medium shrink-0 min-w-[2rem] text-center">
                  {letter}
                </span>

                {/* Title */}
                <Link
                  href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignment.id}`}
                  className="text-sm flex-1 hover:underline truncate"
                >
                  {assignment.title}
                </Link>

                {/* Status indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Lock indicator */}
                  {assignment.is_locked && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  )}

                  {/* Visibility indicator */}
                  {isTeacher && !assignment.is_visible && (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}

                  {/* Answers check/X */}
                  <span className="shrink-0">
                    {assignment.answers_enabled ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </span>

                  {/* Progress bar with green/red coloring */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {roundedProgress}%
                    </span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex">
                  {correctPct > 0 && (
                        <div
                          className="h-full bg-success/70 transition-all"
                          style={{ width: `${(correctPct / 100) * 100}%` }}
                        />
                      )}
                      {incorrectPct > 0 && (
                        <div
                          className="h-full bg-destructive/50 transition-all"
                          style={{ width: `${(incorrectPct / 100) * 100}%` }}
                        />
                      )}
                      {roundedProgress === 0 && (
                        <div className="h-full" style={{ width: '0%' }} />
                      )}
                    </div>
                  </div>

                  {/* Per-assignment settings (teachers only) */}
                  {isTeacher && (
                    <Popover
                      open={settingsOpen === assignment.id}
                      onOpenChange={(open) => setSettingsOpen(open ? assignment.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="p-0 w-auto">
                        <AssignmentSettingsOverlay
                          isVisible={assignment.is_visible}
                          answersEnabled={assignment.answers_enabled}
                          isLocked={assignment.is_locked}
                          answerMode={assignment.answer_mode}
                          aiGradingEnabled={assignment.ai_grading_enabled}
                          onVisibilityChange={(v) => handleUpdateAssignment(assignment.id, { is_visible: v })}
                          onAnswersEnabledChange={(v) => handleUpdateAssignment(assignment.id, { answers_enabled: v })}
                          onLockedChange={(v) => handleUpdateAssignment(assignment.id, { is_locked: v })}
                          onAnswerModeChange={(m) => handleUpdateAssignment(assignment.id, { answer_mode: m })}
                          onAiGradingChange={(v) => handleUpdateAssignment(assignment.id, { ai_grading_enabled: v })}
                          isLoading={isUpdating}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation to adjacent paragraphs */}
      <div className="flex justify-between items-center pt-4">
        {prevParagraph ? (
          <Link
            href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${prevParagraph.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {prevParagraph.paragraph_number}. {prevParagraph.title}
          </Link>
        ) : (
          <div />
        )}
        {nextParagraph && (
          <Link
            href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${nextParagraph.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {nextParagraph.paragraph_number}. {nextParagraph.title} →
          </Link>
        )}
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>Create a new assignment for this paragraph.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              placeholder="e.g., Exercise Set A"
              value={newAssignmentTitle}
              onChange={(e) => setNewAssignmentTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAssignmentOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAssignment} disabled={!newAssignmentTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

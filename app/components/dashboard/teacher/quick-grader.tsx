'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  student_name?: string;
  assignment_title?: string;
};

type OpenAnswer = {
  id: string;
  assignment_id: string | null;
  assignment_title: string;
  block_id: string;
  question: string;
  max_points: number;
  rubric: Array<{ id: string; label: string; points: number }>;
  student_id: string;
  student_name: string;
  student_email: string | null;
  answer_data: any;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
};

type OpenAnswersResponse = {
  rows: OpenAnswer[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  options?: {
    assignments?: Array<{ id: string; title: string }>;
    students?: Array<{ id: string; name: string }>;
  };
};

type QuickGraderProps = {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function QuickGrader({ classId, isOpen, onClose }: QuickGraderProps) {
  const [mode, setMode] = useState<'submissions' | 'open_answers'>('open_answers');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [openAnswers, setOpenAnswers] = useState<OpenAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedOpenAnswer, setSelectedOpenAnswer] = useState<OpenAnswer | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [selectedOpenAnswerIds, setSelectedOpenAnswerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignmentId, setFilterAssignmentId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [openAnswersPage, setOpenAnswersPage] = useState(1);
  const [openAnswersHasNext, setOpenAnswersHasNext] = useState(false);
  const [openAnswersTotal, setOpenAnswersTotal] = useState(0);
  const [assignmentOptions, setAssignmentOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [studentOptions, setStudentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPendingSubmissions();
    }
  }, [isOpen, classId]);

  useEffect(() => {
    if (!isOpen || mode !== 'open_answers') return;
    fetchOpenAnswers();
  }, [isOpen, classId, mode, searchQuery, filterAssignmentId, filterStudentId, openAnswersPage]);

  const fetchOpenAnswers = async () => {
    const params = new URLSearchParams();
    params.set('status', 'pending');
    params.set('page', String(openAnswersPage));
    params.set('limit', '50');
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (filterAssignmentId) params.set('assignmentId', filterAssignmentId);
    if (filterStudentId) params.set('studentId', filterStudentId);

    const openAnswersResponse = await fetch(`/api/classes/${classId}/assignments/open-answers?${params.toString()}`);
    if (!openAnswersResponse.ok) return;
    const payload = await openAnswersResponse.json();

    if (Array.isArray(payload)) {
      setOpenAnswers(payload);
      setOpenAnswersHasNext(false);
      setOpenAnswersTotal(payload.length);
      return;
    }

    const parsed = payload as OpenAnswersResponse;
    setOpenAnswers(parsed.rows || []);
    setOpenAnswersHasNext(!!parsed.pagination?.hasNext);
    setOpenAnswersTotal(parsed.pagination?.total || 0);
    setAssignmentOptions(parsed.options?.assignments || []);
    setStudentOptions(parsed.options?.students || []);
  };

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch pending submissions for this class
      const response = await fetch(`/api/classes/${classId}/submissions/pending`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
      await fetchOpenAnswers();
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (mode === 'submissions') {
      if (!selectedSubmission || !grade) return;
    } else {
      if (!selectedOpenAnswer || !grade) return;
    }
    
    setSaving(true);
    try {
      const parsedScore = parseFloat(grade);
      const response = mode === 'submissions'
        ? await fetch(`/api/submissions/${selectedSubmission!.id}/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: parsedScore,
            feedback: feedback || null
          })
        })
        : await fetch(`/api/classes/${classId}/assignments/open-answers/${selectedOpenAnswer!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: parsedScore,
            feedback: feedback || null,
            rubric_scores: selectedOpenAnswer?.rubric?.map((item) => ({
              id: item.id,
              label: item.label,
              max_points: item.points,
              points_awarded: rubricScores[item.id] ?? 0,
            })) || [],
          })
        });

      if (response.ok) {
        toast({ title: 'Grade saved successfully' });
        if (mode === 'submissions' && selectedSubmission) {
          setSubmissions(prev => prev.map(s => 
            s.id === selectedSubmission.id 
              ? { ...s, status: 'graded', grade: parsedScore, feedback }
              : s
          ));
        } else if (mode === 'open_answers' && selectedOpenAnswer) {
          setOpenAnswers(prev => prev.filter(a => a.id !== selectedOpenAnswer.id));
        }
        setSelectedSubmission(null);
        setSelectedOpenAnswer(null);
        setGrade('');
        setFeedback('');
        setRubricScores({});
      } else {
        const data = await response.json();
        toast({ title: 'Failed to save grade', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save grade:', error);
      toast({ title: 'Failed to save grade', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGrade = async () => {
    const parsedScore = parseFloat(grade);
    if (!Number.isFinite(parsedScore) || selectedOpenAnswerIds.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/assignments/open-answers/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedOpenAnswerIds.map((answerId) => ({
            answer_id: answerId,
            score: parsedScore,
            feedback: feedback || null,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({ title: 'Bulk grading failed', description: data.error, variant: 'destructive' });
        return;
      }

      const data = await response.json();
      const updatedCount = Number(data?.updated_count || 0);
      const failedCount = Number(data?.failed_count || 0);
      toast({
        title: `Bulk grading done`,
        description: `${updatedCount} updated${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });
      setSelectedOpenAnswerIds([]);
      setSelectedOpenAnswer(null);
      setGrade('');
      setFeedback('');
      await fetchOpenAnswers();
    } catch (error) {
      console.error('Failed bulk grading:', error);
      toast({ title: 'Bulk grading failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const pendingOpenCount = openAnswersTotal || openAnswers.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quick Grade</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 h-[60vh]">
          {/* Submission List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">
                {mode === 'submissions' ? `Submissions (${pendingCount} pending)` : `Open Answers (${pendingOpenCount} pending)`}
              </h3>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'open_answers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('open_answers');
                  setSelectedSubmission(null);
                }}
              >
                Open Answers
              </Button>
              <Button
                type="button"
                variant={mode === 'submissions' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('submissions');
                  setSelectedOpenAnswer(null);
                }}
              >
                Submissions
              </Button>
            </div>
            {mode === 'open_answers' && (
              <div className="mb-3 space-y-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setOpenAnswersPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search student, assignment, question..."
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={filterAssignmentId}
                    onChange={(e) => {
                      setOpenAnswersPage(1);
                      setFilterAssignmentId(e.target.value);
                    }}
                  >
                    <option value="">All assignments</option>
                    {assignmentOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={filterStudentId}
                    onChange={(e) => {
                      setOpenAnswersPage(1);
                      setFilterStudentId(e.target.value);
                    }}
                  >
                    <option value="">All students</option>
                    {studentOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : mode === 'submissions' && submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No submissions to grade</p>
              ) : mode === 'open_answers' && openAnswers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No open answers pending review</p>
              ) : (
                <div className="space-y-2">
                  {mode === 'submissions' && submissions.map(submission => (
                    <div
                      key={submission.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                        selectedSubmission?.id === submission.id ? 'bg-accent border-primary' : ''
                      } ${submission.status === 'graded' ? 'opacity-60' : ''}`}
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setGrade(submission.grade?.toString() || '');
                        setFeedback(submission.feedback || '');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{submission.student_name || 'Unknown Student'}</p>
                          <p className="text-xs text-muted-foreground truncate">{submission.assignment_title || 'Assignment'}</p>
                        </div>
                        {submission.status === 'graded' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      {submission.status === 'graded' && submission.grade !== null && (
                        <Badge className="mt-2" variant="secondary">
                          Grade: {submission.grade}%
                        </Badge>
                      )}
                    </div>
                  ))}
                  {mode === 'open_answers' && openAnswers.map(answer => (
                    <div
                      key={answer.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                        selectedOpenAnswer?.id === answer.id ? 'bg-accent border-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedOpenAnswer(answer);
                        setGrade(answer.score?.toString() || '');
                        setFeedback(answer.feedback || '');
                        setRubricScores(
                          Object.fromEntries((answer.rubric || []).map((item) => [item.id, 0]))
                        );
                      }}
                    >
                      <div className="mb-2">
                        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selectedOpenAnswerIds.includes(answer.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedOpenAnswerIds((prev) => {
                                if (e.target.checked) return [...prev, answer.id];
                                return prev.filter((id) => id !== answer.id);
                              });
                            }}
                          />
                          Select for bulk
                        </label>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{answer.student_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{answer.assignment_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{answer.question || 'Open question'}</p>
                        </div>
                        <Clock className="h-4 w-4 text-amber-500" />
                      </div>
                      <Badge className="mt-2" variant="secondary">
                        Max: {answer.max_points} pts
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Grading Panel */}
          <div className="flex-1 pl-4">
            {(mode === 'submissions' ? !!selectedSubmission : !!selectedOpenAnswer) ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">
                    Grading: {mode === 'submissions' ? selectedSubmission?.student_name : selectedOpenAnswer?.student_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'submissions' ? selectedSubmission?.assignment_title : selectedOpenAnswer?.assignment_title}
                  </p>
                </div>

                {mode === 'open_answers' && selectedOpenAnswer && (
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <p className="text-sm font-medium">{selectedOpenAnswer.question || 'Open question'}</p>
                      <p className="text-xs text-muted-foreground">Student answer</p>
                      <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
                        {typeof selectedOpenAnswer.answer_data?.text === 'string'
                          ? selectedOpenAnswer.answer_data.text
                          : JSON.stringify(selectedOpenAnswer.answer_data, null, 2)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mode === 'open_answers' && selectedOpenAnswer && selectedOpenAnswer.rubric.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Rubric</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedOpenAnswer.rubric.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_100px] items-center gap-3">
                          <div>
                            <div className="text-sm font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground">max {item.points} pts</div>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={String(item.points)}
                            value={String(rubricScores[item.id] ?? 0)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const next = Number.isFinite(raw) ? Math.max(0, Math.min(item.points, raw)) : 0;
                              setRubricScores((prev) => ({ ...prev, [item.id]: next }));
                            }}
                          />
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm font-medium">
                          Rubric total: {selectedOpenAnswer.rubric.reduce((sum, item) => sum + Number(rubricScores[item.id] ?? 0), 0)} / {selectedOpenAnswer.rubric.reduce((sum, item) => sum + Number(item.points || 0), 0)}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const total = selectedOpenAnswer.rubric.reduce((sum, item) => sum + Number(rubricScores[item.id] ?? 0), 0);
                            setGrade(String(total));
                          }}
                        >
                          Use total
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {mode === 'submissions' ? 'Grade (%)' : `Score (${selectedOpenAnswer?.max_points || 0} max)`}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={mode === 'submissions' ? '100' : String(selectedOpenAnswer?.max_points || 0)}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder={mode === 'submissions' ? 'Enter grade (0-100)' : 'Enter score'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback (optional)</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter feedback for the student..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleGrade} disabled={saving || !grade}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Grade
                  </Button>
                  {mode === 'open_answers' && (
                    <Button
                      variant="secondary"
                      onClick={handleBulkGrade}
                      disabled={saving || !grade || selectedOpenAnswerIds.length === 0}
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Grade Selected ({selectedOpenAnswerIds.length})
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => {
                    setSelectedSubmission(null);
                    setSelectedOpenAnswer(null);
                    setGrade('');
                    setFeedback('');
                    setRubricScores({});
                  }}>
                    Cancel
                  </Button>
                </div>
                {mode === 'open_answers' && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Page {openAnswersPage} · {pendingOpenCount} total</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={openAnswersPage <= 1 || saving}
                        onClick={() => setOpenAnswersPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!openAnswersHasNext || saving}
                        onClick={() => setOpenAnswersPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a submission to grade
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

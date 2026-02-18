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

type QuickGraderProps = {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function QuickGrader({ classId, isOpen, onClose }: QuickGraderProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPendingSubmissions();
    }
  }, [isOpen, classId]);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch pending submissions for this class
      const response = await fetch(`/api/classes/${classId}/submissions/pending`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission || !grade) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/submissions/${selectedSubmission.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseFloat(grade),
          feedback: feedback || null
        })
      });

      if (response.ok) {
        toast({ title: 'Grade saved successfully' });
        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === selectedSubmission.id 
            ? { ...s, status: 'graded', grade: parseFloat(grade), feedback }
            : s
        ));
        setSelectedSubmission(null);
        setGrade('');
        setFeedback('');
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

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

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
              <h3 className="font-medium">Submissions ({pendingCount} pending)</h3>
            </div>
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No submissions to grade</p>
              ) : (
                <div className="space-y-2">
                  {submissions.map(submission => (
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
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Grading Panel */}
          <div className="flex-1 pl-4">
            {selectedSubmission ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Grading: {selectedSubmission.student_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.assignment_title}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Enter grade (0-100)"
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
                  <Button variant="outline" onClick={() => {
                    setSelectedSubmission(null);
                    setGrade('');
                    setFeedback('');
                  }}>
                    Cancel
                  </Button>
                </div>
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

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Submission = {
  id: string;
  content: any;
  submitted_at: string;
  status: string;
  grade?: number;
  feedback?: string;
  assignments: {
    title: string;
  };
  profiles: {
    full_name: string;
  };
};

type SubmissionComment = {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
};

type SubmissionsViewProps = {
  assignmentId?: string;
};

export function SubmissionsView({ assignmentId }: SubmissionsViewProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [comments, setComments] = useState<Record<string, SubmissionComment[]>>({});
  const [newComment, setNewComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    try {
      const url = assignmentId
        ? `/api/submissions?assignmentId=${assignmentId}`
        : '/api/submissions';

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        // Fetch comments for each submission
        data.forEach((submission: Submission) => {
          fetchCommentsForSubmission(submission.id);
        });
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommentsForSubmission = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [submissionId]: data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      const response = await fetch(`/api/submissions/${selectedSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: grade ? parseFloat(grade) : null,
          feedback: feedback.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grade submission');
      }

      toast({
        title: 'Submission Graded',
        description: `Grade saved for ${selectedSubmission.profiles.full_name}`,
      });

      // Refresh submissions
      await fetchSubmissions();
      setSelectedSubmission(null);
      setGrade('');
      setFeedback('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Grading Failed',
        description: error.message,
      });
    }
  };

  const handleAddComment = async (submissionId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      toast({
        title: 'Comment Added',
        description: 'Your comment has been added to the submission.',
      });

      setNewComment('');
      await fetchCommentsForSubmission(submissionId);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Comment',
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div>Loading submissions...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Student Submissions</h2>
            <p className="text-muted-foreground">
              Review and grade student work
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No submissions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {submission.assignments.title}
                      </CardTitle>
                      <CardDescription>
                        Submitted by {submission.profiles.full_name} on{' '}
                        {format(new Date(submission.submitted_at), 'PPP')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                        {submission.status}
                      </Badge>
                      {submission.grade && (
                        <Badge variant="outline">
                          Grade: {submission.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {submission.content?.text && (
                      <div>
                        <Label className="text-sm font-medium">Submission Content</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          <p className="whitespace-pre-wrap">{submission.content.text}</p>
                        </div>
                      </div>
                    )}

                    {submission.feedback && (
                      <div>
                        <Label className="text-sm font-medium">Feedback</Label>
                        <div className="mt-1 p-3 bg-blue-50 rounded-md">
                          <p className="whitespace-pre-wrap">{submission.feedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Comments Section */}
                    <div>
                      <Label className="text-sm font-medium">Comments</Label>
                      <div className="mt-2 space-y-2">
                        {(comments[submission.id] || []).map((comment) => (
                          <div key={comment.id} className="p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {comment.profiles?.full_name || 'Unknown'} ({comment.profiles?.role})
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                              </span>
                            </div>
                            <p className="mt-1 text-sm whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        ))}
                        {/* Add new comment */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(submission.id);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(submission.id)}
                            disabled={!newComment.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setGrade(submission.grade?.toString() || '');
                          setFeedback(submission.feedback || '');
                        }}
                      >
                        {submission.status === 'graded' ? 'Update Grade' : 'Grade Submission'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Grading Dialog */}
      <Dialog
        open={!!selectedSubmission}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmission(null);
            setGrade('');
            setFeedback('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Grade Submission: {selectedSubmission?.assignments.title}
            </DialogTitle>
            <DialogDescription>
              Provide feedback and a grade for {selectedSubmission?.profiles.full_name}'s work
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">Grade (Optional)</Label>
              <Input
                id="grade"
                type="number"
                step="0.1"
                placeholder="e.g., 8.5"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Provide constructive feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
              Cancel
            </Button>
            <Button onClick={handleGradeSubmission}>
              Save Grade & Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
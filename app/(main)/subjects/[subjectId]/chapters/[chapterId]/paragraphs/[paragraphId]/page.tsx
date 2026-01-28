'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';

type Assignment = {
  id: string;
  title: string;
  letter_index: string;
  assignment_index: number;
  block_count: number;
  answers_enabled: boolean;
  progress_percent?: number;
};

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
};

type AdjacentParagraph = {
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
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';

  // Get adjacent paragraphs
  const currentIndex = allParagraphs.findIndex(p => p.id === paragraphId);
  const prevParagraph = currentIndex > 0 ? allParagraphs[currentIndex - 1] : null;
  const nextParagraph = currentIndex < allParagraphs.length - 1 ? allParagraphs[currentIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all paragraphs in this chapter
        const paragraphsResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (paragraphsResponse.ok) {
          const paragraphs = await paragraphsResponse.json();
          setAllParagraphs(paragraphs);
          const currentParagraph = paragraphs.find((p: Paragraph) => p.id === paragraphId);
          if (currentParagraph) {
            setParagraph(currentParagraph);
          }
        }

        // Fetch assignments
        const assignmentsResponse = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`
        );
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          setAssignments(assignmentsData || []);
        }
      } catch (error) {
        console.error('Error fetching paragraph data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId]);

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
        setAssignments(prev => [...prev, newAssignment]);
        setNewAssignmentTitle('');
        setIsCreateAssignmentOpen(false);
        toast({ title: 'Assignment created' });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
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
        {isTeacher && (
          <Button onClick={() => setIsCreateAssignmentOpen(true)} size="sm">
            + Add Assignment
          </Button>
        )}
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
        <div className="space-y-2">
          {assignments.map((assignment, index) => (
            <Link
              key={assignment.id}
              href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignment.id}`}
              className="flex items-center gap-3 py-3 px-4 rounded border hover:bg-muted transition-colors cursor-pointer"
            >
              {/* Letter index */}
              <span className="text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0 w-8 text-center">
                {assignment.letter_index || indexToLetter(assignment.assignment_index || index)}
              </span>
              
              {/* Title */}
              <span className="text-sm flex-1">{assignment.title}</span>
              
              {/* Progress and answers status */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Progress */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {assignment.progress_percent || 0}%
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${assignment.progress_percent || 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Answers status */}
                <span className="text-xs text-muted-foreground">
                  {assignment.answers_enabled ? 'Answers on' : 'Answers off'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Navigation to adjacent paragraphs */}
      <div className="flex justify-between items-center pt-4 border-t">
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

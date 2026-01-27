'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { useContext } from 'react';
import Link from 'next/link';
import { ParagraphAssignmentView } from '@/components/subjects/ParagraphAssignmentView';

type Assignment = {
  id: string;
  title: string;
  letter_index: string;
  assignment_index: number;
  block_count: number;
  answers_enabled: boolean;
};

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
};

export default function ParagraphDetailPage() {
  const params = useParams();
  const { subjectId, chapterId, paragraphId } = params as {
    subjectId: string;
    chapterId: string;
    paragraphId: string;
  };
  const [paragraph, setParagraph] = useState<Paragraph>({
    id: paragraphId,
    title: `Paragraph ${paragraphId}`,
    paragraph_number: 1
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as any;
  const isTeacher = role === 'teacher';

  const handleAssignmentSelect = (assignmentId: string) => {
    // Navigate to assignment
    window.location.href = `/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}`;
  };

  const handleNavigateToParagraph = (targetParagraphId: string) => {
    // Navigate to adjacent paragraph
    window.location.href = `/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${targetParagraphId}`;
  };

  // Fetch paragraph and assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch paragraph info
        const paragraphResponse = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
        if (paragraphResponse.ok) {
          const paragraphs = await paragraphResponse.json();
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
        } else {
          setAssignments([]);
        }
      } catch (error) {
        console.error('Error fetching paragraph data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load paragraph data.',
          variant: 'destructive'
        });
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId, toast]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/subjects/${subjectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-base">
            {paragraph.paragraph_number}. {paragraph.title}
          </h1>
          <p className="text-muted-foreground">Assignments in this paragraph</p>
        </div>
      </div>

      {/* Assignments Section */}
      <ParagraphAssignmentView
        subjectId={subjectId}
        chapterId={chapterId}
        paragraphId={paragraphId}
        onAssignmentSelect={handleAssignmentSelect}
        onNavigateToParagraph={handleNavigateToParagraph}
      />

      {/* Teacher Tools */}
      {isTeacher && (
        <div className="flex justify-center mt-8">
          <Button onClick={() => setIsCreateAssignmentOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Assignment
          </Button>
        </div>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for this paragraph.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignment-title">Assignment Title</Label>
              <Input id="assignment-title" placeholder="e.g., Basic Concepts Quiz" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              const titleInput = document.getElementById('assignment-title') as HTMLInputElement;

              if (!titleInput?.value?.trim()) {
                toast({
                  title: 'Error',
                  description: 'Assignment title is required.',
                  variant: 'destructive'
                });
                return;
              }

              try {
                const response = await fetch(
                  `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: titleInput.value.trim(),
                      answers_enabled: false
                    })
                  }
                );

                if (response.ok) {
                  const newAssignment = await response.json();
                  setAssignments(prev => [...prev, newAssignment]);
                  toast({
                    title: 'Assignment Created',
                    description: 'The new assignment has been added to the paragraph.',
                  });
                  setIsCreateAssignmentOpen(false);
                  titleInput.value = '';
                } else {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create assignment');
                }
              } catch (error) {
                console.error('Error creating assignment:', error);
                toast({
                  title: 'Error',
                  description: error instanceof Error ? error.message : 'Failed to create assignment. Please try again.',
                  variant: 'destructive'
                });
              }
            }}>
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
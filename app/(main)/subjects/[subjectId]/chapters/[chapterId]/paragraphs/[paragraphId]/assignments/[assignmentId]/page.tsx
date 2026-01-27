'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { useContext } from 'react';
import Link from 'next/link';
import { AssignmentEditor } from '@/components/AssignmentEditor';
import { StudentAssignmentView } from '@/components/subjects/StudentAssignmentView';

type Assignment = {
  id: string;
  title: string;
  assignment_index: number;
  answers_enabled: boolean;
};

type Block = {
  id: string;
  type: string;
  position: number;
  data: any;
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const paragraphId = params.paragraphId as string;
  const assignmentId = params.assignmentId as string;

  // Redirect if assignmentId is missing
  if (!assignmentId || assignmentId === 'undefined') {
    router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`);
    return null;
  }
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as any;
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assignment
        const assignmentResponse = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}`
        );
        if (assignmentResponse.ok) {
          const assignmentData = await assignmentResponse.json();
          setAssignment(assignmentData);
        }

        // Fetch blocks
        const blocksResponse = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`
        );
        if (blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          setBlocks(blocksData.sort((a: Block, b: Block) => a.position - b.position));
        }
      } catch (error) {
        console.error('Error fetching assignment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load assignment.',
          variant: 'destructive'
        });
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId, assignmentId, toast]);

  const handleBlockSubmit = async (blockId: string, answerData: any) => {
    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks/${blockId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answerData })
        }
      );

      if (response.ok) {
        toast({
          title: 'Answer Submitted',
          description: 'Your answer has been saved.',
        });
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit answer.',
        variant: 'destructive'
      });
    }
  };

  if (!assignment) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading assignment...</p>
      </div>
    </div>;
  }

  // Show AssignmentEditor for teachers, student view for students
  if (isTeacher) {
    return (
      <AssignmentEditor
        assignmentId={assignmentId}
        subjectId={subjectId}
        chapterId={chapterId}
        paragraphId={paragraphId}
        initialBlocks={blocks as any}
        onSave={(savedBlocks) => {
          // Refresh blocks after save
          setBlocks(savedBlocks as any);
        }}
        onPreview={() => {
          // Could switch to preview mode
        }}
      />
    );
  }

  // Student view
  return (
    <StudentAssignmentView
      subjectId={subjectId}
      chapterId={chapterId}
      paragraphId={paragraphId}
      assignmentId={assignmentId}
      onNavigateBack={() => router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`)}
      onNavigateNext={() => {
        // TODO: Implement navigation to next assignment
      }}
      onNavigatePrev={() => {
        // TODO: Implement navigation to previous assignment
      }}
    />
  );
}
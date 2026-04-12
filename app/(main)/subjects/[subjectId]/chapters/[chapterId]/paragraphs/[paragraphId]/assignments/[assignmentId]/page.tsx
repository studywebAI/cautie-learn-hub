'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { useContext } from 'react';
import { AssignmentSettings, normalizeAssignmentSettings } from '@/lib/assignments/settings';

const AssignmentEditor = dynamic(
  () => import('@/components/AssignmentEditor').then((m) => m.AssignmentEditor),
  { ssr: false }
);
const StudentAssignmentView = dynamic(
  () => import('@/components/subjects/StudentAssignmentView').then((m) => m.StudentAssignmentView),
  { ssr: false }
);

type Assignment = {
  id: string;
  title: string;
  assignment_index: number;
  answers_enabled: boolean;
  is_visible?: boolean | null;
  answer_mode?: 'view_only' | 'editable' | 'self_grade' | null;
  ai_grading_enabled?: boolean | null;
  settings?: AssignmentSettings | null;
};

type Block = {
  id: string;
  type: string;
  position: number;
  data: any;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(url, { cache: 'no-store' });
    lastResponse = response;
    if (response.ok) return response;
    if (response.status !== 404) break;
    await sleep(120 * (i + 1));
  }
  if (lastResponse) return lastResponse;
  throw new Error('Request failed');
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const paragraphId = params.paragraphId as string;
  const assignmentId = params.assignmentId as string;
  
  // Get instructions from URL query params (passed from agenda)
  const instructions = searchParams.get('instructions') || undefined;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignmentList, setAssignmentList] = useState<Assignment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as any;
  const isTeacher = role === 'teacher';

  useEffect(() => {
    // Redirect if assignmentId is missing
    if (!assignmentId || assignmentId === 'undefined') {
      router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`);
      return;
    }

    const fetchData = async () => {
      try {
        // Retry assignment fetch for a short time so just-created items don't throw client-side errors.
        const assignmentResponse = await fetchWithRetry(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}`
        );
        if (assignmentResponse.ok) {
          const assignmentData = await assignmentResponse.json();
          setAssignment(assignmentData);
          setLoadError(null);
        } else {
          setLoadError('Assignment not found.');
          return;
        }

        // Fetch paragraph assignments for prev/next navigation
        const listResponse = await fetchWithRetry(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`
        );
        if (listResponse.ok) {
          const listData = await listResponse.json();
          const sorted = (Array.isArray(listData) ? listData : []).sort(
            (a: Assignment, b: Assignment) => a.assignment_index - b.assignment_index
          );
          setAssignmentList(sorted);
        }

        // Fetch blocks
        const blocksResponse = await fetchWithRetry(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/blocks`
        );
        if (blocksResponse.ok) {
          const blocksData = await blocksResponse.json();
          const normalizedBlocks = Array.isArray(blocksData) ? blocksData : [];
          setBlocks(normalizedBlocks.sort((a: Block, b: Block) => a.position - b.position));
        }
      } catch (error) {
        console.error('Error fetching assignment data:', error);
        setLoadError('Failed to load assignment.');
        toast({
          title: 'Error',
          description: 'Failed to load assignment.',
          variant: 'destructive'
        });
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId, assignmentId, toast]);

  const currentAssignmentIndex = assignmentList.findIndex((item) => item.id === assignmentId);
  const prevAssignment = currentAssignmentIndex > 0 ? assignmentList[currentAssignmentIndex - 1] : null;
  const nextAssignment =
    currentAssignmentIndex >= 0 && currentAssignmentIndex < assignmentList.length - 1
      ? assignmentList[currentAssignmentIndex + 1]
      : null;

  if (!assignment) {
    if (loadError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="mb-3 text-muted-foreground">{loadError}</p>
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`)}
            >
              go back to paragraph
            </button>
          </div>
        </div>
      );
    }
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">loading assignment...</p>
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
        answersEnabled={Boolean(assignment.answers_enabled)}
        isVisible={assignment.is_visible !== false}
        answerMode={(assignment.answer_mode as any) || 'view_only'}
        aiGradingEnabled={Boolean(assignment.ai_grading_enabled)}
        initialSettings={normalizeAssignmentSettings(assignment.settings || {})}
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
      instructions={instructions}
      onNavigateBack={() => router.push(`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}`)}
      onNavigateNext={() => {
        if (!nextAssignment) return;
        router.push(
          `/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${nextAssignment.id}`
        );
      }}
      onNavigatePrev={() => {
        if (!prevAssignment) return;
        router.push(
          `/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments/${prevAssignment.id}`
        );
      }}
    />
  );
}

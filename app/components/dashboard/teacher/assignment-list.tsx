
'use client';

import { useState, useContext, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAssignmentDialog } from './create-assignment-dialog';
import { SubmitAssignmentDialog } from '../student/submit-assignment-dialog';
import { SubmissionsView } from './submissions-view';
import type { ClassAssignment } from '@/contexts/app-context';
import { format, parseISO } from 'date-fns';
import { AppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';

type AssignmentListProps = {
  assignments: ClassAssignment[];
  classId: string;
  isTeacher?: boolean;
};

export function AssignmentList({ assignments, classId, isTeacher = true }: AssignmentListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null);
  const [submissionStatuses, setSubmissionStatuses] = useState<Record<string, string>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const { deleteAssignment } = useContext(AppContext) || {};
  const { toast } = useToast();

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      try {
        if (deleteAssignment) {
          await deleteAssignment(assignmentId);
          toast({
            title: 'Assignment Deleted',
            description: 'The assignment has been removed.',
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error deleting assignment',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmitClick = (assignment: ClassAssignment) => {
    setSelectedAssignment(assignment);
    setIsSubmitOpen(true);
  };

  const handleSubmissionComplete = () => {
    // Refresh submission statuses
    fetchSubmissionStatuses();
    setSelectedAssignment(null);
  };

  const handleViewSubmissions = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setShowSubmissions(true);
  };

  const fetchSubmissionStatuses = async () => {
    if (!isTeacher) {
      // For students, check their own submissions
      try {
        const response = await fetch('/api/submissions');
        if (response.ok) {
          const submissions = await response.json();
          const statusMap: Record<string, string> = {};
          submissions.forEach((sub: any) => {
            statusMap[sub.assignment_id] = sub.status === 'graded' ? 'Graded' : 'Submitted';
          });
          setSubmissionStatuses(statusMap);
        }
      } catch (error) {
        console.error('Failed to fetch submission statuses:', error);
      }
    }
  };

  const fetchSubmissionCounts = async () => {
    if (!isTeacher) return;

    try {
      // For teachers, fetch all submissions for their assignments
      const response = await fetch('/api/submissions');
      if (response.ok) {
        const submissions = await response.json();
        const countMap: Record<string, number> = {};
        submissions.forEach((sub: any) => {
          countMap[sub.assignment_id] = (countMap[sub.assignment_id] || 0) + 1;
        });
        setSubmissionCounts(countMap);
      }
    } catch (error) {
      console.error('Failed to fetch submission counts:', error);
    }
  };

  useEffect(() => {
    if (!isTeacher) {
      fetchSubmissionStatuses();
    } else {
      fetchSubmissionCounts();
    }
  }, [assignments, isTeacher]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Assignments</CardTitle>
            <CardDescription>
              {isTeacher
                ? "An overview of all assignments for this class."
                : "Your assignments for this class."
              }
            </CardDescription>
          </div>
          {isTeacher && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Title</TableHead>
                <TableHead>Due Date</TableHead>
                {isTeacher ? (
                  <TableHead>Submissions</TableHead>
                ) : (
                  <TableHead>Status</TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                  const submissionCount = submissionCounts[assignment.id] || 0;
                  const submissionRate = 0; // We don't have total student count yet, so keep placeholder
                  const studentSubmissionStatus = isTeacher ? null : (submissionStatuses[assignment.id] || "Not submitted");

                  return (
                      <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>{assignment.due_date ? format(parseISO(assignment.due_date), 'MMM d, yyyy') : 'No due date'}</TableCell>
                          <TableCell>
                            {isTeacher ? (
                              <div className="text-sm text-muted-foreground">
                                {submissionCount} submission{submissionCount !== 1 ? 's' : ''}
                              </div>
                            ) : (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                studentSubmissionStatus === 'Submitted' || studentSubmissionStatus === 'Graded'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {studentSubmissionStatus}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isTeacher ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">More actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewSubmissions(assignment.id)}>
                                    View Submissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>Edit Assignment</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAssignment(assignment.id)}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSubmitClick(assignment)}
                                disabled={studentSubmissionStatus === 'Graded'}
                              >
                                {studentSubmissionStatus === 'Submitted' ? 'Update Submission' :
                                 studentSubmissionStatus === 'Graded' ? 'Graded' : 'Submit Work'}
                              </Button>
                            )}
                          </TableCell>
                      </TableRow>
                  )
              })}
               {assignments.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No assignments have been created yet.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreateAssignmentDialog
        isOpen={isCreateOpen}
        setIsOpen={setIsCreateOpen}
        classId={classId}
      />
      {selectedAssignment && (
        <SubmitAssignmentDialog
          isOpen={isSubmitOpen}
          setIsOpen={setIsSubmitOpen}
          assignmentId={selectedAssignment.id}
          assignmentTitle={selectedAssignment.title}
          onSubmitted={handleSubmissionComplete}
        />
      )}
      {showSubmissions && selectedAssignmentId && (
        <div className="mt-8">
          <SubmissionsView assignmentId={selectedAssignmentId} />
        </div>
      )}
    </>
  );
}

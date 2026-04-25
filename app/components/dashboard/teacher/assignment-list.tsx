
'use client';

import { useState, useContext, useEffect, useMemo } from 'react';
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
import { EditAssignmentDialog } from './edit-assignment-dialog';
import { SubmitAssignmentDialog } from '../student/submit-assignment-dialog';
import { SubmissionsView } from './submissions-view';
import type { ClassAssignment } from '@/contexts/app-context';
import { format, parseISO } from 'date-fns';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';

type AssignmentListProps = {
  assignments: ClassAssignment[];
  classId: string;
  isTeacher?: boolean;
};

export function AssignmentList({ assignments, classId, isTeacher = true }: AssignmentListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null);
  const [submissionStatuses, setSubmissionStatuses] = useState<Record<string, string>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [submissionRates, setSubmissionRates] = useState<Record<string, number>>({});
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<'all' | 'homework' | 'test'>('all');
  const app = useContext(AppContext) as AppContextType | null;
  const deleteAssignment = app?.deleteAssignment;
  const isDutch = app?.language === 'nl';
  const { toast } = useToast();
  const t = {
    assignments: isDutch ? 'opdrachten' : 'assignments',
    teacherOverview: isDutch ? 'Overzicht van alle opdrachten voor deze klas.' : 'An overview of all assignments for this class.',
    studentOverview: isDutch ? 'Jouw opdrachten voor deze klas.' : 'Your assignments for this class.',
    createAssignment: isDutch ? 'opdracht maken' : 'create assignment',
    title: isDutch ? 'titel' : 'title',
    type: isDutch ? 'type' : 'type',
    all: isDutch ? 'alles' : 'all',
    homework: isDutch ? 'huiswerk' : 'homework',
    tests: isDutch ? 'toetsen' : 'tests',
    test: isDutch ? 'toets' : 'test',
    other: isDutch ? 'overig' : 'other',
    dueDate: isDutch ? 'deadline' : 'due date',
    submissions: isDutch ? 'inzendingen' : 'submissions',
    status: isDutch ? 'status' : 'status',
    actions: isDutch ? 'acties' : 'actions',
    noDueDate: isDutch ? 'geen deadline' : 'no due date',
    submittedProgress: isDutch ? 'ingeleverd' : 'submitted',
    notSubmitted: isDutch ? 'niet ingeleverd' : 'not submitted',
    submitted: isDutch ? 'ingeleverd' : 'submitted',
    graded: isDutch ? 'nagekeken' : 'graded',
    viewSubmissions: isDutch ? 'inzendingen bekijken' : 'view submissions',
    editAssignment: isDutch ? 'opdracht bewerken' : 'edit assignment',
    delete: isDutch ? 'verwijderen' : 'delete',
    updateSubmission: isDutch ? 'inzending aanpassen' : 'update submission',
    submitWork: isDutch ? 'inleveren' : 'submit work',
    noAssignments: isDutch ? 'Er zijn nog geen opdrachten gemaakt.' : 'No assignments have been created yet.',
    assignmentDeleted: isDutch ? 'opdracht verwijderd' : 'assignment deleted',
    assignmentDeletedDesc: isDutch ? 'De opdracht is verwijderd.' : 'The assignment has been removed.',
    deleteError: isDutch ? 'fout bij verwijderen opdracht' : 'error deleting assignment',
    confirmDelete: isDutch ? 'Weet je zeker dat je deze opdracht wil verwijderen?' : 'Are you sure you want to delete this assignment?',
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (assignmentTypeFilter === 'all') return true;
      const rawType = String(assignment.type || '').toLowerCase();
      if (assignmentTypeFilter === 'homework') return rawType === 'homework';
      return rawType === 'small_test' || rawType === 'big_test';
    });
  }, [assignments, assignmentTypeFilter]);

  const getTypeLabel = (assignment: ClassAssignment) => {
    const rawType = String(assignment.type || '').toLowerCase();
    if (rawType === 'homework') return t.homework;
    if (rawType === 'small_test' || rawType === 'big_test') return t.test;
    return t.other;
  };

  const getDueLabel = (assignment: ClassAssignment) => {
    const value = assignment.scheduled_end_at || assignment.due_date || null;
    if (!value) return t.noDueDate;
    try {
      return format(parseISO(value), 'MMM d, yyyy');
    } catch {
      return t.noDueDate;
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (confirm(t.confirmDelete)) {
      try {
        if (deleteAssignment) {
          await deleteAssignment(assignmentId);
          toast({
            title: t.assignmentDeleted,
            description: t.assignmentDeletedDesc,
          });
        }
      } catch (error: any) {
        toast({
          title: t.deleteError,
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

  const handleEditClick = (assignment: ClassAssignment) => {
    setSelectedAssignment(assignment);
    setIsEditOpen(true);
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
      const response = await fetch(`/api/classes/${classId}/assignments/stats`);
      if (response.ok) {
        const payload = await response.json();
        const countMap: Record<string, number> = {};
        const rateMap: Record<string, number> = {};
        (payload.assignmentStats || []).forEach((row: any) => {
          countMap[row.assignmentId] = Number(row.submissions || 0);
          rateMap[row.assignmentId] = Number(row.submissionRate || 0);
        });
        setSubmissionCounts(countMap);
        setSubmissionRates(rateMap);
        setTotalStudents(Number(payload.totalStudents || 0));
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
  }, [assignments, isTeacher, classId]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">{t.assignments}</CardTitle>
            <CardDescription>
              {isTeacher
                ? t.teacherOverview
                : t.studentOverview
              }
            </CardDescription>
          </div>
          {isTeacher && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.createAssignment}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Button variant={assignmentTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setAssignmentTypeFilter('all')}>
              {t.all}
            </Button>
            <Button variant={assignmentTypeFilter === 'homework' ? 'default' : 'outline'} size="sm" onClick={() => setAssignmentTypeFilter('homework')}>
              {t.homework}
            </Button>
            <Button variant={assignmentTypeFilter === 'test' ? 'default' : 'outline'} size="sm" onClick={() => setAssignmentTypeFilter('test')}>
              {t.tests}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">{t.title}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.dueDate}</TableHead>
                {isTeacher ? (
                  <TableHead>{t.submissions}</TableHead>
                ) : (
                  <TableHead>{t.status}</TableHead>
                )}
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => {
                  const submissionCount = submissionCounts[assignment.id] || 0;
                  const submissionRate = submissionRates[assignment.id] || 0;
                  const studentSubmissionStatus = isTeacher ? null : (submissionStatuses[assignment.id] || "Not submitted");

                  return (
                      <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">{getTypeLabel(assignment)}</span>
                          </TableCell>
                          <TableCell>{getDueLabel(assignment)}</TableCell>
                          <TableCell>
                            {isTeacher ? (
                              <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">
                                  {submissionCount}/{totalStudents} {t.submittedProgress}
                                </div>
                                <Progress value={submissionRate} className="h-1.5" />
                              </div>
                            ) : (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                studentSubmissionStatus === 'Submitted' || studentSubmissionStatus === 'Graded'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {studentSubmissionStatus === 'Submitted'
                                  ? t.submitted
                                  : studentSubmissionStatus === 'Graded'
                                    ? t.graded
                                    : t.notSubmitted}
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
                                    {t.viewSubmissions}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditClick(assignment)}>{t.editAssignment}</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAssignment(assignment.id)}>{t.delete}</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSubmitClick(assignment)}
                                disabled={studentSubmissionStatus === 'Graded'}
                              >
                                {studentSubmissionStatus === 'Submitted' ? t.updateSubmission :
                                 studentSubmissionStatus === 'Graded' ? t.graded : t.submitWork}
                              </Button>
                            )}
                          </TableCell>
                      </TableRow>
                  )
              })}
               {filteredAssignments.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        {t.noAssignments}
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
      <EditAssignmentDialog
        isOpen={isEditOpen}
        setIsOpen={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedAssignment(null);
        }}
        classId={classId}
        assignment={selectedAssignment}
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


'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, BookCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ClassInfo, ClassAssignment } from '@/contexts/app-context';
import { differenceInDays, parseISO, isFuture } from 'date-fns';
import { useState, useEffect, useRef, useContext } from 'react';
import type { Student } from '@/lib/teacher-types';
import { AppContext } from '@/contexts/app-context';

type ClassCardProps = {
  classInfo: ClassInfo;
  onArchive?: () => void;
  isArchived?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (classId: string) => void;
  priority?: boolean; // Whether to load student data immediately
};

export function ClassCard({
  classInfo,
  onArchive,
  isArchived = false,
  isBulkMode = false,
  isSelected = false,
  onToggleSelect,
  priority = false
}: ClassCardProps) {
  const router = useRouter();
  const { students: allStudents } = useContext(AppContext) as any;
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  // Fetch student count for this specific class
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (hasFetchedRef.current) return; // Prevent multiple fetches

    const fetchData = async () => {
        hasFetchedRef.current = true;
        if (!classInfo.id || classInfo.id.startsWith('local-') || isArchived) {
            setIsLoading(false);
            return;
        }

        try {
            // Fetch assignments
            const assignmentsRes = await fetch(`/api/assignments`);
            const allAssignments = await assignmentsRes.json();
            setAssignments(allAssignments.filter((a: ClassAssignment) => a.class_id === classInfo.id));

            // Fetch student count for this class
            const membersRes = await fetch(`/api/classes/${classInfo.id}/members`);
            if (membersRes.ok) {
                const members = await membersRes.json();
                setStudentCount(members.length);
            } else {
                console.warn(`Failed to fetch members for class ${classInfo.id}`);
                setStudentCount(0);
            }
        } catch (error) {
            console.error(`Failed to fetch data for class ${classInfo.id}`, error);
            setAssignments([]);
            setStudentCount(0);
        } finally {
            setIsLoading(false);
        }
    };

    if (priority) {
      // Load immediately for priority cards
      fetchData();
    } else {
      // Delay loading for non-priority cards to prevent overwhelming the server
      const timer = setTimeout(fetchData, 1000); // Reduced delay
      return () => {
        if (!hasFetchedRef.current) {
          clearTimeout(timer);
        }
      };
    }
  }, [classInfo.id, isArchived, priority]);


  const assignmentsDue = assignments.filter(a => {
    if (!a.due_date) return false;
    const dueDate = parseISO(a.due_date);
    return isFuture(dueDate) && differenceInDays(dueDate, new Date()) <= 7;
  }).length;

  // Calculate actual average progress from submissions
  const [averageProgress, setAverageProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = async () => {
      if (!classInfo.id || classInfo.id.startsWith('local-') || isArchived) {
        setAverageProgress(0);
        return;
      }

      try {
        // Get all submissions for this class's assignments
        const assignmentIds = assignments.map(a => a.id);
        if (assignmentIds.length === 0) {
          setAverageProgress(0);
          return;
        }

        const submissionsRes = await fetch('/api/submissions?assignmentIds=' + assignmentIds.join(','));
        if (submissionsRes.ok) {
          const allSubmissions = await submissionsRes.json();
          const classSubmissions = allSubmissions.filter((s: any) =>
            assignments.some(a => a.id === s.assignment_id)
          );

          if (studentCount === 0 || assignments.length === 0) {
            setAverageProgress(0);
            return;
          }

          // Calculate completion rate
          const totalPossible = studentCount * assignments.length;
          const completed = classSubmissions.filter((s: any) =>
            s.status === 'submitted' || s.grade !== null
          ).length;

          const progress = totalPossible > 0 ? (completed / totalPossible) * 100 : 0;
          setAverageProgress(Math.round(progress));
        }
      } catch (error) {
        console.error('Failed to calculate progress:', error);
        setAverageProgress(0);
      }
    };

    calculateProgress();
  }, [classInfo.id, assignments, studentCount, isArchived]);
  
  const alerts: string[] = [];
  if (assignmentsDue > 0) {
    alerts.push(`${assignmentsDue} assignment${assignmentsDue > 1 ? 's are' : ' is'} due this week.`);
  }

  const card = (
    <Card className={`h-full flex flex-col hover:border-primary transition-all ${isArchived ? 'opacity-75' : ''} ${isBulkMode ? 'cursor-default' : ''}`}>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          {isBulkMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(classInfo.id)}
              className="mr-2"
            />
          )}
          {classInfo.name}
          {isArchived && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              Archived
            </span>
          )}
        </CardTitle>
        <div className="flex items-center text-sm text-muted-foreground pt-1 gap-4">
          {isArchived ? (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground italic">Archived class - data not available</span>
            </div>
          ) : (
            <>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/class/${classInfo.id}?tab=students`);
                }}
              >
                <Users className="h-4 w-4" />
                <span>{studentCount} Student{studentCount !== 1 ? 's' : ''}</span>
              </div>
              <div
                className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/class/${classInfo.id}?tab=assignments`);
                }}
              >
                <BookCheck className="h-4 w-4" />
                <span>{assignmentsDue} Due Soon</span>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-muted-foreground">Average Progress</span>
            <span className="text-sm font-bold text-primary">{averageProgress}%</span>
          </div>
          <Progress value={averageProgress} className="h-2" />
        </div>
        {alerts.length > 0 && (
          <div>
            <Separator className="my-3" />
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{alert}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <div className={`flex items-center text-sm font-medium text-primary transition-opacity ${isBulkMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
          <span>Manage Class</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );

  if (isBulkMode) {
    return card;
  }

  return (
    <Link href={`/class/${classInfo.id}`} className="group">
      {card}
    </Link>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ClassInfo, ClassAssignment } from '@/contexts/app-context';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '@/contexts/app-context';

type ClassCardProps = {
  classInfo: ClassInfo;
  onArchive?: () => void;
  isArchived?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (classId: string) => void;
  priority?: boolean;
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
  const { students: allStudents } = useContext(AppContext) as any;
  const [averageProgress, setAverageProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // No delayed fetching - just show class name
  useEffect(() => {
    if (!classInfo.id || classInfo.id.startsWith('local-') || isArchived) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        // Fetch assignments and submissions for progress
        const [assignmentsRes, submissionsRes] = await Promise.all([
          fetch(`/api/assignments`),
          fetch(`/api/submissions`)
        ]);
        
        const allAssignments = await assignmentsRes.json();
        const allSubmissions = await submissionsRes.json();
        
        const classAssignments = allAssignments.filter((a: ClassAssignment) => a.class_id === classInfo.id);
        const classSubmissions = allSubmissions.filter((s: any) => 
          classAssignments.some((a: any) => a.id === s.assignment_id)
        );
        
        // Get unique student count from submissions
        const uniqueStudents = new Set(classSubmissions.map((s: any) => s.user_id));
        const studentCount = uniqueStudents.size;
        
        if (studentCount > 0 && classAssignments.length > 0) {
          const totalPossible = studentCount * classAssignments.length;
          const completed = classSubmissions.filter((s: any) =>
            s.status === 'submitted' || s.grade !== null
          ).length;
          const progress = (completed / totalPossible) * 100;
          setAverageProgress(Math.round(progress));
        }
      } catch (error) {
        console.error('Failed to calculate progress:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [classInfo.id, isArchived]);

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
            <span className="text-muted-foreground italic">Archived</span>
          ) : (
            <span className="text-muted-foreground">Click to view</span>
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

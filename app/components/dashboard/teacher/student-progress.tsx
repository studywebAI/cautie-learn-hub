'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type StudentProgress = {
  id: string;
  name: string;
  email: string;
  completed_assignments: number;
  total_assignments: number;
  average_grade: number | null;
  last_activity: string | null;
  status: 'on_track' | 'falling_behind' | 'inactive';
};

type StudentProgressPanelProps = {
  classId: string;
};

export function StudentProgressPanel({ classId }: StudentProgressPanelProps) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProgress();
  }, [classId]);

  const fetchStudentProgress = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/progress`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />On Track</Badge>;
      case 'falling_behind':
        return <Badge className="bg-amber-500"><AlertCircle className="mr-1 h-3 w-3" />Falling Behind</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Sort by status (on_track first, then falling_behind, then inactive)
  const sortedStudents = [...students].sort((a: StudentProgress, b: StudentProgress) => {
    const statusOrder: Record<string, number> = { on_track: 0, falling_behind: 1, inactive: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student Progress
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No students in this class yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sortedStudents.map(student => (
                <Link
                  key={student.id}
                  href={`/class/${classId}/student/${student.id}`}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar>
                    <AvatarFallback>{getInitials(student.name || 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{student.name || student.email}</p>
                      {getStatusBadge(student.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress 
                        value={getProgressPercentage(student.completed_assignments, student.total_assignments)} 
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {student.completed_assignments}/{student.total_assignments}
                      </span>
                    </div>
                    {student.average_grade !== null && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg. Grade: {student.average_grade}%
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

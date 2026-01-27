'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';

type StudentProgress = {
  studentId: string;
  studentName: string;
  avatarUrl?: string;
  totalAssignments: number;
  completedAssignments: number;
  gradedAssignments: number;
  averageGrade: number | null;
  completionRate: number;
  assignmentDetails: Array<{
    assignmentId: string;
    title: string;
    dueDate?: string;
    submitted: boolean;
    submittedAt?: string;
    status: string;
    grade?: number;
  }>;
};

type Assignment = {
  id: string;
  title: string;
  dueDate?: string;
};

type ProgressDashboardProps = {
  classId: string;
};

export function StudentProgressDashboard({ classId }: ProgressDashboardProps) {
  const [data, setData] = useState<{
    className: string;
    students: StudentProgress[];
    assignments: Assignment[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, [classId]);

  const fetchProgressData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/progress`);
      if (response.ok) {
        const progressData = await response.json();
        setData(progressData);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    }
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'graded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: 'default',
      graded: 'default',
      draft: 'secondary',
      not_submitted: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-2 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8">Failed to load progress data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Progress</h2>
          <p className="text-muted-foreground">{data.className}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data.students.length}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{data.assignments.length}</div>
            <div className="text-sm text-muted-foreground">Assignments</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.students.map((student) => (
              <Card key={student.studentId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatarUrl} />
                      <AvatarFallback>
                        {student.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{student.studentName}</CardTitle>
                      <CardDescription className="text-xs">
                        {student.completedAssignments}/{student.totalAssignments} assignments
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {student.completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={student.completionRate} className="h-2" />
                  </div>

                  {student.averageGrade !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Grade</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {student.averageGrade.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Status Overview</CardTitle>
              <CardDescription>
                Detailed view of all assignments and student submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    {data.assignments.map((assignment) => (
                      <TableHead key={assignment.id} className="text-center min-w-[120px]">
                        {assignment.title}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={student.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {student.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {student.studentName}
                        </div>
                      </TableCell>
                      {data.assignments.map((assignment) => {
                        const detail = student.assignmentDetails.find(d => d.assignmentId === assignment.id);
                        return (
                          <TableCell key={assignment.id} className="text-center">
                            {detail ? (
                              <div className="flex flex-col items-center gap-1">
                                {getStatusIcon(detail.status)}
                                {detail.grade !== undefined && (
                                  <span className="text-xs font-medium">
                                    {detail.grade}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Progress value={student.completionRate} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">
                            {student.completionRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
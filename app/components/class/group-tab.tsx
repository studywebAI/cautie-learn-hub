'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Users, User, Clock, TrendingUp, FileText, 
  CheckCircle, AlertCircle, Activity, Eye, 
  GraduationCap, BookOpen, Star, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

type Student = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  lastSeen: string | null;
  onlineStatus: 'online' | 'offline';
  stats: {
    totalAssignments: number;
    completedAssignments: number;
    gradedAssignments: number;
    averageGrade: number | null;
    completionRate: number;
  };
  lastGraded: {
    assignmentId: string;
    grade: number;
    submittedAt: string;
    status: string;
  } | null;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, any>;
    createdAt: string;
  }>;
  recentSubmissions: Array<{
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    status: string;
    grade: number | null;
    submittedAt: string | null;
    createdAt: string;
  }>;
};

type Teacher = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  lastSeen: string | null;
  onlineStatus: 'online' | 'offline';
};

type GroupData = {
  classId: string;
  students: Student[];
  teachers: Teacher[];
  assignments: Array<{ id: string; title: string; dueDate: string | null }>;
  stats: {
    totalStudents: number;
    onlineStudents: number;
    totalTeachers: number;
    onlineTeachers: number;
  };
};

type GroupTabProps = {
  classId: string;
  isTeacher: boolean;
};

export function GroupTab({ classId, isTeacher }: GroupTabProps) {
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  useEffect(() => {
    fetchGroupData();
  }, [classId]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/group`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredStudents = data?.students.filter(student => {
    if (filter === 'online') return student.onlineStatus === 'online';
    if (filter === 'offline') return student.onlineStatus === 'offline';
    return true;
  }) || [];

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (action.includes('edit') || action.includes('update')) return <Activity className="h-3 w-3 text-blue-500" />;
    if (action.includes('submit')) return <FileText className="h-3 w-3 text-purple-500" />;
    return <Clock className="h-3 w-3 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load group data
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.onlineStudents}</p>
                <p className="text-sm text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalTeachers}</p>
                <p className="text-sm text-muted-foreground">Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.students.filter(s => s.stats.averageGrade !== null).length}
                </p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Students
        </Button>
        <Button
          variant={filter === 'online' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('online')}
          className="gap-2"
        >
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Online ({data.students.filter(s => s.onlineStatus === 'online').length})
        </Button>
        <Button
          variant={filter === 'offline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('offline')}
          className="gap-2"
        >
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Offline ({data.students.filter(s => s.onlineStatus === 'offline').length})
        </Button>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(student => (
          <Card 
            key={student.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedStudent(student)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    student.onlineStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{student.name}</p>
                    {student.onlineStatus === 'online' ? (
                      <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {formatLastSeen(student.lastSeen)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{student.stats.completionRate}%</span>
                    </div>
                    <Progress value={student.stats.completionRate} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Assignments</span>
                      <span>
                        {student.stats.completedAssignments}/{student.stats.totalAssignments}
                      </span>
                    </div>
                    
                    {student.stats.averageGrade !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg Grade</span>
                        <span className="font-medium">{student.stats.averageGrade}%</span>
                      </div>
                    )}
                  </div>

                  {/* Last graded */}
                  {student.lastGraded && (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="font-medium">Last grade: {student.lastGraded.grade}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students found</p>
          </CardContent>
        </Card>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback>
                  </Avatar>
                  <span>{selectedStudent.name}</span>
                  {selectedStudent.onlineStatus === 'online' ? (
                    <Badge className="bg-green-500">Online</Badge>
                  ) : (
                    <Badge variant="secondary">Offline - {formatLastSeen(selectedStudent.lastSeen)}</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.stats.completedAssignments}</p>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedStudent.stats.gradedAssignments}</p>
                    <p className="text-xs text-muted-foreground">Graded</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {selectedStudent.stats.averageGrade !== null ? `${selectedStudent.stats.averageGrade}%` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Grade</p>
                  </div>
                </div>

                {/* Last Graded */}
                {selectedStudent.lastGraded && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Last Grade
                    </h4>
                    <div className="flex items-center justify-between">
                      <span>Score: {selectedStudent.lastGraded.grade}%</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(selectedStudent.lastGraded.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </h4>
                  {selectedStudent.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStudent.recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                          {getActionIcon(activity.action)}
                          <span className="flex-1 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>

                {/* Recent Submissions */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    Recent Submissions
                  </h4>
                  {selectedStudent.recentSubmissions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStudent.recentSubmissions.map(submission => (
                        <div key={submission.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {submission.grade !== null ? (
                              <Star className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : submission.status === 'submitted' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            <span className="truncate">{submission.assignmentTitle}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {submission.grade !== null && (
                              <Badge variant="outline" className="text-amber-500">
                                {submission.grade}%
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {submission.submittedAt 
                                ? new Date(submission.submittedAt).toLocaleDateString()
                                : new Date(submission.createdAt).toLocaleDateString()
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                  )}
                </div>

                {/* Quick Links for Teachers */}
                {isTeacher && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/class/${classId}/assignments?student=${selectedStudent.id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Assignments
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/class/${classId}/progress?student=${selectedStudent.id}`}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Progress
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

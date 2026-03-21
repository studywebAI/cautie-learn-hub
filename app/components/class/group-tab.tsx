'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Clock, TrendingUp, FileText, CheckCircle, Activity, Star, ChevronDown, ChevronRight, ClipboardCheck, CalendarDays, Library } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { AppContext, AppContextType } from '@/contexts/app-context';

type Student = {
  id: string;
  name: string;
  email: string | null;
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
  email: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  lastSeen: string | null;
  onlineStatus: 'online' | 'offline';
  subjects?: Array<{
    id: string;
    title: string;
    ownerName: string | null;
    ownerEmail: string | null;
  }>;
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
  cachedData?: GroupData; // Accept cached data from parent
};

export function GroupTab({ classId, isTeacher, cachedData }: GroupTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';
  const t = {
    failedLoad: isDutch ? 'Kon groepsdata niet laden' : 'Failed to load group data',
    teachers: isDutch ? 'Docenten' : 'Teachers',
    students: isDutch ? 'Leerlingen' : 'Students',
    noTeachers: isDutch ? 'Geen docenten gevonden' : 'No teachers found',
    noSubjectsYet: isDutch ? 'Nog geen vakken gekoppeld' : 'No linked subjects yet',
    online: isDutch ? 'Online' : 'Online',
    offline: isDutch ? 'Offline' : 'Offline',
    allStudents: isDutch ? 'Alle leerlingen' : 'All students',
    noStudentsFound: isDutch ? 'Geen leerlingen gevonden' : 'No students found',
    never: isDutch ? 'Nooit' : 'Never',
    justNow: isDutch ? 'Net nu' : 'Just now',
    minAgo: (m: number) => (isDutch ? `${m}m geleden` : `${m}m ago`),
    hourAgo: (h: number) => (isDutch ? `${h}u geleden` : `${h}h ago`),
    noEmail: isDutch ? 'Geen e-mail' : 'No email',
    progress: isDutch ? 'Voortgang' : 'Progress',
    assignments: isDutch ? 'Opdrachten' : 'Assignments',
    avgGrade: isDutch ? 'Gem. cijfer' : 'Avg Grade',
    lastGrade: isDutch ? 'Laatste cijfer' : 'Last grade',
    complete: isDutch ? 'Voltooid' : 'Complete',
    submitted: isDutch ? 'Ingeleverd' : 'Submitted',
    graded: isDutch ? 'Beoordeeld' : 'Graded',
    score: isDutch ? 'Score' : 'Score',
    recentActivity: isDutch ? 'Recente activiteit' : 'Recent Activity',
    noRecentActivity: isDutch ? 'Geen recente activiteit' : 'No recent activity',
    recentSubmissions: isDutch ? 'Recente inzendingen' : 'Recent Submissions',
    noSubmissions: isDutch ? 'Nog geen inzendingen' : 'No submissions yet',
    viewAssignments: isDutch ? 'Bekijk opdrachten' : 'View Assignments',
    viewProgress: isDutch ? 'Bekijk voortgang' : 'View Progress',
    linkedSubjects: isDutch ? 'Gekoppelde vakken' : 'Linked subjects',
    noLinkedSubjects: isDutch ? 'Nog geen vakken gekoppeld.' : 'No linked subjects yet.',
    unknownOwner: isDutch ? 'Onbekende eigenaar' : 'Unknown owner',
    offlineSince: (when: string) => (isDutch ? `Offline - ${when}` : `Offline - ${when}`),
    people: isDutch ? 'personen' : 'people',
    teacherListHint: isDutch ? 'Klik een docent om gekoppelde vakken te bekijken' : 'Click a teacher to view linked subjects',
    studentListHint: isDutch ? 'Selecteer een leerling voor details en prestaties' : 'Select a student for details and performance',
    expand: isDutch ? 'Uitklappen' : 'Expand',
    collapse: isDutch ? 'Inklappen' : 'Collapse',
    viewGrades: isDutch ? 'Bekijk cijfers' : 'View grades',
    viewAttendance: isDutch ? 'Bekijk aanwezigheid' : 'View attendance',
    viewSchedule: isDutch ? 'Bekijk rooster' : 'View schedule',
    viewSubjects: isDutch ? 'Bekijk vakken' : 'View subjects',
  };

  const [data, setData] = useState<GroupData | null>(cachedData || null);
  const [loading, setLoading] = useState(!cachedData);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [teachersCollapsed, setTeachersCollapsed] = useState(false);
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(`group-panel-state:${classId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { teachersCollapsed?: boolean; studentsCollapsed?: boolean };
      setTeachersCollapsed(parsed.teachersCollapsed === true);
      setStudentsCollapsed(parsed.studentsCollapsed === true);
    } catch {
      // ignore invalid cache
    }
  }, [classId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `group-panel-state:${classId}`,
      JSON.stringify({ teachersCollapsed, studentsCollapsed })
    );
  }, [classId, teachersCollapsed, studentsCollapsed]);

  useEffect(() => {
    const loadClassPreferences = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}`);
        if (!response.ok) return;
        const result = await response.json();
        setScheduleEnabled(result?.preferences?.school_schedule_enabled === true);
      } catch {
        setScheduleEnabled(false);
      }
    };
    void loadClassPreferences();
  }, [classId]);

  useEffect(() => {
    // Show cached data immediately, but always refresh in background
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      void logClassTabEvent({
        classId,
        tab: 'group',
        event: 'cache_hydrated',
        stage: 'data',
        level: 'debug',
      });
    }
    void logClassTabEvent({
      classId,
      tab: 'group',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
    fetchGroupData();
  }, [classId, cachedData]);

  const fetchGroupData = async () => {
    setLoading(true);
    void logClassTabEvent({
      classId,
      tab: 'group',
      event: 'load_start',
      stage: 'data',
      level: 'debug',
    });
    try {
      const response = await fetch(`/api/classes/${classId}/group`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        void logClassTabEvent({
          classId,
          tab: 'group',
          event: 'load_success',
          stage: 'data',
          level: 'debug',
          meta: {
            student_count: (result?.students || []).length,
            teacher_count: (result?.teachers || []).length,
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
      void logClassTabEvent({
        classId,
        tab: 'group',
        event: 'load_error',
        stage: 'data',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
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
    if (!lastSeen) return t.never;
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return t.minAgo(diffMins);
    if (diffMins < 1440) return t.hourAgo(Math.floor(diffMins / 60));
    return date.toLocaleDateString();
  };

  const filteredStudents = (data?.students || [])
    .filter(student => {
      if (filter === 'online') return student.onlineStatus === 'online';
      if (filter === 'offline') return student.onlineStatus === 'offline';
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for consistency

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <CheckCircle className="h-3 w-3 text-foreground/70" />;
    if (action.includes('edit') || action.includes('update')) return <Activity className="h-3 w-3 text-foreground/70" />;
    if (action.includes('submit')) return <FileText className="h-3 w-3 text-foreground/70" />;
    return <Clock className="h-3 w-3 text-foreground/60" />;
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
          {t.failedLoad}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="rounded-2xl border-none shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTeachersCollapsed((value) => !value)}
                className="inline-flex items-center gap-1.5 text-left"
                aria-label={teachersCollapsed ? t.expand : t.collapse}
              >
                {teachersCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <CardTitle className="text-base">{t.teachers}</CardTitle>
              </button>
              <span className="text-xs text-muted-foreground">
                {data.teachers.length} {t.people}
              </span>
            </div>
            {!teachersCollapsed && <p className="text-xs text-muted-foreground">{t.teacherListHint}</p>}
          </CardHeader>
          {!teachersCollapsed && <CardContent className="space-y-2">
            {(data.teachers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noTeachers}</p>
            ) : (
              [...data.teachers]
                .sort((a, b) => (a.email || a.name).localeCompare(b.email || b.name))
                .map((teacher) => (
                  <button
                    type="button"
                    key={teacher.id}
                    className="w-full rounded-xl bg-muted/30 p-3 text-left transition-colors hover:bg-muted/55"
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      void logClassTabEvent({
                        classId,
                        tab: 'group',
                        event: 'teacher_opened',
                        stage: 'action',
                        level: 'debug',
                        meta: { teacher_id: teacher.id },
                      });
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{teacher.email || teacher.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(teacher.subjects || []).length > 0
                            ? (teacher.subjects || []).map((s) => s.title).join(', ')
                            : t.noSubjectsYet}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                        {teacher.onlineStatus === 'online' ? t.online : t.offline}
                      </Badge>
                    </div>
                  </button>
                ))
            )}
          </CardContent>}
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-none shadow-none">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => setStudentsCollapsed((value) => !value)}
                    className="inline-flex items-center gap-1.5 text-left"
                    aria-label={studentsCollapsed ? t.expand : t.collapse}
                  >
                    {studentsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <h3 className="text-base font-semibold">{t.students}</h3>
                  </button>
                  {!studentsCollapsed && <p className="text-xs text-muted-foreground">{t.studentListHint}</p>}
                </div>
                {!studentsCollapsed && <div className="inline-flex w-full gap-2 rounded-full bg-muted/35 p-1 md:w-auto">
                  <Button
                    variant={filter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="h-8 rounded-full px-3"
                  >
                    {t.allStudents}
                  </Button>
                  <Button
                    variant={filter === 'online' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('online')}
                    className="h-8 rounded-full px-3 gap-2"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {t.online} ({data.students.filter(s => s.onlineStatus === 'online').length})
                  </Button>
                  <Button
                    variant={filter === 'offline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('offline')}
                    className="h-8 rounded-full px-3 gap-2"
                  >
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    {t.offline} ({data.students.filter(s => s.onlineStatus === 'offline').length})
                  </Button>
                </div>}
              </div>
            </CardContent>
          </Card>

          {!studentsCollapsed && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {filteredStudents.map(student => (
          <Card 
            key={student.id} 
            className="cursor-pointer rounded-2xl border-none shadow-none transition-colors hover:bg-muted/40"
            onClick={() => {
              setSelectedStudent(student);
              void logClassTabEvent({
                classId,
                tab: 'group',
                event: 'student_opened',
                stage: 'action',
                level: 'debug',
                meta: { student_id: student.id },
              });
            }}
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
                        {t.online}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {formatLastSeen(student.lastSeen)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{student.email || t.noEmail}</p>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.progress}</span>
                      <span className="font-medium">{student.stats.completionRate}%</span>
                    </div>
                    <Progress value={student.stats.completionRate} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">{t.assignments}</span>
                      <span>
                        {student.stats.completedAssignments}/{student.stats.totalAssignments}
                      </span>
                    </div>
                    
                    {student.stats.averageGrade !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.avgGrade}</span>
                        <span className="font-medium">{student.stats.averageGrade}%</span>
                      </div>
                    )}
                  </div>

                  {/* Last graded */}
                  {student.lastGraded && (
                    <div className="mt-3 rounded-xl bg-muted/45 p-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-foreground/70" />
                        <span className="font-medium">{t.lastGrade}: {student.lastGraded.grade}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
          </div>}
        </div>
      </div>

      {!studentsCollapsed && filteredStudents.length === 0 && (
        <Card className="rounded-2xl border-none shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t.noStudentsFound}</p>
          </CardContent>
        </Card>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border-none">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback>
                  </Avatar>
                  <span>{selectedStudent.name}</span>
                  {selectedStudent.onlineStatus === 'online' ? (
                    <Badge className="bg-green-500">{t.online}</Badge>
                  ) : (
                    <Badge variant="secondary">{t.offlineSince(formatLastSeen(selectedStudent.lastSeen))}</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedStudent.email || t.noEmail}</p>
               
              <div className="space-y-6 mt-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/45 rounded-xl">
                    <p className="text-2xl font-bold">{selectedStudent.stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">{t.complete}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/45 rounded-xl">
                    <p className="text-2xl font-bold">{selectedStudent.stats.completedAssignments}</p>
                    <p className="text-xs text-muted-foreground">{t.submitted}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/45 rounded-xl">
                    <p className="text-2xl font-bold">{selectedStudent.stats.gradedAssignments}</p>
                    <p className="text-xs text-muted-foreground">{t.graded}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/45 rounded-xl">
                    <p className="text-2xl font-bold">
                      {selectedStudent.stats.averageGrade !== null ? `${selectedStudent.stats.averageGrade}%` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.avgGrade}</p>
                  </div>
                </div>

                {/* Last Graded */}
                {selectedStudent.lastGraded && (
                  <div className="p-4 bg-muted/45 rounded-xl">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-foreground/70" />
                      {t.lastGrade}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span>{t.score}: {selectedStudent.lastGraded.grade}%</span>
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
                    {t.recentActivity}
                  </h4>
                  {selectedStudent.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStudent.recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/35 text-sm">
                          {getActionIcon(activity.action)}
                          <span className="flex-1 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.noRecentActivity}</p>
                  )}
                </div>

                {/* Recent Submissions */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4" />
                    {t.recentSubmissions}
                  </h4>
                  {selectedStudent.recentSubmissions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStudent.recentSubmissions.map(submission => (
                        <div key={submission.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/35 text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {submission.grade !== null ? (
                              <Star className="h-4 w-4 text-foreground/70 shrink-0" />
                            ) : submission.status === 'submitted' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            <span className="truncate">{submission.assignmentTitle}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {submission.grade !== null && (
                              <Badge variant="secondary">
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
                    <p className="text-sm text-muted-foreground">{t.noSubmissions}</p>
                  )}
                </div>

                {/* Quick Links for Teachers */}
                {isTeacher && (
                  <div className="grid grid-cols-1 gap-2 pt-4 md:grid-cols-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link prefetch={false} href={`/class/${classId}?tab=grades&studentId=${selectedStudent.id}`}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        {t.viewGrades}
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link prefetch={false} href={`/class/${classId}?tab=assignments&studentId=${selectedStudent.id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        {t.viewAssignments}
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link prefetch={false} href={`/class/${classId}?tab=progress&studentId=${selectedStudent.id}`}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        {t.viewProgress}
                      </Link>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}`}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {t.viewAttendance}
                      </Link>
                    </Button>
                    {scheduleEnabled && (
                      <Button variant="outline" className="flex-1" asChild>
                        <Link prefetch={false} href={`/agenda?classId=${classId}`}>
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {t.viewSchedule}
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Teacher Detail Dialog */}
      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-xl rounded-2xl border-none">
          {selectedTeacher && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTeacher.email || selectedTeacher.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=grades&teacherId=${selectedTeacher.id}`}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      {t.viewGrades}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=progress&teacherId=${selectedTeacher.id}`}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {t.viewProgress}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance&teacherId=${selectedTeacher.id}`}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {t.viewAttendance}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=subjects`}>
                      <Library className="h-4 w-4 mr-2" />
                      {t.viewSubjects}
                    </Link>
                  </Button>
                  {scheduleEnabled && (
                    <Button variant="outline" asChild>
                      <Link prefetch={false} href={`/agenda?classId=${classId}`}>
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {t.viewSchedule}
                      </Link>
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.linkedSubjects}
                </p>
                {(selectedTeacher.subjects || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noLinkedSubjects}</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedTeacher.subjects || []).map((subject) => (
                      <div key={subject.id} className="rounded-xl bg-muted/35 p-3">
                        <p className="font-medium">{subject.title}</p>
                        <p className="text-xs text-muted-foreground">{subject.ownerEmail || subject.ownerName || t.unknownOwner}</p>
                      </div>
                    ))}
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


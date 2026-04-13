'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Clock, Activity, ChevronDown, ChevronRight, ClipboardCheck, CalendarDays, Library, UserPlus, Settings, Plus, NotebookPen, Ellipsis, FolderOpen, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

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
  cachedData?: GroupData;
  parentLoading?: boolean;
};

export function GroupTab({ classId, isTeacher, cachedData, parentLoading = false }: GroupTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const language = appContext?.language || 'en';
  const isDutch = language === 'nl';

  const t = {
    failedLoad: isDutch ? 'Kon groepsdata niet laden' : 'Failed to load group data',
    teachers: isDutch ? 'Docenten' : 'Teachers',
    students: isDutch ? 'Leerlingen' : 'Students',
    noTeachers: isDutch ? 'Geen docenten gevonden' : 'No teachers found',
    noStudentsFound: isDutch ? 'Geen leerlingen gevonden' : 'No students found',
    noEmail: isDutch ? 'Geen e-mail' : 'No email',
    people: isDutch ? 'personen' : 'people',
    teacherListHint: isDutch ? 'Klik een docent om gekoppelde vakken te bekijken' : 'Click a teacher to view linked subjects',
    studentListHint: isDutch ? 'Klik een leerling voor acties en details' : 'Click a student for actions and details',
    online: isDutch ? 'Online' : 'Online',
    offline: isDutch ? 'Offline' : 'Offline',
    expand: isDutch ? 'Uitklappen' : 'Expand',
    collapse: isDutch ? 'Inklappen' : 'Collapse',
  };

  const [data, setData] = useState<GroupData | null>(cachedData || null);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teachersCollapsed, setTeachersCollapsed] = useState(false);
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);

  useEffect(() => {
    setSelectedStudent(null);
    setSelectedTeacher(null);
    if (!cachedData) setData(null);
    setLoading(!cachedData && !parentLoading);
    setError(null);
  }, [classId, cachedData, parentLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(`group-panel-state:${classId}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { teachersCollapsed?: boolean; studentsCollapsed?: boolean };
      setTeachersCollapsed(parsed.teachersCollapsed === true);
      setStudentsCollapsed(parsed.studentsCollapsed === true);
    } catch {}
  }, [classId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`group-panel-state:${classId}`, JSON.stringify({ teachersCollapsed, studentsCollapsed }));
  }, [classId, teachersCollapsed, studentsCollapsed]);

  useEffect(() => {
    if (!cachedData) return;
    setData(cachedData);
    setLoading(false);
  }, [cachedData]);

  useEffect(() => {
    if (cachedData || parentLoading || data) return;
    void fetchGroupData();
  }, [classId, cachedData, parentLoading, data]);

  const fetchGroupData = async () => {
    if (!data) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classes/${classId}/group`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }
      const result = await response.json();
      setData(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.failedLoad;
      setError(msg);
      setData(null);
      console.error('Failed to fetch group data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const summarizeSignals = (student: Student) => {
    const actions = (student.recentActivity || []).map((item) => item.action.toLowerCase());
    const noteCount = (student.recentActivity || []).filter((item) => item.action.toLowerCase().includes('note') || item.entityType.toLowerCase().includes('note')).length;
    const missedHw = actions.some((action) => action.includes('homework') && (action.includes('miss') || action.includes('incomplete')));
    const attendanceAction = actions.find((action) => action.includes('attendance') || action.includes('present') || action.includes('absent'));
    const lastAttendance = attendanceAction ? (attendanceAction.includes('absent') ? 'Absent' : 'Present') : null;
    const lastActivityAt = student.recentActivity?.[0]?.createdAt || student.lastSeen;
    return {
      noteCount,
      missedHw,
      lastAttendance,
      lastActivity: formatLastSeen(lastActivityAt || null),
      lastNoteAt: student.recentActivity?.find((item) => item.action.toLowerCase().includes('note'))?.createdAt || null,
    };
  };

  const filteredStudents = (data?.students || []).sort((a, b) => a.name.localeCompare(b.name));

  if ((loading || parentLoading) && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label="Loading group" sublabel="Fetching teachers and students" size="md" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <div className="space-y-3">
            <p>{error || t.failedLoad}</p>
            <Button variant="outline" onClick={() => void fetchGroupData()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-none shadow-none">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="rounded-2xl bg-muted/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setTeachersCollapsed((v) => !v)} className="inline-flex items-center gap-1.5 text-left" aria-label={teachersCollapsed ? t.expand : t.collapse}>
                    {teachersCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <CardTitle className="text-base">{t.teachers}</CardTitle>
                  </button>
                  <span className="text-xs text-muted-foreground">{data.teachers.length} {t.people}</span>
                </div>
                {!teachersCollapsed && <p className="text-xs text-muted-foreground">{t.teacherListHint}</p>}
              </CardHeader>
              {!teachersCollapsed && (
                <CardContent className="space-y-2">
                  {data.teachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noTeachers}</p>
                  ) : (
                    [...data.teachers].sort((a, b) => (a.email || a.name).localeCompare(b.email || b.name)).map((teacher) => (
                      <button key={teacher.id} type="button" className="w-full rounded-xl bg-muted/30 p-3 text-left transition-colors hover:bg-muted/55" onClick={() => setSelectedTeacher(teacher)}>
                        <p className="truncate font-medium">{teacher.email || teacher.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{(teacher.subjects || []).map((s) => s.title).join(', ') || 'No linked subjects yet'}</p>
                      </button>
                    ))
                  )}
                </CardContent>
              )}
            </div>

            <div className="rounded-2xl bg-muted/20">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <button type="button" onClick={() => setStudentsCollapsed((v) => !v)} className="inline-flex items-center gap-1.5 text-left" aria-label={studentsCollapsed ? t.expand : t.collapse}>
                      {studentsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h3 className="text-base font-semibold">{t.students}</h3>
                    </button>
                    {!studentsCollapsed && <p className="text-xs text-muted-foreground">{t.studentListHint}</p>}
                  </div>
                  {!studentsCollapsed && <span className="text-xs text-muted-foreground">{filteredStudents.length} {t.people}</span>}
                </div>
              </CardContent>

              {!studentsCollapsed && (
                <div className="space-y-2 px-6 pb-6">
                  {filteredStudents.map((student) => {
                    const signals = summarizeSignals(student);
                    return (
                      <button
                        type="button"
                        key={student.id}
                        className="w-full rounded-xl bg-muted/35 px-3 py-2 text-left transition-colors hover:bg-muted/55"
                        onClick={() => {
                          setSelectedStudent(student);
                          void logClassTabEvent({ classId, tab: 'group', event: 'student_opened', stage: 'action', level: 'debug', meta: { student_id: student.id } });
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(student.name)}</AvatarFallback></Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{student.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{student.email || t.noEmail}</p>
                          </div>

                          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
                            <span>Last: {signals.lastAttendance || '—'}</span>
                            <span>Activity: {signals.lastActivity}</span>
                            {signals.missedHw && <Badge variant="outline">Missed HW</Badge>}
                            {signals.noteCount > 0 && <span>?? {signals.noteCount}</span>}
                          </div>

                          <div className="flex items-center gap-1">
                            <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${student.id}&quick=event`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70" onClick={(e) => e.stopPropagation()} title="Add Event">
                              <Plus className="h-4 w-4" />
                            </Link>
                            <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${student.id}&quick=note`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70" onClick={(e) => e.stopPropagation()} title="Add Note">
                              <NotebookPen className="h-4 w-4" />
                            </Link>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground" title="Open">
                              <Ellipsis className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <div className="rounded-xl bg-muted/20 py-12 text-center text-muted-foreground">
                      <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>{t.noStudentsFound}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border-none">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback></Avatar>
                  <span>{selectedStudent.name}</span>
                  {selectedStudent.onlineStatus === 'online' ? <Badge className="bg-green-500">{t.online}</Badge> : <Badge variant="secondary">{t.offline}</Badge>}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedStudent.email || t.noEmail}</p>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=grades&studentId=${selectedStudent.id}`}><ClipboardCheck className="mr-2 h-4 w-4" />Grades</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/subjects?classId=${classId}`}><Library className="mr-2 h-4 w-4" />Subjects</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=analytics&studentId=${selectedStudent.id}`}><ListChecks className="mr-2 h-4 w-4" />Completion</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}`}><CalendarDays className="mr-2 h-4 w-4" />Attendance</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/other/materials?classId=${classId}`}><FolderOpen className="mr-2 h-4 w-4" />Files</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}&quick=note`}><NotebookPen className="mr-2 h-4 w-4" />Notes</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=grades&studentId=${selectedStudent.id}`}><Plus className="mr-2 h-4 w-4" />Assign HW</Link></Button>
                </div>

                <div className="rounded-xl bg-muted/35 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <span>Last activity: {formatLastSeen(selectedStudent.recentActivity?.[0]?.createdAt || selectedStudent.lastSeen || null)}</span>
                    <span>Last note: {selectedStudent.recentActivity?.find((event) => event.action.toLowerCase().includes('note'))?.createdAt ? new Date(selectedStudent.recentActivity.find((event) => event.action.toLowerCase().includes('note'))!.createdAt).toLocaleDateString() : '-'}</span>
                    <span>Recent submissions: {selectedStudent.recentSubmissions.length}</span>
                  </div>
                </div>

                {selectedStudent.recentActivity.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Recent timeline</h4>
                    <div className="space-y-2">
                      {selectedStudent.recentActivity.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex items-center gap-2 rounded-xl bg-muted/30 p-2 text-sm">
                          <Activity className="h-3.5 w-3.5 text-foreground/70" />
                          <span className="flex-1 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-xl rounded-2xl border-none">
          {selectedTeacher && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTeacher.email || selectedTeacher.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=grades`}><Library className="mr-2 h-4 w-4" />View grades</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=group`}><Users className="mr-2 h-4 w-4" />Manage group</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=analytics`}><Activity className="mr-2 h-4 w-4" />View analytics</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=settings`}><Settings className="mr-2 h-4 w-4" />View settings</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=invite`}><UserPlus className="mr-2 h-4 w-4" />Invite people</Link></Button>
                  <Button variant="outline" asChild><Link prefetch={false} href={`/class/${classId}?tab=attendance`}><Clock className="mr-2 h-4 w-4" />Attendance</Link></Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


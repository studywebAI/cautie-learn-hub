'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronRight, MessageSquare, Info, Pencil, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, any>;
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

export function GroupTab({ classId, cachedData, parentLoading = false }: GroupTabProps) {
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
  const [renameMode, setRenameMode] = useState(false);
  const [renameStudent, setRenameStudent] = useState<Student | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  useEffect(() => {
    setSelectedStudent(null);
    setSelectedTeacher(null);
    setRenameStudent(null);
    setRenameValue('');
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
    window.localStorage.setItem(
      `group-panel-state:${classId}`,
      JSON.stringify({ teachersCollapsed, studentsCollapsed })
    );
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
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatLastSeen = (value: string | null) => {
    if (!value) return 'never';
    const date = new Date(value);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const saveStudentRename = async () => {
    if (!renameStudent) return;
    setSavingRename(true);
    try {
      const response = await fetch(`/api/classes/${classId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: renameStudent.id,
          display_name: renameValue.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save rename');
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((student) =>
            student.id === renameStudent.id
              ? { ...student, name: renameValue.trim() || 'Unnamed student' }
              : student
          ),
        };
      });
      setSelectedStudent((prev) =>
        prev && prev.id === renameStudent.id
          ? { ...prev, name: renameValue.trim() || 'Unnamed student' }
          : prev
      );
      setRenameStudent(null);
      setRenameValue('');
      void logClassTabEvent({
        classId,
        tab: 'group',
        event: 'student_renamed',
        stage: 'action',
        level: 'info',
        meta: { student_id: renameStudent.id },
      });
    } catch (error) {
      console.error('Rename failed:', error);
    } finally {
      setSavingRename(false);
    }
  };

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
            <Button variant="outline" onClick={() => void fetchGroupData()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedStudents = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTeachers = [...data.teachers].sort((a, b) => (a.email || a.name).localeCompare(b.email || b.name));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-none shadow-none">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTeachersCollapsed((v) => !v)}
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
              {!teachersCollapsed && (
                <CardContent className="space-y-2">
                  {sortedTeachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noTeachers}</p>
                  ) : (
                    sortedTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        className="w-full rounded-xl bg-muted/30 p-3 text-left transition-colors hover:bg-muted/55"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        <p className="truncate font-medium">{teacher.email || teacher.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(teacher.subjects || []).map((s) => s.title).join(', ') || 'No linked subjects yet'}
                        </p>
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
                    <button
                      type="button"
                      onClick={() => setStudentsCollapsed((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-left"
                      aria-label={studentsCollapsed ? t.expand : t.collapse}
                    >
                      {studentsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h3 className="text-base font-semibold">{t.students}</h3>
                    </button>
                    {!studentsCollapsed && <p className="text-xs text-muted-foreground">{t.studentListHint}</p>}
                  </div>
                  {!studentsCollapsed && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {sortedStudents.length} {t.people}
                      </span>
                      <Button
                        variant={renameMode ? 'default' : 'outline'}
                        size="sm"
                        className="h-7"
                        onClick={() => setRenameMode((prev) => !prev)}
                      >
                        Rename students
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>

              {!studentsCollapsed && (
                <div className="space-y-2 px-6 pb-6">
                  {sortedStudents.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      className="w-full rounded-xl bg-muted/35 px-3 py-2 text-left transition-colors hover:bg-muted/55"
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
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{student.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{student.email || t.noEmail}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=logs&student_id=${student.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70"
                            onClick={(e) => e.stopPropagation()}
                            title="View timeline"
                          >
                            <Info className="h-4 w-4" />
                          </Link>
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=attendance&studentId=${student.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70"
                            onClick={(e) => e.stopPropagation()}
                            title="Attendance"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Link>
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=attendance&studentId=${student.id}&quick=event`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70"
                            onClick={(e) => e.stopPropagation()}
                            title="Add custom event"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                          {renameMode && (
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-background/70"
                              onClick={(event) => {
                                event.stopPropagation();
                                setRenameStudent(student);
                                setRenameValue(student.name);
                              }}
                              title="Rename student"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}

                  {sortedStudents.length === 0 && (
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
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border-none">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback>
                  </Avatar>
                  <span>{selectedStudent.name}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedStudent.email || t.noEmail}</p>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=grades&studentId=${selectedStudent.id}`}>
                      Grades
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/subjects?classId=${classId}`}>
                      Subjects
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=analytics&studentId=${selectedStudent.id}`}>
                      Completion
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}`}>
                      Attendance
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/other/materials?classId=${classId}`}>
                      Files
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}&quick=event`}>
                      Assign Event
                    </Link>
                  </Button>
                </div>

                {selectedStudent.recentActivity.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Recent events</h4>
                    <div className="space-y-2">
                      {selectedStudent.recentActivity.slice(0, 8).map((activity) => (
                        <div key={activity.id} className="rounded-xl bg-muted/30 p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {activity.details?.actor_name && (
                            <p className="mt-1 text-xs text-muted-foreground">By {String(activity.details.actor_name)}</p>
                          )}
                          {activity.details?.custom_message && (
                            <p className="mt-1 text-xs text-muted-foreground">{String(activity.details.custom_message)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-muted/35 p-3 text-sm text-muted-foreground">
                  Last activity: {formatLastSeen(selectedStudent.recentActivity?.[0]?.createdAt || selectedStudent.lastSeen || null)}
                </div>
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
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance`}>
                      Attendance
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=grades`}>
                      Grades
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=analytics`}>
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=logs`}>
                      Logs
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameStudent} onOpenChange={() => setRenameStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename student</DialogTitle>
            <DialogDescription>
              This name is saved only for this class and stored server-side.
            </DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={100} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameStudent(null)} disabled={savingRename}>
              Cancel
            </Button>
            <Button onClick={() => void saveStudentRename()} disabled={savingRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronRight, MessageSquare, Info, Pencil, Check, Settings, CircleHelp, MoreHorizontal } from 'lucide-react';
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
    noEmail: isDutch ? 'Gast' : 'Guest',
    people: isDutch ? 'personen' : 'people',
    teacherListHint: isDutch ? 'Klik een docent om gekoppelde vakken te bekijken' : 'Click a teacher to view linked subjects',
    studentListHint: isDutch ? 'Klik een leerling voor acties en details' : 'Click a student for actions and details',
    expand: isDutch ? 'Uitklappen' : 'Expand',
    collapse: isDutch ? 'Inklappen' : 'Collapse',
    settings: isDutch ? 'Instellingen' : 'Settings',
    rename: isDutch ? 'Hernoemen' : 'Rename',
    help: isDutch ? 'Help' : 'Help',
    renameHint: isDutch ? 'Selecteer een leerling om te hernoemen.' : 'Select a student to rename.',
    renameSavedHint: isDutch
      ? 'Naam is klasgebonden en wordt in Supabase opgeslagen.'
      : 'Rename is class-scoped and syncs to the class member alias in Supabase.',
    renameVisibleHint: isDutch
      ? 'Nieuwe naam is direct zichtbaar in Groep, Aanwezigheid en Logs.'
      : 'The new name appears immediately in Group, Attendance, and Logs after save.',
    renameStudent: isDutch ? 'Leerling hernoemen' : 'Rename student',
    renameDescription: isDutch ? 'Deze naam wordt alleen voor deze klas opgeslagen.' : 'This name is saved only for this class and stored server-side.',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    save: isDutch ? 'Opslaan' : 'Save',
    noLinkedSubjects: isDutch ? 'Nog geen gekoppelde vakken' : 'No linked subjects yet',
    grades: isDutch ? 'Cijfers' : 'Grades',
    subjects: isDutch ? 'Vakken' : 'Subjects',
    completion: isDutch ? 'Voltooiing' : 'Completion',
    attendance: isDutch ? 'Aanwezigheid' : 'Attendance',
    files: isDutch ? 'Bestanden' : 'Files',
    assignEvent: isDutch ? 'Event toevoegen' : 'Assign Event',
    logs: isDutch ? 'Logs' : 'Logs',
    activity: isDutch ? 'Activiteit' : 'Activity',
  };

  const [data, setData] = useState<GroupData | null>(cachedData || null);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teachersCollapsed, setTeachersCollapsed] = useState(false);
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [groupSettingsSection, setGroupSettingsSection] = useState<'rename' | 'help'>('rename');
  const [renameStudent, setRenameStudent] = useState<Student | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [logCodeQuery, setLogCodeQuery] = useState('');

  useEffect(() => {
    setSelectedStudent(null);
    setSelectedTeacher(null);
    setRenameStudent(null);
    setRenameValue('');
    setGroupSettingsOpen(false);
    setGroupSettingsSection('rename');
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
      setGroupSettingsOpen(false);
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
      <div className="class-panel py-8 text-center text-muted-foreground">
        <div className="space-y-3">
          <p>{error || t.failedLoad}</p>
          <Button variant="outline" onClick={() => void fetchGroupData()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const sortedStudents = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTeachers = [...data.teachers].sort((a, b) => (a.email || a.name).localeCompare(b.email || b.name));

  return (
    <div className="class-shell" data-testid="group-tab">
      <div className="space-y-3 p-1 md:p-1">
          <div className="relative flex items-center justify-end">
            <Button
              variant={groupSettingsOpen ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-2 rounded-md border-sidebar-border/70 bg-sidebar-accent/35 hover:bg-sidebar-accent/55"
              onClick={() => setGroupSettingsOpen((prev) => !prev)}
            >
              <Settings className="h-4 w-4" />
              {t.settings}
            </Button>
            {groupSettingsOpen && (
              <div className="absolute right-0 top-11 z-20 flex w-full max-w-[520px] overflow-hidden rounded-md bg-background md:w-[520px]">
                <div className="w-44 border-r border-sidebar-border/80 bg-sidebar-accent/20 p-2">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${groupSettingsSection === 'rename' ? 'bg-muted/70 text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                    onClick={() => setGroupSettingsSection('rename')}
                  >
                    <Pencil className="h-4 w-4" />
                    {t.rename}
                  </button>
                  <button
                    type="button"
                    className={`mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${groupSettingsSection === 'help' ? 'bg-muted/70 text-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
                    onClick={() => setGroupSettingsSection('help')}
                  >
                    <CircleHelp className="h-4 w-4" />
                    {t.help}
                  </button>
                </div>
                <div className="flex-1 bg-background p-3">
                  {groupSettingsSection === 'rename' ? (
                    <div className="space-y-2">
                      <p className="text-sm">{t.renameHint}</p>
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {sortedStudents.map((student) => (
                          <button
                            key={`rename-${student.id}`}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                            onClick={() => {
                              setRenameStudent(student);
                              setRenameValue(student.name);
                            }}
                          >
                            <div className="min-w-0">
                              <p className="truncate">{student.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{student.email || t.noEmail}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{t.renameSavedHint}</p>
                      <p>{t.renameVisibleHint}</p>
                      <div className="space-y-2 rounded-lg bg-muted/20 p-2">
                        <p className="text-xs uppercase tracking-wide">{isDutch ? 'Log code hulp' : 'Log code help'}</p>
                        <Input
                          value={logCodeQuery}
                          onChange={(event) => setLogCodeQuery(event.target.value.toUpperCase())}
                          placeholder={isDutch ? 'Voer code in (bv. EVT-ATT-001)' : 'Enter code (e.g. EVT-ATT-001)'}
                          className="h-9"
                        />
                        <div className="space-y-1 text-xs">
                          {(isDutch
                            ? [
                                ['EVT-ATT-001', 'Aanwezigheidsstatus aangepast (check of x).'],
                                ['EVT-ATT-002', 'Huiswerk-markering gewijzigd.'],
                                ['EVT-ATT-003', 'Te-laat markering gewijzigd.'],
                                ['EVT-CUS-001', 'Aangepast eventbericht toegevoegd.'],
                                ['ROS-MEM-001', 'Leerlingnaam in deze klas hernoemd.'],
                              ]
                            : [
                                ['EVT-ATT-001', 'Attendance state changed (check or x).'],
                                ['EVT-ATT-002', 'Homework flag changed.'],
                                ['EVT-ATT-003', 'Late flag changed.'],
                                ['EVT-CUS-001', 'Custom event message added.'],
                                ['ROS-MEM-001', 'Student alias renamed for this class.'],
                              ]
                          )
                            .filter(([code]) => !logCodeQuery || code.includes(logCodeQuery))
                            .map(([code, description]) => (
                              <div key={code} className="rounded-md bg-background/80 px-2 py-1">
                                <p className="font-mono text-[11px] text-foreground">{code}</p>
                                <p>{description}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="class-panel" data-testid="group-section-teachers">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setTeachersCollapsed((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-left"
                    aria-label={teachersCollapsed ? t.expand : t.collapse}
                  >
                    {teachersCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h3 className="text-base font-normal" data-testid="group-heading-teachers">{t.teachers}</h3>
                    </button>
                  <span className="text-xs text-muted-foreground">
                    {data.teachers.length} {t.people}
                  </span>
                </div>
                {!teachersCollapsed && <p className="text-xs text-muted-foreground">{t.teacherListHint}</p>}
              {!teachersCollapsed && (
                <div className="mt-3 space-y-1.5">
                  {sortedTeachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noTeachers}</p>
                  ) : (
                    sortedTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        className="group flex w-full items-center gap-3 rounded-md surface-panel px-3 py-2 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{teacher.email || teacher.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {(teacher.subjects || []).map((s) => s.title).join(', ') || t.noLinkedSubjects}
                          </p>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="class-panel" data-testid="group-section-students">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => setStudentsCollapsed((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-left"
                      aria-label={studentsCollapsed ? t.expand : t.collapse}
                    >
                      {studentsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h3 className="text-base" data-testid="group-heading-students">{t.students}</h3>
                    </button>
                    {!studentsCollapsed && <p className="text-xs text-muted-foreground">{t.studentListHint}</p>}
                  </div>
                  {!studentsCollapsed && (
                    <div className="flex items-center gap-2 pr-1">
                      <span className="text-xs text-muted-foreground">
                        {sortedStudents.length} {t.people}
                      </span>
                    </div>
                  )}
                </div>

              {!studentsCollapsed && (
                <div className="mt-3 space-y-1.5">
                  {sortedStudents.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      data-testid={`group-student-row-${student.id}`}
                      className="group flex items-center gap-3 rounded-md surface-panel px-3 py-2 text-left transition-colors hover:bg-[hsl(var(--interactive-hover))]"
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
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{student.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{student.email || t.noEmail}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=logs&student_id=${student.id}&category=events`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/35 hover:bg-sidebar-accent/60"
                            onClick={(e) => e.stopPropagation()}
                            title={isDutch ? 'Bekijk tijdlijn' : 'View timeline'}
                          >
                            <Info className="h-4 w-4" />
                          </Link>
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=attendance&studentId=${student.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/35 hover:bg-sidebar-accent/60"
                            onClick={(e) => e.stopPropagation()}
                            title={t.attendance}
                          >
                            <Check className="h-4 w-4" />
                          </Link>
                          <Link
                            prefetch={false}
                            href={`/class/${classId}?tab=attendance&studentId=${student.id}&quick=event`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/35 hover:bg-sidebar-accent/60"
                            onClick={(e) => e.stopPropagation()}
                            title={isDutch ? 'Aangepast event toevoegen' : 'Add custom event'}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/35 hover:bg-sidebar-accent/60"
                            onClick={(e) => {
                              e.stopPropagation();
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
                            title={isDutch ? 'Meer acties' : 'More actions'}
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}

                  {sortedStudents.length === 0 && (
                    <div className="rounded-md surface-panel py-10 text-center text-foreground/75">
                      <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>{t.noStudentsFound}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-md border-0">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedStudent.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedStudent.email || t.noEmail}</p>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=grades&studentId=${selectedStudent.id}`}>
                      {t.grades}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/subjects?classId=${classId}`}>
                      {t.subjects}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=analytics&studentId=${selectedStudent.id}`}>
                      {t.completion}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}&quick=timeline`}>
                      {t.attendance}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/other/materials?classId=${classId}`}>
                      {t.files}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance&studentId=${selectedStudent.id}&quick=event`}>
                      {t.assignEvent}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=logs&student_id=${selectedStudent.id}&category=events`}>
                      {t.logs}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=logs&student_id=${selectedStudent.id}&category=all`}>
                      {t.activity}
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-xl rounded-md border-0">
          {selectedTeacher && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTeacher.email || selectedTeacher.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=attendance`}>
                      {t.attendance}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=grades`}>
                      {t.grades}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=analytics`}>
                      {isDutch ? 'Analyse' : 'Analytics'}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link prefetch={false} href={`/class/${classId}?tab=logs`}>
                      {t.logs}
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
            <DialogTitle>{t.renameStudent}</DialogTitle>
            <DialogDescription>
              {t.renameDescription}
            </DialogDescription>
          </DialogHeader>
          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={100} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameStudent(null)} disabled={savingRename}>
              {t.cancel}
            </Button>
            <Button onClick={() => void saveStudentRename()} disabled={savingRename}>
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


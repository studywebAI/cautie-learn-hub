'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCheck, XCircle, MessageSquareText, Clock3, NotebookPen, History, UserCheck, UserX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';

type StudentAttendance = {
  id: string;
  name: string;
  email: string | null;
  isPresent: boolean | null;
  hasHomeworkIncomplete: boolean;
  wasTooLate: boolean;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, any>;
    createdAt: string;
  }>;
  stats: {
    totalAbsent: number;
    totalHomeworkIncomplete: number;
    totalTooLate: number;
  };
};

type AttendanceTabProps = {
  classId: string;
  cachedData?: { students?: StudentAttendance[] } | null;
  parentLoading?: boolean;
};

type PendingAction = {
  studentId: string;
  isPresent: boolean;
  hasHomeworkIncomplete?: boolean;
  wasTooLate?: boolean;
  customMessage?: string;
  logCustomEvent?: boolean;
};

export function AttendanceTab({ classId, cachedData = null, parentLoading = false }: AttendanceTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const isDutch = appContext?.language === 'nl';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentAttendance[]>(cachedData?.students || []);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [timelineStudentId, setTimelineStudentId] = useState<string | null>(null);
  const [isCustomEventDialogOpen, setIsCustomEventDialogOpen] = useState(false);
  const [customEventText, setCustomEventText] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_CLASS_PREFERENCES);
  const [logCustomEvent, setLogCustomEvent] = useState(true);
  const [processingStudentIds, setProcessingStudentIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const { toast } = useToast();
  const selectedStudentId = searchParams?.get('studentId') || '';
  const quickAction = searchParams?.get('quick') || '';
  const t = {
    attendance: isDutch ? 'Aanwezigheid' : 'Attendance',
    students: isDutch ? 'leerlingen' : 'students',
    allStudents: isDutch ? 'Alle leerlingen' : 'All students',
    noEmail: isDutch ? 'Gast' : 'Guest',
    viewTimeline: isDutch ? 'Bekijk tijdlijn' : 'View timeline',
    homeworkIncomplete: isDutch ? 'Huiswerk onvolledig' : 'Homework incomplete',
    late: isDutch ? 'Te laat' : 'Late',
    addCustomEvent: isDutch ? 'Aangepast event toevoegen' : 'Add custom event',
    addAttendanceNote: isDutch ? 'Notitie' : 'Note',
    present: isDutch ? 'Aanwezig' : 'Present',
    absent: isDutch ? 'Afwezig' : 'Absent',
    bulkPresent: isDutch ? 'Markeer alles aanwezig' : 'Mark all present',
    bulkAbsent: isDutch ? 'Markeer alles afwezig' : 'Mark all absent',
    showingOneStudent: isDutch ? 'Toont een leerling vanuit Groep.' : 'Showing one student from Group tab.',
    showAll: isDutch ? 'Toon alles' : 'Show all',
    noStudentsYet: isDutch ? 'Nog geen leerlingen in deze klas.' : 'No students in this class yet.',
    confirmTitle: isDutch ? 'Bevestig aanwezigheidswijziging' : 'Confirm attendance change',
    confirmDescription: isDutch ? 'Weet je zeker dat je deze wijziging wilt toepassen?' : 'Are you sure you want to apply this attendance update?',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    confirm: isDutch ? 'Bevestigen' : 'Confirm',
    customEventFor: isDutch ? 'Aangepast event voor' : 'Custom event for',
    customEventDescription: isDutch ? 'Voeg een aangepast bericht toe voor dit event.' : 'Add a custom message for this student event.',
    saveEvent: isDutch ? 'Event opslaan' : 'Save event',
    quickReason: isDutch ? 'Snelle reden' : 'Quick reason',
    alsoLogEvent: isDutch ? 'Ook toevoegen aan class logs' : 'Also add to class logs',
    reasonLateTraffic: isDutch ? 'Te laat door vervoer' : 'Late due to transport',
    reasonMaterialMissing: isDutch ? 'Materiaal vergeten' : 'Forgot materials',
    reasonBehavior: isDutch ? 'Klasgedrag besproken' : 'Behavior discussed',
    reasonParentContact: isDutch ? 'Oudercontact gepland' : 'Parent contact planned',
    timeline: isDutch ? 'tijdlijn' : 'timeline',
    timelineDescription: isDutch ? 'Recente aanwezigheid en events met docent en datum.' : 'Recent attendance and custom events with teacher and date.',
    noEventsYet: isDutch ? 'Nog geen events.' : 'No events yet.',
    teacher: isDutch ? 'Docent' : 'Teacher',
    loadingLogs: isDutch ? 'Laden...' : 'Loading...',
    viewLogs: isDutch ? 'Bekijk logs' : 'View logs',
    unnamedStudent: isDutch ? 'Naamloze leerling' : 'Unnamed student',
  };

  const fetchAttendance = async (forceRefresh = false) => {
    const shouldKeepCurrentRowsVisible = !forceRefresh && students.length > 0;
    if (!shouldKeepCurrentRowsVisible) {
      setLoading(true);
    }
    void logClassTabEvent({
      classId,
      tab: 'attendance',
      event: 'load_start',
      stage: 'data',
      level: 'debug',
      meta: { force_refresh: forceRefresh },
    });

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
        void logClassTabEvent({
          classId,
          tab: 'attendance',
          event: 'load_success',
          stage: 'data',
          level: 'debug',
          meta: { student_count: (data.students || []).length },
        });
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      void logClassTabEvent({
        classId,
        tab: 'attendance',
        event: 'load_error',
        stage: 'data',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      if (!shouldKeepCurrentRowsVisible) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setStudents(cachedData?.students || []);
    setLoading(!cachedData && !parentLoading);
  }, [classId, cachedData, parentLoading]);

  useEffect(() => {
    if (cachedData?.students?.length) {
      setStudents(cachedData.students);
      setLoading(false);
    }
  }, [cachedData]);

  useEffect(() => {
    void logClassTabEvent({
      classId,
      tab: 'attendance',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
    if (!cachedData?.students?.length) {
      void fetchAttendance();
    }

    const loadPreferences = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}`);
        if (!response.ok) return;
        const data = await response.json();
        setPreferences(normalizeClassPreferences(data.preferences || {}));
      } catch {
        setPreferences(DEFAULT_CLASS_PREFERENCES);
      }
    };

    void loadPreferences();
  }, [classId, cachedData]);

  useEffect(() => {
    if (!selectedStudentId || !quickAction) return;
    const student = students.find((entry) => entry.id === selectedStudentId);
    if (!student) return;
    if (quickAction === 'event') {
      setSelectedStudent(student);
      setCustomEventText('');
      setLogCustomEvent(true);
      setIsCustomEventDialogOpen(true);
      return;
    }
    if (quickAction === 'timeline') {
      setTimelineStudentId(student.id);
      return;
    }
    if (quickAction === 'present') {
      handleAttendanceToggle(student.id, true);
      return;
    }
    if (quickAction === 'absent') {
      handleAttendanceToggle(student.id, false);
      return;
    }
    if (quickAction === 'homework') {
      handleFlagToggle(student.id, 'hasHomeworkIncomplete', !student.hasHomeworkIncomplete);
      return;
    }
    if (quickAction === 'late') {
      handleFlagToggle(student.id, 'wasTooLate', !student.wasTooLate);
      return;
    }
  }, [quickAction, selectedStudentId, students]);

  const formatActivityLabel = (action: string, details?: Record<string, any>) => {
    if (action === 'attendance_state_changed') {
      if (details?.to_is_present === true) return isDutch ? 'Aanwezig gemarkeerd' : 'Marked present';
      if (details?.to_is_present === false) return isDutch ? 'Afwezig gemarkeerd' : 'Marked absent';
      return isDutch ? 'Aanwezigheid bijgewerkt' : 'Attendance updated';
    }

    if (action === 'attendance_event_homework_incomplete') {
      if (details?.to_active === true) return isDutch ? 'Huiswerk onvolledig aangezet' : 'Homework incomplete enabled';
      if (details?.to_active === false) return isDutch ? 'Huiswerk onvolledig uitgezet' : 'Homework incomplete disabled';
      return isDutch ? 'Huiswerkstatus bijgewerkt' : 'Homework status updated';
    }

    if (action === 'attendance_event_late') {
      if (details?.to_active === true) return isDutch ? 'Te laat aangezet' : 'Late flag enabled';
      if (details?.to_active === false) return isDutch ? 'Te laat uitgezet' : 'Late flag disabled';
      return isDutch ? 'Te-laatstatus bijgewerkt' : 'Late status updated';
    }

    if (action === 'attendance_event_custom') {
      return isDutch ? 'Aangepaste notitie toegevoegd' : 'Custom note added';
    }

    return String(action || '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const patchStudentLocal = (studentId: string, updates: Partial<StudentAttendance>) => {
    setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, ...updates } : student)));
  };

  const rollbackStudent = (studentId: string, snapshot: StudentAttendance | undefined) => {
    if (!snapshot) return;
    setStudents((prev) => prev.map((student) => (student.id === studentId ? snapshot : student)));
  };

  const postAttendanceAction = async (action: PendingAction, optimisticPatch: Partial<StudentAttendance>) => {
    const previous = students.find((student) => student.id === action.studentId);
    setProcessingStudentIds((prev) => new Set(prev).add(action.studentId));
    patchStudentLocal(action.studentId, optimisticPatch);

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        rollbackStudent(action.studentId, previous);
        throw new Error(`Failed to update attendance (${response.status})`);
      }

      clearQuickAction();
      const noop = Boolean(payload?.noop);
      if (!noop) {
        toast({
          title: isDutch ? 'Opgeslagen' : 'Saved',
          description: isDutch ? 'Aanwezigheid bijgewerkt.' : 'Attendance updated.',
        });
      }
      void fetchAttendance(true);
      void logClassTabEvent({
        classId,
        tab: 'attendance',
        event: 'attendance_update_success',
        stage: 'action',
        level: 'info',
        meta: action,
      });
    } catch (error) {
      rollbackStudent(action.studentId, previous);
      console.error('Failed to update attendance:', error);
      void logClassTabEvent({
        classId,
        tab: 'attendance',
        event: 'attendance_update_error',
        stage: 'action',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      toast({
        variant: 'destructive',
        title: isDutch ? 'Opslaan mislukt' : 'Save failed',
        description: isDutch ? 'Aanwezigheid kon niet worden bijgewerkt.' : 'Attendance update could not be saved.',
      });
    } finally {
      setProcessingStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(action.studentId);
        return next;
      });
    }
  };

  const handleAttendanceToggle = (studentId: string, isPresent: boolean) => {
    const student = students.find((entry) => entry.id === studentId);
    const action: PendingAction = {
      studentId,
      isPresent,
      hasHomeworkIncomplete: student?.hasHomeworkIncomplete ?? false,
      wasTooLate: student?.wasTooLate ?? false,
    };

    if (!preferences.attendance_require_confirmation) {
      void postAttendanceAction(action, { isPresent });
      return;
    }

    setPendingAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    await postAttendanceAction(pendingAction, { isPresent: pendingAction.isPresent });
    setIsConfirmDialogOpen(false);
    setPendingAction(null);
  };

  const handleFlagToggle = (studentId: string, field: 'hasHomeworkIncomplete' | 'wasTooLate', value: boolean) => {
    const student = students.find((entry) => entry.id === studentId);
    if (!student) return;

    const action: PendingAction = {
      studentId,
      isPresent: student.isPresent ?? true,
      hasHomeworkIncomplete: field === 'hasHomeworkIncomplete' ? value : student.hasHomeworkIncomplete,
      wasTooLate: field === 'wasTooLate' ? value : student.wasTooLate,
    };

    const optimisticPatch: Partial<StudentAttendance> = {
      [field]: value,
    };

    if (!preferences.attendance_require_confirmation) {
      void postAttendanceAction(action, optimisticPatch);
      return;
    }

    setPendingAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleBulkAttendance = async (isPresent: boolean) => {
    if (visibleStudents.length === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        visibleStudents.map((student) =>
          postAttendanceAction(
            {
              studentId: student.id,
              isPresent,
              hasHomeworkIncomplete: student.hasHomeworkIncomplete,
              wasTooLate: student.wasTooLate,
            },
            { isPresent }
          )
        )
      );
      toast({
        title: isDutch ? 'Bulk update voltooid' : 'Bulk update completed',
        description: isDutch
          ? `${visibleStudents.length} leerlingen bijgewerkt.`
          : `Updated ${visibleStudents.length} students.`,
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleSaveCustomEvent = async () => {
    if (!selectedStudent || !customEventText.trim()) return;

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          isPresent: selectedStudent.isPresent ?? true,
          hasHomeworkIncomplete: selectedStudent.hasHomeworkIncomplete,
          wasTooLate: selectedStudent.wasTooLate,
          customMessage: customEventText.trim(),
          logCustomEvent,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to save custom event (${response.status})`);
      }

      clearQuickAction();
      toast({
        title: isDutch ? 'Opgeslagen' : 'Saved',
        description: isDutch ? 'Aangepast event opgeslagen.' : 'Custom event saved.',
      });
      void fetchAttendance(true);
      void logClassTabEvent({
        classId,
        tab: 'attendance',
        event: 'custom_event_saved',
        stage: 'action',
        level: 'info',
        meta: { student_id: selectedStudent.id },
      });
    } catch (error) {
      console.error('Failed to save custom event:', error);
      void logClassTabEvent({
        classId,
        tab: 'attendance',
        event: 'custom_event_save_error',
        stage: 'action',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      toast({
        variant: 'destructive',
        title: isDutch ? 'Opslaan mislukt' : 'Save failed',
        description: isDutch ? 'Aangepast event kon niet worden opgeslagen.' : 'Custom event could not be saved.',
      });
    }

    setIsCustomEventDialogOpen(false);
    setCustomEventText('');
  };

  const visibleStudents = selectedStudentId
    ? students.filter((student) => student.id === selectedStudentId)
    : students;
  const timelineStudent = timelineStudentId
    ? students.find((student) => student.id === timelineStudentId) || null
    : null;

  const applyStudentFilter = (studentId: string) => {
    const nextParams = new URLSearchParams(searchParams?.toString() || '');
    nextParams.set('tab', 'attendance');
    nextParams.delete('quick');
    if (studentId) {
      nextParams.set('studentId', studentId);
    } else {
      nextParams.delete('studentId');
    }
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const clearQuickAction = () => {
    if (!quickAction) return;
    const nextParams = new URLSearchParams(searchParams?.toString() || '');
    nextParams.set('tab', 'attendance');
    nextParams.delete('quick');
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">{t.attendance}</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{visibleStudents.length} {t.students}</p>
          <Select value={selectedStudentId || 'all'} onValueChange={(value) => applyStudentFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder={t.allStudents} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStudents}</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name || t.unnamedStudent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => void handleBulkAttendance(true)}
            disabled={bulkSaving || visibleStudents.length === 0}
          >
            {t.bulkPresent}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => void handleBulkAttendance(false)}
            disabled={bulkSaving || visibleStudents.length === 0}
          >
            {t.bulkAbsent}
          </Button>
        </div>
      </div>

      {selectedStudentId && (
        <div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          {t.showingOneStudent}
          <Link prefetch={false} href={`/class/${classId}?tab=attendance`} className="ml-2 underline underline-offset-2">
            {t.showAll}
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {visibleStudents.map((student) => (
          <div
            key={student.id}
            data-testid={`attendance-student-row-${student.id}`}
            className={`rounded-xl bg-muted/25 px-3 py-2.5 transition-colors ${
              selectedStudentId === student.id ? 'bg-muted/45' : 'hover:bg-muted/35'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate">{student.name || t.unnamedStudent}</p>
                <p className="truncate text-xs text-muted-foreground">{student.email || t.noEmail}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  data-testid={`attendance-action-info-${student.id}`}
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1 rounded-xl px-2 text-xs"
                  aria-label={t.viewTimeline}
                  onClick={() => setTimelineStudentId(student.id)}
                  title={t.viewTimeline}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>{t.viewTimeline}</span>
                </Button>

                <Button
                  data-testid={`attendance-action-homework-${student.id}`}
                  variant={student.hasHomeworkIncomplete ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-10 gap-1 rounded-xl px-2 text-xs"
                  aria-label={t.homeworkIncomplete}
                  disabled={processingStudentIds.has(student.id)}
                  onClick={() => handleFlagToggle(student.id, 'hasHomeworkIncomplete', !student.hasHomeworkIncomplete)}
                  title={t.homeworkIncomplete}
                >
                  <NotebookPen className="h-3.5 w-3.5" />
                  <span>HW</span>
                </Button>

                <Button
                  data-testid={`attendance-action-late-${student.id}`}
                  variant={student.wasTooLate ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-10 gap-1 rounded-xl px-2 text-xs"
                  aria-label={t.late}
                  disabled={processingStudentIds.has(student.id)}
                  onClick={() => handleFlagToggle(student.id, 'wasTooLate', !student.wasTooLate)}
                  title={t.late}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{t.late}</span>
                </Button>

                <Button
                  data-testid={`attendance-action-custom-${student.id}`}
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1 rounded-xl px-2 text-xs"
                  aria-label={t.addAttendanceNote}
                  onClick={() => {
                    setSelectedStudent(student);
                    setCustomEventText('');
                    setLogCustomEvent(true);
                    setIsCustomEventDialogOpen(true);
                  }}
                  title={t.addAttendanceNote}
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span>{t.addAttendanceNote}</span>
                </Button>

                <Button
                  data-testid={`attendance-action-present-${student.id}`}
                  variant={student.isPresent === true ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 gap-1 rounded-xl px-2 text-xs ${student.isPresent === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  aria-label={t.present}
                  disabled={processingStudentIds.has(student.id)}
                  onClick={() => handleAttendanceToggle(student.id, true)}
                  title={t.present}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{t.present}</span>
                </Button>

                <Button
                  data-testid={`attendance-action-absent-${student.id}`}
                  variant={student.isPresent === false ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-10 gap-1 rounded-xl px-2 text-xs"
                  aria-label={t.absent}
                  disabled={processingStudentIds.has(student.id)}
                  onClick={() => handleAttendanceToggle(student.id, false)}
                  title={t.absent}
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>{t.absent}</span>
                </Button>
              </div>

              <div className="hidden items-center gap-2 text-xs sm:flex">
                {student.stats.totalAbsent > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="mr-1 h-3 w-3" />
                    {student.stats.totalAbsent}
                  </Badge>
                )}
                {student.stats.totalHomeworkIncomplete > 0 && (
                  <Badge variant="outline" className="text-xs">
                    HW {student.stats.totalHomeworkIncomplete}
                  </Badge>
                )}
                {student.stats.totalTooLate > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {student.stats.totalTooLate}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t.noStudentsYet}</CardContent>
        </Card>
      )}

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>{t.confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={() => void handleConfirm()}>{t.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomEventDialogOpen} onOpenChange={setIsCustomEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.customEventFor} {selectedStudent?.name}</DialogTitle>
            <DialogDescription>{t.customEventDescription}</DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[100px]"
            placeholder=""
            value={customEventText}
            onChange={(e) => setCustomEventText(e.target.value)}
          />
          <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
            <Label>{t.quickReason}</Label>
            <Select
              value="__none"
              onValueChange={(value) => {
                if (value === '__none') return;
                setCustomEventText(value);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t.quickReason} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">{t.quickReason}</SelectItem>
                <SelectItem value={t.reasonLateTraffic}>{t.reasonLateTraffic}</SelectItem>
                <SelectItem value={t.reasonMaterialMissing}>{t.reasonMaterialMissing}</SelectItem>
                <SelectItem value={t.reasonBehavior}>{t.reasonBehavior}</SelectItem>
                <SelectItem value={t.reasonParentContact}>{t.reasonParentContact}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={logCustomEvent} onCheckedChange={(checked) => setLogCustomEvent(Boolean(checked))} />
            <span>{t.alsoLogEvent}</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomEventDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveCustomEvent} disabled={!customEventText.trim()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              {t.saveEvent}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!timelineStudent} onOpenChange={() => setTimelineStudentId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{timelineStudent?.name || ''} {t.timeline}</DialogTitle>
            <DialogDescription>{t.timelineDescription}</DialogDescription>
          </DialogHeader>
          {timelineStudent && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.replace(`/class/${classId}?tab=logs&student_id=${timelineStudent.id}`)}
              >
                {t.viewLogs}
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {(timelineStudent?.recentActivity || []).length === 0 && (
              <p className="text-sm text-muted-foreground">{t.noEventsYet}</p>
            )}
            {(timelineStudent?.recentActivity || []).map((activity) => (
              <div key={activity.id} className="rounded-md border bg-muted/20 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{formatActivityLabel(activity.action, activity.details)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>
                {activity.details?.actor_name && (
                  <p className="mt-1 text-xs text-muted-foreground">{t.teacher}: {String(activity.details.actor_name)}</p>
                )}
                {activity.details?.custom_message && (
                  <p className="mt-1 text-xs text-muted-foreground">{String(activity.details.custom_message)}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, MessageSquare, Clock, BookOpen, Info } from 'lucide-react';
import { DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

type StudentAttendance = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
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
};

type PendingAction = {
  studentId: string;
  isPresent: boolean;
  hasHomeworkIncomplete?: boolean;
  wasTooLate?: boolean;
};

export function AttendanceTab({ classId }: AttendanceTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [timelineStudent, setTimelineStudent] = useState<StudentAttendance | null>(null);
  const [isCustomEventDialogOpen, setIsCustomEventDialogOpen] = useState(false);
  const [customEventText, setCustomEventText] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_CLASS_PREFERENCES);
  const selectedStudentId = searchParams?.get('studentId') || '';
  const quickAction = searchParams?.get('quick') || '';

  const fetchAttendance = async (forceRefresh = false) => {
    if (!forceRefresh && students.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    void logClassTabEvent({
      classId,
      tab: 'attendance',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
    void fetchAttendance();

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
  }, [classId]);

  useEffect(() => {
    if (!selectedStudentId || !quickAction) return;
    const student = students.find((entry) => entry.id === selectedStudentId);
    if (!student) return;
    if (quickAction === 'event') {
      setSelectedStudent(student);
      setCustomEventText('');
      setIsCustomEventDialogOpen(true);
    }
  }, [quickAction, selectedStudentId, students]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatActivityLabel = (action: string) =>
    String(action || '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const patchStudentLocal = (studentId: string, updates: Partial<StudentAttendance>) => {
    setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, ...updates } : student)));
  };

  const rollbackStudent = (studentId: string, snapshot: StudentAttendance | undefined) => {
    if (!snapshot) return;
    setStudents((prev) => prev.map((student) => (student.id === studentId ? snapshot : student)));
  };

  const postAttendanceAction = async (action: PendingAction, optimisticPatch: Partial<StudentAttendance>) => {
    const previous = students.find((student) => student.id === action.studentId);
    patchStudentLocal(action.studentId, optimisticPatch);

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        rollbackStudent(action.studentId, previous);
        throw new Error(`Failed to update attendance (${response.status})`);
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
        }),
      });

      if (response.ok) {
        void fetchAttendance(true);
        void logClassTabEvent({
          classId,
          tab: 'attendance',
          event: 'custom_event_saved',
          stage: 'action',
          level: 'info',
          meta: { student_id: selectedStudent.id },
        });
      }
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
    }

    setIsCustomEventDialogOpen(false);
    setCustomEventText('');
  };

  const visibleStudents = selectedStudentId
    ? students.filter((student) => student.id === selectedStudentId)
    : students;

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{visibleStudents.length} students</p>
          <select
            value={selectedStudentId}
            onChange={(event) => applyStudentFilter(event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStudentId && (
        <div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          Showing one student from Group tab.
          <a href={`/class/${classId}?tab=attendance`} className="ml-2 underline underline-offset-2">
            Show all
          </a>
        </div>
      )}

      <div className="space-y-2">
        {visibleStudents.map((student) => (
          <div
            key={student.id}
            className={`rounded-xl bg-muted/25 px-3 py-2.5 transition-colors ${
              selectedStudentId === student.id ? 'bg-muted/45' : 'hover:bg-muted/35'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{student.name}</p>
                <p className="truncate text-xs text-muted-foreground">{student.email || 'No email'}</p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setTimelineStudent(student)}
                  title="View timeline"
                >
                  <Info className="h-4 w-4" />
                </Button>

                <Button
                  variant={student.hasHomeworkIncomplete ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFlagToggle(student.id, 'hasHomeworkIncomplete', !student.hasHomeworkIncomplete)}
                  title="Homework incomplete"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>

                <Button
                  variant={student.wasTooLate ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFlagToggle(student.id, 'wasTooLate', !student.wasTooLate)}
                  title="Late"
                >
                  <Clock className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedStudent(student);
                    setCustomEventText('');
                    setIsCustomEventDialogOpen(true);
                  }}
                  title="Add custom event"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>

                <Button
                  variant={student.isPresent === true ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 w-8 p-0 ${student.isPresent === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => handleAttendanceToggle(student.id, true)}
                  title="Present"
                >
                  <Check className="h-4 w-4" />
                </Button>

                <Button
                  variant={student.isPresent === false ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleAttendanceToggle(student.id, false)}
                  title="Absent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="hidden items-center gap-2 text-xs sm:flex">
                {student.stats.totalAbsent > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <X className="mr-1 h-3 w-3" />
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
                    <Clock className="mr-1 h-3 w-3" />
                    {student.stats.totalTooLate}
                  </Badge>
                )}
              </div>
            </div>

            {student.recentActivity && student.recentActivity.length > 0 && (
              <div className="mt-2 rounded-md bg-muted/35 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recent activity</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => router.replace(`/class/${classId}?tab=logs&student_id=${student.id}`)}
                  >
                    View logs
                  </Button>
                </div>
                <div className="space-y-1">
                  {student.recentActivity.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/90">{formatActivityLabel(event.action)}</span>
                      <span>|</span>
                      <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                      {event.details?.custom_message && (
                        <span className="truncate">| {String(event.details.custom_message)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No students in this class yet.</CardContent>
        </Card>
      )}

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm attendance change</DialogTitle>
            <DialogDescription>Are you sure you want to apply this attendance update?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleConfirm()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomEventDialogOpen} onOpenChange={setIsCustomEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom event for {selectedStudent?.name}</DialogTitle>
            <DialogDescription>Add a custom message for this student event.</DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[100px]"
            placeholder=""
            value={customEventText}
            onChange={(e) => setCustomEventText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomEvent} disabled={!customEventText.trim()}>
              Save event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!timelineStudent} onOpenChange={() => setTimelineStudent(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{timelineStudent?.name} timeline</DialogTitle>
            <DialogDescription>Recent attendance and custom events with teacher and date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(timelineStudent?.recentActivity || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            )}
            {(timelineStudent?.recentActivity || []).map((activity) => (
              <div key={activity.id} className="rounded-md border bg-muted/20 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{formatActivityLabel(activity.action)}</span>
                  <span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>
                {activity.details?.actor_name && (
                  <p className="mt-1 text-xs text-muted-foreground">Teacher: {String(activity.details.actor_name)}</p>
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

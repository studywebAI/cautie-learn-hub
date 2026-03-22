'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Archive, Copy, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassPreferences, DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

interface ClassSettingsProps {
  classId: string;
  className: string;
  onArchive?: () => void;
  isArchived?: boolean;
}

type Teacher = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type SubjectRow = {
  id: string;
  title: string;
  owner_teacher_id: string | null;
  owner_teacher_email: string | null;
  shared_teacher_ids: string[];
  class_id: string | null;
};

type ImportCandidate = {
  id: string;
  title: string;
  class_id: string | null;
};

type PendingTeacherJoinRequest = {
  id: string;
  requester_user_id: string;
  requester_email: string | null;
  subject_title: string | null;
  requested_at: string;
  status: 'pending';
};

type TeacherInviteCodeActivity = {
  id: string;
  code: string;
  issued_to_email: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  issued_by_label: string | null;
  used_by_label: string | null;
  is_expired?: boolean;
};

type ScheduleSlot = {
  id: string;
  class_id: string;
  day_of_week: number;
  period_index: number;
  title: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  subject_id: string | null;
  notes: string | null;
};

type SettingsSectionId =
  | 'profile'
  | 'invite'
  | 'defaults'
  | 'schedule'
  | 'requests'
  | 'activity'
  | 'subjects'
  | 'import'
  | 'danger';

export function ClassSettings({ classId, className, onArchive, isArchived = false }: ClassSettingsProps) {
  const preferenceSwitchClassName =
    'data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-rose-600';
  const formatTimeLabel = (time: string) => {
    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
  };

  const parseTimeToMinutes = (time: string) => {
    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return NaN;
    return hour * 60 + minute;
  };

  const scheduleTimeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 5) {
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push({ value, label: formatTimeLabel(value) });
      }
    }
    return options;
  }, []);

  const [isArchiving, setIsArchiving] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [loadingClassConfig, setLoadingClassConfig] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<string | null>(null);
  const [loadingInviteActivity, setLoadingInviteActivity] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [importSourceId, setImportSourceId] = useState('');
  const [importMode, setImportMode] = useState<'copy' | 'link'>('copy');
  const [importTitle, setImportTitle] = useState('');
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [classTitle, setClassTitle] = useState(className || '');
  const [classDescription, setClassDescription] = useState('');
  const [studentJoinCode, setStudentJoinCode] = useState('');
  const [teacherJoinCode, setTeacherJoinCode] = useState('');
  const [preferences, setPreferences] = useState<ClassPreferences>(DEFAULT_CLASS_PREFERENCES);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<PendingTeacherJoinRequest[]>([]);
  const [inviteActivity, setInviteActivity] = useState<TeacherInviteCodeActivity[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>('profile');
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [creatingScheduleSlot, setCreatingScheduleSlot] = useState(false);
  const [newScheduleSlot, setNewScheduleSlot] = useState({
    day_of_week: '1',
    period_index: '1',
    title: '',
    start_time: '08:30',
    end_time: '09:20',
    is_break: false,
    subject_id: '',
    notes: '',
  });
  const { refetchClasses } = useContext(AppContext) as any;
  const profileAutosaveReadyRef = useRef(false);
  const preferencesAutosaveReadyRef = useRef(false);
  const lastSavedProfileRef = useRef<{ name: string; description: string }>({ name: '', description: '' });
  const lastSavedPreferencesRef = useRef<string>(JSON.stringify(DEFAULT_CLASS_PREFERENCES));

  useEffect(() => {
    void loadClassConfig();
    void loadSubjectSettings();
    void loadPendingJoinRequests();
    void loadInviteActivity();
    void loadSchedule();
    void logClassTabEvent({
      classId,
      tab: 'settings',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
  }, [classId]);

  const teacherLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const teacher of teachers) {
      map.set(teacher.id, teacher.email || teacher.full_name || teacher.id);
    }
    return map;
  }, [teachers]);

  const loadClassConfig = async () => {
    setLoadingClassConfig(true);
    try {
      const response = await fetch(`/api/classes/${classId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load class settings');
      }
      const fetchedClass = data.class || {};
      setClassTitle(fetchedClass.name || className || '');
      setClassDescription(fetchedClass.description || '');
      setStudentJoinCode(fetchedClass.join_code || '');
      setTeacherJoinCode(fetchedClass.teacher_join_code || '');
      const normalizedPreferences = normalizeClassPreferences(data.preferences || {});
      setPreferences(normalizedPreferences);
      lastSavedProfileRef.current = {
        name: (fetchedClass.name || className || '').trim(),
        description: (fetchedClass.description || '').trim(),
      };
      lastSavedPreferencesRef.current = JSON.stringify(normalizedPreferences);
      profileAutosaveReadyRef.current = true;
      preferencesAutosaveReadyRef.current = true;
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'load_class_config_success',
        stage: 'data',
        level: 'debug',
      });
    } catch (error: any) {
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'load_class_config_error',
        stage: 'data',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
      toast({
        title: 'Could not load class settings',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingClassConfig(false);
    }
  };

  const loadSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`);
      const data = await response.json();
      if (!response.ok && response.status !== 403) {
        throw new Error(data.error || 'Failed to load schedule');
      }
      setScheduleSlots(data.slots || []);
    } catch (error: any) {
      toast({
        title: 'Could not load school schedule',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSchedule(false);
    }
  };

  const createScheduleSlot = async () => {
    if (!preferences.school_schedule_enabled) {
      toast({ title: 'Enable school schedule first', variant: 'destructive' });
      return;
    }
    if (!Number.isInteger(Number(newScheduleSlot.period_index)) || Number(newScheduleSlot.period_index) <= 0) {
      toast({ title: 'Period must be a positive number', variant: 'destructive' });
      return;
    }
    if (parseTimeToMinutes(newScheduleSlot.start_time) >= parseTimeToMinutes(newScheduleSlot.end_time)) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    if (!newScheduleSlot.title.trim()) {
      toast({ title: 'Slot title is required', variant: 'destructive' });
      return;
    }

    setCreatingScheduleSlot(true);
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: Number(newScheduleSlot.day_of_week),
          period_index: Number(newScheduleSlot.period_index),
          title: newScheduleSlot.title.trim(),
          start_time: newScheduleSlot.start_time,
          end_time: newScheduleSlot.end_time,
          is_break: newScheduleSlot.is_break,
          subject_id: newScheduleSlot.subject_id || null,
          notes: newScheduleSlot.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create slot');
      toast({ title: 'Schedule slot added' });
      setNewScheduleSlot((prev) => ({ ...prev, title: '', notes: '' }));
      await loadSchedule();
    } catch (error: any) {
      toast({
        title: 'Could not add schedule slot',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingScheduleSlot(false);
    }
  };

  const deleteScheduleSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/school-schedule?slotId=${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete slot');
      toast({ title: 'Schedule slot removed' });
      await loadSchedule();
    } catch (error: any) {
      toast({
        title: 'Could not remove schedule slot',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    }
  };

  const scheduleStartMinutes = parseTimeToMinutes(newScheduleSlot.start_time);
  const scheduleEndMinutes = parseTimeToMinutes(newScheduleSlot.end_time);
  const scheduleDurationMinutes = Number.isNaN(scheduleStartMinutes) || Number.isNaN(scheduleEndMinutes)
    ? 0
    : Math.max(0, scheduleEndMinutes - scheduleStartMinutes);
  const isSchedulePeriodValid =
    Number.isInteger(Number(newScheduleSlot.period_index)) && Number(newScheduleSlot.period_index) > 0;
  const isScheduleTimeRangeValid = scheduleEndMinutes > scheduleStartMinutes;
  const canCreateScheduleSlot =
    preferences.school_schedule_enabled &&
    !creatingScheduleSlot &&
    isSchedulePeriodValid &&
    isScheduleTimeRangeValid &&
    Boolean(newScheduleSlot.title.trim());

  const loadInviteActivity = async () => {
    setLoadingInviteActivity(true);
    try {
      const response = await fetch(`/api/classes/${classId}/teacher-invite-codes`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load teacher invite activity');
      setInviteActivity(data.recent_codes || []);
    } catch (error: any) {
      toast({
        title: 'Could not load teacher invite activity',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingInviteActivity(false);
    }
  };

  const loadPendingJoinRequests = async () => {
    setLoadingJoinRequests(true);
    try {
      const response = await fetch(`/api/classes/${classId}/teacher-join-requests`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load join requests');
      setPendingJoinRequests(data.requests || []);
    } catch (error: any) {
      toast({
        title: 'Could not load join requests',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingJoinRequests(false);
    }
  };

  const resolveJoinRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    setProcessingJoinRequestId(requestId);
    try {
      const response = await fetch(`/api/classes/${classId}/teacher-join-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          decision,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process request');
      toast({ title: decision === 'approve' ? 'Teacher approved' : 'Teacher rejected' });
      await loadPendingJoinRequests();
      await loadInviteActivity();
      await refetchClasses?.();
    } catch (error: any) {
      toast({
        title: 'Could not process request',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingJoinRequestId(null);
    }
  };

  const loadSubjectSettings = async () => {
    setLoadingSubjects(true);
    try {
      const response = await fetch(`/api/classes/${classId}/settings/subjects`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subject settings');
      }
      setTeachers(data.teachers || []);
      setSubjects(data.subjects || []);
      setImportCandidates(data.import_candidates || []);
    } catch (error: any) {
      toast({
        title: 'Could not load subject settings',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSaveProfile = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!classTitle.trim()) {
      if (!silent) {
        toast({ title: 'Class name is required', variant: 'destructive' });
      }
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          name: classTitle.trim(),
          description: classDescription.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save class profile');

      lastSavedProfileRef.current = {
        name: classTitle.trim(),
        description: classDescription.trim(),
      };
      if (!silent) {
        toast({ title: 'Class profile updated' });
      }
      await refetchClasses?.();
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'class_profile_saved',
        stage: 'action',
        level: 'info',
      });
    } catch (error: any) {
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'class_profile_save_error',
        stage: 'action',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
      toast({
        title: 'Could not save class profile',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async ({ silent = false }: { silent?: boolean } = {}) => {
    setSavingPreferences(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_preferences',
          preferences,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save preferences');
      const normalizedPreferences = normalizeClassPreferences(data.preferences || preferences);
      setPreferences(normalizedPreferences);
      lastSavedPreferencesRef.current = JSON.stringify(normalizedPreferences);

      if (!silent) {
        toast({ title: 'Teaching defaults saved' });
      }
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'preferences_saved',
        stage: 'action',
        level: 'info',
        meta: preferences,
      });
    } catch (error: any) {
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'preferences_save_error',
        stage: 'action',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
      toast({
        title: 'Could not save teaching defaults',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  useEffect(() => {
    if (!profileAutosaveReadyRef.current || loadingClassConfig) return;
    const name = classTitle.trim();
    const description = classDescription.trim();
    if (!name) return;
    if (name === lastSavedProfileRef.current.name && description === lastSavedProfileRef.current.description) return;

    const timer = setTimeout(() => {
      void handleSaveProfile({ silent: true });
    }, 600);

    return () => clearTimeout(timer);
  }, [classTitle, classDescription, loadingClassConfig]);

  useEffect(() => {
    if (!preferencesAutosaveReadyRef.current || loadingClassConfig) return;
    const serialized = JSON.stringify(preferences);
    if (serialized === lastSavedPreferencesRef.current) return;

    const timer = setTimeout(() => {
      void handleSavePreferences({ silent: true });
    }, 450);

    return () => clearTimeout(timer);
  }, [preferences, loadingClassConfig]);

  const handleRegenerateCodes = async () => {
    setRegeneratingCodes(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_codes' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate codes');
      setStudentJoinCode(data.join_code || '');
      setTeacherJoinCode(data.teacher_join_code || '');
      toast({ title: 'Invite codes regenerated' });
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'codes_regenerated',
        stage: 'action',
        level: 'warn',
      });
    } catch (error: any) {
      void logClassTabEvent({
        classId,
        tab: 'settings',
        event: 'codes_regenerate_error',
        stage: 'action',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
      toast({
        title: 'Could not regenerate codes',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingCodes(false);
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value || '');
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleArchiveClass = async () => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive class');
      }

      toast({
        title: 'Class archived',
        description: `${classTitle} has been archived successfully.`,
      });

      await refetchClasses();
      onArchive?.();
    } catch (error) {
      toast({
        title: 'Failed to archive class',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOwnerChange = async (subjectId: string, ownerTeacherId: string) => {
    setSavingSubjectId(subjectId);
    try {
      const response = await fetch(`/api/classes/${classId}/settings/subjects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_owner',
          subject_id: subjectId,
          owner_teacher_id: ownerTeacherId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update owner');

      toast({ title: 'Subject owner updated' });
      await loadSubjectSettings();
    } catch (error: any) {
      toast({
        title: 'Could not update owner',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingSubjectId(null);
    }
  };

  const handleSharedChange = async (subjectId: string, sharedTeacherIds: string[]) => {
    setSavingSubjectId(subjectId);
    try {
      const response = await fetch(`/api/classes/${classId}/settings/subjects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_shared',
          subject_id: subjectId,
          shared_teacher_ids: sharedTeacherIds,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update shared teachers');

      toast({ title: 'Shared teachers updated' });
      await loadSubjectSettings();
    } catch (error: any) {
      toast({
        title: 'Could not update shared teachers',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingSubjectId(null);
    }
  };

  const toggleSharedTeacher = (subject: SubjectRow, teacherId: string, checked: boolean) => {
    const next = new Set(subject.shared_teacher_ids || []);
    if (checked) next.add(teacherId);
    else next.delete(teacherId);
    void handleSharedChange(subject.id, Array.from(next));
  };

  const handleImport = async () => {
    if (!importSourceId) {
      toast({ title: 'Select a subject first', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`/api/classes/${classId}/settings/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_subject_id: importSourceId,
          mode: importMode,
          title: importTitle.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import subject');

      toast({ title: importMode === 'copy' ? 'Subject copied' : 'Subject linked' });
      setImportSourceId('');
      setImportTitle('');
      await loadSubjectSettings();
    } catch (error: any) {
      toast({
        title: 'Could not import subject',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const settingsSections: Array<{ id: SettingsSectionId; label: string; description: string }> = [
    { id: 'profile', label: 'Class Profile', description: 'Name and description' },
    { id: 'invite', label: 'Invite Access', description: 'Join codes and rotation' },
    { id: 'defaults', label: 'Teaching Defaults', description: 'Grades, attendance, schedule flags' },
    { id: 'schedule', label: 'School Schedule', description: 'Create and manage timetable slots' },
    { id: 'requests', label: 'Teacher Requests', description: 'Approve or reject joins' },
    { id: 'activity', label: 'Invite Activity', description: 'Recent invite code usage' },
    { id: 'subjects', label: 'Subject Management', description: 'Owners and shared teachers' },
    { id: 'import', label: 'Import Subject', description: 'Copy or link from another class' },
    { id: 'danger', label: 'Danger Zone', description: 'Archive class' },
  ];
  const activeSectionMeta = settingsSections.find((section) => section.id === activeSettingsSection) || settingsSections[0];

  return (
    <div className="grid gap-4 rounded-2xl bg-zinc-100 p-3 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 self-start">
        <Card className="border-0 bg-zinc-200/70 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Class Settings</CardTitle>
            <CardDescription>Pick a topic to edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {settingsSections.map((section) => (
              <Button
                key={section.id}
                type="button"
                variant="ghost"
                onClick={() => setActiveSettingsSection(section.id)}
                className={`h-auto w-full justify-start rounded-md px-3 py-2 text-left ${
                  activeSettingsSection === section.id
                    ? 'bg-zinc-100 text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-zinc-100'
                    : 'text-foreground/80 hover:bg-zinc-200/70'
                }`}
              >
                <span className="text-sm font-medium">{section.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-4">
        <Card className="border-0 bg-zinc-200/70 shadow-none">
          <CardHeader>
            <CardTitle>{activeSectionMeta.label}</CardTitle>
            <CardDescription>{activeSectionMeta.description}</CardDescription>
          </CardHeader>
        </Card>

      {activeSettingsSection === 'profile' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Class Profile</CardTitle>
          <CardDescription>Rename the class and update the class description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Class Name</Label>
            <Input
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
              placeholder="Class name"
              disabled={loadingClassConfig || savingProfile}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={classDescription}
              onChange={(e) => setClassDescription(e.target.value)}
              placeholder="Optional class description"
              disabled={loadingClassConfig || savingProfile}
            />
          </div>
          <p className="text-xs text-muted-foreground">{savingProfile ? 'Saving changes...' : 'Changes autosave.'}</p>
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'invite' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Invite Access</CardTitle>
          <CardDescription>Copy current join codes or rotate them if they leaked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Student Join Code</Label>
            <div className="flex gap-2">
              <Input value={studentJoinCode} readOnly />
              <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" variant="outline" size="icon" onClick={() => void copyText(studentJoinCode, 'Student join code')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Teacher Join Code</Label>
            <div className="flex gap-2">
              <Input value={teacherJoinCode} readOnly />
              <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" variant="outline" size="icon" onClick={() => void copyText(teacherJoinCode, 'Teacher join code')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" variant="outline" onClick={() => void handleRegenerateCodes()} disabled={regeneratingCodes}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {regeneratingCodes ? 'Regenerating...' : 'Regenerate Invite Codes'}
          </Button>
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'defaults' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Teaching Defaults</CardTitle>
          <CardDescription>Class-wide defaults used by grades, attendance, and invite flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Default Subject View</Label>
            <Select
              value={preferences.default_subject_view}
              onValueChange={(value) =>
                setPreferences((prev) => ({
                  ...prev,
                  default_subject_view: value === 'all' ? 'all' : 'mine',
                }))
              }
            >
              <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                <SelectValue placeholder="Choose default subject view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My subject first</SelectItem>
                <SelectItem value="all">All subjects first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Default Grade Scale</Label>
            <Select
              value={preferences.grades_default_scale}
              onValueChange={(value) =>
                setPreferences((prev) => ({
                  ...prev,
                  grades_default_scale:
                    value === 'a_f' || value === 'one_to_ten' ? (value as any) : 'both',
                }))
              }
            >
              <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                <SelectValue placeholder="Choose default grade scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Show A-F and 1-10</SelectItem>
                <SelectItem value="a_f">Prefer A-F</SelectItem>
                <SelectItem value="one_to_ten">Prefer 1-10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Show class average in grades</p>
              <p className="text-xs text-muted-foreground">Toggle class-level average cards in grades.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {preferences.grades_show_class_average ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={preferences.grades_show_class_average}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, grades_show_class_average: Boolean(checked) }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Require attendance confirmation</p>
              <p className="text-xs text-muted-foreground">Prompt before attendance changes are saved.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {preferences.attendance_require_confirmation ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={preferences.attendance_require_confirmation}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, attendance_require_confirmation: Boolean(checked) }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Allow teacher invite actions</p>
              <p className="text-xs text-muted-foreground">Enable or disable teacher invite section.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {preferences.invite_allow_teacher_invites ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={preferences.invite_allow_teacher_invites}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, invite_allow_teacher_invites: Boolean(checked) }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Enable school schedule</p>
              <p className="text-xs text-muted-foreground">Turns on class timetable management for this class.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {preferences.school_schedule_enabled ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={preferences.school_schedule_enabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, school_schedule_enabled: Boolean(checked) }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Show school schedule to students</p>
              <p className="text-xs text-muted-foreground">Students can view timetable blocks in agenda/dashboard when enabled.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {preferences.school_schedule_visible_to_students ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={preferences.school_schedule_visible_to_students}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, school_schedule_visible_to_students: Boolean(checked) }))
                }
                disabled={!preferences.school_schedule_enabled}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{savingPreferences ? 'Saving defaults...' : 'Defaults autosave.'}</p>
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'schedule' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>School Schedule</CardTitle>
          <CardDescription>
            Add one slot at a time: choose day, period, time range, and optional subject link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-emerald-100/70 p-3 text-sm text-emerald-900">
            Slot preview: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.max(0, Number(newScheduleSlot.day_of_week) - 1)]}
            {' · '}P{newScheduleSlot.period_index || '?'}{' · '}
            {formatTimeLabel(newScheduleSlot.start_time)} - {formatTimeLabel(newScheduleSlot.end_time)}
            {scheduleDurationMinutes > 0 ? ` (${scheduleDurationMinutes} min)` : ''}
            {newScheduleSlot.title.trim() ? ` · ${newScheduleSlot.title.trim()}` : ''}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Day</Label>
              <Select
                value={newScheduleSlot.day_of_week}
                onValueChange={(value) => setNewScheduleSlot((prev) => ({ ...prev, day_of_week: value }))}
              >
                <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                  <SelectValue placeholder="Choose a day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="7">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Input
                value={newScheduleSlot.period_index}
                onChange={(e) => setNewScheduleSlot((prev) => ({ ...prev, period_index: e.target.value }))}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">Use 1, 2, 3...</p>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={newScheduleSlot.title}
                onChange={(e) => setNewScheduleSlot((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Period 1 - Math"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Select
                value={newScheduleSlot.start_time}
                onValueChange={(value) => setNewScheduleSlot((prev) => ({ ...prev, start_time: value }))}
              >
                <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                  <SelectValue placeholder="Choose start time" />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTimeOptions.map((option) => (
                    <SelectItem key={`start-${option.value}`} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Select
                value={newScheduleSlot.end_time}
                onValueChange={(value) => setNewScheduleSlot((prev) => ({ ...prev, end_time: value }))}
              >
                <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                  <SelectValue placeholder="Choose end time" />
                </SelectTrigger>
                <SelectContent>
                  {scheduleTimeOptions.map((option) => (
                    <SelectItem key={`end-${option.value}`} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subject (optional)</Label>
              <Select
                value={newScheduleSlot.subject_id || '__none'}
                onValueChange={(value) =>
                  setNewScheduleSlot((prev) => ({ ...prev, subject_id: value === '__none' ? '' : value }))
                }
              >
                <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                  <SelectValue placeholder="No subject link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No subject link</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isSchedulePeriodValid && (
            <p className="text-sm text-rose-700">Period must be a positive whole number.</p>
          )}
          {!isScheduleTimeRangeValid && (
            <p className="text-sm text-rose-700">End time must be after start time.</p>
          )}

          <div className="flex items-center justify-between rounded-md bg-zinc-200/70 p-3">
            <div>
              <p className="text-sm font-medium">Break slot</p>
              <p className="text-xs text-muted-foreground">Mark this timetable slot as pause/break.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {newScheduleSlot.is_break ? 'On' : 'Off'}
              </span>
              <Switch
                className={preferenceSwitchClassName}
                checked={newScheduleSlot.is_break}
                onCheckedChange={(checked) => setNewScheduleSlot((prev) => ({ ...prev, is_break: Boolean(checked) }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input
              value={newScheduleSlot.notes}
              onChange={(e) => setNewScheduleSlot((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Extra info for this slot"
            />
          </div>

          <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" onClick={() => void createScheduleSlot()} disabled={!canCreateScheduleSlot}>
            {creatingScheduleSlot ? 'Adding...' : 'Add schedule slot'}
          </Button>

          <div className="space-y-2">
            {loadingSchedule ? (
              <p className="text-sm text-muted-foreground">Loading schedule slots...</p>
            ) : scheduleSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedule slots yet.</p>
            ) : (
              scheduleSlots.map((slot) => (
                <div key={slot.id} className="rounded-md bg-zinc-200/70 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.max(0, slot.day_of_week - 1)]} · P{slot.period_index} · {slot.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.start_time} - {slot.end_time} {slot.is_break ? '· Break' : ''}
                    </p>
                  </div>
                  <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" variant="outline" size="sm" onClick={() => void deleteScheduleSlot(slot.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'requests' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Teacher Join Requests</CardTitle>
          <CardDescription>Approve or reject teachers who request access via teacher join code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingJoinRequests ? (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          ) : pendingJoinRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending teacher join requests.</p>
          ) : (
            pendingJoinRequests.map((request) => (
              <div key={request.id} className="rounded-lg bg-zinc-200/70 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{request.requester_email || request.requester_user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Subject: {request.subject_title || 'No subject provided'} · Requested {new Date(request.requested_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0"
                    size="sm"
                    onClick={() => void resolveJoinRequest(request.id, 'approve')}
                    disabled={processingJoinRequestId === request.id}
                  >
                    Approve
                  </Button>
                  <Button
                    className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0"
                    size="sm"
                    variant="outline"
                    onClick={() => void resolveJoinRequest(request.id, 'reject')}
                    disabled={processingJoinRequestId === request.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'activity' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Teacher Invite Activity</CardTitle>
          <CardDescription>
            Categorized by status so you can track new teacher invite flow end-to-end.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInviteActivity ? (
            <p className="text-sm text-muted-foreground">Loading teacher invite activity...</p>
          ) : inviteActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher invite activity yet.</p>
          ) : (
            inviteActivity.map((item) => (
              <div key={item.id} className="rounded-lg bg-zinc-200/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{item.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued by {item.issued_by_label || 'unknown'}{item.issued_to_email ? ` for ${item.issued_to_email}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      item.status === 'used'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : item.status === 'revoked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.status === 'active' && item.is_expired ? 'expired' : item.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Issued: {new Date(item.issued_at).toLocaleString()} · Expires: {new Date(item.expires_at).toLocaleString()}
                </p>
                {item.used_at && (
                  <p className="text-xs text-muted-foreground">
                    Used by {item.used_by_label || 'unknown'} at {new Date(item.used_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'subjects' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Subject Management</CardTitle>
          <CardDescription>
            See who owns which subject, change ownership, and share subjects between teachers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSubjects ? (
            <p className="text-sm text-muted-foreground">Loading subject settings...</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects in this class yet.</p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="rounded-lg bg-zinc-200/70 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{subject.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Owner: {subject.owner_teacher_email || 'No owner'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Owner</Label>
                    <Select
                      value={subject.owner_teacher_id || '__none'}
                      onValueChange={(value) => {
                        if (value === '__none') return;
                        void handleOwnerChange(subject.id, value);
                      }}
                      disabled={savingSubjectId === subject.id}
                    >
                      <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" disabled>Select teacher</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.email || teacher.full_name || teacher.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Shared Teachers</Label>
                    <div className="space-y-2 rounded-md bg-zinc-200/70 p-2 max-h-36 overflow-auto">
                      {teachers.map((teacher) => {
                        const isOwner = subject.owner_teacher_id === teacher.id;
                        const checked = (subject.shared_teacher_ids || []).includes(teacher.id);
                        return (
                          <label key={teacher.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              disabled={isOwner || savingSubjectId === subject.id}
                              onCheckedChange={(value) =>
                                toggleSharedTeacher(subject, teacher.id, Boolean(value))
                              }
                            />
                            <span>{teacher.email || teacher.full_name || teacher.id}</span>
                            {isOwner && <span className="text-xs text-muted-foreground">(owner)</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Current shared: {(subject.shared_teacher_ids || []).map((id) => teacherLabelById.get(id) || id).join(', ') || 'none'}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'import' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Import Subject</CardTitle>
          <CardDescription>
            Import one of your subjects from another class. Copy duplicates content; Link reuses the same subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Source Subject</Label>
            <Select
              value={importSourceId || '__none'}
              onValueChange={(value) => setImportSourceId(value === '__none' ? '' : value)}
            >
              <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Select a subject</SelectItem>
                {importCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Mode</Label>
            <Select
              value={importMode}
              onValueChange={(value) => setImportMode(value as 'copy' | 'link')}
            >
              <SelectTrigger className="h-9 rounded-md border-0 bg-zinc-200/70 text-sm">
                <SelectValue placeholder="Choose import mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copy">Copy (new subject in this class)</SelectItem>
                <SelectItem value="link">Link (same subject across classes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importMode === 'copy' && (
            <div className="space-y-1">
              <Label>New Subject Title (optional)</Label>
              <Input
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                placeholder="Leave empty to keep original title"
              />
            </div>
          )}

          <Button className="bg-zinc-200/70 hover:bg-zinc-100 text-black border-0" onClick={() => void handleImport()} disabled={importing || !importSourceId}>
            {importing ? 'Importing...' : 'Import Subject'}
          </Button>
        </CardContent>
      </Card>
      )}

      {activeSettingsSection === 'danger' && (
      <Card className="border-0 bg-zinc-200/70 shadow-none">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Archive class when it is no longer active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isArchived ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-200/70">
              <div>
                <h3 className="font-medium text-red-600">Archive Class</h3>
                <p className="text-sm text-muted-foreground">
                  Archiving this class hides it from active workflows while preserving stored data.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isArchiving}>
                    <Archive className="w-4 h-4 mr-2" />
                    {isArchiving ? 'Archiving...' : 'Archive Class'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive Class</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to archive "{classTitle || className}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchiveClass} className="bg-red-600 hover:bg-red-700">
                      Archive Class
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 rounded-lg bg-zinc-200/70">
              <div className="text-center">
                <h3 className="font-medium text-gray-600">Class Archived</h3>
                <p className="text-sm text-muted-foreground">
                  This class has been archived and is no longer active.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}
      </div>
    </div>
  );
}




'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
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

export function ClassSettings({ classId, className, onArchive, isArchived = false }: ClassSettingsProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [loadingClassConfig, setLoadingClassConfig] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [processingJoinRequestId, setProcessingJoinRequestId] = useState<string | null>(null);
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
  const { refetchClasses } = useContext(AppContext) as any;

  useEffect(() => {
    void loadClassConfig();
    void loadSubjectSettings();
    void loadPendingJoinRequests();
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
      setPreferences(normalizeClassPreferences(data.preferences || {}));
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

  const handleSaveProfile = async () => {
    if (!classTitle.trim()) {
      toast({ title: 'Class name is required', variant: 'destructive' });
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

      toast({ title: 'Class profile updated' });
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

  const handleSavePreferences = async () => {
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
      setPreferences(normalizeClassPreferences(data.preferences || preferences));

      toast({ title: 'Teaching defaults saved' });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Settings</CardTitle>
          <CardDescription>
            Manage collaboration, defaults, invite access, and archive options.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
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
          <Button onClick={() => void handleSaveProfile()} disabled={savingProfile || loadingClassConfig}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Access</CardTitle>
          <CardDescription>Copy current join codes or rotate them if they leaked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Student Join Code</Label>
            <div className="flex gap-2">
              <Input value={studentJoinCode} readOnly />
              <Button variant="outline" size="icon" onClick={() => void copyText(studentJoinCode, 'Student join code')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Teacher Join Code</Label>
            <div className="flex gap-2">
              <Input value={teacherJoinCode} readOnly />
              <Button variant="outline" size="icon" onClick={() => void copyText(teacherJoinCode, 'Teacher join code')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button variant="outline" onClick={() => void handleRegenerateCodes()} disabled={regeneratingCodes}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {regeneratingCodes ? 'Regenerating...' : 'Regenerate Invite Codes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teaching Defaults</CardTitle>
          <CardDescription>Class-wide defaults used by grades, attendance, and invite flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Default Subject View</Label>
            <select
              value={preferences.default_subject_view}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  default_subject_view: e.target.value === 'all' ? 'all' : 'mine',
                }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="mine">My subject first</option>
              <option value="all">All subjects first</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Default Grade Scale</Label>
            <select
              value={preferences.grades_default_scale}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  grades_default_scale:
                    e.target.value === 'a_f' || e.target.value === 'one_to_ten' ? (e.target.value as any) : 'both',
                }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="both">Show A-F and 1-10</option>
              <option value="a_f">Prefer A-F</option>
              <option value="one_to_ten">Prefer 1-10</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Show class average in grades</p>
              <p className="text-xs text-muted-foreground">Toggle class-level average cards in grades.</p>
            </div>
            <Switch
              checked={preferences.grades_show_class_average}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, grades_show_class_average: Boolean(checked) }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Require attendance confirmation</p>
              <p className="text-xs text-muted-foreground">Prompt before attendance changes are saved.</p>
            </div>
            <Switch
              checked={preferences.attendance_require_confirmation}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, attendance_require_confirmation: Boolean(checked) }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Allow teacher invite actions</p>
              <p className="text-xs text-muted-foreground">Enable or disable teacher invite section.</p>
            </div>
            <Switch
              checked={preferences.invite_allow_teacher_invites}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({ ...prev, invite_allow_teacher_invites: Boolean(checked) }))
              }
            />
          </div>

          <Button onClick={() => void handleSavePreferences()} disabled={savingPreferences}>
            {savingPreferences ? 'Saving...' : 'Save Teaching Defaults'}
          </Button>
        </CardContent>
      </Card>

      <Card>
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
              <div key={request.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{request.requester_email || request.requester_user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Subject: {request.subject_title || 'No subject provided'} · Requested {new Date(request.requested_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => void resolveJoinRequest(request.id, 'approve')}
                    disabled={processingJoinRequestId === request.id}
                  >
                    Approve
                  </Button>
                  <Button
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

      <Card>
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
              <div key={subject.id} className="rounded-lg border p-4 space-y-3">
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
                    <select
                      value={subject.owner_teacher_id || ''}
                      onChange={(e) => void handleOwnerChange(subject.id, e.target.value)}
                      disabled={savingSubjectId === subject.id}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="" disabled>Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.email || teacher.full_name || teacher.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Shared Teachers</Label>
                    <div className="space-y-2 rounded-md border p-2 max-h-36 overflow-auto">
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

      <Card>
        <CardHeader>
          <CardTitle>Import Subject</CardTitle>
          <CardDescription>
            Import one of your subjects from another class. Copy duplicates content; Link reuses the same subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Source Subject</Label>
            <select
              value={importSourceId}
              onChange={(e) => setImportSourceId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a subject</option>
              {importCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Mode</Label>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'copy' | 'link')}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="copy">Copy (new subject in this class)</option>
              <option value="link">Link (same subject across classes)</option>
            </select>
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

          <Button onClick={() => void handleImport()} disabled={importing || !importSourceId}>
            {importing ? 'Importing...' : 'Import Subject'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Archive class when it is no longer active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isArchived ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
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
            <div className="flex items-center justify-center p-4 border rounded-lg bg-gray-50">
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
    </div>
  );
}

'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Archive } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/app-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

export function ClassSettings({ classId, className, onArchive, isArchived = false }: ClassSettingsProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [importSourceId, setImportSourceId] = useState('');
  const [importMode, setImportMode] = useState<'copy' | 'link'>('copy');
  const [importTitle, setImportTitle] = useState('');
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const { refetchClasses } = useContext(AppContext) as any;

  useEffect(() => {
    void loadSubjectSettings();
  }, [classId]);

  const teacherLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const teacher of teachers) {
      map.set(teacher.id, teacher.email || teacher.full_name || teacher.id);
    }
    return map;
  }, [teachers]);

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
        description: `${className} has been archived successfully.`,
      });

      await refetchClasses();
      onArchive?.();
    } catch (error) {
      console.error('Error archiving class:', error);
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
            Manage settings for {className}
          </CardDescription>
        </CardHeader>
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
                  Archiving this class will hide it from all users. The class data will be preserved but no longer accessible.
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
                      Are you sure you want to archive "{className}"? This action cannot be undone.
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
                  This class has been archived and is no longer accessible to students.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

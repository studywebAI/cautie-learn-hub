'use client';

import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { SubjectCard } from './subject-card';

type SubjectsGridProps = {
  classId?: string;
  isTeacher?: boolean;
};

export function SubjectsGrid({ classId, isTeacher = false }: SubjectsGridProps) {
  const { classes, subjects: cachedSubjects } = useContext(AppContext) as AppContextType;
  const scopeKey = classId || 'all';
  const cacheKey = `studyweb-subjects-cache:${scopeKey}`;
  const checksumKey = `studyweb-subjects-checksum:${scopeKey}`;
  const syncAtKey = `studyweb-subjects-last-sync-at:${scopeKey}`;
  const SYNC_COOLDOWN_MS = 20000;
  const seededSubjects = useMemo(() => {
    const source = Array.isArray(cachedSubjects) ? cachedSubjects : [];
    if (!classId) return source;
    return source.filter((subject: any) => {
      const classIds = Array.isArray(subject?.classes) ? subject.classes.map((classItem: any) => classItem?.id) : [];
      const directClassId = typeof subject?.class_id === 'string' ? subject.class_id : null;
      return classIds.includes(classId) || directClassId === classId;
    });
  }, [cachedSubjects, classId]);

  const [subjects, setSubjects] = useState<any[]>(seededSubjects);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'recent'>('default');
  const [filterFolderId, setFilterFolderId] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [autoIcons, setAutoIcons] = useState(true);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Join Subject (student self-enroll, or teacher co-teach request -- the
  // backend branches on the joining account's role). Same one join_code
  // works for both, mirroring how classes used to work.
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Import-test-by-code state (G3, docs/subjects-feature-brainstorm.md)
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importSubjectId, setImportSubjectId] = useState('');
  const [importChapterId, setImportChapterId] = useState('');
  const [importParagraphId, setImportParagraphId] = useState('');
  const [importChapters, setImportChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [importParagraphs, setImportParagraphs] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingImportChapters, setIsLoadingImportChapters] = useState(false);
  const [isLoadingImportParagraphs, setIsLoadingImportParagraphs] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Quick-create shortcut (S0, docs/subjects-feature-brainstorm.md section F
  // point 18) — jump straight to "new assignment/test" without drilling
  // three levels deep first.
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateKind, setQuickCreateKind] = useState<'homework' | 'test'>('homework');
  const [quickCreateSubjectId, setQuickCreateSubjectId] = useState('');
  const [quickCreateChapterId, setQuickCreateChapterId] = useState('');
  const [quickCreateParagraphId, setQuickCreateParagraphId] = useState('');
  const [quickCreateChapters, setQuickCreateChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [quickCreateParagraphs, setQuickCreateParagraphs] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingQuickCreateChapters, setIsLoadingQuickCreateChapters] = useState(false);
  const [isLoadingQuickCreateParagraphs, setIsLoadingQuickCreateParagraphs] = useState(false);

  useEffect(() => {
    if (!quickCreateSubjectId) {
      setQuickCreateChapters([]);
      setQuickCreateChapterId('');
      return;
    }
    setIsLoadingQuickCreateChapters(true);
    setQuickCreateChapterId('');
    setQuickCreateParagraphId('');
    fetch(`/api/subjects/${quickCreateSubjectId}/chapters`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQuickCreateChapters(Array.isArray(data) ? data : []))
      .catch(() => setQuickCreateChapters([]))
      .finally(() => setIsLoadingQuickCreateChapters(false));
  }, [quickCreateSubjectId]);

  useEffect(() => {
    if (!quickCreateSubjectId || !quickCreateChapterId) {
      setQuickCreateParagraphs([]);
      setQuickCreateParagraphId('');
      return;
    }
    setIsLoadingQuickCreateParagraphs(true);
    setQuickCreateParagraphId('');
    fetch(`/api/subjects/${quickCreateSubjectId}/chapters/${quickCreateChapterId}/paragraphs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setQuickCreateParagraphs(Array.isArray(data) ? data : []))
      .catch(() => setQuickCreateParagraphs([]))
      .finally(() => setIsLoadingQuickCreateParagraphs(false));
  }, [quickCreateSubjectId, quickCreateChapterId]);

  const resetQuickCreateState = () => {
    setQuickCreateKind('homework');
    setQuickCreateSubjectId('');
    setQuickCreateChapterId('');
    setQuickCreateParagraphId('');
    setQuickCreateChapters([]);
    setQuickCreateParagraphs([]);
  };

  const handleQuickCreateGo = () => {
    if (!quickCreateParagraphId) return;
    setIsQuickCreateOpen(false);
    const kindParam = quickCreateKind === 'test' ? '&kind=test' : '';
    router.push(`/subjects/${quickCreateSubjectId}/chapters/${quickCreateChapterId}/paragraphs/${quickCreateParagraphId}?create=1${kindParam}`);
    resetQuickCreateState();
  };

  useEffect(() => {
    if (!importSubjectId) {
      setImportChapters([]);
      setImportChapterId('');
      return;
    }
    setIsLoadingImportChapters(true);
    setImportChapterId('');
    setImportParagraphId('');
    fetch(`/api/subjects/${importSubjectId}/chapters`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setImportChapters(Array.isArray(data) ? data : []))
      .catch(() => setImportChapters([]))
      .finally(() => setIsLoadingImportChapters(false));
  }, [importSubjectId]);

  useEffect(() => {
    if (!importSubjectId || !importChapterId) {
      setImportParagraphs([]);
      setImportParagraphId('');
      return;
    }
    setIsLoadingImportParagraphs(true);
    setImportParagraphId('');
    fetch(`/api/subjects/${importSubjectId}/chapters/${importChapterId}/paragraphs`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setImportParagraphs(Array.isArray(data) ? data : []))
      .catch(() => setImportParagraphs([]))
      .finally(() => setIsLoadingImportParagraphs(false));
  }, [importSubjectId, importChapterId]);

  useEffect(() => {
    if (!isTeacher) return;
    fetch('/api/subject-folders')
      .then((res) => (res.ok ? res.json() : { folders: [] }))
      .then((data) => setFolders(Array.isArray(data.folders) ? data.folders : []))
      .catch(() => setFolders([]));
  }, [isTeacher]);

  const handleSubjectUpdated = (subjectId: string, patch: { archived_at?: string | null; folder_id?: string | null }) => {
    setSubjects((prev) => prev.map((s) => (s.id === subjectId ? { ...s, ...patch } : s)));
  };

  const handleCreateFolder = async (name: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/subject-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setFolders((prev) => [...prev, data.folder]);
      return data.folder?.id || null;
    } catch {
      return null;
    }
  };

  const resetImportState = () => {
    setImportCode('');
    setImportSubjectId('');
    setImportChapterId('');
    setImportParagraphId('');
    setImportChapters([]);
    setImportParagraphs([]);
  };

  const handleImportTest = async () => {
    if (!importCode.trim() || !importParagraphId) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/tests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: importCode.trim(), targetParagraphId: importParagraphId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import test');
      }
      toast({ title: 'Test imported', description: 'A new independent copy was added.' });
      setIsImportOpen(false);
      const subjectIdForNav = data.subjectId || importSubjectId;
      const chapterIdForNav = data.chapterId || importChapterId;
      const paragraphIdForNav = data.paragraphId || importParagraphId;
      resetImportState();
      if (subjectIdForNav && chapterIdForNav && paragraphIdForNav) {
        router.push(`/subjects/${subjectIdForNav}/chapters/${chapterIdForNav}/paragraphs/${paragraphIdForNav}`);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    let hydrated = false;
    if (typeof window !== 'undefined') {
      try {
        const fromStorage = window.localStorage.getItem(cacheKey);
        if (fromStorage) {
          const parsed = JSON.parse(fromStorage);
          if (Array.isArray(parsed)) {
            setSubjects(parsed);
            setIsLoading(false);
            hydrated = true;
          }
        }
      } catch {
        // Ignore local cache parse failures.
      }
    }

    if (!hydrated && seededSubjects.length > 0) {
      setSubjects(seededSubjects);
      setIsLoading(false);
      hydrated = true;
    }

    if (!hydrated) {
      setSubjects([]);
      setIsLoading(true);
    }
  }, [cacheKey, seededSubjects]);

  const toggleClassSelection = (classItemId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classItemId)
        ? prev.filter(id => id !== classItemId)
        : [...prev, classItemId]
    );
  };

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiUrl = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';
      const response = await fetch(apiUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      const nextSubjects = Array.isArray(data) ? data : (data?.subjects || []);
      setSubjects(nextSubjects);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, JSON.stringify(nextSubjects));
      }
    } catch (error) {
      setSubjects((prev) => (prev.length === 0 ? [] : prev));
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, classId]);

  const syncSubjects = useCallback(async (force = false) => {
    try {
      if (typeof window === 'undefined') {
        await fetchSubjects();
        return;
      }
      const checksum =
        !force ? window.localStorage.getItem(checksumKey) || '' : '';

      const syncUrl = new URL('/api/subjects/sync', window.location.origin);
      if (classId) syncUrl.searchParams.set('classId', classId);
      if (checksum) syncUrl.searchParams.set('checksum', checksum);

      const response = await fetch(syncUrl.toString(), {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`sync failed (${response.status})`);
      }

      const payload = await response.json();
      if (typeof payload?.checksum === 'string') {
        window.localStorage.setItem(checksumKey, payload.checksum);
      }

      if (payload?.changed && Array.isArray(payload?.subjects)) {
        setSubjects(payload.subjects);
        window.localStorage.setItem(cacheKey, JSON.stringify(payload.subjects));
      }
    } catch (error) {
      await fetchSubjects();
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, checksumKey, classId, fetchSubjects]);

  useEffect(() => {
    const run = async () => {
      if (typeof window !== 'undefined') {
        const lastSyncAt = Number(window.localStorage.getItem(syncAtKey) || '0');
        const now = Date.now();
        if (lastSyncAt > 0 && now - lastSyncAt < SYNC_COOLDOWN_MS) {
          setIsLoading(false);
          return;
        }
      }
      await syncSubjects();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(syncAtKey, String(Date.now()));
      }
    };
    void run();
  }, [syncAtKey, syncSubjects]);

  // A join-code deep link (?join_code=XXXX, e.g. from a teacher's shared
  // QR/link in Subject Settings > Invite) opens the dialog pre-filled
  // instead of requiring the code to be typed in by hand.
  useEffect(() => {
    const codeFromUrl = searchParams?.get('join_code');
    if (codeFromUrl) {
      setJoinCodeInput(codeFromUrl);
      setIsJoinOpen(true);
    }
  }, [searchParams]);

  const handleJoinSubject = async () => {
    if (!joinCodeInput.trim()) return;
    setIsJoining(true);
    try {
      const response = await fetch('/api/subjects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_code: joinCodeInput.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to join subject');

      toast({ title: data.message || (isTeacher ? 'Request sent' : 'Joined subject') });
      setIsJoinOpen(false);
      setJoinCodeInput('');
      if (!data.pendingApproval) await syncSubjects(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectTitle.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing title',
        description: 'Please provide a title for the subject.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const apiUrl = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';
      const requestBody = classId
        ? {
            title: newSubjectTitle,
            description: newSubjectDescription || undefined,
            class_label: newSubjectTitle,
            cover_type: autoIcons ? 'ai_icons' : 'custom',
          }
        : {
            title: newSubjectTitle,
            description: newSubjectDescription || undefined,
            // API expects `class_ids` (snake_case) to match validation schema
            class_ids: selectedClassIds.length > 0 ? selectedClassIds : null,
            cover_type: autoIcons ? 'ai_icons' : 'custom',
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subject');
      }

      await syncSubjects(true);
      setNewSubjectTitle('');
      setNewSubjectDescription('');
      setAutoIcons(true);
      setSelectedClassIds([]);
      setIsCreateOpen(false);

      toast({
        title: 'Subject Created',
        description: 'Your subject has been created.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // This must stay above any early return (isLoading below) — hooks can't
  // be called conditionally. It previously sat after the isLoading
  // return, so the component called a different number of hooks on the
  // loading vs. loaded render, which is exactly React error #310
  // ("Rendered more hooks than during the previous render").
  const visibleSubjects = useMemo(() => {
    let list = subjects.filter((subject: any) => showArchived || !subject.archived_at);
    if (filterFolderId !== 'all') {
      list = filterFolderId === 'none'
        ? list.filter((subject: any) => !subject.folder_id)
        : list.filter((subject: any) => subject.folder_id === filterFolderId);
    }
    if (sortBy === 'name') {
      list = [...list].sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'recent') {
      list = [...list].sort((a: any, b: any) => {
        const aTime = a.paragraphContext?.lastActiveAt ? new Date(a.paragraphContext.lastActiveAt).getTime() : 0;
        const bTime = b.paragraphContext?.lastActiveAt ? new Date(b.paragraphContext.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return list;
  }, [subjects, sortBy, filterFolderId, showArchived]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-[4/3] surface-interactive" />
              <div className="p-4 space-y-2">
                <div className="h-3 surface-interactive rounded w-3/4" />
                <div className="h-2 surface-interactive rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-[13px] text-foreground">
        {subjects.length > 1 && (
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {isTeacher && folders.length > 0 && (
              <Select value={filterFolderId} onValueChange={setFilterFolderId}>
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="recent">Recently active</SelectItem>
              </SelectContent>
            </Select>
            {isTeacher && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-3.5 w-3.5" />
                Show archived
              </label>
            )}
          </div>
        )}
        {isTeacher ? (
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsQuickCreateOpen(true)} size="sm" className="h-9 rounded-xl">
              + New assignment/test
            </Button>
            <Button onClick={() => setIsImportOpen(true)} size="sm" variant="outline" className="h-9 rounded-xl">
              Import Test
            </Button>
            <Button onClick={() => setIsJoinOpen(true)} size="sm" variant="outline" className="h-9 rounded-xl">
              Join Subject
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" variant="outline" className="h-9 rounded-xl">
              + Create Subject
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => setIsJoinOpen(true)} size="sm" className="h-9 rounded-xl">
              + Join Subject
            </Button>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border surface-panel p-12 text-center flex flex-col items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm">No subjects yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isTeacher ? 'Create one to start adding chapters, tests and materials.' : 'Ask your teacher for a join code to add your first subject.'}
              </p>
            </div>
            {isTeacher ? (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-9 rounded-xl mt-1">
                Create First Subject
              </Button>
            ) : (
              <Button onClick={() => setIsJoinOpen(true)} size="sm" className="h-9 rounded-xl mt-1">
                Join Subject
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                isTeacher={isTeacher}
                folders={folders}
                onSubjectUpdated={handleSubjectUpdated}
                onCreateFolder={handleCreateFolder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subject</DialogTitle>
            <DialogDescription>
              Add a new subject to your curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-title">Title</Label>
              <Input
                id="subject-title"
                placeholder=""
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
              />
            </div>

            {/* Auto icons switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-icons" className="text-sm">Auto-generated cover icons</Label>
              <Switch
                id="auto-icons"
                checked={autoIcons}
                onCheckedChange={setAutoIcons}
              />
            </div>

            {autoIcons && (
              <div className="space-y-2">
                <Label htmlFor="subject-description">What is this subject about?</Label>
                <Textarea
                  id="subject-description"
                  placeholder="e.g., Study of living organisms, cells, genetics, and ecosystems..."
                  value={newSubjectDescription}
                  onChange={(e) => setNewSubjectDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This helps generate relevant cover icons for the subject card.
                </p>
              </div>
            )}

            {!autoIcons && (
              <div className="space-y-2 p-3 border rounded surface-interactive">
                <p className="text-xs text-muted-foreground">
                  Custom image upload will be available after creating the subject.
                  You can upload a cover image from the subject settings.
                </p>
              </div>
            )}

            {!classId && classes.length > 0 && (
              <div className="space-y-2">
                <Label>Link to classes (optional)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 surface-interactive">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`class-${classItem.id}`}
                        checked={selectedClassIds.includes(classItem.id)}
                        onCheckedChange={() => toggleClassSelection(classItem.id)}
                      />
                      <label
                        htmlFor={`class-${classItem.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {classItem.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedClassIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedClassIds.length} class{selectedClassIds.length !== 1 ? 'es' : ''} selected
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating || !newSubjectTitle.trim()} className="rounded-xl">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Subject Dialog -- same code for both roles. A teacher of the
          subject approves every request (student or co-teacher) from
          Settings > Subject > Access before it takes effect. */}
      <Dialog open={isJoinOpen} onOpenChange={(open) => { setIsJoinOpen(open); if (!open) setJoinCodeInput(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a subject</DialogTitle>
            <DialogDescription>
              {isTeacher
                ? 'Enter a join code to request co-teaching a subject. A teacher of that subject needs to approve you first.'
                : 'Enter the join code your teacher shared. They need to approve your request before you get access.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="join-subject-code">Join code</Label>
            <Input
              id="join-subject-code"
              placeholder="e.g. AB12CD"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="font-mono tracking-wider"
              onKeyDown={(e) => { if (e.key === 'Enter' && joinCodeInput.trim()) void handleJoinSubject(); }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJoinOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleJoinSubject} disabled={isJoining || !joinCodeInput.trim()} className="rounded-xl">
              {isJoining ? 'Joining...' : 'Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Test Dialog (G3, docs/subjects-feature-brainstorm.md) */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) resetImportState(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import a shared test</DialogTitle>
            <DialogDescription>
              Enter the share code from another teacher to add a fully independent copy of their test.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-code">Share code</Label>
              <Input
                id="import-code"
                placeholder="e.g. AB3D9FZ"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={importSubjectId} onValueChange={setImportSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select value={importChapterId} onValueChange={setImportChapterId} disabled={!importSubjectId || isLoadingImportChapters}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingImportChapters ? 'Loading...' : 'Choose a chapter'} />
                </SelectTrigger>
                <SelectContent>
                  {importChapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>{chapter.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paragraph</Label>
              <Select value={importParagraphId} onValueChange={setImportParagraphId} disabled={!importChapterId || isLoadingImportParagraphs}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingImportParagraphs ? 'Loading...' : 'Choose a paragraph'} />
                </SelectTrigger>
                <SelectContent>
                  {importParagraphs.map((paragraph) => (
                    <SelectItem key={paragraph.id} value={paragraph.id}>{paragraph.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleImportTest}
              disabled={isImporting || !importCode.trim() || !importParagraphId}
              className="rounded-xl"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-create shortcut (S0, docs/subjects-feature-brainstorm.md section F) */}
      <Dialog open={isQuickCreateOpen} onOpenChange={(open) => { setIsQuickCreateOpen(open); if (!open) resetQuickCreateState(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New assignment or test</DialogTitle>
            <DialogDescription>
              Pick where it goes — you'll land straight in the create wizard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What are you creating?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={quickCreateKind === 'homework' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickCreateKind('homework')}
                >
                  Homework
                </Button>
                <Button
                  type="button"
                  variant={quickCreateKind === 'test' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickCreateKind('test')}
                >
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={quickCreateSubjectId} onValueChange={setQuickCreateSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select value={quickCreateChapterId} onValueChange={setQuickCreateChapterId} disabled={!quickCreateSubjectId || isLoadingQuickCreateChapters}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingQuickCreateChapters ? 'Loading...' : 'Choose a chapter'} />
                </SelectTrigger>
                <SelectContent>
                  {quickCreateChapters.map((chapter: any) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.title}{chapter.is_tests_chapter ? ' (Toetsen)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paragraph</Label>
              <Select value={quickCreateParagraphId} onValueChange={setQuickCreateParagraphId} disabled={!quickCreateChapterId || isLoadingQuickCreateParagraphs}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingQuickCreateParagraphs ? 'Loading...' : 'Choose a paragraph'} />
                </SelectTrigger>
                <SelectContent>
                  {quickCreateParagraphs.map((paragraph) => (
                    <SelectItem key={paragraph.id} value={paragraph.id}>{paragraph.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickCreateOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleQuickCreateGo} disabled={!quickCreateParagraphId} className="rounded-xl">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

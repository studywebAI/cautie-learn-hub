'use client';

import React, { useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { InputWithTypingPlaceholder } from '@/components/ui/input-with-typing-placeholder';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [autoIcons, setAutoIcons] = useState(true);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

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
      console.error('Error fetching subjects:', error);
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
      console.warn('Subjects sync failed; falling back to full fetch', error);
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-[13px] text-[hsl(var(--sidebar-active-foreground))]">
        {isTeacher && (
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-9 rounded-xl border-sidebar-border/80 bg-sidebar-accent px-3 text-[13px] text-[hsl(var(--sidebar-active-foreground))] hover:bg-sidebar-accent/90">
              + create subject
            </Button>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="py-16 text-center text-sidebar-foreground/80">
            <p className="mb-4 text-[13px] lowercase">no subjects yet</p>
            {isTeacher && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-9 rounded-xl border-sidebar-border/80 bg-sidebar-accent px-3 text-[13px] text-[hsl(var(--sidebar-active-foreground))] hover:bg-sidebar-accent/90">
                create first subject
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">create subject</DialogTitle>
            <DialogDescription>
              Add a new subject to your curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-title" className="lowercase">title</Label>
              <InputWithTypingPlaceholder
                id="subject-title"
                placeholders={["Biology", "Mathematics", "Nederlands", "History", "Physics", "Chemistry"]}
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
              />
            </div>

            {/* Auto icons switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-icons" className="text-sm lowercase">auto-generated cover icons</Label>
              <Switch
                id="auto-icons"
                checked={autoIcons}
                onCheckedChange={setAutoIcons}
              />
            </div>

            {autoIcons && (
              <div className="space-y-2">
                <Label htmlFor="subject-description" className="lowercase">what is this subject about?</Label>
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
              <div className="space-y-2 p-3 border rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Custom image upload will be available after creating the subject.
                  You can upload a cover image from the subject settings.
                </p>
              </div>
            )}

            {!classId && classes.length > 0 && (
              <div className="space-y-2">
                <Label className="lowercase">link to classes (optional)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">
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
              cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating || !newSubjectTitle.trim()} className="rounded-xl">
              {isCreating ? 'creating...' : 'create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

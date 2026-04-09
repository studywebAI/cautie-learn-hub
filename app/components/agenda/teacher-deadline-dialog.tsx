'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, Link as LinkIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import type { ClassInfo } from '@/contexts/app-context';
import { HierarchicalLinkPickerV2 } from './hierarchical-link-picker-v2';

type DeadlineType = 'assignment' | 'quiz' | 'studyset' | 'event' | 'other';

type AgendaLink = {
  id?: string;
  link_type: string;
  link_ref_id?: string | null;
  label: string;
  metadata_json?: Record<string, any>;
  position?: number;
};

type SubjectOption = {
  id: string;
  title: string;
  classId: string;
  className: string;
};

type LinkSourceOption = {
  id: string;
  link_type: string;
  link_ref_id?: string | null;
  label: string;
  subtitle?: string;
  metadata_json?: Record<string, any>;
};

type TeacherDeadlineDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classes: ClassInfo[];
  defaultClassId?: string;
  onDeadlineCreated: (deadline: {
    title: string;
    description: string;
    class_id: string;
    subject_id?: string | null;
    item_type: DeadlineType;
    starts_at?: string | null;
    due_at?: string | null;
    visible: boolean;
    publish_at?: string | null;
    links?: AgendaLink[];
  }) => Promise<void>;
  initialDate?: Date;
};

export function TeacherDeadlineDialog({
  isOpen,
  setIsOpen,
  classes,
  defaultClassId,
  onDeadlineCreated,
  initialDate,
}: TeacherDeadlineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(defaultClassId ? [defaultClassId] : []);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [itemType, setItemType] = useState<DeadlineType>('assignment');
  const [isVisibleToStudents, setIsVisibleToStudents] = useState(true);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('09:00');
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, SubjectOption[]>>({});
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [links, setLinks] = useState<AgendaLink[]>([]);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceResults, setSourceResults] = useState<LinkSourceOption[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (defaultClassId) setSelectedClassIds([defaultClassId]);
  }, [defaultClassId]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedClassIds.length > 0) return;
    const fallbackClass = (classes || []).find((classItem) => classItem.status !== 'archived');
    if (fallbackClass) setSelectedClassIds([fallbackClass.id]);
  }, [isOpen, classes, selectedClassIds]);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    const loadSubjects = async () => {
      if (selectedClassIds.length === 0) {
        setSubjectsByClass({});
        setSelectedSubjectIds([]);
        return;
      }
      setIsLoadingSubjects(true);
      try {
        const entries = await Promise.all(
          selectedClassIds.map(async (classId) => {
            const response = await fetch(`/api/classes/${classId}/subjects`);
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || 'Failed to load subjects');
            const className = (classes || []).find((classItem) => classItem.id === classId)?.name || 'Class';
            const rows = (data?.subjects || []).map((subject: any) => ({
              id: subject.id,
              title: subject.title,
              classId,
              className,
            }));
            return [classId, rows] as const;
          })
        );
        const map = Object.fromEntries(entries) as Record<string, SubjectOption[]>;
        setSubjectsByClass(map);
        const validSubjectIds = new Set(Object.values(map).flat().map((subject) => subject.id));
        setSelectedSubjectIds((prev) => prev.filter((subjectId) => validSubjectIds.has(subjectId)));
      } catch {
        setSubjectsByClass({});
        setSelectedSubjectIds([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    void loadSubjects();
  }, [classes, selectedClassIds]);

  useEffect(() => {
    if (!sourcesOpen || selectedClassIds.length === 0) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadingSources(true);
      try {
        const params = new URLSearchParams();
        params.set('classIds', selectedClassIds.join(','));
        if (sourceQuery.trim()) params.set('q', sourceQuery.trim());
        const response = await fetch(`/api/classes/agenda/link-sources?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load sources');
        setSourceResults(data?.items || []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setSourceResults([]);
      } finally {
        setLoadingSources(false);
      }
    };

    const timeout = setTimeout(() => {
      void run();
    }, 180);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedClassIds, sourceQuery, sourcesOpen]);

  const selectedClasses = useMemo(
    () =>
      (classes || [])
        .filter((classItem) => selectedClassIds.includes(classItem.id))
        .map((classItem) => ({ id: classItem.id, name: classItem.name })),
    [classes, selectedClassIds]
  );

  const allSubjects = useMemo(() => Object.values(subjectsByClass).flat(), [subjectsByClass]);

  const selectedSubjects = useMemo(
    () => allSubjects.filter((subject) => selectedSubjectIds.includes(subject.id)),
    [allSubjects, selectedSubjectIds]
  );

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) => {
      if (prev.includes(classId)) return prev.filter((id) => id !== classId);
      return [...prev, classId];
    });
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subjectId)) return prev.filter((id) => id !== subjectId);
      return [...prev, subjectId];
    });
  };

  const addSourceAsLink = (source: LinkSourceOption) => {
    const next: AgendaLink = {
      link_type: source.link_type,
      link_ref_id: source.link_ref_id || null,
      label: source.label,
      metadata_json: source.metadata_json || {},
      position: links.length,
    };
    const duplicate = links.find(
      (link) =>
        link.link_type === next.link_type &&
        (link.link_ref_id || '') === (next.link_ref_id || '') &&
        link.label === next.label
    );
    if (duplicate) return;
    setLinks((prev) => [...prev, next]);
    setSourceQuery('');
    setSourcesOpen(false);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index).map((link, idx) => ({ ...link, position: idx })));
  };

  const handleCreate = async () => {
    if (!date || selectedClassIds.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please provide date and at least one class.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const dueAt = new Date(date);
      dueAt.setHours(12, 0, 0, 0);
      const publishAtIso = !isVisibleToStudents && publishDate
        ? new Date(`${publishDate}T${publishTime || '09:00'}`).toISOString()
        : null;

      const safeTitle = title.trim() || 'Agenda item';
      for (const classId of selectedClassIds) {
        const classSubjectIds = selectedSubjectIds.filter((subjectId) =>
          (subjectsByClass[classId] || []).some((subject) => subject.id === subjectId)
        );

        if (classSubjectIds.length === 0) {
          await onDeadlineCreated({
            title: safeTitle,
            description: description.trim(),
            class_id: classId,
            subject_id: null,
            item_type: itemType,
            starts_at: dueAt.toISOString(),
            due_at: dueAt.toISOString(),
            visible: isVisibleToStudents,
            publish_at: isVisibleToStudents ? null : publishAtIso,
            links,
          });
          continue;
        }

        for (const subjectId of classSubjectIds) {
          await onDeadlineCreated({
            title: safeTitle,
            description: description.trim(),
            class_id: classId,
            subject_id: subjectId,
            item_type: itemType,
            starts_at: dueAt.toISOString(),
            due_at: dueAt.toISOString(),
            visible: isVisibleToStudents,
            publish_at: isVisibleToStudents ? null : publishAtIso,
            links,
          });
        }
      }

      toast({
        title: 'Agenda item created',
        description: `"${safeTitle}" was added.`,
      });
      resetAndClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create agenda item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setDate(initialDate);
    setSelectedClassIds(defaultClassId ? [defaultClassId] : []);
    setSelectedSubjectIds([]);
    setItemType('assignment');
    setIsVisibleToStudents(true);
    setPublishDate('');
    setPublishTime('09:00');
    setLinks([]);
    setSourceQuery('');
    setSourceResults([]);
    setSourcesOpen(false);
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resetAndClose();
        else setIsOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Agenda Item</DialogTitle>
          <DialogDescription>
            Add a teacher-planned item with optional subject and linked context.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="class">Class</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="class" variant="secondary" className="justify-between">
                    {selectedClasses.length > 0
                      ? `${selectedClasses.length} class${selectedClasses.length === 1 ? '' : 'es'} selected`
                      : 'Select classes'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-2">
                  <div className="space-y-1">
                    {(classes || [])
                      .filter((classItem) => classItem.status !== 'archived')
                      .map((classItem) => {
                        const checked = selectedClassIds.includes(classItem.id);
                        return (
                          <button
                            key={classItem.id}
                            type="button"
                            onClick={() => toggleClassSelection(classItem.id)}
                            className="flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left"
                          >
                            <span className="text-sm">{classItem.name}</span>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleClassSelection(classItem.id)}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </button>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={itemType} onValueChange={(value) => setItemType(value as DeadlineType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Homework</SelectItem>
                  <SelectItem value="quiz">Test</SelectItem>
                  <SelectItem value="event">Big Test</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="subject" variant="secondary" className="justify-between">
                    {selectedSubjects.length > 0
                      ? `${selectedSubjects.length} subject${selectedSubjects.length === 1 ? '' : 's'} selected`
                      : isLoadingSubjects
                        ? 'Loading subjects...'
                        : 'No subject'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-2">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectIds([])}
                      className="w-full rounded-md border px-2.5 py-2 text-left text-sm"
                    >
                      No subject
                    </button>
                    {allSubjects.map((subject) => {
                      const checked = selectedSubjectIds.includes(subject.id);
                      return (
                        <button
                          key={`${subject.classId}-${subject.id}`}
                          type="button"
                          onClick={() => toggleSubjectSelection(subject.id)}
                          className="flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left"
                        >
                          <span className="text-sm">
                            {subject.title}
                            <span className="ml-1 text-xs text-muted-foreground">({subject.className})</span>
                          </span>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSubjectSelection(subject.id)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn('justify-start text-left', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <div
            className="relative rounded-xl border border-border bg-muted/30 px-3 py-3"
          >
            <span
              className={cn(
                'absolute inset-y-2 left-2 w-1 rounded-full',
                isVisibleToStudents ? 'bg-emerald-500/70' : 'bg-rose-400/75'
              )}
            />
            <div className="pl-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Visible to students</p>
                  <p className="text-xs text-muted-foreground">
                    Turn off to keep hidden. You can optionally schedule publish time.
                  </p>
                </div>
                <Switch checked={isVisibleToStudents} onCheckedChange={setIsVisibleToStudents} />
              </div>

              {!isVisibleToStudents && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="publishDate">Publish date</Label>
                    <Input
                      id="publishDate"
                      type="date"
                      value={publishDate}
                      onChange={(event) => setPublishDate(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="publishTime">Publish time</Label>
                    <Input
                      id="publishTime"
                      type="time"
                      value={publishTime}
                      onChange={(event) => setPublishTime(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Linked Context</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add recents or subject/chapter/paragraph/assignment links.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setHierarchyOpen(true)}>
                  Add from subjects
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setSourcesOpen((open) => !open)}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {sourcesOpen ? 'Close recents' : 'Add from recents'}
                </Button>
              </div>
            </div>

            {sourcesOpen && (
              <div className="rounded-xl border bg-sidebar-accent/40 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={sourceQuery}
                    onChange={(event) => setSourceQuery(event.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-2">
                  {loadingSources ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : sourceResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sources found.</p>
                  ) : (
                    sourceResults.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/50"
                        onClick={() => addSourceAsLink(source)}
                      >
                        <div className="text-sm font-medium truncate">{source.label}</div>
                        <div className="text-xs text-muted-foreground">{source.subtitle || source.link_type}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={`${link.link_type}-${link.link_ref_id || index}`} className="flex items-center gap-2 rounded-lg border p-2">
                    <Badge variant="secondary">{link.link_type.replace('_', ' ')}</Badge>
                    <span className="text-sm truncate flex-1">{link.label}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLink(index)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create item
          </Button>
        </DialogFooter>
      </DialogContent>
      <HierarchicalLinkPickerV2
        isOpen={hierarchyOpen}
        onClose={() => setHierarchyOpen(false)}
        classId={selectedClassIds[0]}
        onSelect={(picked) => {
          const duplicate = links.find(
            (link) =>
              link.link_type === picked.type &&
              (link.link_ref_id || '') === '' &&
              link.label === picked.title
          );
          if (duplicate) return;
          setLinks((prev) => [
            ...prev,
            {
              link_type: picked.type,
              label: picked.path ? `${picked.title} | ${picked.path}` : picked.title,
              metadata_json: { path: picked.path || null, url: picked.url || null },
              position: prev.length,
            },
          ]);
        }}
      />
    </Dialog>
  );
}


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
import { InputWithTypingPlaceholder } from '@/components/ui/input-with-typing-placeholder';
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
import type { ClassInfo } from '@/contexts/app-context';

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
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('none');
  const [itemType, setItemType] = useState<DeadlineType>('assignment');
  const [isVisibleToStudents, setIsVisibleToStudents] = useState(true);
  const [publishAtLocal, setPublishAtLocal] = useState('');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [links, setLinks] = useState<AgendaLink[]>([]);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceResults, setSourceResults] = useState<LinkSourceOption[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (defaultClassId) setSelectedClassId(defaultClassId);
  }, [defaultClassId]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedClassId) return;
    const fallbackClass = (classes || []).find((classItem) => classItem.status !== 'archived');
    if (fallbackClass) setSelectedClassId(fallbackClass.id);
  }, [isOpen, classes, selectedClassId]);

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedClassId) {
        setSubjects([]);
        setSelectedSubjectId('none');
        return;
      }
      setIsLoadingSubjects(true);
      try {
        const response = await fetch(`/api/classes/${selectedClassId}/subjects`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load subjects');
        const rows = (data?.subjects || []).map((subject: any) => ({
          id: subject.id,
          title: subject.title,
        }));
        setSubjects(rows);
        if (rows.length === 0) setSelectedSubjectId('none');
      } catch {
        setSubjects([]);
        setSelectedSubjectId('none');
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    void loadSubjects();
  }, [selectedClassId]);

  useEffect(() => {
    if (!sourcesOpen || !selectedClassId) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadingSources(true);
      try {
        const params = new URLSearchParams();
        params.set('classIds', selectedClassId);
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
  }, [sourcesOpen, selectedClassId, sourceQuery]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) || null,
    [subjects, selectedSubjectId]
  );

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
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index).map((link, idx) => ({ ...link, position: idx })));
  };

  const handleCreate = async () => {
    if (!title.trim() || !date || !selectedClassId) {
      toast({
        title: 'Missing information',
        description: 'Please provide title, date, and class.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const dueAt = new Date(date);
      dueAt.setHours(12, 0, 0, 0);
      const publishAtIso = publishAtLocal ? new Date(publishAtLocal).toISOString() : null;

      await onDeadlineCreated({
        title: title.trim(),
        description: description.trim(),
        class_id: selectedClassId,
        subject_id: selectedSubject?.id || null,
        item_type: itemType,
        starts_at: dueAt.toISOString(),
        due_at: dueAt.toISOString(),
        visible: isVisibleToStudents,
        publish_at: isVisibleToStudents ? null : publishAtIso,
        links,
      });

      toast({
        title: 'Agenda item created',
        description: `"${title.trim()}" was added.`,
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
    setSelectedSubjectId('none');
    setItemType('assignment');
    setIsVisibleToStudents(true);
    setPublishAtLocal('');
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
            <InputWithTypingPlaceholder
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholders={['Chapter 3 quiz review', 'Read pages 50-70', 'Prepare lab report']}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes || [])
                    .filter((classItem) => classItem.status !== 'archived')
                    .map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={itemType} onValueChange={(value) => setItemType(value as DeadlineType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="studyset">Studyset</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject (optional)</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder={isLoadingSubjects ? 'Loading subjects...' : 'No subject'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
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
              placeholder="Add instructions or context"
              rows={3}
            />
          </div>

          <div
            className={cn(
              'rounded-xl border px-3 py-3',
              isVisibleToStudents ? 'bg-muted/30 border-border' : 'bg-red-100/50 border-red-300'
            )}
          >
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
              <div className="mt-3 grid gap-2">
                <Label htmlFor="publishAt">Publish at (optional)</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={publishAtLocal}
                  onChange={(event) => setPublishAtLocal(event.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Linked Context</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Search recents and attach context links.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSourcesOpen((open) => !open)}>
                <LinkIcon className="h-4 w-4 mr-2" />
                {sourcesOpen ? 'Close search' : 'Link from recents'}
              </Button>
            </div>

            {sourcesOpen && (
              <div className="rounded-xl border bg-sidebar-accent/40 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={sourceQuery}
                    onChange={(event) => setSourceQuery(event.target.value)}
                    placeholder="Search assignments, materials, runs, studysets"
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
                    <Badge variant="outline">{link.link_type}</Badge>
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
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

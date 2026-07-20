'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Lock, Settings2 } from 'lucide-react';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';

interface Chapter {
  id: string;
  title: string;
  chapter_number: number;
  is_tests_chapter?: boolean;
}

interface Paragraph {
  id: string;
  title: string;
  paragraph_number: number;
  completion_percent: number;
  assignment_count: number;
  prerequisite_paragraph_id?: string | null;
  locked?: boolean;
  is_pending?: boolean;
}

export default function ChapterOverviewPage() {
  const params = useParams();
  const { subjectId, chapterId } = params as {
    subjectId: string;
    chapterId: string;
  };

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adjacentChapters, setAdjacentChapters] = useState<{ prev?: Chapter; next?: Chapter }>({});
  const [isCreateParagraphOpen, setIsCreateParagraphOpen] = useState(false);
  const [newParagraphTitle, setNewParagraphTitle] = useState('');
  const [isCreatingParagraph, setIsCreatingParagraph] = useState(false);
  const { toast } = useToast();
  const { role, language } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';
  const isDutch = language === 'nl';
  const t = {
    paragraphs: isDutch ? 'Paragrafen' : 'Paragraphs',
    addParagraph: isDutch ? '+ Paragraaf toevoegen' : '+ Add Paragraph',
    addParagraphTitle: isDutch ? 'Paragraaf toevoegen' : 'Add Paragraph',
    addParagraphDescription: isDutch ? 'Maak een nieuwe paragraaf voor dit hoofdstuk.' : 'Create a new paragraph for this chapter.',
    title: isDutch ? 'Titel' : 'Title',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    creating: isDutch ? 'Aanmaken...' : 'Creating...',
    create: isDutch ? 'Maken' : 'Create',
    assignmentsWord: isDutch ? 'opdrachten' : 'assignments',
    finishFirst: isDutch ? 'Rond eerst af' : 'Finish first',
    prerequisiteSettings: isDutch ? 'Paragraafinstellingen' : 'Paragraph settings',
    requiresFirst: isDutch ? 'Vereist eerst (optioneel)' : 'Requires first (optional)',
    none: isDutch ? 'Geen' : 'None',
    lockedHint: isDutch
      ? 'Leerlingen zien deze paragraaf pas na 100% voortgang op de gekozen paragraaf.'
      : 'Students only see this paragraph once the chosen one is 100% complete.',
    save: isDutch ? 'Opslaan' : 'Save',
    saving: isDutch ? 'Opslaan...' : 'Saving...',
    saveFailed: isDutch ? 'Opslaan mislukt' : 'Save failed',
  };

  const fetchChapterData = async () => {
    if (!subjectId || !chapterId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/overview`, {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = await response.json();
      setSubject(payload.subject || null);
      setChapter(payload.chapter || null);
      setParagraphs(Array.isArray(payload.paragraphs) ? payload.paragraphs : []);
      setAdjacentChapters(payload.adjacentChapters || {});
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChapterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chapterId]);

  const handleParagraphClick = (paragraphId: string, paragraphNumber: number, paragraphTitle: string) => {
    if (chapter) {
      const activity = {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        paragraphId,
        paragraphNumber,
        paragraphTitle,
      };
      localStorage.setItem(`lastActivity_${subjectId}`, JSON.stringify(activity));
    }
  };

  const handleCreateParagraph = async () => {
    const resolvedTitle = newParagraphTitle.trim();
    if (!resolvedTitle || isCreatingParagraph) return;

    const nextNumber = paragraphs.length ? Math.max(...paragraphs.map((p) => p.paragraph_number || 0)) + 1 : 1;
    const tempId = `temp-paragraph-${Date.now()}`;
    const optimisticParagraph: Paragraph = {
      id: tempId,
      title: resolvedTitle,
      paragraph_number: nextNumber,
      completion_percent: 0,
      assignment_count: 0,
      is_pending: true,
    };

    setIsCreatingParagraph(true);
    setParagraphs((prev) => [...prev, optimisticParagraph]);
    setNewParagraphTitle('');
    setIsCreateParagraphOpen(false);

    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: resolvedTitle }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.details || errorData?.error || 'Failed to create paragraph');
      }
      const created = await response.json();
      setParagraphs((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, ...created, assignment_count: 0, completion_percent: 0, is_pending: false }
            : p
        )
      );
    } catch (error) {
      setParagraphs((prev) => prev.filter((p) => p.id !== tempId));
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create paragraph',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingParagraph(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <CautieLoader label="Loading chapter" sublabel="Fetching paragraphs" size="lg" />
      </div>
    );
  }

  if (!chapter) {
    return <div className="page-content text-muted-foreground">Chapter not found</div>;
  }

  return (
    <div className="page-content">
      <PageHeader
        title={`${chapter.chapter_number}. ${chapter.title}`}
        subtitle={`${subject?.title || 'Subjects'} / ${t.paragraphs}`}
        actions={
          <div className="flex items-center gap-1">
            {isTeacher && (
              <Button size="sm" variant="outline" onClick={() => setIsCreateParagraphOpen(true)}>
                {t.addParagraph}
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2">
              <Link prefetch={false} href={`/subjects/${subjectId}`}>
                <ChevronLeft className="h-3.5 w-3.5" />
                {subject?.title || 'Subjects'}
              </Link>
            </Button>
            {adjacentChapters.prev && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={`${adjacentChapters.prev.chapter_number}. ${adjacentChapters.prev.title}`}>
                <Link prefetch={false} href={`/subjects/${subjectId}/chapters/${adjacentChapters.prev.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {adjacentChapters.next && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8" title={`${adjacentChapters.next.chapter_number}. ${adjacentChapters.next.title}`}>
                <Link prefetch={false} href={`/subjects/${subjectId}/chapters/${adjacentChapters.next.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Numbered paragraph list */}
      {paragraphs.length > 0 ? (
        <div>
          {paragraphs.map((paragraph) => {
            const roundedProgress = Math.ceil(paragraph.completion_percent || 0);

            if (paragraph.locked) {
              const prereq = paragraphs.find((p) => p.id === paragraph.prerequisite_paragraph_id);
              return (
                <div
                  key={paragraph.id}
                  className="flex items-center gap-3 py-3 px-1 border-b border-border opacity-60 cursor-not-allowed"
                  title={prereq ? `${t.finishFirst}: ${prereq.title}` : undefined}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground">
                    {chapter.chapter_number}.{paragraph.paragraph_number} {paragraph.title}
                  </span>
                </div>
              );
            }

            return (
              <div key={paragraph.id} className="flex items-center gap-1 border-b border-border">
                <Link
                  prefetch={false}
                  href={`/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraph.id}`}
                  onClick={() => handleParagraphClick(paragraph.id, paragraph.paragraph_number, paragraph.title)}
                  className="flex flex-1 min-w-0 items-center gap-3 py-3 px-1 hover:bg-accent/40 rounded-lg transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted-foreground tabular-nums">
                    {chapter.chapter_number}.{paragraph.paragraph_number}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
                    {paragraph.title}
                    {paragraph.is_pending ? (
                      <span className="ml-2 text-xs text-muted-foreground">({t.creating})</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {paragraph.assignment_count} {t.assignmentsWord}
                  </span>
                  <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {roundedProgress}%
                  </span>
                  <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--sidebar-active-foreground))] transition-all"
                      style={{ width: `${roundedProgress}%` }}
                    />
                  </div>
                </Link>
                {isTeacher && !paragraph.is_pending && (
                  <ParagraphPrerequisitePopover
                    subjectId={subjectId}
                    chapter={chapter}
                    paragraph={paragraph}
                    allParagraphs={paragraphs}
                    isDutch={isDutch}
                    t={t}
                    onSaved={(prerequisiteId) => {
                      setParagraphs((prev) =>
                        prev.map((p) => (p.id === paragraph.id ? { ...p, prerequisite_paragraph_id: prerequisiteId } : p))
                      );
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Create Paragraph Dialog */}
      <Dialog open={isCreateParagraphOpen} onOpenChange={setIsCreateParagraphOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addParagraphTitle}</DialogTitle>
            <DialogDescription>{t.addParagraphDescription}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="paragraph-title">{t.title}</Label>
            <Input
              id="paragraph-title"
              value={newParagraphTitle}
              onChange={(e) => setNewParagraphTitle(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateParagraphOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateParagraph} disabled={!newParagraphTitle.trim() || isCreatingParagraph}>
              {isCreatingParagraph ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParagraphPrerequisitePopover({
  subjectId,
  chapter,
  paragraph,
  allParagraphs,
  isDutch,
  t,
  onSaved,
}: {
  subjectId: string;
  chapter: Chapter;
  paragraph: Paragraph;
  allParagraphs: Paragraph[];
  isDutch: boolean;
  t: Record<string, string>;
  onSaved: (prerequisiteId: string | null) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(paragraph.prerequisite_paragraph_id || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prerequisite_paragraph_id: value || null }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to save');
      }
      onSaved(value || null);
      setOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.saveFailed, description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t.prerequisiteSettings}
          onClick={(e) => e.preventDefault()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3" onClick={(e) => e.stopPropagation()}>
        <Label htmlFor={`prereq-${paragraph.id}`} className="text-xs">
          {t.requiresFirst}
        </Label>
        <select
          id={`prereq-${paragraph.id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t.none}</option>
          {allParagraphs
            .filter((p) => p.id !== paragraph.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {chapter.chapter_number}.{p.paragraph_number} {p.title}
              </option>
            ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{t.lockedHint}</p>
        <Button size="sm" className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? t.saving : t.save}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

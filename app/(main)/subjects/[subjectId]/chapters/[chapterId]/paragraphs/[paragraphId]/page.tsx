'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionTracking } from '@/lib/hooks/useSessionTracking';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import Link from 'next/link';
import { Settings, EyeOff, Lock, Share2, Copy, Check, Wand2, Layers, CircleCheck, Brush, ChevronLeft } from 'lucide-react';
import { AssignmentSettingsOverlay } from '@/components/AssignmentSettingsOverlay';
import { AssignmentSettings, DEFAULT_ASSIGNMENT_SETTINGS, normalizeAssignmentSettings } from '@/lib/assignments/settings';

type Assignment = {
  id: string;
  title: string;
  type?: 'homework' | 'small_test' | 'big_test' | 'other';
  letter_index: string;
  assignment_index: number;
  block_count: number;
  answers_enabled: boolean;
  is_visible: boolean;
  is_locked: boolean;
  answer_mode: 'view_only' | 'editable' | 'self_grade';
  ai_grading_enabled: boolean;
  settings?: AssignmentSettings | null;
  progress_percent?: number;
  correct_percent?: number;
  is_pending?: boolean;
  results_released?: boolean;
};

type Paragraph = {
  id: string;
  title: string;
  paragraph_number: number;
};

type BreadcrumbSubject = {
  id: string;
  title: string;
};

type BreadcrumbChapter = {
  id: string;
  title: string;
  chapter_number?: number;
  is_tests_chapter?: boolean;
};

// Convert index to letter (0=a, 1=b, 26=aa, etc.)
function indexToLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(97 + index);
  }
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
}

function ShareTestPanel({
  code,
  isLoading,
  labels,
}: {
  code: string | null;
  isLoading: boolean;
  labels: { title: string; hint: string; codeLabel: string; linkLabel: string; copy: string; copied: string };
}) {
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = code ? `${origin}/tests/import/${code}` : '';

  const copy = async (value: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1500);
    } catch {
      // clipboard API unavailable — silently ignore, user can still select the text
    }
  };

  return (
    <div className="w-72 p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">{labels.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{labels.hint}</p>
      </div>
      {isLoading && !code ? (
        <div className="h-8 surface-interactive rounded animate-pulse" />
      ) : code ? (
        <div className="space-y-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">{labels.codeLabel}</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input value={code} readOnly className="h-8 text-sm font-mono tracking-wider" />
              <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => copy(code, 'code')}>
                {copiedField === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">{labels.linkLabel}</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input value={link} readOnly className="h-8 text-xs" />
              <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => copy(link, 'link')}>
                {copiedField === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ParagraphDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { subjectId, chapterId, paragraphId } = params as {
    subjectId: string;
    chapterId: string;
    paragraphId: string;
  };
  
  const [paragraph, setParagraph] = useState<Paragraph | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allParagraphs, setAllParagraphs] = useState<Paragraph[]>([]);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<'all' | 'homework' | 'test'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const [bulkSettingsOpen, setBulkSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const [shareCodes, setShareCodes] = useState<Record<string, string>>({});
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [resolvedChapterId, setResolvedChapterId] = useState(chapterId);
  const [subjectPath, setSubjectPath] = useState<BreadcrumbSubject | null>(null);
  const [chapterPath, setChapterPath] = useState<BreadcrumbChapter | null>(null);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';
  const { dictionary } = useDictionary();
  const s = dictionary.subjects;
  const c = dictionary.common;
  const t = {
    backToChapters: s.backToChapters,
    allSettings: s.allSettings,
    addAssignment: s.addAssignment,
    noAssignmentsYet: s.noAssignmentsYet,
    createFirstAssignment: s.createFirstAssignment,
    addAssignmentTitle: s.addAssignmentTitle,
    addAssignmentDescription: s.addParagraphDescriptionInChapter,
    addAssignmentDescriptionWizard: s.addAssignmentDescriptionWizard,
    title: s.fieldTitle,
    back: c.back,
    homework: s.homeworkBadge,
    test: s.testBadge,
    content: s.contentBadge,
    isTestAutoHint: s.isTestAutoHint,
    allAssignments: s.allAssignmentsFilter,
    onlyHomework: s.onlyHomeworkFilter,
    onlyTests: s.testsBadge,
    filterByType: s.filterByType,
    cancel: c.cancel,
    creating: s.creatingEllipsis,
    create: c.create,
    error: c.error,
    failedUpdate: s.failedUpdateSettings,
    failedBulkUpdate: s.failedBulkUpdate,
    failedCreateAssignment: s.failedCreateAssignment,
    shareTest: s.shareTest,
    shareTestTitle: s.shareTestTitle,
    shareTestHint: s.shareTestHint,
    shareCode: s.shareCode,
    shareLink: s.shareLink,
    copy: c.copy,
    copied: s.copied,
    failedShare: s.failedShare,
  };
  const effectiveChapterId = resolvedChapterId || chapterId;

  // Auto-track study session for students
  useSessionTracking(paragraphId, !isTeacher);

  // Auto-open the create wizard when arriving via the Subjects-page "new
  // assignment/test" shortcut (S0, docs/subjects-feature-brainstorm.md
  // section F point 18) — reads plain window.location instead of
  // useSearchParams() to avoid requiring a Suspense boundary here.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create') === '1') {
      setIsCreateAssignmentOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Get adjacent paragraphs
  const currentIndex = allParagraphs.findIndex(p => p.id === paragraphId);
  const prevParagraph = currentIndex > 0 ? allParagraphs[currentIndex - 1] : null;
  const nextParagraph = currentIndex < allParagraphs.length - 1 ? allParagraphs[currentIndex + 1] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/overview`,
          { cache: 'no-store' }
        );
        if (!response.ok) return;
        const payload = await response.json();
        const canonicalChapterId = payload?.canonicalChapterId as string | undefined;
        if (canonicalChapterId && canonicalChapterId !== chapterId) {
          setResolvedChapterId(canonicalChapterId);
          router.replace(
            `/subjects/${subjectId}/chapters/${canonicalChapterId}/paragraphs/${paragraphId}`
          );
        } else {
          setResolvedChapterId(chapterId);
        }
        setParagraph(payload.paragraph || null);
        setAllParagraphs(Array.isArray(payload.allParagraphs) ? payload.allParagraphs : []);
        setSubjectPath(payload.subject || null);
        setChapterPath(payload.chapter || null);
        const normalizedAssignments = (payload.assignments || []).map((a: any) => ({
          ...a,
          is_visible: a.is_visible ?? true,
          is_locked: a.is_locked ?? false,
          answer_mode: a.answer_mode ?? 'view_only',
          ai_grading_enabled: a.ai_grading_enabled ?? false,
          settings: normalizeAssignmentSettings(a.settings || {}),
        }));
        setAssignments(normalizedAssignments);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [subjectId, chapterId, paragraphId, router]);

  const handleUpdateAssignment = async (assignmentId: string, updates: Partial<Assignment>) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setAssignments(prev => prev.map(a => 
          a.id === assignmentId ? { ...a, ...updates } : a
        ));
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: t.error, description: t.failedUpdate, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShareAssignment = async (assignmentId: string) => {
    if (shareCodes[assignmentId]) return;
    setIsSharing(true);
    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments/${assignmentId}/share`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to share');
      const data = await response.json();
      setShareCodes((prev) => ({ ...prev, [assignmentId]: data.code }));
    } catch (error) {
      toast({ title: t.error, description: t.failedShare, variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleBulkUpdate = async (updates: Partial<Assignment>) => {
    setIsUpdating(true);
    try {
      await Promise.all(
        assignments.map(a =>
          fetch(`/api/assignments/${a.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
        )
      );
      setAssignments(prev => prev.map(a => ({ ...a, ...updates })));
    } catch (error) {
      toast({ title: t.error, description: t.failedBulkUpdate, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Assignments are created free-form (no Homework/Test/Content wizard, docs/
  // subjects-feature-brainstorm.md section H): just a title, straight into the
  // editor. "Is this a test" is a togglable setting (AssignmentEditor Settings
  // tab), pre-checked here if the paragraph lives in the Toetsen-hoofdstuk.
  const handleCreateAssignment = async () => {
    if (!newAssignmentTitle.trim()) return;
    if (isCreatingAssignment) return;

    const title = newAssignmentTitle.trim();
    const isTest = Boolean(chapterPath?.is_tests_chapter);
    const effectiveSettings = normalizeAssignmentSettings(DEFAULT_ASSIGNMENT_SETTINGS);

    setIsCreatingAssignment(true);
    setIsCreateAssignmentOpen(false);

    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            answers_enabled: false,
            type: isTest ? 'small_test' : 'homework',
            settings: effectiveSettings,
          }),
        }
      );

      if (response.ok) {
        const newAssignment = await response.json();
        setNewAssignmentTitle('');
        router.push(
          `/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments/${newAssignment.id}`
        );
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create assignment');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : t.failedCreateAssignment,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // One-click "generate flashcards/quiz from this chapter's leerstof"
  // (docs/subjects-feature-brainstorm.md section D point 14) — reuses the
  // existing standalone Flashcards/Quiz tools via their sourceText query-param
  // handoff, same pattern as app/(main)/material/page.tsx.
  const handleGenerateFromParagraph = async (kind: 'flashcards' | 'quiz' | 'notes') => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateMenuOpen(false);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/text-content`);
      if (!res.ok) throw new Error('Failed to load paragraph content');
      const data = await res.json();
      const sourceText = String(data?.sourceText || '').trim();
      if (!sourceText) {
        toast({
          variant: 'destructive',
          title: s.noContentFound,
          description: s.addTextBlocksFirst,
        });
        return;
      }
      const encoded = encodeURIComponent(sourceText.slice(0, 4000));
      if (kind === 'flashcards') {
        router.push(`/tools/flashcards?sourceText=${encoded}`);
      } else if (kind === 'notes') {
        router.push(`/tools/notes?sourceText=${encoded}&autostart=1`);
      } else {
        router.push(`/tools/quiz?sourceText=${encoded}&autostart=1`);
      }
    } catch {
      toast({ variant: 'destructive', title: s.generateFailed });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetCreateForm = () => {
    setNewAssignmentTitle('');
  };

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="h-6 surface-interactive rounded w-1/3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 surface-interactive rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!paragraph) {
    return <div className="page-content text-center py-8 text-muted-foreground">Paragraph not found</div>;
  }

  const bulkSettings = assignments.length > 0
    ? normalizeAssignmentSettings(assignments[0].settings || {})
    : normalizeAssignmentSettings({});
  const filteredAssignments = assignments.filter((assignment) => {
    if (assignmentTypeFilter === 'all') return true;
    const isTest = assignment.type === 'small_test' || assignment.type === 'big_test';
    if (assignmentTypeFilter === 'test') return isTest;
    return !isTest;
  });
  return (
    <div className="page-content">
      <PageHeader
        title={`${paragraph.paragraph_number}. ${paragraph.title}`}
        subtitle={[
          subjectPath?.title || dictionary.sidebar.subjects,
          (chapterPath?.is_tests_chapter ? s.testsBadge : chapterPath?.title) || s.chapterLabel,
          paragraph?.title || s.paragraphs,
          s.assignments,
        ].join(' / ')}
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2">
              <Link prefetch={false} href={`/subjects/${subjectId}`}>
                <ChevronLeft className="h-3.5 w-3.5" />
                {t.backToChapters}
              </Link>
            </Button>
            <div className="hidden items-center gap-1 rounded-md border border-border p-1 md:flex">
              <span className="px-1 text-[10px] text-muted-foreground">{t.filterByType}</span>
              <Button type="button" size="sm" variant={assignmentTypeFilter === 'all' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setAssignmentTypeFilter('all')}>
                {t.allAssignments}
              </Button>
              <Button type="button" size="sm" variant={assignmentTypeFilter === 'homework' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setAssignmentTypeFilter('homework')}>
                {t.onlyHomework}
              </Button>
              <Button type="button" size="sm" variant={assignmentTypeFilter === 'test' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setAssignmentTypeFilter('test')}>
                {t.onlyTests}
              </Button>
            </div>
            {/* One-click flashcards/quiz generation from this paragraph's leerstof */}
            {isTeacher && assignments.length > 0 && (
              <Popover open={generateMenuOpen} onOpenChange={setGenerateMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={isGenerating}>
                    <Wand2 className="h-3.5 w-3.5" />
                    <span className="text-xs">{s.generate}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-1.5">
                  <button
                    onClick={() => handleGenerateFromParagraph('flashcards')}
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:surface-interactive text-left"
                  >
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    {s.flashcardsFromChapter}
                  </button>
                  <button
                    onClick={() => handleGenerateFromParagraph('notes')}
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:surface-interactive text-left"
                  >
                    <Brush className="h-4 w-4 text-muted-foreground" />
                    {s.notesFromChapter}
                  </button>
                  <button
                    onClick={() => handleGenerateFromParagraph('quiz')}
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:surface-interactive text-left"
                  >
                    <CircleCheck className="h-4 w-4 text-muted-foreground" />
                    {s.quizFromChapter}
                  </button>
                </PopoverContent>
              </Popover>
            )}

            {/* Bulk settings for all assignments */}
            {isTeacher && assignments.length > 0 && (
              <Popover open={bulkSettingsOpen} onOpenChange={setBulkSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    <span className="text-xs">{t.allSettings}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-0 w-auto">
                  <AssignmentSettingsOverlay
                    settings={bulkSettings}
                    onSettingsChange={(settings) => handleBulkUpdate({ settings })}
                    isLoading={isUpdating}
                  />
                </PopoverContent>
              </Popover>
            )}
            {isTeacher && (
              <Button onClick={() => { resetCreateForm(); setIsCreateAssignmentOpen(true); }} size="sm" className="h-8">
                {t.addAssignment}
              </Button>
            )}
          </>
        }
      />

      {/* Assignments list */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm mb-4">{t.noAssignmentsYet}</p>
          {isTeacher && (
            <Button onClick={() => { resetCreateForm(); setIsCreateAssignmentOpen(true); }} size="sm">
                {t.createFirstAssignment}
            </Button>
          )}
        </div>
      ) : (
        <div>
          {filteredAssignments.map((assignment, index) => {
            // For students, hide invisible assignments
            if (!isTeacher && !assignment.is_visible) return null;

            const letter = assignment.letter_index || indexToLetter(assignment.assignment_index || index);
            const progress = assignment.progress_percent || 0;
            const roundedProgress = Math.ceil(progress);
            const correctPct = assignment.correct_percent ?? 0;
            const incorrectPct = roundedProgress > 0 ? roundedProgress - correctPct : 0;
            const isTest = assignment.type === 'small_test' || assignment.type === 'big_test';
            const isContent = !isTest && assignment.settings?.delivery?.isContent === true;

            return (
              <div
                key={assignment.id}
                className={`flex items-center gap-3 border-b border-border px-1 py-3.5 transition-colors hover:bg-accent/40 rounded-lg ${
                  !assignment.is_visible ? 'opacity-50' : ''
                }`}
              >
                {/* Letter badge */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted-foreground">
                  {letter}
                </span>

                {/* Title */}
                {assignment.is_pending ? (
                  <span className="text-sm flex-1 truncate text-muted-foreground">
                    {assignment.title} (creating...)
                  </span>
                ) : (
                  <Link prefetch={false}
                    href={`/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments/${assignment.id}`}
                    className="text-sm font-medium flex-1 hover:underline truncate"
                  >
                    {assignment.title}
                  </Link>
                )}
                {/* No badge for a plain assignment — that's the default; only Test/Content are worth calling out. */}
                {(isTest || isContent) && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isTest ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>
                    {isTest ? t.test : t.content}
                  </span>
                )}

                {/* Status indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {isTeacher && assignment.is_locked && (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  )}

                  {/* Visibility indicator */}
                  {isTeacher && !assignment.is_visible && (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {roundedProgress}%
                    </span>
                    <div className="w-14 h-1.5 bg-accent rounded-full overflow-hidden flex">
                  {correctPct > 0 && (
                        <div
                          className="h-full bg-success/70 transition-all"
                          style={{ width: `${(correctPct / 100) * 100}%` }}
                        />
                      )}
                      {incorrectPct > 0 && (
                        <div
                          className="h-full bg-destructive/50 transition-all"
                          style={{ width: `${(incorrectPct / 100) * 100}%` }}
                        />
                      )}
                      {roundedProgress === 0 && (
                        <div className="h-full" style={{ width: '0%' }} />
                      )}
                    </div>
                  </div>

                  {/* Nakijkresultaten link (tests only, students only, once released) */}
                  {!isTeacher && isTest && assignment.results_released && (
                    <Link prefetch={false}
                      href={`/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments/${assignment.id}/results`}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
                    >
                      {s.results}
                    </Link>
                  )}

                  {/* Share test with another teacher (tests only, teachers only) */}
                  {isTeacher && !assignment.is_pending && isTest && (
                    <Popover
                      open={shareOpen === assignment.id}
                      onOpenChange={(open) => {
                        setShareOpen(open ? assignment.id : null);
                        if (open && !shareCodes[assignment.id]) {
                          void handleShareAssignment(assignment.id);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t.shareTest}>
                          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="p-0 w-auto">
                        <ShareTestPanel
                          code={shareCodes[assignment.id] || null}
                          isLoading={isSharing}
                          labels={{
                            title: t.shareTestTitle,
                            hint: t.shareTestHint,
                            codeLabel: t.shareCode,
                            linkLabel: t.shareLink,
                            copy: t.copy,
                            copied: t.copied,
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Per-assignment settings (teachers only) */}
                  {isTeacher && !assignment.is_pending && (
                    <Popover
                      open={settingsOpen === assignment.id}
                      onOpenChange={(open) => setSettingsOpen(open ? assignment.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="p-0 w-auto">
                        <AssignmentSettingsOverlay
                          settings={normalizeAssignmentSettings(assignment.settings || {})}
                          onSettingsChange={(settings) => handleUpdateAssignment(assignment.id, { settings })}
                          isLoading={isUpdating}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation to adjacent paragraphs */}
      <div className="flex justify-between items-center pt-4">
        {prevParagraph ? (
          <Link prefetch={false}
            href={`/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${prevParagraph.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {prevParagraph.paragraph_number}. {prevParagraph.title}
          </Link>
        ) : (
          <div />
        )}
        {nextParagraph && (
          <Link prefetch={false}
            href={`/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${nextParagraph.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {nextParagraph.paragraph_number}. {nextParagraph.title}
          </Link>
        )}
      </div>

      {/* Create Assignment Dialog — free-form, no type wizard (docs/subjects-feature-brainstorm.md section H) */}
      <Dialog open={isCreateAssignmentOpen} onOpenChange={(open) => {
        setIsCreateAssignmentOpen(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent className="sm:max-w-md p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">{t.addAssignmentTitle}</DialogTitle>
            <DialogDescription>{t.addAssignmentDescriptionWizard}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <Label htmlFor="assignment-title">{t.title}</Label>
              <Input
                id="assignment-title"
                autoFocus
                value={newAssignmentTitle}
                onChange={(e) => setNewAssignmentTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAssignmentTitle.trim() && !isCreatingAssignment) handleCreateAssignment();
                }}
                className="mt-1"
              />
            </div>
            {chapterPath?.is_tests_chapter && (
              <p className="text-xs text-muted-foreground">{t.isTestAutoHint}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateAssignmentOpen(false); resetCreateForm(); }}>
              {t.cancel}
            </Button>
            <Button onClick={handleCreateAssignment} disabled={!newAssignmentTitle.trim() || isCreatingAssignment}>
              {isCreatingAssignment ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';
import { Settings, EyeOff, Lock } from 'lucide-react';
import { AssignmentSettingsOverlay } from '@/components/AssignmentSettingsOverlay';
import { AssignmentSettings, DEFAULT_ASSIGNMENT_SETTINGS, normalizeAssignmentSettings } from '@/lib/assignments/settings';
import { ASSIGNMENT_PRESETS, AssignmentCreateKind, getPresetById, toAssignmentType } from '@/lib/assignments/presets';

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
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [createKind, setCreateKind] = useState<AssignmentCreateKind>('homework');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [addToAgenda, setAddToAgenda] = useState(true);
  const [homeworkDueAtLocal, setHomeworkDueAtLocal] = useState('');
  const [testStartsAtLocal, setTestStartsAtLocal] = useState('');
  const [testEndsAtLocal, setTestEndsAtLocal] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number>(45);
  const [attemptLimit, setAttemptLimit] = useState<number>(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeAnswers, setRandomizeAnswers] = useState(true);
  const [integrityMode, setIntegrityMode] = useState(true);
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<'all' | 'homework' | 'test'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null);
  const [bulkSettingsOpen, setBulkSettingsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [resolvedChapterId, setResolvedChapterId] = useState(chapterId);
  const [subjectPath, setSubjectPath] = useState<BreadcrumbSubject | null>(null);
  const [chapterPath, setChapterPath] = useState<BreadcrumbChapter | null>(null);
  const { toast } = useToast();
  const { role } = useContext(AppContext) as AppContextType;
  const isTeacher = role === 'teacher';
  const appContext = useContext(AppContext) as AppContextType;
  const isDutch = appContext.language === 'nl';
  const t = {
    backToChapters: isDutch ? 'Terug naar hoofdstukken' : 'Back to chapters',
    allSettings: isDutch ? 'Alle instellingen' : 'All settings',
    addAssignment: isDutch ? '+ Opdracht Toevoegen' : '+ Add Assignment',
    noAssignmentsYet: isDutch ? 'Nog geen opdrachten' : 'No assignments yet',
    createFirstAssignment: isDutch ? 'Eerste opdracht maken' : 'Create First Assignment',
    addAssignmentTitle: isDutch ? 'Opdracht Toevoegen' : 'Add Assignment',
    addAssignmentDescription: isDutch ? 'Maak een nieuwe opdracht voor deze paragraaf.' : 'Create a new assignment for this paragraph.',
    addAssignmentDescriptionWizard: isDutch ? 'Kies eerst wat je wilt maken, daarna begeleiden we je stap voor stap.' : 'Choose what you are creating first, then we guide you step by step.',
    title: isDutch ? 'Titel' : 'Title',
    back: isDutch ? 'Terug' : 'Back',
    assignmentTypeTitle: isDutch ? 'Wat Maak Je?' : 'What Are You Creating?',
    assignmentTypeDescription: isDutch ? 'Kies eerst het doel. Wij zetten slimme standaardinstellingen klaar.' : 'Choose the goal first. We apply smart defaults.',
    homework: isDutch ? 'Huiswerk' : 'Homework',
    test: isDutch ? 'Toets' : 'Test',
    homeworkCaption: isDutch ? 'Oefenen, reflectie, thuiswerk' : 'Practice, reflection, take-home work',
    testCaption: isDutch ? 'Getimed, gecontroleerd, beoordelingsmodus' : 'Timed, controlled, assessment mode',
    starterTitle: isDutch ? 'Kies een Starter' : 'Choose a Starter',
    starterDescription: isDutch ? 'Begin met een bewezen opzet of start helemaal zelf.' : 'Start with a proven layout or build your own.',
    createYourOwn: isDutch ? 'Zelf Opbouwen' : 'Create Your Own',
    blockMix: isDutch ? 'Blokverdeling' : 'Block mix',
    estimatedTime: isDutch ? 'Geschatte tijd' : 'Estimated time',
    difficulty: isDutch ? 'Moeilijkheid' : 'Difficulty',
    easy: isDutch ? 'Makkelijk' : 'Easy',
    medium: isDutch ? 'Gemiddeld' : 'Medium',
    hard: isDutch ? 'Moeilijk' : 'Hard',
    homeworkSettingsTitle: isDutch ? 'Huiswerkinstellingen' : 'Homework Settings',
    testSettingsTitle: isDutch ? 'Toetsinstellingen' : 'Test Settings',
    dueDate: isDutch ? 'Inlevermoment' : 'Due date',
    openTime: isDutch ? 'Starttijd' : 'Open time',
    closeTime: isDutch ? 'Eindtijd' : 'Close time',
    timerMinutes: isDutch ? 'Timer (minuten)' : 'Timer (minutes)',
    attemptLimit: isDutch ? 'Max. pogingen' : 'Attempt limit',
    randomizeQuestions: isDutch ? 'Vragen Willekeurig' : 'Randomize Questions',
    randomizeAnswers: isDutch ? 'Antwoordopties Willekeurig' : 'Randomize Options',
    integrityMode: isDutch ? 'Integriteitsmodus (Anti-Cheat)' : 'Integrity Mode (Anti-Cheat)',
    addToAgenda: isDutch ? 'Toevoegen Aan Agenda' : 'Add to Agenda',
    createHomework: isDutch ? 'Huiswerk maken' : 'Create homework',
    createTest: isDutch ? 'Toets maken' : 'Create test',
    allAssignments: isDutch ? 'Alles' : 'All',
    onlyHomework: isDutch ? 'Huiswerk' : 'Homework',
    onlyTests: isDutch ? 'Toetsen' : 'Tests',
    filterByType: isDutch ? 'Filter Op Type' : 'Filter by Type',
    agendaCreated: isDutch ? 'Agenda-item aangemaakt' : 'Agenda item created',
    failedAgendaCreate: isDutch ? 'Kon agenda-item niet maken' : 'Could not create agenda item',
    continueBtn: isDutch ? 'Doorgaan' : 'Continue',
    choosePresetFirst: isDutch ? 'Kies een preset of ga verder met zelf opbouwen.' : 'Select a preset or continue with create your own.',
    presetConceptCheck: isDutch ? 'Conceptcheck' : 'Concept check',
    presetConceptCheckUse: isDutch ? 'Snelle controle na de les.' : 'Quick check after a lesson.',
    presetPracticeMix: isDutch ? 'Oefenmix' : 'Practice mix',
    presetPracticeMixUse: isDutch ? 'Afwisselende oefening voor huiswerk.' : 'Varied reinforcement practice.',
    presetQuiz20: isDutch ? 'Quiz (20 min)' : 'Quiz (20 min)',
    presetQuiz20Use: isDutch ? 'Korte toets op recente leerstof.' : 'Short test on recent material.',
    presetChapter45: isDutch ? 'Hoofdstuktoets (45 min)' : 'Chapter test (45 min)',
    presetChapter45Use: isDutch ? 'Formele hoofdstuktoets.' : 'Formal chapter assessment.',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    creating: isDutch ? 'Aanmaken...' : 'Creating...',
    create: isDutch ? 'Maken' : 'Create',
    error: isDutch ? 'Fout' : 'Error',
    failedUpdate: isDutch ? 'Instellingen bijwerken mislukt' : 'Failed to update settings',
    failedBulkUpdate: isDutch ? 'Bijwerken mislukt' : 'Failed to update',
    failedCreateAssignment: isDutch ? 'Opdracht maken mislukt' : 'Failed to create assignment',
  };
  const effectiveChapterId = resolvedChapterId || chapterId;

  // Auto-track study session for students
  useSessionTracking(paragraphId, !isTeacher);

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
        console.error('Error fetching paragraph data:', error);
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
      console.error('Update error:', error);
      toast({ title: t.error, description: t.failedUpdate, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
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

  const handleCreateAssignment = async () => {
    if (!newAssignmentTitle.trim()) return;
    if (isCreatingAssignment) return;

    const title = newAssignmentTitle.trim();
    const selectedPreset = getPresetById(selectedPresetId);
    const toIsoOrNull = (value: string) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    };
    const scheduledStartAt = createKind === 'test' ? toIsoOrNull(testStartsAtLocal) : null;
    const scheduledEndAt = createKind === 'test'
      ? toIsoOrNull(testEndsAtLocal)
      : toIsoOrNull(homeworkDueAtLocal);
    const effectiveSettingsBase = normalizeAssignmentSettings(DEFAULT_ASSIGNMENT_SETTINGS);
    const withPresetSettings = selectedPreset ? selectedPreset.applyDefaults(effectiveSettingsBase) : effectiveSettingsBase;
    const effectiveSettings = normalizeAssignmentSettings({
      ...withPresetSettings,
      time: {
        ...withPresetSettings.time,
        startAt: scheduledStartAt,
        endAt: scheduledEndAt,
        durationMinutes: createKind === 'test' ? timerMinutes : null,
        showTimer: createKind === 'test',
      },
      attempts: {
        ...withPresetSettings.attempts,
        maxAttempts: createKind === 'test' ? attemptLimit : (withPresetSettings.attempts.maxAttempts || 3),
      },
      access: {
        ...withPresetSettings.access,
        shuffleQuestions: createKind === 'test' ? randomizeQuestions : withPresetSettings.access.shuffleQuestions,
        shuffleAnswers: createKind === 'test' ? randomizeAnswers : withPresetSettings.access.shuffleAnswers,
      },
      antiCheat: {
        ...withPresetSettings.antiCheat,
        requireFullscreen: createKind === 'test' ? integrityMode : withPresetSettings.antiCheat.requireFullscreen,
        detectTabSwitch: createKind === 'test' ? integrityMode : withPresetSettings.antiCheat.detectTabSwitch,
      },
    });
    const nextIndex = assignments.length > 0
      ? Math.max(...assignments.map((assignment) => assignment.assignment_index || 0)) + 1
      : 0;
    const tempId = `temp-assignment-${Date.now()}`;
    const optimisticAssignment: Assignment = {
      id: tempId,
      title,
      type: toAssignmentType(createKind),
      letter_index: indexToLetter(nextIndex),
      assignment_index: nextIndex,
      block_count: 0,
      answers_enabled: false,
      is_visible: true,
      is_locked: false,
      answer_mode: 'view_only',
      ai_grading_enabled: false,
      progress_percent: 0,
      correct_percent: 0,
      is_pending: true,
    };

    setIsCreatingAssignment(true);
    setAssignments((prev) => [...prev, optimisticAssignment]);
    setNewAssignmentTitle('');
    setIsCreateAssignmentOpen(false);
    setCreateStep(1);
    setSelectedPresetId(null);

    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            answers_enabled: false,
            type: toAssignmentType(createKind),
            scheduled_start_at: scheduledStartAt,
            scheduled_end_at: scheduledEndAt,
            settings: effectiveSettings,
            preset_id: selectedPresetId,
          }),
        }
      );

      if (response.ok) {
        const newAssignment = await response.json();
        if (selectedPreset && newAssignment?.id) {
          const defaultDataByType: Record<string, any> = {
            open_question: { question: '', correct_answer: '', ai_grading: true, grading_criteria: '', max_score: 5 },
            multiple_choice: {
              question: '',
              options: [
                { id: 'a', text: '', correct: false },
                { id: 'b', text: '', correct: false },
                { id: 'c', text: '', correct: true },
                { id: 'd', text: '', correct: false },
              ],
              multiple_correct: false,
              shuffle: true,
            },
            fill_in_blank: { text: '', answers: [''], case_sensitive: false },
            matching: { prompt: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }] },
            ordering: { prompt: '', items: ['', '', ''], correct_order: [0, 1, 2] },
            text: { header: '', content: '', style: 'normal' },
          };
          const blockInsertPayloads = selectedPreset.blockMix.flatMap((mix) =>
            Array.from({ length: mix.count }, (_unused, i) => ({
              type: mix.type,
              data: defaultDataByType[mix.type] || { text: '' },
              position: i,
            }))
          );
          await Promise.all(
            blockInsertPayloads.map((payload, idx) =>
              fetch(
                `/api/subjects/${subjectId}/chapters/${effectiveChapterId}/paragraphs/${paragraphId}/assignments/${newAssignment.id}/blocks`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...payload,
                    position: idx,
                  }),
                }
              )
            )
          );
        }
        setAssignments((prev) =>
          prev.map((assignment) =>
            assignment.id === tempId
              ? {
                  ...assignment,
                  ...newAssignment,
                  is_visible: newAssignment.is_visible ?? true,
                  is_locked: newAssignment.is_locked ?? false,
                  answer_mode: newAssignment.answer_mode ?? ('view_only' as const),
                  ai_grading_enabled: newAssignment.ai_grading_enabled ?? false,
                  type: newAssignment.type ?? toAssignmentType(createKind),
                  is_pending: false,
                }
              : assignment
          )
        );

        if (addToAgenda && newAssignment?.class_id) {
          const isTest = createKind === 'test';
          const agendaTitle = isTest ? `${t.test}: ${title}` : `${t.homework}: ${title}`;
          const dueAt = isTest ? scheduledEndAt : scheduledEndAt;
          const startsAt = isTest ? scheduledStartAt : null;
          const agendaRes = await fetch(`/api/classes/${newAssignment.class_id}/agenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: agendaTitle,
              description: selectedPreset ? `${selectedPreset.key} preset` : null,
              item_type: isTest ? 'quiz' : 'assignment',
              starts_at: startsAt,
              due_at: dueAt,
              visible: true,
              links: [
                {
                  link_type: 'assignment',
                  link_ref_id: newAssignment.id,
                  label: title,
                  metadata_json: {
                    assignment_type: createKind,
                    paragraph_id: paragraphId,
                  },
                },
              ],
            }),
          });
          if (!agendaRes.ok) {
            toast({ title: t.error, description: t.failedAgendaCreate, variant: 'destructive' });
          } else {
            toast({ title: t.agendaCreated });
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create assignment');
      }
    } catch (error) {
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== tempId));
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : t.failedCreateAssignment,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const resetCreateWizard = () => {
    setCreateStep(1);
    setCreateKind('homework');
    setSelectedPresetId(null);
    setAddToAgenda(true);
    setHomeworkDueAtLocal('');
    setTestStartsAtLocal('');
    setTestEndsAtLocal('');
    setTimerMinutes(45);
    setAttemptLimit(1);
    setRandomizeQuestions(true);
    setRandomizeAnswers(true);
    setIntegrityMode(true);
    setNewAssignmentTitle('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!paragraph) {
    return <div className="text-center py-8 text-muted-foreground">Paragraph not found</div>;
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
  const getPresetLabel = (presetKey: string) => {
    if (presetKey === 'conceptCheck') return t.presetConceptCheck;
    if (presetKey === 'practiceMix') return t.presetPracticeMix;
    if (presetKey === 'quiz20') return t.presetQuiz20;
    if (presetKey === 'chapter45') return t.presetChapter45;
    return presetKey;
  };
  const getPresetUsage = (presetKey: string) => {
    if (presetKey === 'conceptCheck') return t.presetConceptCheckUse;
    if (presetKey === 'practiceMix') return t.presetPracticeMixUse;
    if (presetKey === 'quiz20') return t.presetQuiz20Use;
    if (presetKey === 'chapter45') return t.presetChapter45Use;
    return '';
  };
  const visiblePresets = ASSIGNMENT_PRESETS.filter((preset) => preset.kind === createKind);

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            {[
              subjectPath?.title || 'Subject',
              chapterPath?.title || 'Chapter',
              paragraph?.title || 'Paragraph',
              'Assignments',
            ].join(' / ')}
          </div>
          <Link prefetch={false}
            href={`/subjects/${subjectId}`}
            className="text-xs text-muted-foreground hover:text-foreground mb-1 block"
          >
            {t.backToChapters}
          </Link>
          <h1 className="text-lg">
            {paragraph.paragraph_number}. {paragraph.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-md border border-border p-1 md:flex">
            <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t.filterByType}</span>
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
            <Button onClick={() => { resetCreateWizard(); setIsCreateAssignmentOpen(true); }} size="sm" className="h-8">
              {t.addAssignment}
            </Button>
          )}
        </div>
      </div>

      {/* Assignments list */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm mb-4">{t.noAssignmentsYet}</p>
          {isTeacher && (
            <Button onClick={() => { resetCreateWizard(); setIsCreateAssignmentOpen(true); }} size="sm">
                {t.createFirstAssignment}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((assignment, index) => {
            // For students, hide invisible assignments
            if (!isTeacher && !assignment.is_visible) return null;

            const letter = assignment.letter_index || indexToLetter(assignment.assignment_index || index);
            const progress = assignment.progress_percent || 0;
            const roundedProgress = Math.ceil(progress);
            const correctPct = assignment.correct_percent ?? 0;
            const incorrectPct = roundedProgress > 0 ? roundedProgress - correctPct : 0;
            const isTest = assignment.type === 'small_test' || assignment.type === 'big_test';

            return (
              <div
                key={assignment.id}
                className={`flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-4 py-3 transition-colors hover:bg-sidebar-accent/65 ${
                  !assignment.is_visible ? 'opacity-50' : ''
                }`}
              >
                {/* Letter badge */}
                <span className="bg-foreground text-background px-2.5 py-1 rounded-full text-xs font-medium shrink-0 min-w-[2rem] text-center">
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
                    className="text-sm flex-1 hover:underline truncate"
                  >
                    {assignment.title}
                  </Link>
                )}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isTest ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                  {isTest ? t.test : t.homework}
                </span>

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
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex">
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

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateAssignmentOpen} onOpenChange={(open) => {
        setIsCreateAssignmentOpen(open);
        if (!open) resetCreateWizard();
      }}>
        <DialogContent className="sm:max-w-5xl p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">{t.addAssignmentTitle}</DialogTitle>
            <DialogDescription>{t.addAssignmentDescriptionWizard}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`rounded-full px-2 py-0.5 ${createStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
              <span className={`rounded-full px-2 py-0.5 ${createStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
              <span className={`rounded-full px-2 py-0.5 ${createStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
            </div>

            {createStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t.assignmentTypeTitle}</p>
                <p className="text-xs text-muted-foreground">{t.assignmentTypeDescription}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    className={`rounded-xl border p-4 text-left transition ${createKind === 'homework' ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:bg-muted/40'}`}
                    onClick={() => setCreateKind('homework')}
                  >
                    <p className="text-sm font-medium">{t.homework}</p>
                    <p className="text-xs text-muted-foreground">{t.homeworkCaption}</p>
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border p-4 text-left transition ${createKind === 'test' ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:bg-muted/40'}`}
                    onClick={() => setCreateKind('test')}
                  >
                    <p className="text-sm font-medium">{t.test}</p>
                    <p className="text-xs text-muted-foreground">{t.testCaption}</p>
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{t.starterTitle}</p>
                <p className="text-xs text-muted-foreground">{t.starterDescription}</p>
                <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
                  {visiblePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedPresetId === preset.id ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:bg-muted/40'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{getPresetLabel(preset.key)}</p>
                          <p className="text-xs text-muted-foreground">{getPresetUsage(preset.key)}</p>
                          <p className="mt-2 text-[11px] text-muted-foreground">{t.blockMix}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {preset.blockMix.map((block) => (
                              <span key={`${preset.id}-${block.type}`} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                                {block.type.replace(/_/g, ' ')} x{block.count}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{preset.estimatedTimeMin} min</span>
                      </div>
                      <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Actual Layout Preview</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {preset.blockMix.slice(0, 4).map((block, idx) => (
                            <div key={`${preset.id}-preview-${block.type}`} className="rounded-md border border-border/70 bg-[hsl(var(--surface-1))] p-2">
                              <p className="text-[10px] font-medium capitalize">{block.type.replace(/_/g, ' ')}</p>
                              <div className="mt-1.5 space-y-1">
                                <div className="h-2 w-full rounded bg-muted" />
                                <div className="h-2 rounded bg-muted/80" style={{ width: `${70 - (idx % 3) * 10}%` }} />
                                <div className="h-2 rounded bg-muted/70" style={{ width: `${52 + (idx % 2) * 18}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPresetId(null)}
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedPresetId === null ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:bg-muted/40'}`}
                  >
                    <p className="text-sm font-medium">{t.createYourOwn}</p>
                    <p className="text-xs text-muted-foreground">{t.choosePresetFirst}</p>
                  </button>
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="assignment-title">{t.title}</Label>
                  <Input
                    id="assignment-title"
                    value={newAssignmentTitle}
                    onChange={(e) => setNewAssignmentTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {createKind === 'homework' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t.homeworkSettingsTitle}</p>
                    <div>
                      <Label htmlFor="hw-due-at">{t.dueDate}</Label>
                      <Input
                        id="hw-due-at"
                        type="datetime-local"
                        value={homeworkDueAtLocal}
                        onChange={(e) => setHomeworkDueAtLocal(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                      <input type="checkbox" checked={addToAgenda} onChange={(e) => setAddToAgenda(e.target.checked)} />
                      {t.addToAgenda}
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">{t.testSettingsTitle}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label htmlFor="test-start-at">{t.openTime}</Label>
                        <Input
                          id="test-start-at"
                          type="datetime-local"
                          value={testStartsAtLocal}
                          onChange={(e) => setTestStartsAtLocal(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="test-end-at">{t.closeTime}</Label>
                        <Input
                          id="test-end-at"
                          type="datetime-local"
                          value={testEndsAtLocal}
                          onChange={(e) => setTestEndsAtLocal(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="timer-minutes">{t.timerMinutes}</Label>
                        <Input
                          id="timer-minutes"
                          type="number"
                          min={1}
                          value={timerMinutes}
                          onChange={(e) => setTimerMinutes(Math.max(1, Number(e.target.value) || 1))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="attempt-limit">{t.attemptLimit}</Label>
                        <Input
                          id="attempt-limit"
                          type="number"
                          min={1}
                          value={attemptLimit}
                          onChange={(e) => setAttemptLimit(Math.max(1, Number(e.target.value) || 1))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} />
                        {t.randomizeQuestions}
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <input type="checkbox" checked={randomizeAnswers} onChange={(e) => setRandomizeAnswers(e.target.checked)} />
                        {t.randomizeAnswers}
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <input type="checkbox" checked={integrityMode} onChange={(e) => setIntegrityMode(e.target.checked)} />
                        {t.integrityMode}
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <input type="checkbox" checked={addToAgenda} onChange={(e) => setAddToAgenda(e.target.checked)} />
                        {t.addToAgenda}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (createStep === 1) {
                setIsCreateAssignmentOpen(false);
                resetCreateWizard();
                return;
              }
              setCreateStep((prev) => Math.max(1, (prev - 1) as 1 | 2 | 3));
            }}>
              {createStep === 1 ? t.cancel : t.back}
            </Button>
            {createStep < 3 ? (
              <Button onClick={() => setCreateStep((prev) => Math.min(3, (prev + 1) as 1 | 2 | 3))}>
                {t.continueBtn}
              </Button>
            ) : (
              <Button onClick={handleCreateAssignment} disabled={!newAssignmentTitle.trim() || isCreatingAssignment}>
                {isCreatingAssignment ? t.creating : (createKind === 'test' ? t.createTest : t.createHomework)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


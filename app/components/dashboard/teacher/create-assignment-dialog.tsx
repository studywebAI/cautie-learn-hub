'use client';

import { useState, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Copy, Loader2, Link as LinkIcon, Paperclip, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SelectMaterialDialog } from './select-material-dialog';
import type { MaterialReference } from '@/lib/teacher-types';
import { ASSIGNMENT_PRESETS, AssignmentCreateKind, getPresetById, toAssignmentType } from '@/lib/assignments/presets';
import { DEFAULT_ASSIGNMENT_SETTINGS, normalizeAssignmentSettings } from '@/lib/assignments/settings';

type CreateAssignmentDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
};

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildDefaultBlockData(type: string) {
  if (type === 'open_question') return { question: '', correct_answer: '', ai_grading: true, grading_criteria: '', max_score: 5 };
  if (type === 'multiple_choice') {
    return {
      question: '',
      options: [
        { id: 'a', text: '', correct: false },
        { id: 'b', text: '', correct: false },
        { id: 'c', text: '', correct: false },
        { id: 'd', text: '', correct: false },
      ],
      explanation: '',
    };
  }
  if (type === 'fill_in_blank') return { sentence: '', answers: [''], alternatives: [] };
  if (type === 'matching') return { prompt: '', pairs: [{ left: '', right: '' }], shuffle: true };
  if (type === 'ordering') return { prompt: '', items: ['', '', ''], correctOrder: [0, 1, 2] };
  if (type === 'text') return { header: '', content: '', style: 'normal' };
  return { text: '' };
}

function formatBlockTypeLabel(type: string): string {
  return String(type || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function previewRowClass(type: string): string {
  if (type === 'open_question') return 'bg-blue-100/70 border-blue-200/80';
  if (type === 'multiple_choice') return 'bg-emerald-100/70 border-emerald-200/80';
  if (type === 'fill_in_blank') return 'bg-amber-100/70 border-amber-200/80';
  if (type === 'matching' || type === 'ordering') return 'bg-purple-100/70 border-purple-200/80';
  return 'surface-interactive border-border/80';
}

function previewQuestionHint(type: string, isDutch: boolean): string {
  if (type === 'open_question') return isDutch ? 'Open vraag met rubric' : 'Open response with rubric';
  if (type === 'multiple_choice') return isDutch ? 'Meerkeuze vraag' : 'Multiple-choice question';
  if (type === 'fill_in_blank') return isDutch ? 'Invulzin' : 'Fill in the blank';
  if (type === 'matching') return isDutch ? 'Koppelbegrippen' : 'Match concepts';
  if (type === 'ordering') return isDutch ? 'Zet stappen op volgorde' : 'Order the steps';
  return isDutch ? 'Instructieblok' : 'Instruction block';
}

export function CreateAssignmentDialog({ isOpen, setIsOpen, classId }: CreateAssignmentDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [createKind, setCreateKind] = useState<AssignmentCreateKind>('homework');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [homeworkDueAtLocal, setHomeworkDueAtLocal] = useState('');
  const [testStartsAtLocal, setTestStartsAtLocal] = useState('');
  const [testEndsAtLocal, setTestEndsAtLocal] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number>(45);
  const [attemptLimit, setAttemptLimit] = useState<number>(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeAnswers, setRandomizeAnswers] = useState(true);
  const [integrityMode, setIntegrityMode] = useState(true);
  const [addToAgenda, setAddToAgenda] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Pick<MaterialReference, 'id' | 'title'> | null>(null);
  const [isSelectMaterialOpen, setIsSelectMaterialOpen] = useState(false);
  const [chapters, setChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [blocks, setBlocks] = useState<Array<{ id: string; type: string; content: any }>>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const { toast } = useToast();
  const { createAssignment, language } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';

  const t = {
    createAssignment: isDutch ? 'Nieuwe opdracht maken' : 'Create New Assignment',
    createDescription: isDutch ? 'Kies eerst wat je maakt. Daarna begeleiden we je stap voor stap.' : 'Choose what you are creating first. Then we guide you step by step.',
    stepType: isDutch ? 'Stap 1 van 3 - Type' : 'Step 1 of 3 - Type',
    stepPreset: isDutch ? 'Stap 2 van 3 - Preset' : 'Step 2 of 3 - Preset',
    stepDetails: isDutch ? 'Stap 3 van 3 - Details' : 'Step 3 of 3 - Details',
    whatCreating: isDutch ? 'Wat Maak Je?' : 'What Are You Creating?',
    homework: isDutch ? 'Huiswerk' : 'Homework',
    test: isDutch ? 'Toets' : 'Test',
    homeworkCaption: isDutch ? 'Oefenen, reflectie, thuiswerk' : 'Practice, reflection, take-home work',
    testCaption: isDutch ? 'Beoordeling, quiz, toetsmoment' : 'Assessment, quiz, checkpoint',
    chooseTemplate: isDutch ? 'Kies een starttemplate' : 'Pick a starting template',
    chooseTemplateDescription: isDutch ? 'Gebruik een bewezen opzet of begin vanaf nul.' : 'Use a proven structure or start from scratch.',
    createYourOwn: isDutch ? 'Zelf Opbouwen' : 'Create Your Own',
    createYourOwnCaption: isDutch ? 'Lege opdracht zonder startblokken.' : 'Blank assignment with no starter blocks.',
    assignmentTitle: isDutch ? 'Titel' : 'Title',
    contentOptional: isDutch ? 'Inhoud (optioneel)' : 'Content (optional)',
    dueAt: isDutch ? 'Inlevermoment' : 'Due at',
    startsAt: isDutch ? 'Startmoment' : 'Starts at',
    endsAt: isDutch ? 'Eindmoment' : 'Ends at',
    timerMinutes: isDutch ? 'Timer (minuten)' : 'Timer (minutes)',
    attemptLimit: isDutch ? 'Pogingen' : 'Attempts',
    randomizeQuestions: isDutch ? 'Vragen Husselen' : 'Randomize Questions',
    randomizeAnswers: isDutch ? 'Antwoorden Husselen' : 'Randomize Answers',
    integrityMode: isDutch ? 'Integriteitsmodus (Fullscreen + Tabdetectie)' : 'Integrity Mode (Fullscreen + Tab Switch Detection)',
    addToAgenda: isDutch ? 'Ook Aan Agenda Toevoegen' : 'Also Add to Agenda',
    addToAgendaHelp: isDutch ? 'Voegt automatisch een agenda-item toe voor deze opdracht.' : 'Automatically creates an agenda item for this assignment.',
    materials: isDutch ? 'Materiaal' : 'Material',
    materialsHelp: isDutch ? 'Optioneel: voeg bestaand materiaal toe of maak nieuw materiaal.' : 'Optional: attach existing material or create new material.',
    createNewMaterial: isDutch ? 'Nieuw materiaal maken...' : 'Create new material...',
    createNewQuiz: isDutch ? 'Nieuwe quiz maken' : 'Create new quiz',
    createNewFlashcards: isDutch ? 'Nieuwe flashcards maken' : 'Create new flashcards',
    attachExisting: isDutch ? 'Bestaand koppelen' : 'Attach existing',
    attached: isDutch ? 'Gekoppeld' : 'Attached',
    removeAttachedMaterial: isDutch ? 'Gekoppeld materiaal verwijderen' : 'Remove attached material',
    chapterOptional: isDutch ? 'Hoofdstuk (optioneel)' : 'Chapter (optional)',
    blockOptional: isDutch ? 'Blok (optioneel)' : 'Block (optional)',
    chooseChapter: isDutch ? 'Kies Hoofdstuk' : 'Choose Chapter',
    chooseBlock: isDutch ? 'Kies Blok' : 'Choose Block',
    noChapters: isDutch ? 'Geen hoofdstukken beschikbaar' : 'No chapters available',
    noBlocks: isDutch ? 'Geen blokken in dit hoofdstuk' : 'No blocks in this chapter',
    loadingChapters: isDutch ? 'Hoofdstukken Laden...' : 'Loading Chapters...',
    loadingBlocks: isDutch ? 'Blokken Laden...' : 'Loading Blocks...',
    missingInfo: isDutch ? 'Onvolledige informatie' : 'Missing information',
    missingInfoDesc: isDutch ? 'Vul minimaal een titel in. Voeg bij huiswerk een inlevermoment toe, of bij een toets een start- en eindmoment.' : 'Enter at least a title. Add due time for homework, or both start and end times for tests.',
    createSuccess: isDutch ? 'Opdracht gemaakt' : 'Assignment created',
    createSuccessDesc: isDutch ? 'is toegevoegd aan de klas.' : 'has been assigned to the class.',
    createError: isDutch ? 'Fout bij maken van opdracht' : 'Error creating assignment',
    createCtaHomework: isDutch ? 'Huiswerk maken' : 'Create homework',
    createCtaTest: isDutch ? 'Toets maken' : 'Create test',
    cancel: isDutch ? 'Annuleren' : 'Cancel',
    back: isDutch ? 'Terug' : 'Back',
    next: isDutch ? 'Volgende' : 'Next',
    recommended: isDutch ? 'Aanbevolen' : 'Recommended',
  };

  const filteredPresets = useMemo(
    () => ASSIGNMENT_PRESETS.filter((preset) => preset.kind === createKind),
    [createKind]
  );

  const getPresetLabel = (key: string) => {
    if (key === 'conceptCheck') return isDutch ? 'Conceptcheck (20 min)' : 'Concept check (20 min)';
    if (key === 'practiceMix') return isDutch ? 'Oefenmix (30 min)' : 'Practice mix (30 min)';
    if (key === 'quiz20') return isDutch ? 'Quiz (20 min)' : 'Quiz (20 min)';
    if (key === 'chapter45') return isDutch ? 'Hoofdstuktoets (45 min)' : 'Chapter test (45 min)';
    return key;
  };

  const getPresetUsage = (key: string) => {
    if (key === 'conceptCheck') return isDutch ? 'Snel begrip controleren met veel open vragen.' : 'Quick understanding check with mostly open questions.';
    if (key === 'practiceMix') return isDutch ? 'Combinatie van invullen en uitleg vragen.' : 'Mix of fill-in and explanation prompts.';
    if (key === 'quiz20') return isDutch ? 'Korte toets op recente leerstof.' : 'Short test on recent material.';
    if (key === 'chapter45') return isDutch ? 'Volledige hoofdstuktoets met hogere druk.' : 'Full chapter test with stricter conditions.';
    return '';
  };

  useEffect(() => {
    if (!isOpen || !classId) return;
    const fetchChapters = async () => {
      setIsLoadingChapters(true);
      try {
        const response = await fetch(`/api/classes/${classId}/chapters`);
        if (response.ok) {
          const data = await response.json();
          setChapters(data.chapters || []);
        }
      } catch (error) {
        console.error('Failed to fetch chapters:', error);
      } finally {
        setIsLoadingChapters(false);
      }
    };
    void fetchChapters();
  }, [isOpen, classId]);

  useEffect(() => {
    if (!selectedChapter) {
      setBlocks([]);
      setSelectedBlock('');
      return;
    }
    const fetchBlocks = async () => {
      setIsLoadingBlocks(true);
      setBlocks([]);
      setSelectedBlock('');
      try {
        const response = await fetch(`/api/classes/${classId}/chapters/${selectedChapter}/blocks`);
        if (response.ok) {
          const data = await response.json();
          setBlocks(data.blocks || []);
        }
      } catch (error) {
        console.error('Failed to fetch blocks:', error);
      } finally {
        setIsLoadingBlocks(false);
      }
    };
    void fetchBlocks();
  }, [selectedChapter, classId]);

  const handleCreateAssignment = async () => {
    const trimmedTitle = title.trim();
    const isTest = createKind === 'test';
    const scheduledStartAt = isTest ? toIsoOrNull(testStartsAtLocal) : null;
    const scheduledEndAt = isTest ? toIsoOrNull(testEndsAtLocal) : toIsoOrNull(homeworkDueAtLocal);
    if (!trimmedTitle || (!isTest && !scheduledEndAt) || (isTest && (!scheduledStartAt || !scheduledEndAt))) {
      toast({
        title: t.missingInfo,
        description: t.missingInfoDesc,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedPreset = getPresetById(selectedPresetId);
      const baseSettings = normalizeAssignmentSettings(DEFAULT_ASSIGNMENT_SETTINGS);
      const presetSettings = selectedPreset ? selectedPreset.applyDefaults(baseSettings) : baseSettings;
      const settings = normalizeAssignmentSettings({
        ...presetSettings,
        time: {
          ...presetSettings.time,
          startAt: scheduledStartAt,
          endAt: scheduledEndAt,
          durationMinutes: isTest ? Math.max(1, Number(timerMinutes || 45)) : null,
        },
        attempts: {
          ...presetSettings.attempts,
          maxAttempts: isTest ? Math.max(1, Number(attemptLimit || 1)) : 3,
        },
        access: {
          ...presetSettings.access,
          shuffleQuestions: isTest ? !!randomizeQuestions : false,
          shuffleAnswers: isTest ? !!randomizeAnswers : false,
          shuffleQuestionsPerStudent: isTest ? !!randomizeQuestions : false,
          allowedClassIds: [classId],
        },
        antiCheat: {
          ...presetSettings.antiCheat,
          requireFullscreen: isTest ? !!integrityMode : false,
          detectTabSwitch: isTest ? !!integrityMode : false,
        },
        delivery: {
          ...presetSettings.delivery,
          allowResume: isTest ? !integrityMode : true,
        },
      });

      const createdAssignment = await createAssignment({
        title: trimmedTitle,
        description: description.trim() || null,
        scheduled_start_at: scheduledStartAt,
        scheduled_end_at: scheduledEndAt,
        scheduled_answer_release_at: scheduledEndAt,
        class_id: classId,
        material_id: selectedMaterial?.id || null,
        chapter_id: selectedChapter || null,
        block_id: selectedBlock || null,
        paragraph_id: null,
        type: toAssignmentType(createKind),
        assignment_index: 0,
        settings,
      } as any);

      if (!createdAssignment?.id) {
        throw new Error('Assignment was created but no id was returned.');
      }

      if (selectedPreset) {
        let position = 0;
        for (const mix of selectedPreset.blockMix) {
          for (let i = 0; i < mix.count; i += 1) {
            await fetch('/api/blocks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assignment_id: createdAssignment.id,
                type: mix.type,
                data: buildDefaultBlockData(mix.type),
                position,
              }),
            });
            position += 1;
          }
        }
      }

      if (addToAgenda) {
        const startsAt = scheduledStartAt || scheduledEndAt;
        const dueAt = scheduledEndAt;
        const agendaPayload = {
          title: isTest ? `${t.test}: ${trimmedTitle}` : `${t.homework}: ${trimmedTitle}`,
          description: description.trim() || null,
          item_type: isTest ? 'quiz' : 'assignment',
          starts_at: startsAt,
          due_at: dueAt,
          visible: true,
          links: [
            {
              link_type: 'assignment',
              link_ref_id: createdAssignment.id,
              label: trimmedTitle,
              url: `/class/${classId}`,
            },
          ],
          metadata_json: {
            assignment_id: createdAssignment.id,
            assignment_type: createKind,
          },
        };

        const existingAgendaRes = await fetch(`/api/classes/${classId}/agenda?includeHidden=1`);
        let matchingAgendaIds: string[] = [];
        if (existingAgendaRes.ok) {
          const existingAgendaPayload = await existingAgendaRes.json();
          const items = Array.isArray(existingAgendaPayload?.items) ? existingAgendaPayload.items : [];
          matchingAgendaIds = items
            .filter((item: any) =>
              Array.isArray(item?.class_agenda_item_links) &&
              item.class_agenda_item_links.some(
                (link: any) =>
                  link?.link_type === 'assignment' &&
                  String(link?.link_ref_id || '') === String(createdAssignment.id)
              )
            )
            .map((item: any) => String(item.id));
        }

        if (matchingAgendaIds.length > 0) {
          await fetch(`/api/classes/${classId}/agenda/${matchingAgendaIds[0]}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaPayload),
          });
          if (matchingAgendaIds.length > 1) {
            for (const duplicateId of matchingAgendaIds.slice(1)) {
              await fetch(`/api/classes/${classId}/agenda/${duplicateId}`, {
                method: 'DELETE',
              });
            }
          }
        } else {
          await fetch(`/api/classes/${classId}/agenda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaPayload),
          });
        }
      }

      toast({
        title: t.createSuccess,
        description: `"${trimmedTitle}" ${t.createSuccessDesc}`,
      });
      resetAndClose();
    } catch (error: any) {
      toast({
        title: t.createError,
        description: error?.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToTool = (tool: 'quiz' | 'flashcards') => {
    setIsOpen(false);
    const params = new URLSearchParams({
      context: 'assignment',
      classId,
    });
    router.push(`/tools/${tool}?${params.toString()}`);
  };

  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setCreateStep(1);
    setCreateKind('homework');
    setSelectedPresetId(null);
    setHomeworkDueAtLocal('');
    setTestStartsAtLocal('');
    setTestEndsAtLocal('');
    setTimerMinutes(45);
    setAttemptLimit(1);
    setRandomizeQuestions(true);
    setRandomizeAnswers(true);
    setIntegrityMode(true);
    setAddToAgenda(true);
    setSelectedMaterial(null);
    setSelectedChapter('');
    setSelectedBlock('');
    setIsOpen(false);
  };

  const handleMaterialSelected = (material: Pick<MaterialReference, 'id' | 'title'>) => {
    setSelectedMaterial(material);
    setIsSelectMaterialOpen(false);
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) resetAndClose();
          else setIsOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-7">
          <DialogHeader>
            <DialogTitle className="text-xl">{t.createAssignment}</DialogTitle>
            <DialogDescription>{t.createDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-3">
            <div className="text-xs text-muted-foreground">
              {createStep === 1 ? t.stepType : createStep === 2 ? t.stepPreset : t.stepDetails}
            </div>

            {createStep === 1 && (
              <div className="grid gap-3">
                <p className="text-sm font-medium">{t.whatCreating}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCreateKind('homework')}
                    className={`w-full rounded-xl border p-4 text-left transition ${createKind === 'homework' ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:surface-interactive'}`}
                  >
                    <p className="text-sm font-medium">{t.homework}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.homeworkCaption}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateKind('test')}
                    className={`w-full rounded-xl border p-4 text-left transition ${createKind === 'test' ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:surface-interactive'}`}
                  >
                    <p className="text-sm font-medium">{t.test}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.testCaption}</p>
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="grid gap-3">
                <div>
                  <p className="text-sm font-medium">{t.chooseTemplate}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.chooseTemplateDescription}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${selectedPresetId === preset.id ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:surface-interactive'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{getPresetLabel(preset.key)}</p>
                          <p className="text-xs text-muted-foreground">{getPresetUsage(preset.key)}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {preset.blockMix.map((mix) => (
                              <span key={`${preset.id}-${mix.type}`} className="rounded-full surface-interactive px-2 py-0.5 text-[10px]">
                                {mix.count}x {formatBlockTypeLabel(mix.type)}
                              </span>
                            ))}
                          </div>
                        </div>
                        {preset.recommended && (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">{t.recommended}</span>
                        )}
                      </div>
                      <div className="mt-3 rounded-xl border border-border/80 bg-background p-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {isDutch ? 'Live Layout Voorbeeld' : 'Live Layout Preview'}
                        </p>
                        <div className="mt-2 space-y-2 rounded-lg border border-border/70 surface-chip p-2">
                          {preset.blockMix.slice(0, 3).map((mix) => (
                            <div key={`${preset.id}-preview-${mix.type}`} className={`rounded-md border p-2 ${previewRowClass(mix.type)}`}>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-medium">{formatBlockTypeLabel(mix.type)}</span>
                                <span>x{mix.count}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-foreground/70">{previewQuestionHint(mix.type, isDutch)}</p>
                              <div className="mt-1.5 space-y-1">
                                <div className="h-2 rounded bg-background/80" />
                                <div className="h-2 w-5/6 rounded bg-background/70" />
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
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedPresetId === null ? 'border-primary bg-primary/8 ring-1 ring-primary/25' : 'border-border hover:surface-interactive'}`}
                  >
                    <p className="text-sm font-medium">{t.createYourOwn}</p>
                    <p className="text-xs text-muted-foreground">{t.createYourOwnCaption}</p>
                  </button>
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="title">{t.assignmentTitle}</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">{t.contentOptional}</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                {createKind === 'homework' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="homework-due">{t.dueAt}</Label>
                    <Input
                      id="homework-due"
                      type="datetime-local"
                      value={homeworkDueAtLocal}
                      onChange={(e) => setHomeworkDueAtLocal(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="test-start">{t.startsAt}</Label>
                        <Input
                          id="test-start"
                          type="datetime-local"
                          value={testStartsAtLocal}
                          onChange={(e) => setTestStartsAtLocal(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="test-end">{t.endsAt}</Label>
                        <Input
                          id="test-end"
                          type="datetime-local"
                          value={testEndsAtLocal}
                          onChange={(e) => setTestEndsAtLocal(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="timer-minutes">{t.timerMinutes}</Label>
                        <Input
                          id="timer-minutes"
                          type="number"
                          min={1}
                          value={timerMinutes}
                          onChange={(e) => setTimerMinutes(Number(e.target.value || 45))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="attempt-limit">{t.attemptLimit}</Label>
                        <Input
                          id="attempt-limit"
                          type="number"
                          min={1}
                          value={attemptLimit}
                          onChange={(e) => setAttemptLimit(Number(e.target.value || 1))}
                        />
                      </div>
                    </div>
                    <label className="flex items-center justify-between rounded-md border border-border/70 surface-chip px-3 py-2 text-sm">
                      <span>{t.randomizeQuestions}</span>
                      <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-border/70 surface-chip px-3 py-2 text-sm">
                      <span>{t.randomizeAnswers}</span>
                      <input type="checkbox" checked={randomizeAnswers} onChange={(e) => setRandomizeAnswers(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-border/70 surface-chip px-3 py-2 text-sm">
                      <span>{t.integrityMode}</span>
                      <input type="checkbox" checked={integrityMode} onChange={(e) => setIntegrityMode(e.target.checked)} />
                    </label>
                  </div>
                )}

                <label className="flex items-center justify-between rounded-md border border-border/80 surface-chip p-3 text-sm">
                  <span>
                    {t.addToAgenda}
                    <span className="ml-2 text-xs text-muted-foreground">{t.addToAgendaHelp}</span>
                  </span>
                  <input type="checkbox" checked={addToAgenda} onChange={(e) => setAddToAgenda(e.target.checked)} />
                </label>

                <Separator />

                <div className="grid gap-2">
                  <Label>{t.materials}</Label>
                  <p className="text-sm text-muted-foreground">{t.materialsHelp}</p>
                  {selectedMaterial ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-md surface-interactive border text-sm">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate flex-1">{t.attached}: {selectedMaterial.title}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMaterial(null)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">{t.removeAttachedMaterial}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary">{t.createNewMaterial}</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => navigateToTool('quiz')}>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            {t.createNewQuiz}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigateToTool('flashcards')}>
                            <Copy className="mr-2 h-4 w-4" />
                            {t.createNewFlashcards}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="secondary" onClick={() => setIsSelectMaterialOpen(true)}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        {t.attachExisting}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="chapter">{t.chapterOptional}</Label>
                    <select
                      id="chapter"
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      disabled={isLoadingChapters}
                    >
                      <option value="">{isLoadingChapters ? t.loadingChapters : t.chooseChapter}</option>
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                      ))}
                      {!isLoadingChapters && chapters.length === 0 && <option value="" disabled>{t.noChapters}</option>}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="block">{t.blockOptional}</Label>
                    <select
                      id="block"
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedBlock}
                      onChange={(e) => setSelectedBlock(e.target.value)}
                      disabled={!selectedChapter || isLoadingBlocks}
                    >
                      <option value="">
                        {!selectedChapter ? t.chooseChapter : isLoadingBlocks ? t.loadingBlocks : t.chooseBlock}
                      </option>
                      {blocks.map((block) => (
                        <option key={block.id} value={block.id}>{block.type}</option>
                      ))}
                      {!isLoadingBlocks && selectedChapter && blocks.length === 0 && <option value="" disabled>{t.noBlocks}</option>}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <div>
              {createStep > 1 ? (
                <Button variant="outline" onClick={() => setCreateStep((prev) => (prev === 2 ? 1 : 2))}>
                  {t.back}
                </Button>
              ) : (
                <Button variant="outline" onClick={resetAndClose}>{t.cancel}</Button>
              )}
            </div>
            <div>
              {createStep < 3 ? (
                <Button onClick={() => setCreateStep((prev) => (prev === 1 ? 2 : 3))}>{t.next}</Button>
              ) : (
                <Button onClick={handleCreateAssignment} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createKind === 'test' ? t.createCtaTest : t.createCtaHomework}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SelectMaterialDialog
        isOpen={isSelectMaterialOpen}
        setIsOpen={setIsSelectMaterialOpen}
        classId={classId}
        onMaterialSelected={handleMaterialSelected}
      />
    </>
  );
}

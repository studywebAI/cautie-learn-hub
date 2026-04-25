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
import { AppContext, AppContextType, ClassAssignment } from '@/contexts/app-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SelectMaterialDialog } from './select-material-dialog';
import type { MaterialReference } from '@/lib/teacher-types';
import { ASSIGNMENT_PRESETS, AssignmentCreateKind, getPresetById, toAssignmentType } from '@/lib/assignments/presets';
import { DEFAULT_ASSIGNMENT_SETTINGS, normalizeAssignmentSettings } from '@/lib/assignments/settings';

type EditAssignmentDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
  assignment: ClassAssignment | null;
};

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInputOrEmpty(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function assignmentToKind(assignment: ClassAssignment | null): AssignmentCreateKind {
  const raw = String(assignment?.type || '').toLowerCase();
  return raw === 'small_test' || raw === 'big_test' ? 'test' : 'homework';
}

export function EditAssignmentDialog({ isOpen, setIsOpen, classId, assignment }: EditAssignmentDialogProps) {
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
  const [integrityMode, setIntegrityMode] = useState(false);
  const [addToAgenda, setAddToAgenda] = useState(false);
  const [existingAgendaItemId, setExistingAgendaItemId] = useState<string | null>(null);
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
  const { language, refetchAssignments } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';

  const t = {
    editAssignment: isDutch ? 'opdracht bewerken' : 'edit assignment',
    editDescription: isDutch ? 'Werk type, opzet en instellingen bij in duidelijke stappen.' : 'Update type, structure, and settings in clear steps.',
    stepType: isDutch ? 'stap 1 van 3 - type' : 'step 1 of 3 - type',
    stepPreset: isDutch ? 'stap 2 van 3 - preset' : 'step 2 of 3 - preset',
    stepDetails: isDutch ? 'stap 3 van 3 - details' : 'step 3 of 3 - details',
    whatCreating: isDutch ? 'welk type is dit?' : 'what type is this?',
    homework: isDutch ? 'huiswerk' : 'homework',
    test: isDutch ? 'toets' : 'test',
    homeworkCaption: isDutch ? 'oefenen, reflectie, thuiswerk' : 'practice, reflection, take-home work',
    testCaption: isDutch ? 'beoordeling, quiz, toetsmoment' : 'assessment, quiz, checkpoint',
    chooseTemplate: isDutch ? 'pas eventueel een template toe' : 'optionally apply a template',
    chooseTemplateDescription: isDutch ? 'Template past instellingen aan, maar verwijdert geen bestaande blokken.' : 'Template updates settings, but does not remove existing blocks.',
    createYourOwn: isDutch ? 'huidige opzet behouden' : 'keep current setup',
    createYourOwnCaption: isDutch ? 'Geen preset toepassen, alleen handmatige aanpassingen.' : 'No preset; keep manual settings.',
    assignmentTitle: isDutch ? 'titel' : 'title',
    contentOptional: isDutch ? 'inhoud (optioneel)' : 'content (optional)',
    dueAt: isDutch ? 'inlevermoment' : 'due at',
    startsAt: isDutch ? 'startmoment' : 'starts at',
    endsAt: isDutch ? 'eindmoment' : 'ends at',
    timerMinutes: isDutch ? 'timer (minuten)' : 'timer (minutes)',
    attemptLimit: isDutch ? 'pogingen' : 'attempts',
    randomizeQuestions: isDutch ? 'vragen husselen' : 'randomize questions',
    randomizeAnswers: isDutch ? 'antwoorden husselen' : 'randomize answers',
    integrityMode: isDutch ? 'integriteitsmodus (fullscreen + tabdetectie)' : 'integrity mode (fullscreen + tab switch detection)',
    addToAgenda: isDutch ? 'op agenda zetten' : 'show in agenda',
    addToAgendaHelp: isDutch ? 'Bij uitzetten verwijderen we gekoppelde agenda-item(s).' : 'Turning this off removes linked agenda item(s).',
    materials: isDutch ? 'materiaal' : 'material',
    materialsHelp: isDutch ? 'Optioneel: wijzig het gekoppelde materiaal.' : 'Optional: change the linked material.',
    createNewMaterial: isDutch ? 'nieuw materiaal maken...' : 'create new material...',
    createNewQuiz: isDutch ? 'nieuwe quiz maken' : 'create new quiz',
    createNewFlashcards: isDutch ? 'nieuwe flashcards maken' : 'create new flashcards',
    attachExisting: isDutch ? 'bestaand koppelen' : 'attach existing',
    attached: isDutch ? 'gekoppeld' : 'attached',
    removeAttachedMaterial: isDutch ? 'gekoppeld materiaal verwijderen' : 'remove attached material',
    chapterOptional: isDutch ? 'hoofdstuk (optioneel)' : 'chapter (optional)',
    blockOptional: isDutch ? 'blok (optioneel)' : 'block (optional)',
    chooseChapter: isDutch ? 'kies hoofdstuk' : 'choose chapter',
    chooseBlock: isDutch ? 'kies blok' : 'choose block',
    noChapters: isDutch ? 'geen hoofdstukken beschikbaar' : 'no chapters available',
    noBlocks: isDutch ? 'geen blokken in dit hoofdstuk' : 'no blocks in this chapter',
    loadingChapters: isDutch ? 'hoofdstukken laden...' : 'loading chapters...',
    loadingBlocks: isDutch ? 'blokken laden...' : 'loading blocks...',
    missingInfo: isDutch ? 'onvolledige informatie' : 'missing information',
    missingInfoDesc: isDutch ? 'Vul minimaal een titel in. Voeg bij huiswerk een inlevermoment toe, of bij een toets een start- en eindmoment.' : 'Enter at least a title. Add due time for homework, or both start and end times for tests.',
    saveSuccess: isDutch ? 'opdracht bijgewerkt' : 'assignment updated',
    saveSuccessDesc: isDutch ? 'Wijzigingen zijn opgeslagen.' : 'Changes have been saved.',
    saveError: isDutch ? 'fout bij bijwerken' : 'error updating assignment',
    saveCta: isDutch ? 'wijzigingen opslaan' : 'save changes',
    cancel: isDutch ? 'annuleren' : 'cancel',
    back: isDutch ? 'terug' : 'back',
    next: isDutch ? 'volgende' : 'next',
    recommended: isDutch ? 'aanbevolen' : 'recommended',
  };

  const filteredPresets = useMemo(
    () => ASSIGNMENT_PRESETS.filter((preset) => preset.kind === createKind),
    [createKind]
  );

  const getPresetLabel = (key: string) => {
    if (key === 'conceptCheck') return isDutch ? 'conceptcheck (20 min)' : 'concept check (20 min)';
    if (key === 'practiceMix') return isDutch ? 'oefenmix (30 min)' : 'practice mix (30 min)';
    if (key === 'quiz20') return isDutch ? 'quiz (20 min)' : 'quiz (20 min)';
    if (key === 'chapter45') return isDutch ? 'hoofdstuktoets (45 min)' : 'chapter test (45 min)';
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
    if (!isOpen || !assignment) return;
    const settings = normalizeAssignmentSettings(assignment.settings || DEFAULT_ASSIGNMENT_SETTINGS);
    const inferredKind = assignmentToKind(assignment);
    setCreateStep(1);
    setCreateKind(inferredKind);
    setSelectedPresetId(null);
    setTitle(assignment.title || '');
    setDescription(assignment.description || '');
    setHomeworkDueAtLocal(toLocalInputOrEmpty(assignment.scheduled_end_at || assignment.due_date || null));
    setTestStartsAtLocal(toLocalInputOrEmpty(assignment.scheduled_start_at || settings.time.startAt || null));
    setTestEndsAtLocal(toLocalInputOrEmpty(assignment.scheduled_end_at || settings.time.endAt || null));
    setTimerMinutes(Number(settings.time.durationMinutes || 45));
    setAttemptLimit(Number(settings.attempts.maxAttempts || 1));
    setRandomizeQuestions(Boolean(settings.access.shuffleQuestions));
    setRandomizeAnswers(Boolean(settings.access.shuffleAnswers));
    setIntegrityMode(Boolean(settings.antiCheat.requireFullscreen || settings.antiCheat.detectTabSwitch));
    setSelectedMaterial(assignment.material_id ? { id: assignment.material_id, title: 'Linked material' } : null);
    setSelectedChapter(assignment.chapter_id || '');
    setSelectedBlock(assignment.block_id || '');
  }, [isOpen, assignment]);

  useEffect(() => {
    if (!isOpen || !assignment?.id) return;
    const fetchAgendaLinkState = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/agenda?includeHidden=1`);
        if (!response.ok) return;
        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const match = items.find((item: any) =>
          Array.isArray(item?.class_agenda_item_links) &&
          item.class_agenda_item_links.some(
            (link: any) => link?.link_type === 'assignment' && String(link?.link_ref_id || '') === String(assignment.id)
          )
        );
        if (match?.id) {
          setExistingAgendaItemId(match.id);
          setAddToAgenda(true);
        } else {
          setExistingAgendaItemId(null);
          setAddToAgenda(false);
        }
      } catch {
        setExistingAgendaItemId(null);
      }
    };
    void fetchAgendaLinkState();
  }, [isOpen, assignment?.id, classId]);

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

  const handleSaveAssignment = async () => {
    if (!assignment?.id) return;
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
      const existingSettings = normalizeAssignmentSettings(assignment.settings || DEFAULT_ASSIGNMENT_SETTINGS);
      const presetSettings = selectedPreset ? selectedPreset.applyDefaults(existingSettings) : existingSettings;
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

      const updateRes = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim() || null,
          type: toAssignmentType(createKind),
          scheduled_start_at: scheduledStartAt,
          scheduled_end_at: scheduledEndAt,
          scheduled_answer_release_at: scheduledEndAt,
          chapter_id: selectedChapter || null,
          block_id: selectedBlock || null,
          material_id: selectedMaterial?.id || null,
          settings,
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update assignment');
      }

      const agendaPayload = {
        title: isTest ? `${t.test}: ${trimmedTitle}` : `${t.homework}: ${trimmedTitle}`,
        description: description.trim() || null,
        item_type: isTest ? 'quiz' : 'assignment',
        starts_at: scheduledStartAt || scheduledEndAt,
        due_at: scheduledEndAt,
        visible: true,
        links: [
          {
            link_type: 'assignment',
            link_ref_id: assignment.id,
            label: trimmedTitle,
            url: `/class/${classId}`,
          },
        ],
        metadata_json: {
          assignment_id: assignment.id,
          assignment_type: createKind,
        },
      };

      if (addToAgenda && existingAgendaItemId) {
        await fetch(`/api/classes/${classId}/agenda/${existingAgendaItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agendaPayload),
        });
      } else if (addToAgenda && !existingAgendaItemId) {
        await fetch(`/api/classes/${classId}/agenda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agendaPayload),
        });
      } else if (!addToAgenda && existingAgendaItemId) {
        await fetch(`/api/classes/${classId}/agenda/${existingAgendaItemId}`, {
          method: 'DELETE',
        });
      }

      await refetchAssignments();
      toast({
        title: t.saveSuccess,
        description: t.saveSuccessDesc,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: t.saveError,
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

  const handleMaterialSelected = (material: Pick<MaterialReference, 'id' | 'title'>) => {
    setSelectedMaterial(material);
    setIsSelectMaterialOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.editAssignment}</DialogTitle>
            <DialogDescription>{t.editDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-3">
            <div className="text-xs text-muted-foreground">
              {createStep === 1 ? t.stepType : createStep === 2 ? t.stepPreset : t.stepDetails}
            </div>

            {createStep === 1 && (
              <div className="grid gap-3">
                <p className="text-sm font-medium">{t.whatCreating}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateKind('homework')}
                    className={`w-full rounded-lg border p-4 text-left transition ${createKind === 'homework' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                  >
                    <p className="text-sm font-medium">{t.homework}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.homeworkCaption}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateKind('test')}
                    className={`w-full rounded-lg border p-4 text-left transition ${createKind === 'test' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${selectedPresetId === preset.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{getPresetLabel(preset.key)}</p>
                          <p className="text-xs text-muted-foreground">{getPresetUsage(preset.key)}</p>
                        </div>
                        {preset.recommended && (
                          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">{t.recommended}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPresetId(null)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedPresetId === null ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
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
                    <label className="flex items-center justify-between text-sm">
                      <span>{t.randomizeQuestions}</span>
                      <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between text-sm">
                      <span>{t.randomizeAnswers}</span>
                      <input type="checkbox" checked={randomizeAnswers} onChange={(e) => setRandomizeAnswers(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between text-sm">
                      <span>{t.integrityMode}</span>
                      <input type="checkbox" checked={integrityMode} onChange={(e) => setIntegrityMode(e.target.checked)} />
                    </label>
                  </div>
                )}

                <label className="flex items-center justify-between rounded-md border p-3 text-sm">
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
                    <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50 border text-sm">
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
                <Button variant="outline" onClick={() => setIsOpen(false)}>{t.cancel}</Button>
              )}
            </div>
            <div>
              {createStep < 3 ? (
                <Button onClick={() => setCreateStep((prev) => (prev === 1 ? 2 : 3))}>{t.next}</Button>
              ) : (
                <Button onClick={handleSaveAssignment} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.saveCta}
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

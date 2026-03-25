'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Atom,
  Brain,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Compass,
  Dna,
  FlaskConical,
  GraduationCap,
  Globe,
  Landmark,
  Languages,
  Lightbulb,
  Microscope,
  Music,
  Palette,
  Pencil,
  PenTool,
  Plus,
  Route,
  Sigma,
  Upload,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';

type StudysetRow = {
  id: string;
  name: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
  updated_at: string;
  source_bundle?: string | null;
};

type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  kind: 'onedrive';
  mimeType?: string;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
};

type IconOption = {
  id: string;
  Icon: LucideIcon;
};

type ColorOption = {
  id: string;
  swatchClass: string;
};

const STEP_TITLES = ['Basics', 'Calendar', 'Sources'];

const ICON_OPTIONS: IconOption[] = [
  { id: 'book-open', Icon: BookOpen },
  { id: 'flask', Icon: FlaskConical },
  { id: 'landmark', Icon: Landmark },
  { id: 'globe', Icon: Globe },
  { id: 'calculator', Icon: Calculator },
  { id: 'dna', Icon: Dna },
  { id: 'atom', Icon: Atom },
  { id: 'pencil', Icon: Pencil },
  { id: 'code', Icon: Code2 },
  { id: 'brain', Icon: Brain },
  { id: 'graduation-cap', Icon: GraduationCap },
  { id: 'languages', Icon: Languages },
  { id: 'music', Icon: Music },
  { id: 'palette', Icon: Palette },
  { id: 'microscope', Icon: Microscope },
  { id: 'sigma', Icon: Sigma },
  { id: 'compass', Icon: Compass },
  { id: 'pen-tool', Icon: PenTool },
  { id: 'lightbulb', Icon: Lightbulb },
];

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'cobalt', swatchClass: 'bg-[#3a5be7]' },
  { id: 'azure', swatchClass: 'bg-[#1d9bf0]' },
  { id: 'turquoise', swatchClass: 'bg-[#19b5a5]' },
  { id: 'mint', swatchClass: 'bg-[#25c47a]' },
  { id: 'lime', swatchClass: 'bg-[#6ad63a]' },
  { id: 'amber', swatchClass: 'bg-[#f4b400]' },
  { id: 'orange', swatchClass: 'bg-[#f78422]' },
  { id: 'coral', swatchClass: 'bg-[#ff6f61]' },
  { id: 'rose', swatchClass: 'bg-[#ff4f8b]' },
  { id: 'magenta', swatchClass: 'bg-[#d946ef]' },
  { id: 'violet', swatchClass: 'bg-[#8b5cf6]' },
  { id: 'grape', swatchClass: 'bg-[#5f3dc4]' },
  { id: 'charcoal', swatchClass: 'bg-[#4b5563]' },
  { id: 'slate', swatchClass: 'bg-[#64748b]' },
];

const TYPING_PLACEHOLDERS = ['WW2 final prep', 'Chemistry exam sprint', 'Spanish oral practice'];
const SOFT_SURFACE = 'border border-[#e5e7eb] bg-[#f8fafc] dark:border-zinc-800 dark:bg-zinc-900/40';
const CALENDAR_CLASSES = {
  day_selected:
    'bg-[#e5e7eb] text-[#111827] hover:bg-[#d1d5db] hover:text-[#111827] focus:bg-[#d1d5db] focus:text-[#111827] dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600',
  day_today: 'bg-[#f1f5f9] text-[#0f172a] dark:bg-zinc-800 dark:text-zinc-100',
  day_range_middle: 'aria-selected:bg-[#e5e7eb] aria-selected:text-[#111827] dark:aria-selected:bg-zinc-700 dark:aria-selected:text-zinc-100',
};

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDates(dates: Date[]) {
  const unique = new Set(dates.map((date) => toIsoLocalDate(date)));
  return Array.from(unique).sort();
}

function parseSourceMeta(raw: string | null | undefined) {
  if (!raw) return { icon: null as string | null, color: null as string | null };
  try {
    const parsed = JSON.parse(raw);
    const icon = typeof parsed?.meta?.icon === 'string' ? parsed.meta.icon : null;
    const color = typeof parsed?.meta?.color === 'string' ? parsed.meta.color : null;
    return { icon, color };
  } catch {
    return { icon: null, color: null };
  }
}

function getMicrosoftErrorMessage(code: string) {
  const map: Record<string, string> = {
    access_denied: 'Microsoft connection was canceled.',
    invalid_state: 'Connection expired. Please try linking again.',
    unauthorized: 'Please log in before linking Microsoft.',
    integration_not_configured: 'Microsoft integration is not configured yet.',
    token_exchange_failed: 'Could not complete Microsoft sign-in. Please retry.',
    microsoft_connect_failed: 'Could not link Microsoft. Please retry.',
  };
  return map[code] || map.microsoft_connect_failed;
}

export default function StudysetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<'home' | 'create'>('home');
  const [step, setStep] = useState(0);
  const [studysets, setStudysets] = useState<StudysetRow[]>([]);
  const [loadingStudysets, setLoadingStudysets] = useState(true);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [notesText, setNotesText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [uploads, setUploads] = useState<UploadMeta[]>([]);

  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftEmail, setMicrosoftEmail] = useState('');
  const [selectedMicrosoftFiles, setSelectedMicrosoftFiles] = useState<MicrosoftFileItem[]>([]);

  const [creating, setCreating] = useState(false);
  const [typingPlaceholder, setTypingPlaceholder] = useState(TYPING_PLACEHOLDERS[0]);
  const [showIconOptions, setShowIconOptions] = useState(false);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);

  const madeStudysets = useMemo(() => studysets.filter((row) => row.status !== 'archived'), [studysets]);

  const usedMeta = useMemo(() => {
    const icons = new Set<string>();
    const colors = new Set<string>();
    for (const row of studysets) {
      const meta = parseSourceMeta(row.source_bundle);
      if (meta.icon) icons.add(meta.icon);
      if (meta.color) colors.add(meta.color);
    }
    return { icons, colors };
  }, [studysets]);

  const selectedDateStrings = useMemo(() => normalizeDates(selectedDates), [selectedDates]);
  const sortedOneDriveFiles = useMemo(() => selectedMicrosoftFiles.slice(0, 24), [selectedMicrosoftFiles]);

  const isStepOneReady = name.trim().length > 0;
  const isStepTwoReady = selectedDateStrings.length > 0;
  const isStepThreeReady =
    notesText.trim().length > 0 ||
    pastedText.trim().length > 0 ||
    uploads.length > 0 ||
    selectedMicrosoftFiles.length > 0;

  const resetWizard = () => {
    setStep(0);
    setName('');
    setSelectedIcon(null);
    setSelectedColor(null);
    setSelectedDates([]);
    setNotesText('');
    setPastedText('');
    setUploads([]);
    setSelectedMicrosoftFiles([]);
  };

  const loadStudysets = async () => {
    setLoadingStudysets(true);
    try {
      const response = await fetch('/api/studysets', { cache: 'no-store' });
      if (!response.ok) {
        setStudysets([]);
        return;
      }
      const data = await response.json();
      setStudysets(Array.isArray(data?.studysets) ? data.studysets : []);
    } catch {
      setStudysets([]);
    } finally {
      setLoadingStudysets(false);
    }
  };

  const loadMicrosoftStatus = async () => {
    try {
      const response = await fetch('/api/integrations/microsoft/status', { cache: 'no-store' });
      if (!response.ok) {
        setMicrosoftConnected(false);
        setMicrosoftEmail('');
        return;
      }
      const data = await response.json();
      setMicrosoftConnected(Boolean(data?.connected));
      setMicrosoftEmail(String(data?.account_email || ''));
    } catch {
      setMicrosoftConnected(false);
      setMicrosoftEmail('');
    }
  };

  const loadMicrosoftSelectedFiles = async () => {
    if (!microsoftConnected) {
      setSelectedMicrosoftFiles([]);
      return;
    }
    try {
      const response = await fetch('/api/integrations/context-sources?provider=microsoft&app=onedrive&selected=1', {
        cache: 'no-store',
      });
      const json = await response.json().catch(() => ({}));
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped: MicrosoftFileItem[] = items.map((item: any) => ({
        id: String(item?.provider_item_id || item?.id || ''),
        name: String(item?.name || 'Untitled'),
        webUrl: item?.web_url ? String(item.web_url) : undefined,
        size: typeof item?.metadata?.size === 'number' ? item.metadata.size : undefined,
        lastModifiedDateTime: typeof item?.metadata?.last_modified === 'string' ? item.metadata.last_modified : undefined,
        kind: 'onedrive',
        mimeType: item?.mime_type ? String(item.mime_type) : undefined,
      })).filter((item: MicrosoftFileItem) => Boolean(item.id));
      setSelectedMicrosoftFiles(mapped);
    } catch {
      setSelectedMicrosoftFiles([]);
    }
  };

  useEffect(() => {
    void loadStudysets();
    void loadMicrosoftStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('ms') === 'connected') {
      toast({ title: 'Microsoft connected', description: 'OneDrive files are ready.' });
      void loadMicrosoftStatus();
      void loadMicrosoftSelectedFiles();
      const params = new URLSearchParams(searchParams.toString());
      params.delete('ms');
      params.delete('ms_error');
      const nextQuery = params.toString();
      router.replace(nextQuery ? `/tools/studyset?${nextQuery}` : '/tools/studyset');
      return;
    }
    const msError = searchParams.get('ms_error');
    if (msError) {
      toast({ title: 'Microsoft connect failed', description: getMicrosoftErrorMessage(msError), variant: 'destructive' });
      router.replace('/tools/studyset');
    }
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (searchParams.get('open') === 'create') {
      setView('create');
      const rawStep = Number(searchParams.get('step'));
      if (!Number.isNaN(rawStep)) {
        setStep(Math.max(0, Math.min(2, rawStep)));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    void loadMicrosoftSelectedFiles();
  }, [microsoftConnected]);

  useEffect(() => {
    const onUpdated = () => {
      void loadMicrosoftSelectedFiles();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('integration-sources-updated', onUpdated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('integration-sources-updated', onUpdated as EventListener);
      }
    };
  }, [loadMicrosoftSelectedFiles]);

  const startCreate = () => {
    resetWizard();
    setView('create');
  };

  const goNext = () => {
    if (step === 0 && !isStepOneReady) return;
    if (step === 1 && !isStepTwoReady) return;
    setStep((value) => Math.min(2, value + 1));
  };

  const canNext = step === 0 ? isStepOneReady : step === 1 ? isStepTwoReady : false;

  const autoPickMeta = () => {
    const icon =
      selectedIcon || ICON_OPTIONS.find((option) => !usedMeta.icons.has(option.id))?.id || ICON_OPTIONS[0].id;
    const color =
      selectedColor || COLOR_OPTIONS.find((option) => !usedMeta.colors.has(option.id))?.id || COLOR_OPTIONS[0].id;
    return { icon, color };
  };

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let pauseTicks = 0;
    const tick = () => {
      const phrase = TYPING_PLACEHOLDERS[phraseIndex] || '';
      if (!deleting) {
        charIndex = Math.min(phrase.length, charIndex + 1);
        setTypingPlaceholder(`${phrase.slice(0, charIndex)}|`);
        if (charIndex === phrase.length) {
          pauseTicks += 1;
          if (pauseTicks > 7) {
            deleting = true;
            pauseTicks = 0;
          }
        }
        return;
      }
      charIndex = Math.max(0, charIndex - 1);
      setTypingPlaceholder(`${phrase.slice(0, charIndex)}|`);
      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % TYPING_PLACEHOLDERS.length;
      }
    };

    const timer = window.setInterval(tick, 90);
    return () => window.clearInterval(timer);
  }, []);

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mapped = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));
    setUploads(mapped);
  };

  const disconnectMicrosoft = async () => {
    const response = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' });
    if (!response.ok) return;
    setMicrosoftConnected(false);
    setMicrosoftEmail('');
    setSelectedMicrosoftFiles([]);
  };

  const createStudyset = async () => {
    if (!isStepOneReady || !isStepTwoReady || !isStepThreeReady) return;
    setCreating(true);
    try {
      const meta = autoPickMeta();
      const sourcePayload = {
        meta: {
          icon: meta.icon,
          color: meta.color,
        },
        schedule: {
          selected_dates: selectedDateStrings,
        },
        sources: {
          notes_text: notesText.trim(),
          pasted_text: pastedText.trim(),
          uploaded_files: uploads,
          imports: {
            word: false,
            powerpoint: false,
            onedrive: selectedMicrosoftFiles.length > 0,
            access_mode: 'read_only',
            microsoft_account: microsoftEmail || null,
            selected_documents: selectedMicrosoftFiles.map((file) => ({
              id: file.id,
              name: file.name,
              kind: file.kind,
              web_url: file.webUrl || null,
              mime_type: file.mimeType || null,
              size: file.size || null,
              last_modified: file.lastModifiedDateTime || null,
            })),
          },
        },
      };

      const createRes = await fetch('/api/studysets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          confidence_level: 'beginner',
          target_days: selectedDateStrings.length,
          minutes_per_day: 45,
          source_bundle: JSON.stringify(sourcePayload),
        }),
      });

      if (!createRes.ok) {
        const message = await createRes.text();
        throw new Error(message || 'Failed to create studyset');
      }

      const createJson = await createRes.json();
      const studysetId = createJson?.studyset?.id;
      if (!studysetId) throw new Error('Studyset ID missing');

      const generateRes = await fetch(`/api/studysets/${studysetId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_dates: selectedDateStrings,
          feedback: notesText.trim() || null,
        }),
      });

      if (!generateRes.ok) {
        const message = await generateRes.text();
        throw new Error(message || 'Failed to generate plan');
      }

      toast({ title: 'Studyset created', description: 'Today plan is ready.' });
      router.push(`/tools/studyset/${studysetId}`);
    } catch (error: any) {
      toast({
        title: 'Could not create studyset',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="flex min-h-full w-full flex-col gap-4">
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Studyset
            </CardTitle>
            <CardDescription>Build once, follow day-by-day. Changes auto-save.</CardDescription>
          </CardHeader>
        </Card>

        {view === 'home' && (
          <>
            <Card className="border-none">
              <CardHeader>
                <CardTitle>New studyset</CardTitle>
                <CardDescription>Create a fresh study plan in 3 clear steps.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={startCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Open new studyset
                </Button>
              </CardContent>
            </Card>

            {!loadingStudysets && madeStudysets.length > 0 && (
              <Card className="border-none">
                <CardHeader>
                  <CardTitle>Made studysets</CardTitle>
                  <CardDescription>Open today plan, edit tasks, or view all days.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {madeStudysets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/tools/studyset/${item.id}`)}
                      className="w-full rounded-xl bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.target_days} days
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {view === 'create' && (
          <Card className="flex min-h-[calc(100vh-10rem)] flex-col border-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Create studyset</CardTitle>
                  <CardDescription>{STEP_TITLES[step]}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {STEP_TITLES.map((title, index) => (
                    <div
                      key={title}
                      className={`rounded-full px-3 py-1 text-xs ${
                        index === step ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {index + 1}. {title}
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-4">
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Studyset name</Label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={typingPlaceholder}
                      className={`border-[#d1d5db] bg-[#f8fafc] text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder:text-zinc-400`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Icon (optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowIconOptions((v) => !v)}>
                      Select icon
                      {showIconOptions ? <ChevronUp className="ml-2 h-3 w-3" /> : <ChevronDown className="ml-2 h-3 w-3" />}
                    </Button>
                    {showIconOptions && (
                      <div className="grid grid-cols-8 gap-1.5 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-2 md:grid-cols-12 dark:border-zinc-800 dark:bg-zinc-900/40">
                        {ICON_OPTIONS.map((option) => {
                          const ActiveIcon = option.Icon;
                          const selected = selectedIcon === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedIcon(selected ? null : option.id)}
                              aria-label={option.id}
                              title={option.id}
                              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                selected
                                  ? 'bg-[#e2e8f0] text-foreground ring-1 ring-[#94a3b8] dark:bg-zinc-700 dark:ring-zinc-500'
                                  : 'bg-white text-muted-foreground hover:bg-[#f1f5f9] dark:bg-zinc-900 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <ActiveIcon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Color (optional)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowColorOptions((v) => !v)}>
                      Select color
                      {showColorOptions ? <ChevronUp className="ml-2 h-3 w-3" /> : <ChevronDown className="ml-2 h-3 w-3" />}
                    </Button>
                    {showColorOptions && (
                      <div className="grid grid-cols-10 gap-1.5 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-2 md:grid-cols-14 dark:border-zinc-800 dark:bg-zinc-900/40">
                        {COLOR_OPTIONS.map((color) => {
                          const selected = selectedColor === color.id;
                          return (
                            <button
                              key={color.id}
                              type="button"
                              aria-label={color.id}
                              title={color.id}
                              onClick={() => setSelectedColor(selected ? null : color.id)}
                              className={`h-6 w-6 rounded-md transition-all ${color.swatchClass} ${
                                selected ? 'ring-2 ring-[#334155] ring-offset-1 ring-offset-background' : 'hover:scale-[1.03]'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      If you skip icon/color, we auto-pick an unused combo.
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Label>Select available study days</Label>
                  <div className={`rounded-xl p-2 ${SOFT_SURFACE}`}>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(value) => setSelectedDates(Array.isArray(value) ? value : [])}
                      className="mx-auto"
                      classNames={CALENDAR_CLASSES}
                    />
                  </div>
                  <div className={`rounded-xl p-3 text-xs text-foreground/80 ${SOFT_SURFACE}`}>
                    {selectedDateStrings.length === 0
                      ? 'Pick at least one day.'
                      : `${selectedDateStrings.length} day${selectedDateStrings.length === 1 ? '' : 's'} selected.`}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label>Notes (optional)</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowNotesInput((v) => !v)}>
                        {showNotesInput ? 'Hide' : 'Add notes'}
                        {showNotesInput ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                      </Button>
                    </div>
                    {showNotesInput && (
                      <Textarea
                        value={notesText}
                        onChange={(event) => setNotesText(event.target.value)}
                        placeholder="What this studyset should focus on..."
                        className={`min-h-[110px] ${SOFT_SURFACE}`}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>Pasted text</Label>
                    <Textarea
                      value={pastedText}
                      onChange={(event) => setPastedText(event.target.value)}
                      placeholder="Paste chapters, summaries, requirements..."
                      className={`min-h-[140px] ${SOFT_SURFACE}`}
                    />
                  </div>

                  <div className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                    <p className="mb-2 text-sm font-medium">Files</p>
                    <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${SOFT_SURFACE}`}>
                      <Upload className="h-4 w-4" />
                      Add files
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                        onChange={handleUploadChange}
                      />
                    </label>
                    {uploads.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                        {uploads.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mb-2 flex h-14 items-center justify-center rounded-md bg-[#f1f5f9] dark:bg-zinc-800">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="truncate text-xs">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Import from OneDrive</p>
                      {microsoftConnected ? (
                        <span className="text-xs text-muted-foreground">{microsoftEmail || 'Connected'}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </div>

                    <div className="mt-2 min-h-[260px]">
                      <MicrosoftAppStrip returnTo="/tools/studyset?open=create&step=2" />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">Selected OneDrive files</p>
                          {microsoftConnected && (
                            <Button type="button" variant="outline" size="sm" onClick={() => void loadMicrosoftSelectedFiles()}>
                              Refresh
                            </Button>
                          )}
                        </div>
                        {!microsoftConnected && (
                          <p className="text-xs text-muted-foreground">Connect Microsoft above to select files.</p>
                        )}
                        {microsoftConnected && sortedOneDriveFiles.length === 0 && (
                          <p className="text-xs text-muted-foreground">No OneDrive files selected yet.</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                          {sortedOneDriveFiles.map((file) => (
                            <div key={file.id} className="rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="mb-2 flex h-14 items-center justify-center rounded-md bg-[#f1f5f9] dark:bg-zinc-800">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <p className="truncate text-xs">{file.name}</p>
                            </div>
                          ))}
                        </div>
                        {microsoftConnected && (
                          <div className="mt-2">
                            <Button type="button" variant="outline" onClick={() => void disconnectMicrosoft()}>
                              Disconnect
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 0) {
                      setView('home');
                      return;
                    }
                    setStep((value) => Math.max(0, value - 1));
                  }}
                  disabled={creating}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                {step < 2 ? (
                  <Button type="button" onClick={goNext} disabled={!canNext || creating}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void createStudyset()} disabled={!isStepThreeReady || creating}>
                    {creating ? 'Creating...' : 'Create studyset'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

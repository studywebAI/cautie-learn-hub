'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Atom,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Code2,
  Dna,
  FlaskConical,
  Globe,
  Landmark,
  Link2,
  Pencil,
  Plus,
  Route,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
  kind: 'word' | 'powerpoint';
  mimeType?: string;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
};

type IconOption = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

const STEP_TITLES = ['Basics', 'Calendar', 'Sources'];

const ICON_OPTIONS: IconOption[] = [
  { id: 'book-open', label: 'Book', Icon: BookOpen },
  { id: 'flask', label: 'Science', Icon: FlaskConical },
  { id: 'landmark', label: 'History', Icon: Landmark },
  { id: 'globe', label: 'Geo', Icon: Globe },
  { id: 'calculator', label: 'Math', Icon: Calculator },
  { id: 'dna', label: 'Biology', Icon: Dna },
  { id: 'atom', label: 'Physics', Icon: Atom },
  { id: 'pencil', label: 'Writing', Icon: Pencil },
  { id: 'code', label: 'Coding', Icon: Code2 },
];

const COLOR_OPTIONS = ['slate', 'stone', 'zinc', 'neutral', 'gray', 'iron', 'graphite'];

const COLOR_CLASS: Record<string, string> = {
  slate: 'bg-slate-200 text-slate-900',
  stone: 'bg-stone-200 text-stone-900',
  zinc: 'bg-zinc-200 text-zinc-900',
  neutral: 'bg-neutral-200 text-neutral-900',
  gray: 'bg-gray-200 text-gray-900',
  iron: 'bg-[#d8d8db] text-[#121212]',
  graphite: 'bg-[#d1d1d4] text-[#101010]',
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
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [wordFiles, setWordFiles] = useState<MicrosoftFileItem[]>([]);
  const [powerpointFiles, setPowerpointFiles] = useState<MicrosoftFileItem[]>([]);
  const [selectedMicrosoftFileIds, setSelectedMicrosoftFileIds] = useState<string[]>([]);

  const [creating, setCreating] = useState(false);

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
  const sortedWordFiles = useMemo(() => wordFiles.slice(0, 12), [wordFiles]);
  const sortedPowerpointFiles = useMemo(() => powerpointFiles.slice(0, 12), [powerpointFiles]);
  const selectedMicrosoftFiles = useMemo(() => {
    const all = [...wordFiles, ...powerpointFiles];
    return all.filter((item) => selectedMicrosoftFileIds.includes(item.id));
  }, [wordFiles, powerpointFiles, selectedMicrosoftFileIds]);

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
    setSelectedMicrosoftFileIds([]);
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

  const loadMicrosoftFiles = async () => {
    if (!microsoftConnected) {
      setWordFiles([]);
      setPowerpointFiles([]);
      return;
    }
    setMicrosoftLoading(true);
    try {
      const [wordRes, pptRes] = await Promise.all([
        fetch('/api/integrations/microsoft/files?kind=word', { cache: 'no-store' }),
        fetch('/api/integrations/microsoft/files?kind=powerpoint', { cache: 'no-store' }),
      ]);
      const wordJson = await wordRes.json().catch(() => ({}));
      const pptJson = await pptRes.json().catch(() => ({}));
      setWordFiles(Array.isArray(wordJson?.items) ? wordJson.items : []);
      setPowerpointFiles(Array.isArray(pptJson?.items) ? pptJson.items : []);
    } catch {
      setWordFiles([]);
      setPowerpointFiles([]);
    } finally {
      setMicrosoftLoading(false);
    }
  };

  useEffect(() => {
    void loadStudysets();
    void loadMicrosoftStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('ms') === 'connected') {
      toast({ title: 'Microsoft connected', description: 'Word and PowerPoint files are ready.' });
      void loadMicrosoftStatus();
      router.replace('/tools/studyset');
      return;
    }
    const msError = searchParams.get('ms_error');
    if (msError) {
      toast({ title: 'Microsoft connect failed', description: msError, variant: 'destructive' });
      router.replace('/tools/studyset');
    }
  }, [router, searchParams, toast]);

  useEffect(() => {
    void loadMicrosoftFiles();
  }, [microsoftConnected]);

  useEffect(() => {
    const validIds = new Set([...wordFiles, ...powerpointFiles].map((file) => file.id));
    setSelectedMicrosoftFileIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [wordFiles, powerpointFiles]);

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
      selectedColor || COLOR_OPTIONS.find((option) => !usedMeta.colors.has(option)) || COLOR_OPTIONS[0];
    return { icon, color };
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mapped = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));
    setUploads(mapped);
  };

  const toggleMicrosoftFile = (fileId: string) => {
    setSelectedMicrosoftFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((value) => value !== fileId) : [...prev, fileId]
    );
  };

  const disconnectMicrosoft = async () => {
    const response = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' });
    if (!response.ok) return;
    setMicrosoftConnected(false);
    setMicrosoftEmail('');
    setWordFiles([]);
    setPowerpointFiles([]);
    setSelectedMicrosoftFileIds([]);
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
            word: selectedMicrosoftFiles.some((file) => file.kind === 'word'),
            powerpoint: selectedMicrosoftFiles.some((file) => file.kind === 'powerpoint'),
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
    <div className="h-full overflow-auto">
      <div className="w-full space-y-4">
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
                        {item.target_days} days · {item.minutes_per_day} min/day
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {view === 'create' && (
          <Card className="border-none">
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

            <CardContent className="space-y-4">
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Studyset name</Label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="WW2 final prep"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Icon (optional)</Label>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                      {ICON_OPTIONS.map((option) => {
                        const ActiveIcon = option.Icon;
                        const selected = selectedIcon === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedIcon(selected ? null : option.id)}
                            className={`rounded-lg px-3 py-2 text-xs transition-colors ${
                              selected ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <ActiveIcon className="h-3.5 w-3.5" />
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Color (optional)</Label>
                    <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
                      {COLOR_OPTIONS.map((color) => {
                        const selected = selectedColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(selected ? null : color)}
                            className={`rounded-lg px-2 py-2 text-xs capitalize transition-all ${COLOR_CLASS[color]} ${
                              selected ? 'ring-1 ring-foreground' : ''
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If you skip icon/color, we auto-pick an unused combo.
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Label>Select available study days</Label>
                  <div className="rounded-xl bg-background p-2">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(value) => setSelectedDates(Array.isArray(value) ? value : [])}
                      className="mx-auto"
                    />
                  </div>
                  <div className="rounded-xl bg-background p-3 text-xs text-muted-foreground">
                    {selectedDateStrings.length === 0
                      ? 'Pick at least one day.'
                      : `${selectedDateStrings.length} day${selectedDateStrings.length === 1 ? '' : 's'} selected.`}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea
                      value={notesText}
                      onChange={(event) => setNotesText(event.target.value)}
                      placeholder="What this studyset should focus on..."
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Pasted text</Label>
                    <Textarea
                      value={pastedText}
                      onChange={(event) => setPastedText(event.target.value)}
                      placeholder="Paste chapters, summaries, requirements..."
                      className="min-h-[140px]"
                    />
                  </div>

                  <div className="rounded-xl bg-background p-3">
                    <p className="mb-2 text-sm font-medium">Files</p>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm">
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
                      <div className="mt-2 space-y-1">
                        {uploads.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="rounded-md bg-card px-2 py-1 text-xs">
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Import from Word/PowerPoint</p>
                      {microsoftConnected ? (
                        <span className="text-xs text-muted-foreground">{microsoftEmail || 'Connected'}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </div>

                    {!microsoftConnected ? (
                      <Button asChild variant="outline" className="mt-2">
                        <a href="/api/integrations/microsoft/connect?returnTo=/tools/studyset">
                          <Link2 className="mr-2 h-4 w-4" />
                          Connect Microsoft
                        </a>
                      </Button>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Button type="button" variant="outline" onClick={() => void loadMicrosoftFiles()}>
                          Refresh files
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void disconnectMicrosoft()}>
                          Disconnect
                        </Button>
                      </div>
                    )}

                    {microsoftConnected && (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-card p-2">
                          <p className="mb-1 text-xs font-medium">Word</p>
                          {microsoftLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                          {!microsoftLoading && sortedWordFiles.length === 0 && (
                            <p className="text-xs text-muted-foreground">No Word files found.</p>
                          )}
                          <div className="space-y-1">
                            {sortedWordFiles.map((file) => (
                              <label key={file.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs">
                                <Checkbox
                                  checked={selectedMicrosoftFileIds.includes(file.id)}
                                  onCheckedChange={() => toggleMicrosoftFile(file.id)}
                                />
                                <span className="truncate">{file.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg bg-card p-2">
                          <p className="mb-1 text-xs font-medium">PowerPoint</p>
                          {microsoftLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                          {!microsoftLoading && sortedPowerpointFiles.length === 0 && (
                            <p className="text-xs text-muted-foreground">No PowerPoint files found.</p>
                          )}
                          <div className="space-y-1">
                            {sortedPowerpointFiles.map((file) => (
                              <label key={file.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs">
                                <Checkbox
                                  checked={selectedMicrosoftFileIds.includes(file.id)}
                                  onCheckedChange={() => toggleMicrosoftFile(file.id)}
                                />
                                <span className="truncate">{file.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
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

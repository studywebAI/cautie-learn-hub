'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Link2,
  Route,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type StudysetRow = {
  id: string;
  name: string;
  confidence_level: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
  updated_at: string;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
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

const DRAFT_KEY = 'studyweb-studyset-wizard-draft-v1';
const MAX_TARGET_DAYS = 60;

const STEP_TITLES = ['Schedule', 'Sources', 'Optional Notes'];

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPlanDates(startDateValue: string, endDateValue: string, excludedWeekdays: Set<number>) {
  const start = parseLocalDate(startDateValue);
  const end = parseLocalDate(endDateValue);
  if (!start || !end || end < start) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  const maxLoops = 370;

  for (let i = 0; i < maxLoops && cursor <= end; i += 1) {
    const day = cursor.getDay();
    if (!excludedWeekdays.has(day)) {
      dates.push(toIsoLocalDate(cursor));
      if (dates.length >= MAX_TARGET_DAYS) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export default function StudysetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const today = useMemo(() => toIsoLocalDate(new Date()), []);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [targetDate, setTargetDate] = useState('');
  const [minutesPerDay, setMinutesPerDay] = useState('45');
  const [confidence, setConfidence] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [excludedDays, setExcludedDays] = useState<number[]>([0, 6]);
  const [sourceBundle, setSourceBundle] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftEmail, setMicrosoftEmail] = useState('');
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [wordFiles, setWordFiles] = useState<MicrosoftFileItem[]>([]);
  const [powerpointFiles, setPowerpointFiles] = useState<MicrosoftFileItem[]>([]);
  const [selectedMicrosoftFileIds, setSelectedMicrosoftFileIds] = useState<string[]>([]);
  const [uploads, setUploads] = useState<UploadMeta[]>([]);
  const [studysets, setStudysets] = useState<StudysetRow[]>([]);
  const [loadingStudysets, setLoadingStudysets] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const selectedMicrosoftFiles = useMemo(() => {
    const all = [...wordFiles, ...powerpointFiles];
    return all.filter((item) => selectedMicrosoftFileIds.includes(item.id));
  }, [wordFiles, powerpointFiles, selectedMicrosoftFileIds]);
  const wordConnected = microsoftConnected && selectedMicrosoftFiles.some((item) => item.kind === 'word');
  const powerpointConnected =
    microsoftConnected && selectedMicrosoftFiles.some((item) => item.kind === 'powerpoint');
  const excludedDaySet = useMemo(() => new Set(excludedDays), [excludedDays]);
  const plannedDates = useMemo(
    () => buildPlanDates(startDate, targetDate, excludedDaySet),
    [startDate, targetDate, excludedDaySet]
  );
  const targetDays = plannedDates.length;

  const hasSources =
    sourceBundle.trim().length > 0 || uploads.length > 0 || selectedMicrosoftFiles.length > 0;
  const isStep1Ready = Boolean(name.trim() && targetDate && targetDays > 0);
  const isStep2Ready = hasSources;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setName(String(draft?.name || ''));
      setStartDate(String(draft?.startDate || today));
      setTargetDate(String(draft?.targetDate || ''));
      setMinutesPerDay(String(draft?.minutesPerDay || '45'));
      const level = String(draft?.confidence || 'beginner');
      if (level === 'beginner' || level === 'intermediate' || level === 'advanced') {
        setConfidence(level);
      }
      setExcludedDays(Array.isArray(draft?.excludedDays) ? draft.excludedDays : [0, 6]);
      setSourceBundle(String(draft?.sourceBundle || ''));
      setAdditionalNotes(String(draft?.additionalNotes || ''));
      setSelectedMicrosoftFileIds(Array.isArray(draft?.selectedMicrosoftFileIds) ? draft.selectedMicrosoftFileIds : []);
      setUploads(Array.isArray(draft?.uploads) ? draft.uploads : []);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [today]);

  useEffect(() => {
    const draft = {
      name,
      startDate,
      targetDate,
      minutesPerDay,
      confidence,
      excludedDays,
      sourceBundle,
      additionalNotes,
      selectedMicrosoftFileIds,
      uploads,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    additionalNotes,
    confidence,
    excludedDays,
    minutesPerDay,
    name,
    selectedMicrosoftFileIds,
    sourceBundle,
    startDate,
    targetDate,
    uploads,
  ]);

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
    void loadMicrosoftStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get('ms') === 'connected') {
      toast({ title: 'Microsoft connected', description: 'Word and PowerPoint files are now available.' });
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

  const loadStudysets = async () => {
    setLoadingStudysets(true);
    try {
      const response = await fetch('/api/studysets');
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

  useEffect(() => {
    void loadStudysets();
  }, []);

  const toggleExcludedDay = (day: number) => {
    setExcludedDays((prev) => {
      if (prev.includes(day)) return prev.filter((value) => value !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
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

  const createAndGenerate = async () => {
    if (!isStep1Ready || !isStep2Ready) return;

    const minutes = Math.max(10, Math.min(480, Number(minutesPerDay || 45)));
    setGenerating(true);
    try {
      const sourcePayload = {
        schedule: {
          start_date: startDate,
          target_date: targetDate,
          excluded_weekdays: excludedDays,
          planned_dates: plannedDates,
        },
        sources: {
          context_text: sourceBundle.trim(),
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
        additional_notes: additionalNotes.trim(),
      };

      const createRes = await fetch('/api/studysets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          confidence_level: confidence,
          target_days: Math.max(1, Math.min(MAX_TARGET_DAYS, targetDays)),
          minutes_per_day: minutes,
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
          start_date: startDate,
          end_date: targetDate,
          excluded_weekdays: excludedDays,
          feedback: additionalNotes.trim() || null,
        }),
      });

      if (!generateRes.ok) {
        const message = await generateRes.text();
        throw new Error(message || 'Failed to generate plan');
      }

      window.localStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Study plan ready', description: 'Your plan was generated and synced to Agenda.' });
      router.push(`/tools/studyset/${studysetId}`);
    } catch (error: any) {
      toast({
        title: 'Could not generate study plan',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePlanForExisting = async (studysetId: string) => {
    setGeneratingId(studysetId);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to generate plan');
      }
      await loadStudysets();
      toast({ title: 'Plan generated', description: 'Daily tasks are now synced into Agenda.' });
    } catch (error: any) {
      toast({
        title: 'Could not generate plan',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const goNext = () => {
    if (step === 0 && !isStep1Ready) return;
    if (step === 1 && !isStep2Ready) return;
    setStep((value) => Math.min(2, value + 1));
  };

  const canNext = step === 0 ? isStep1Ready : step === 1 ? isStep2Ready : false;

  const toggleMicrosoftFile = (fileId: string) => {
    setSelectedMicrosoftFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((value) => value !== fileId) : [...prev, fileId]
    );
  };

  const disconnectMicrosoft = async () => {
    try {
      const response = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to disconnect');
      setMicrosoftConnected(false);
      setMicrosoftEmail('');
      setWordFiles([]);
      setPowerpointFiles([]);
      setSelectedMicrosoftFileIds([]);
      toast({ title: 'Disconnected', description: 'Microsoft account removed.' });
    } catch {
      toast({ title: 'Could not disconnect', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="flex min-h-full w-full flex-col gap-4">
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Studyset
            </CardTitle>
            <CardDescription>
              Build once, then follow day-by-day. No manual save needed.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-none">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Create Study Plan</CardTitle>
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
                    placeholder="Biology exam prep"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Start date</Label>
                    <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Target finish date</Label>
                    <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Minutes per day</Label>
                    <Input
                      type="number"
                      min={10}
                      max={480}
                      value={minutesPerDay}
                      onChange={(event) => setMinutesPerDay(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Exclude days</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((option) => {
                        const selected = excludedDaySet.has(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleExcludedDay(option.value)}
                            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                              selected ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Excluded days are skipped in generated plan dates.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label>Current level</Label>
                    <Select
                      value={confidence}
                      onValueChange={(value) =>
                        setConfidence(value as 'beginner' | 'intermediate' | 'advanced')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl bg-background p-3">
                  <p className="text-sm font-medium">Schedule preview</p>
                  {targetDays === 0 ? (
                    <p className="text-xs text-muted-foreground">Set a valid date range with at least one included day.</p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {targetDays} planned day{targetDays === 1 ? '' : 's'} between {startDate} and {targetDate}
                        {targetDays >= MAX_TARGET_DAYS ? ' (capped at 60)' : ''}.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plannedDates.slice(0, 14).map((date) => (
                          <Badge key={date} variant="outline" className="bg-card">
                            {date}
                          </Badge>
                        ))}
                        {plannedDates.length > 14 && (
                          <Badge variant="outline" className="bg-card">
                            +{plannedDates.length - 14} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Context bundle</Label>
                  <Textarea
                    value={sourceBundle}
                    onChange={(event) => setSourceBundle(event.target.value)}
                    className="min-h-[160px]"
                    placeholder="Paste key chapters, test scope, weak points, and anything important..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-background p-3">
                    <p className="mb-2 text-sm font-medium">Upload source files</p>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Choose files
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                        onChange={handleUploadChange}
                      />
                    </label>
                    {uploads.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">No files selected yet.</p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {uploads.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="rounded-lg bg-card px-2 py-1 text-xs">
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-background p-3">
                    <p className="mb-2 text-sm font-medium">Import from</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Microsoft 365
                        </span>
                        {microsoftConnected ? (
                          <span className="text-xs text-muted-foreground">{microsoftEmail || 'Connected'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not connected</span>
                        )}
                      </div>

                      {!microsoftConnected ? (
                        <Button asChild variant="outline" className="w-full">
                          <a href="/api/integrations/microsoft/connect?returnTo=/tools/studyset">Connect Microsoft</a>
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => void loadMicrosoftFiles()}>
                            Refresh files
                          </Button>
                          <Button type="button" variant="outline" className="flex-1" onClick={() => void disconnectMicrosoft()}>
                            Disconnect
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Read-only access. We never edit external files.
                    </p>

                    {microsoftConnected && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Word documents</p>
                          <div className="mt-1 space-y-1">
                            {microsoftLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                            {!microsoftLoading && wordFiles.length === 0 && (
                              <p className="text-xs text-muted-foreground">No Word files found.</p>
                            )}
                            {wordFiles.slice(0, 8).map((file) => (
                              <label key={file.id} className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5 text-xs">
                                <Checkbox
                                  checked={selectedMicrosoftFileIds.includes(file.id)}
                                  onCheckedChange={() => toggleMicrosoftFile(file.id)}
                                />
                                <span className="flex-1 truncate">{file.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">PowerPoint decks</p>
                          <div className="mt-1 space-y-1">
                            {microsoftLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
                            {!microsoftLoading && powerpointFiles.length === 0 && (
                              <p className="text-xs text-muted-foreground">No PowerPoint files found.</p>
                            )}
                            {powerpointFiles.slice(0, 8).map((file) => (
                              <label key={file.id} className="flex items-center gap-2 rounded-md bg-card px-2 py-1.5 text-xs">
                                <Checkbox
                                  checked={selectedMicrosoftFileIds.includes(file.id)}
                                  onCheckedChange={() => toggleMicrosoftFile(file.id)}
                                />
                                <span className="flex-1 truncate">{file.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Additional instructions (optional)</Label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(event) => setAdditionalNotes(event.target.value)}
                    className="min-h-[160px]"
                    placeholder="Optional: mention preferred tool mix, pace, weak topics, or exam strategy."
                  />
                </div>

                <div className="rounded-xl bg-background p-3 text-xs text-muted-foreground">
                  This step is optional. You can skip it and generate now.
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0 || generating}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              {step < 2 ? (
                <Button type="button" onClick={goNext} disabled={!canNext || generating}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={() => void createAndGenerate()} disabled={generating || !isStep2Ready}>
                  {generating ? 'Generating...' : 'Generate study plan'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardHeader>
            <CardTitle>My Studysets</CardTitle>
            <CardDescription>Open existing plans or regenerate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingStudysets ? (
              <p className="text-sm text-muted-foreground">Loading studysets...</p>
            ) : studysets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No studysets yet.</p>
            ) : (
              studysets.map((item) => (
                <div key={item.id} className="rounded-xl bg-card p-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {item.target_days} days
                    </span>{' '}
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {item.minutes_per_day} min/day
                    </span>{' '}
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {item.confidence_level}
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={generatingId === item.id}
                      onClick={() => void generatePlanForExisting(item.id)}
                    >
                      {generatingId === item.id ? 'Generating...' : 'Regenerate'}
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/tools/studyset/${item.id}`}>Open plan</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardContent className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            Your generated studyset syncs into Agenda and Dashboard automatically.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

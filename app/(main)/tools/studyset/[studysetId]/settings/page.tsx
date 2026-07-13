'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  ArchiveRestore,
  Bell,
  Calendar as CalendarIcon,
  Check,
  Folder,
  Layers,
  Pin,
  Save,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { PageSection } from '@/components/layout/page-section';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ICON_OPTIONS, COLOR_OPTIONS, colorHex, statusMeta } from '@/components/studyset/style-options';

const BRAND = 'var(--accent-brand)';
const CARD = 'surface-panel rounded-2xl border border-border shadow-sm p-5';
const SECTION_HEADING = 'text-[11px] text-muted-foreground mb-3';
const CALENDAR_CLASSES = {
  day_selected:
    'bg-surface-chip text-foreground hover:bg-surface-chip hover:text-foreground focus:bg-surface-chip focus:text-foreground',
  day_today: 'bg-surface-1 text-foreground',
  day_range_middle: 'aria-selected:bg-surface-chip aria-selected:text-foreground',
};

type StudysetSettingsData = {
  id: string;
  name: string;
  status: string;
  meta: {
    icon?: string | null;
    color?: string | null;
    subject?: string | null;
    exam_date?: string | null;
    description?: string | null;
  };
  selected_dates: string[];
};

type Preferences = {
  random_order: boolean;
  daily_reminders: boolean;
  daily_task_limit: number | null;
  theme: 'auto' | 'light' | 'dark';
  pinned: boolean;
  folder: string | null;
  tags: string[];
};

const DEFAULT_PREFERENCES: Preferences = {
  random_order: false,
  daily_reminders: true,
  daily_task_limit: null,
  theme: 'auto',
  pinned: false,
  folder: null,
  tags: [],
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

function parseSelectedDates(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = parsed?.schedule?.selected_dates;
    if (!Array.isArray(list)) return [];
    return list.map((value: unknown) => String(value || '')).filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  } catch {
    return [];
  }
}

export default function StudysetSettingsPage() {
  const params = useParams<{ studysetId: string }>();
  const studysetId = params?.studysetId as string | undefined;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudysetSettingsData | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [folderInput, setFolderInput] = useState('');

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedDateStrings = useMemo(() => normalizeDates(selectedDates), [selectedDates]);

  const load = async () => {
    if (!studysetId) return;
    setLoading(true);
    try {
      const [detailRes, prefRes] = await Promise.all([
        fetch(`/api/studysets/${studysetId}`, { cache: 'no-store' }),
        fetch(`/api/studysets/${studysetId}/preferences`, { cache: 'no-store' }),
      ]);

      if (detailRes.ok) {
        const json = await detailRes.json();
        const studyset = json?.studyset;
        if (studyset) {
          const next: StudysetSettingsData = {
            id: String(studyset.id),
            name: String(studyset.name || ''),
            status: String(studyset.status || 'draft'),
            meta: studyset.meta || {},
            selected_dates: parseSelectedDates(studyset.source_bundle),
          };
          setData(next);
          setName(next.name);
          setSelectedIcon(next.meta?.icon || null);
          setSelectedColor(next.meta?.color || null);
          setSelectedDates(next.selected_dates.map((value) => new Date(`${value}T00:00:00`)));
        }
      }

      if (prefRes.ok) {
        const json = await prefRes.json();
        const prefs = json?.preferences || DEFAULT_PREFERENCES;
        setPreferences({ ...DEFAULT_PREFERENCES, ...prefs });
        setFolderInput(prefs?.folder || '');
      }
    } catch {
      toast({ title: 'Could not load settings', description: 'Try refreshing the page.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studysetId]);

  const hasGeneralChanges =
    !!data &&
    (name.trim() !== data.name ||
      (selectedIcon || null) !== (data.meta?.icon || null) ||
      (selectedColor || null) !== (data.meta?.color || null) ||
      selectedDateStrings.join(',') !== data.selected_dates.join(','));

  const saveGeneral = async () => {
    if (!studysetId || !data) return;
    setSavingGeneral(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || data.name,
          icon: selectedIcon || '',
          color: selectedColor || '',
          selected_dates: selectedDateStrings,
        }),
      });
      if (!response.ok) throw new Error('Failed to save');
      const json = await response.json();
      const studyset = json?.studyset;
      if (studyset) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                name: String(studyset.name || prev.name),
                meta: studyset.meta || prev.meta,
                selected_dates: parseSelectedDates(studyset.source_bundle),
              }
            : prev
        );
      }
      toast({ title: 'Saved', description: 'Studyset details updated.' });
    } catch {
      toast({ title: 'Could not save changes', description: 'Try again.', variant: 'destructive' });
    } finally {
      setSavingGeneral(false);
    }
  };

  const savePreferences = async (patch: Partial<Preferences>) => {
    if (!studysetId) return;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSavingPreferences(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      const json = await response.json();
      if (json?.preferences) setPreferences({ ...DEFAULT_PREFERENCES, ...json.preferences });
    } catch {
      toast({ title: 'Could not save preference', description: 'Try again.', variant: 'destructive' });
      setPreferences(preferences);
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggleArchive = async () => {
    if (!studysetId || !data) return;
    const nextStatus = data.status === 'archived' ? 'active' : 'archived';
    setArchiving(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setData((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      toast({
        title: nextStatus === 'archived' ? 'Studyset archived' : 'Studyset restored',
        description:
          nextStatus === 'archived'
            ? 'It moved to the archived section on your studyset home.'
            : 'It is active again and back in your main list.',
      });
    } catch {
      toast({ title: 'Could not update status', description: 'Try again.', variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  };

  const deleteStudyset = async () => {
    if (!studysetId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/studysets/${studysetId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete studyset');
      toast({ title: 'Studyset removed', description: 'It has been archived and is no longer active.' });
      router.push('/tools/studyset');
    } catch {
      toast({ title: 'Could not delete studyset', description: 'Try again.', variant: 'destructive' });
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <PageSection>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </PageSection>
    );
  }

  if (!data) {
    return (
      <PageSection>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Studyset not found</p>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/tools/studyset">Back to studysets</Link>
          </Button>
        </div>
      </PageSection>
    );
  }

  const sm = statusMeta(data.status);
  const hex = colorHex(selectedColor);

  return (
    <PageSection>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tools/studyset/${studysetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to studyset
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl text-foreground">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            {data.name} — Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit how this studyset looks, schedules and studies for you.
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] ${sm.className}`}>
          {sm.label}
        </span>
      </div>

      <div className="space-y-6">
        {/* General */}
        <section className={CARD}>
          <h2 className={SECTION_HEADING}>general</h2>
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block text-sm font-medium text-foreground">Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-10 max-w-md" />
            </div>

            <div>
              <Label className="mb-3 block text-sm font-medium text-foreground">
                Icon <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="grid max-w-md grid-cols-10 gap-1.5">
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
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                        selected
                          ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                          : 'border-border bg-background text-muted-foreground hover:border-[var(--accent-brand)]/50 hover:bg-[var(--accent-brand)]/5'
                      }`}
                    >
                      <ActiveIcon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-3 block text-sm font-medium text-foreground">
                Color <span className="font-normal text-muted-foreground">(used for the Today list & cards)</span>
              </Label>
              <div className="flex max-w-md flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const selected = selectedColor === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={color.id}
                      title={color.id}
                      onClick={() => setSelectedColor(selected ? null : color.id)}
                      className={`h-7 w-7 rounded-full transition-all ${color.swatchClass} ${
                        selected
                          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110'
                          : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hex }} />
                This color marks {data.name} everywhere — the Today list, cards and reminders.
              </p>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Study days
              </Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Pick the days you actually plan to study — the plan reshuffles around these.
              </p>
              <div className="max-w-md rounded-xl border border-border/60 bg-background p-2">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(value) => setSelectedDates(Array.isArray(value) ? value : [])}
                  className="mx-auto"
                  classNames={CALENDAR_CLASSES}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedDateStrings.length === 0
                  ? 'No study days selected yet.'
                  : `${selectedDateStrings.length} ${selectedDateStrings.length === 1 ? 'day' : 'days'} selected.`}
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-border/60 pt-5">
              <Button
                type="button"
                onClick={() => void saveGeneral()}
                disabled={!hasGeneralChanges || savingGeneral || !name.trim()}
                style={{ backgroundColor: hasGeneralChanges ? BRAND : undefined }}
                className="text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingGeneral ? 'Saving…' : 'Save changes'}
              </Button>
              {!hasGeneralChanges && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5" /> Up to date
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Study preferences */}
        <section className={CARD}>
          <h2 className={SECTION_HEADING}>study preferences</h2>
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="flex items-start gap-3">
                <Shuffle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Shuffle task order</p>
                  <p className="text-xs text-muted-foreground">Mix up the order of today's tasks instead of a fixed sequence.</p>
                </div>
              </div>
              <Switch
                checked={preferences.random_order}
                onCheckedChange={(checked) => void savePreferences({ random_order: checked })}
                disabled={savingPreferences}
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Daily reminders</p>
                  <p className="text-xs text-muted-foreground">Get nudged on the days you planned to study this set.</p>
                </div>
              </div>
              <Switch
                checked={preferences.daily_reminders}
                onCheckedChange={(checked) => void savePreferences({ daily_reminders: checked })}
                disabled={savingPreferences}
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <Layers className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Daily task limit</p>
                  <p className="text-xs text-muted-foreground">Cap how many tasks land on a single day — leave empty for no cap.</p>
                </div>
              </div>
              <Input
                type="number"
                min={1}
                max={50}
                value={preferences.daily_task_limit ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  const num = raw.trim() === '' ? null : Math.max(1, Math.min(50, Number(raw)));
                  void savePreferences({ daily_task_limit: num });
                }}
                placeholder="No cap"
                className="h-9 w-24 text-center"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <div className="flex items-start gap-3">
                <Pin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Pin to top</p>
                  <p className="text-xs text-muted-foreground">Keep this studyset at the top of your active list.</p>
                </div>
              </div>
              <Switch
                checked={preferences.pinned}
                onCheckedChange={(checked) => void savePreferences({ pinned: checked })}
                disabled={savingPreferences}
              />
            </div>
          </div>
        </section>

        {/* Organization */}
        <section className={CARD}>
          <h2 className={SECTION_HEADING}>organization</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Folder className="h-4 w-4 text-muted-foreground" />
                Folder
              </Label>
              <Input
                value={folderInput}
                onChange={(event) => setFolderInput(event.target.value)}
                onBlur={() => {
                  const trimmed = folderInput.trim();
                  if (trimmed !== (preferences.folder || '')) {
                    void savePreferences({ folder: trimmed || null });
                  }
                }}
                placeholder="e.g. Period 2 exams"
                className="h-9"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Group related studysets — folders show up in Recents and on your studyset home.
              </p>
            </div>
          </div>
        </section>

        {/* Status / archive */}
        <section className={CARD}>
          <h2 className={SECTION_HEADING}>status</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {data.status === 'archived' ? (
                <ArchiveRestore className="mt-0.5 h-4 w-4 text-muted-foreground" />
              ) : (
                <Archive className="mt-0.5 h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {data.status === 'archived' ? 'This studyset is archived' : 'Archive this studyset'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.status === 'archived'
                    ? 'It is hidden from your active list and Today overview. Restore it to pick up where you left off.'
                    : "Move it out of your active list without losing any plans, history or analytics — you can restore it any time."}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => void toggleArchive()} disabled={archiving}>
              {data.status === 'archived' ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  {archiving ? 'Restoring…' : 'Restore'}
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  {archiving ? 'Archiving…' : 'Archive'}
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Danger zone */}
        <section className={`${CARD} border-destructive/30`}>
          <h2 className={SECTION_HEADING}>danger zone</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Delete this studyset</p>
                <p className="text-xs text-muted-foreground">
                  We archive it instead of a hard delete, so your history and analytics stay intact in case you change your mind.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </section>

        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-1/40 px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
          More controls — sources, output style, spaced-repetition tuning, export & sharing — live alongside your plan on the
          studyset page and keep adapting automatically as you study.
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this studyset?</AlertDialogTitle>
            <AlertDialogDescription>
              "{data.name}" will be archived. Your plans, attempts and analytics stay intact and you can restore it later from
              settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteStudyset();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageSection>
  );
}

'use client';

import { ChangeEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  History,
  Link2,
  Mic,
  MicOff,
  Plus,
  Route,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { AppContext } from '@/contexts/app-context';

type StudysetRow = {
  id: string;
  name: string;
  target_days: number;
  minutes_per_day: number;
  status: string;
  updated_at: string;
  source_bundle?: string | null;
  progress?: {
    total_tasks: number;
    completed_tasks: number;
    percent: number;
  };
  next_task_href?: string | null;
  meta?: {
    icon?: string | null;
    color?: string | null;
  };
  analytics_summary?: {
    avg_score?: number;
    recent_attempts_7d?: number;
    due_today_tasks?: number;
    pending_interventions?: number;
    weakest_tool?: string | null;
  };
};

type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  kind: 'onedrive';
  mimeType?: string;
  extractedText?: string;
  extractionStatus?: string;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
  extractedText?: string;
  extractionStatus?: 'ready' | 'empty' | 'error';
};

type RecentMaterialItem = {
  id: string;
  title: string;
  type: string;
  snippet: string;
};

type StudysetDraft = {
  name: string;
  selectedDates: string[];
  notesText: string;
  pastedText: string;
  aiRulesText: string;
  voiceMemoText: string;
};

const STEP_TITLES = ['Basics', 'Calendar', 'Sources'];
const STUDYSET_DRAFT_KEY = 'studyset.create.draft.v2';

const SOFT_SURFACE = 'border border-[#e5e7eb] bg-[#f8fafc] dark:border-zinc-800 dark:bg-zinc-900/40';
const CALENDAR_CLASSES = {
  day_selected:
    'bg-[hsl(var(--sidebar-accent)/1)] text-sidebar-foreground hover:bg-[hsl(var(--sidebar-accent)/0.92)] hover:text-sidebar-foreground focus:bg-[hsl(var(--sidebar-accent)/0.92)] focus:text-sidebar-foreground',
  day_today:
    'border border-border bg-transparent text-foreground',
  day_range_middle: 'aria-selected:bg-[hsl(var(--sidebar-accent)/0.85)] aria-selected:text-sidebar-foreground',
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

function parseDraftDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
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
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';

  const [view, setView] = useState<'home' | 'create'>('home');
  const [step, setStep] = useState(0);
  const [studysets, setStudysets] = useState<StudysetRow[]>([]);
  const [loadingStudysets, setLoadingStudysets] = useState(true);

  const [name, setName] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [notesText, setNotesText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [aiRulesText, setAiRulesText] = useState('');
  const [voiceMemoText, setVoiceMemoText] = useState('');
  const [uploads, setUploads] = useState<UploadMeta[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(false);
  const [recents, setRecents] = useState<RecentMaterialItem[]>([]);
  const [selectedRecents, setSelectedRecents] = useState<string[]>([]);

  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftEmail, setMicrosoftEmail] = useState('');
  const [selectedMicrosoftFiles, setSelectedMicrosoftFiles] = useState<MicrosoftFileItem[]>([]);

  const [creating, setCreating] = useState(false);
  const [optimizingAll, setOptimizingAll] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const micSessionIdRef = useRef<string>('');
  const micChunkCountRef = useRef(0);
  const micChunkBytesRef = useRef(0);
  const oneDriveSectionRef = useRef<HTMLDivElement | null>(null);

  const madeStudysets = useMemo(() => studysets.filter((row) => row.status !== 'archived'), [studysets]);
  const debugMic = useCallback((event: string, details?: Record<string, unknown>) => {
    const payload = {
      event,
      sessionId: micSessionIdRef.current || null,
      ts: new Date().toISOString(),
      surface: 'studyset-create',
      ...details,
    };
    console.log('[MIC_DEBUG][STUDYSET][CLIENT]', payload);
    try {
      void fetch('/api/tools/mic-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // keep recording flow resilient if logging fails
    }
  }, []);

  const selectedDateStrings = useMemo(() => normalizeDates(selectedDates), [selectedDates]);
  const todayDate = useMemo(() => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    return next;
  }, []);
  const sortedOneDriveFiles = useMemo(() => selectedMicrosoftFiles.slice(0, 24), [selectedMicrosoftFiles]);

  const isStepOneReady = name.trim().length > 0;
  const isStepTwoReady = selectedDateStrings.length > 0;
  const hasExtractedUploads = uploads.some((file) => (file.extractedText || '').trim().length > 0);
  const hasExtractedMicrosoft = selectedMicrosoftFiles.some((file) => (file.extractedText || '').trim().length > 0);
  const hasSelectedRecents = selectedRecents.length > 0;
  const isStepThreeReady =
    notesText.trim().length > 0 ||
    pastedText.trim().length > 0 ||
    aiRulesText.trim().length > 0 ||
    voiceMemoText.trim().length > 0 ||
    hasSelectedRecents ||
    hasExtractedUploads ||
    hasExtractedMicrosoft;

  const resetWizard = () => {
    setStep(0);
    setName('');
    setSelectedDates([]);
    setNotesText('');
    setPastedText('');
    setAiRulesText('');
    setVoiceMemoText('');
    setUploads([]);
    setSelectedRecents([]);
    setSelectedMicrosoftFiles([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STUDYSET_DRAFT_KEY);
    }
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
        extractedText: typeof item?.extracted_text === 'string' ? item.extracted_text : '',
        extractionStatus: typeof item?.extraction_status === 'string' ? item.extraction_status : undefined,
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
    setRecordingSupported(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
    return () => {
      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
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
      if (typeof window !== 'undefined') {
        const rawDraft = window.localStorage.getItem(STUDYSET_DRAFT_KEY);
        if (rawDraft) {
          try {
            const parsed = JSON.parse(rawDraft) as StudysetDraft;
            if (typeof parsed?.name === 'string') setName(parsed.name);
            if (Array.isArray(parsed?.selectedDates)) {
              const restoredDates = parsed.selectedDates
                .map((value) => parseDraftDate(String(value || '')))
                .filter((date): date is Date => Boolean(date));
              setSelectedDates(restoredDates);
            }
            if (typeof parsed?.notesText === 'string') setNotesText(parsed.notesText);
            if (typeof parsed?.pastedText === 'string') setPastedText(parsed.pastedText);
            if (typeof parsed?.aiRulesText === 'string') setAiRulesText(parsed.aiRulesText);
            if (typeof parsed?.voiceMemoText === 'string') setVoiceMemoText(parsed.voiceMemoText);
          } catch {
            window.localStorage.removeItem(STUDYSET_DRAFT_KEY);
          }
        }
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

  useEffect(() => {
    if (view !== 'create') return;
    const draft: StudysetDraft = {
      name,
      selectedDates: selectedDateStrings,
      notesText,
      pastedText,
      aiRulesText,
      voiceMemoText,
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STUDYSET_DRAFT_KEY, JSON.stringify(draft));
    }
  }, [aiRulesText, name, notesText, pastedText, selectedDateStrings, view, voiceMemoText]);

  useEffect(() => {
    if (view === 'create' && step === 2) {
      void loadRecents();
    }
  }, [step, view]);

  const startCreate = () => {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STUDYSET_DRAFT_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StudysetDraft;
          if (typeof parsed?.name === 'string') setName(parsed.name);
          if (Array.isArray(parsed?.selectedDates)) {
            const restoredDates = parsed.selectedDates
              .map((value) => parseDraftDate(String(value || '')))
              .filter((date): date is Date => Boolean(date));
            setSelectedDates(restoredDates);
          }
          if (typeof parsed?.notesText === 'string') setNotesText(parsed.notesText);
          if (typeof parsed?.pastedText === 'string') setPastedText(parsed.pastedText);
          if (typeof parsed?.aiRulesText === 'string') setAiRulesText(parsed.aiRulesText);
          if (typeof parsed?.voiceMemoText === 'string') setVoiceMemoText(parsed.voiceMemoText);
        } catch {
          window.localStorage.removeItem(STUDYSET_DRAFT_KEY);
          resetWizard();
        }
      } else {
        resetWizard();
      }
    } else {
      resetWizard();
    }
    setView('create');
  };

  const goNext = () => {
    if (step === 0 && !isStepOneReady) return;
    if (step === 1 && !isStepTwoReady) return;
    setStep((value) => Math.min(2, value + 1));
  };

  const canNext = step === 0 ? isStepOneReady : step === 1 ? isStepTwoReady : false;

  const loadRecents = async () => {
    setRecentsLoading(true);
    try {
      const response = await fetch('/api/materials?limit=12', { cache: 'no-store' });
      if (!response.ok) {
        setRecents([]);
        return;
      }
      const data = await response.json().catch(() => ({}));
      const items = Array.isArray(data?.materials) ? data.materials : [];
      const mapped: RecentMaterialItem[] = items.map((item: any) => {
        const sourceText = typeof item?.source_text === 'string' ? item.source_text : '';
        const content =
          typeof item?.content === 'string'
            ? item.content
            : item?.content && typeof item.content === 'object'
              ? JSON.stringify(item.content)
              : '';
        const description = typeof item?.description === 'string' ? item.description : '';
        const snippet = (sourceText || description || content).replace(/\s+/g, ' ').trim().slice(0, 260);
        return {
          id: String(item?.id || ''),
          title: String(item?.title || item?.name || 'Untitled source'),
          type: String(item?.type || 'material'),
          snippet,
        };
      }).filter((item: RecentMaterialItem) => Boolean(item.id));
      setRecents(mapped);
    } finally {
      setRecentsLoading(false);
    }
  };

  const addSelectedRecentsToSources = () => {
    const picked = recents.filter((item) => selectedRecents.includes(item.id));
    if (picked.length === 0) return;
    const block = picked
      .map((item) => `[${item.type}] ${item.title}\n${item.snippet || 'No preview available.'}`)
      .join('\n\n');
    setPastedText((prev) => `${prev.trim()}\n\n${block}`.trim());
    toast({
      title: 'Recents imported',
      description: `${picked.length} recent source${picked.length === 1 ? '' : 's'} added to pasted text.`,
    });
  };

  const transcribeVoiceMemo = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const startedAt = Date.now();
    debugMic('transcribe_started', {
      blobType: audioBlob.type || 'audio/webm',
      blobSize: audioBlob.size,
      chunks: micChunkCountRef.current,
      totalChunkBytes: micChunkBytesRef.current,
      language,
    });
    try {
      const file = new File([audioBlob], 'studyset-voice-memo.webm', { type: audioBlob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', String(language || 'en'));
      formData.append('micSessionId', micSessionIdRef.current || '');
      formData.append('clientTs', new Date().toISOString());
      const response = await fetch('/api/tools/transcribe', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      debugMic('transcribe_response', {
        ok: response.ok,
        status: response.status,
        durationMs: Date.now() - startedAt,
        responseKeys: payload ? Object.keys(payload) : [],
        textLength: typeof payload?.text === 'string' ? payload.text.length : 0,
        errorMessage: payload?.error || null,
      });
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not transcribe audio.');
      }
      const transcript = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!transcript) {
        debugMic('transcribe_no_text', { durationMs: Date.now() - startedAt });
        toast({ title: 'No speech detected', description: 'Recording was saved but no transcript was returned.' });
        return;
      }
      setVoiceMemoText((prev) => `${prev.trim()}\n${transcript}`.trim());
      debugMic('transcribe_success', {
        durationMs: Date.now() - startedAt,
        transcriptLength: transcript.length,
        transcriptPreview: transcript.slice(0, 160),
      });
      toast({ title: 'Voice memo added', description: 'Transcript is now included in your studyset sources.' });
    } catch (error: any) {
      debugMic('transcribe_error', {
        durationMs: Date.now() - startedAt,
        message: error?.message || null,
      });
      toast({
        title: 'Voice transcription failed',
        description: error?.message || 'Try recording again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
      debugMic('transcribe_finished', { durationMs: Date.now() - startedAt });
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    debugMic('recording_stop_requested', {
      recorderState: recorder?.state || 'none',
      isRecording,
      isTranscribing,
    });
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;
    setIsRecording(false);
    debugMic('recording_stop_finished');
  };

  const startRecording = async () => {
    micSessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    micChunkCountRef.current = 0;
    micChunkBytesRef.current = 0;
    debugMic('recording_start_requested', {
      recordingSupported,
      language,
      hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    });
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      debugMic('recording_not_supported');
      toast({ title: 'Mic not available', description: 'Your browser does not support voice recording.', variant: 'destructive' });
      return;
    }

    try {
      debugMic('media_devices_request_start');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];
      debugMic('media_devices_request_success', {
        audioTracks: stream.getAudioTracks().length,
        trackLabels: stream.getAudioTracks().map((track) => track.label || 'unknown'),
      });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.onstart = () => {
        debugMic('recorder_started', {
          recorderMimeType: recorder.mimeType,
          preferredMime,
        });
      };
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          micChunkCountRef.current += 1;
          micChunkBytesRef.current += event.data.size;
          debugMic('recorder_chunk', {
            chunkIndex: micChunkCountRef.current,
            size: event.data.size,
            totalBytes: micChunkBytesRef.current,
          });
        }
      };
      recorder.onerror = (event) => {
        debugMic('recorder_error', {
          recorderState: recorder.state,
          eventType: event.type,
        });
      };
      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        debugMic('recorder_stopped', {
          chunkCount: micChunkCountRef.current,
          totalBytes: micChunkBytesRef.current,
          chunksLength: chunks.length,
        });
        if (!chunks.length) {
          debugMic('recorder_stopped_no_chunks');
          return;
        }
        const blob = new Blob(chunks, { type: preferredMime || 'audio/webm' });
        debugMic('recorder_blob_ready', {
          blobType: blob.type,
          blobSize: blob.size,
        });
        void transcribeVoiceMemo(blob);
      };
      recorder.start(300);
      setIsRecording(true);
      debugMic('recording_state_on');
    } catch (error: any) {
      debugMic('media_devices_request_error', {
        message: error?.message || null,
        name: error?.name || null,
      });
      toast({
        title: 'Mic permission denied',
        description: error?.message || 'Allow microphone access and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const mapped = await Promise.all(
      files.map(async (file) => {
        try {
          if (file.type === 'text/plain') {
            const text = (await file.text()).trim();
            return {
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              extractedText: text,
              extractionStatus: text ? 'ready' as const : 'empty' as const,
            };
          }

          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
          if (!res.ok) {
            return {
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              extractedText: '',
              extractionStatus: 'error' as const,
            };
          }

          const data = await res.json().catch(() => ({}));
          const text = typeof data?.text === 'string' ? data.text.trim() : '';
          return {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            extractedText: text,
            extractionStatus: text ? 'ready' as const : 'empty' as const,
          };
        } catch {
          return {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            extractedText: '',
            extractionStatus: 'error' as const,
          };
        }
      })
    );

    setUploads(mapped);
    const missingTextCount = mapped.filter((file) => (file.extractedText || '').trim().length === 0).length;
    if (missingTextCount > 0) {
      toast({
        title: 'Some files have no extracted text',
        description: `${missingTextCount} file${missingTextCount === 1 ? '' : 's'} will be ignored until extraction succeeds.`,
      });
    }
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
      const extractedUploadFiles = uploads
        .map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          extracted_text: (file.extractedText || '').trim(),
          extraction_status: file.extractionStatus || ((file.extractedText || '').trim() ? 'ready' : 'empty'),
        }))
        .filter((file) => file.extracted_text.length > 0);

      const extractedMicrosoftFiles = selectedMicrosoftFiles
        .map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          web_url: file.webUrl || null,
          mime_type: file.mimeType || null,
          size: file.size || null,
          last_modified: file.lastModifiedDateTime || null,
          extracted_text: (file.extractedText || '').trim(),
          extraction_status: file.extractionStatus || ((file.extractedText || '').trim() ? 'ready' : 'empty'),
        }))
        .filter((file) => file.extracted_text.length > 0);

      const pickedRecents = recents.filter((item) => selectedRecents.includes(item.id));
      const recentsTextBlock = pickedRecents
        .map((item) => `[${item.type}] ${item.title}\n${item.snippet || 'No preview available.'}`)
        .join('\n\n')
        .trim();
      const sourceNotesText = [notesText.trim(), aiRulesText.trim() ? `AI RULES\n${aiRulesText.trim()}` : '', voiceMemoText.trim() ? `VOICE MEMO\n${voiceMemoText.trim()}` : '']
        .filter(Boolean)
        .join('\n\n')
        .trim();
      const sourcePastedText = [pastedText.trim(), recentsTextBlock].filter(Boolean).join('\n\n').trim();
      const contextText = [sourceNotesText, sourcePastedText].filter(Boolean).join('\n\n').trim();

      const sourcePayload = {
        schedule: {
          selected_dates: selectedDateStrings,
        },
        sources: {
          notes_text: sourceNotesText,
          pasted_text: sourcePastedText,
          context_text: contextText,
          ai_rules_text: aiRulesText.trim(),
          voice_memo_text: voiceMemoText.trim(),
          imported_recents: pickedRecents,
          uploaded_files: extractedUploadFiles,
          imports: {
            word: false,
            powerpoint: false,
            onedrive: extractedMicrosoftFiles.length > 0,
            access_mode: 'read_only',
            microsoft_account: microsoftEmail || null,
            selected_documents: extractedMicrosoftFiles,
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
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STUDYSET_DRAFT_KEY);
      }
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

  const optimizeAllStudysets = async () => {
    if (optimizingAll) return;
    setOptimizingAll(true);
    try {
      const response = await fetch('/api/studysets/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: true,
          includeLaunchpad: false,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Could not optimize studysets');

      const replanChanged = Number(json?.replan?.changed || 0);
      const adaptiveChanged = Number(json?.adaptive?.changed || 0);
      toast({
        title: 'Studysets optimized',
        description: `Replan updated ${replanChanged}, adaptive updated ${adaptiveChanged}.`,
      });
      await loadStudysets();
    } catch (error: any) {
      toast({
        title: 'Optimization failed',
        description: error?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setOptimizingAll(false);
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={startCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Open new studyset
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void optimizeAllStudysets()} disabled={optimizingAll}>
                    {optimizingAll ? 'Optimizing...' : 'Optimize all'}
                  </Button>
                </div>
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
                    <div key={item.id} className="w-full rounded-xl bg-card px-3 py-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/tools/studyset/${item.id}`)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.target_days} days
                          {item.progress ? ` - ${item.progress.completed_tasks}/${item.progress.total_tasks} tasks` : ''}
                        </p>
                        {item.analytics_summary && (
                          <p className="text-[11px] text-muted-foreground">
                            Avg {item.analytics_summary.avg_score || 0}% - Due today {item.analytics_summary.due_today_tasks || 0}
                            {typeof item.analytics_summary.pending_interventions === 'number'
                              ? ` - Queue ${item.analytics_summary.pending_interventions}`
                              : ''}
                            {item.analytics_summary.weakest_tool
                              ? ` - Focus ${String(item.analytics_summary.weakest_tool)}`
                              : ''}
                          </p>
                        )}
                      </button>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(item.next_task_href || `/tools/studyset/${item.id}`)}
                        >
                          Quick start
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/tools/studyset/${item.id}`)}
                        >
                          Analytics
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {view === 'create' && (
          <Card className="flex min-h-0 flex-col border-none">
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
                      placeholder=""
                      className={`border-[#d1d5db] bg-[#f8fafc] text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder:text-zinc-400`}
                    />
                  </div>
                  <div className={`rounded-xl p-3 text-xs text-foreground/80 ${SOFT_SURFACE}`}>
                    Visual presets are now automatic. No icon or color setup needed.
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Label>Select study days (today or later)</Label>
                  <div className={`rounded-xl p-2 ${SOFT_SURFACE}`}>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(value) =>
                        setSelectedDates(
                          (Array.isArray(value) ? value : []).filter((date) => {
                            const copy = new Date(date);
                            copy.setHours(0, 0, 0, 0);
                            return copy >= todayDate;
                          })
                        )
                      }
                      disabled={{ before: todayDate }}
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
                  <div className={`rounded-2xl p-4 ${SOFT_SURFACE}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Source hub</p>
                        <p className="text-xs text-muted-foreground">Draft auto-saves. Connecting OneDrive no longer loses your progress.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => void loadRecents()} disabled={recentsLoading}>
                        {recentsLoading ? 'Refreshing...' : 'Refresh recents'}
                      </Button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                      <div className={`relative overflow-hidden rounded-2xl p-4 ${SOFT_SURFACE}`}>
                        <div className="relative mx-auto w-full max-w-xl">
                          <Label>Central brief</Label>
                          <Textarea
                            value={notesText}
                            onChange={(event) => setNotesText(event.target.value)}
                            placeholder="Write your core goal, exam focus, chapter priority, weak areas..."
                            className="mt-2 min-h-[130px] border-[#d1d5db] bg-white dark:border-zinc-800 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="mt-3 hidden min-h-[180px] md:block">
                          <div className="pointer-events-none absolute left-1/2 top-[172px] h-px w-[56%] -translate-x-1/2 bg-border/70" />
                          <div className="pointer-events-none absolute left-[15%] top-[104px] h-[80px] w-px bg-border/70" />
                          <div className="pointer-events-none absolute right-[15%] top-[104px] h-[80px] w-px bg-border/70" />
                          <div className="pointer-events-none absolute left-[26%] top-[118px] h-[72px] w-px rotate-[35deg] bg-border/70" />
                          <div className="pointer-events-none absolute right-[26%] top-[118px] h-[72px] w-px -rotate-[35deg] bg-border/70" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-[7%] top-[62px] rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                            <FileUp className="mr-1 inline h-3.5 w-3.5" /> Files
                          </button>
                          <button type="button" onClick={() => oneDriveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="absolute left-[38%] top-[44px] rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                            <Link2 className="mr-1 inline h-3.5 w-3.5" /> OneDrive
                          </button>
                          <button type="button" onClick={() => document.getElementById('studyset-ai-rules')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="absolute right-[38%] top-[44px] rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                            <Sparkles className="mr-1 inline h-3.5 w-3.5" /> AI rules
                          </button>
                          <button type="button" onClick={() => document.getElementById('studyset-recents')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="absolute right-[7%] top-[62px] rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                            <History className="mr-1 inline h-3.5 w-3.5" /> Recents
                          </button>
                          <button type="button" onClick={() => document.getElementById('studyset-voice-memo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="absolute left-1/2 top-[198px] -translate-x-1/2 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted">
                            <Mic className="mr-1 inline h-3.5 w-3.5" /> Voice memo
                          </button>
                        </div>
                      </div>

                      <div className={`rounded-2xl p-3 ${SOFT_SURFACE}`}>
                        <p className="text-xs font-medium">Source checklist</p>
                        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                          <p>{notesText.trim() ? 'Ready' : 'Missing'} central brief</p>
                          <p>{(pastedText.trim() || selectedRecents.length > 0) ? 'Ready' : 'Missing'} chapter/source text</p>
                          <p>{uploads.length > 0 ? `Ready (${uploads.length})` : 'Optional'} file uploads</p>
                          <p>{sortedOneDriveFiles.length > 0 ? `Ready (${sortedOneDriveFiles.length})` : 'Optional'} OneDrive</p>
                          <p>{aiRulesText.trim() ? 'Ready' : 'Optional'} AI behavior rules</p>
                          <p>{voiceMemoText.trim() ? 'Ready' : 'Optional'} voice memo</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                      <Label>Pasted text</Label>
                      <p className="mb-2 text-xs text-muted-foreground">Paste chapter text, rubric, model answers, or assignment requirements.</p>
                      <Textarea
                        id="studyset-pasted-text"
                        value={pastedText}
                        onChange={(event) => setPastedText(event.target.value)}
                        placeholder="Paste chapters, summaries, requirements..."
                        className="min-h-[170px] border-[#d1d5db] bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>

                    <div id="studyset-ai-rules" className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                      <Label>AI rules</Label>
                      <p className="mb-2 text-xs text-muted-foreground">Tell the planner exactly how to return tasks, titles, symbols, and strict constraints.</p>
                      <Textarea
                        value={aiRulesText}
                        onChange={(event) => setAiRulesText(event.target.value)}
                        placeholder="Example: return day-task lines with explicit tool, subject title, concise objective and exam-level focus..."
                        className="min-h-[170px] border-[#d1d5db] bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                      <p className="mb-2 text-sm font-medium">Files and photos</p>
                      <p className="mb-2 text-xs text-muted-foreground">Import text files, PDFs, docs, images, and slides.</p>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
                        <Upload className="h-4 w-4" />
                        Add files
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.png,.jpg,.jpeg"
                          onChange={handleUploadChange}
                        />
                      </label>
                      {uploads.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {uploads.slice(0, 8).map((file) => (
                            <div key={`${file.name}-${file.size}`} className="rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="mb-2 flex h-12 items-center justify-center rounded-md bg-[#f1f5f9] dark:bg-zinc-800">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <p className="truncate text-xs">{file.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div id="studyset-voice-memo" className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                      <p className="mb-2 text-sm font-medium">Voice memo</p>
                      <p className="mb-2 text-xs text-muted-foreground">Record quick spoken context and convert it to transcript automatically.</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isRecording ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => void startRecording()} disabled={!recordingSupported || isTranscribing}>
                            <Mic className="mr-1 h-4 w-4" />
                            Start recording
                          </Button>
                        ) : (
                          <Button type="button" variant="destructive" size="sm" onClick={() => void stopRecording()}>
                            <MicOff className="mr-1 h-4 w-4" />
                            Stop recording
                          </Button>
                        )}
                        {isTranscribing && <span className="text-xs text-muted-foreground">Transcribing...</span>}
                      </div>
                      <Textarea
                        value={voiceMemoText}
                        onChange={(event) => setVoiceMemoText(event.target.value)}
                        placeholder="Transcript will appear here..."
                        className="mt-2 min-h-[120px] border-[#d1d5db] bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div id="studyset-recents" className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Import from recents</p>
                      <Button type="button" size="sm" variant="outline" onClick={addSelectedRecentsToSources} disabled={selectedRecents.length === 0}>
                        Import selected
                      </Button>
                    </div>
                    {recentsLoading && <p className="text-xs text-muted-foreground">Loading recents...</p>}
                    {!recentsLoading && recents.length === 0 && <p className="text-xs text-muted-foreground">No recent materials found.</p>}
                    <div className="grid gap-2 md:grid-cols-2">
                      {recents.slice(0, 12).map((item) => {
                        const checked = selectedRecents.includes(item.id);
                        return (
                          <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-background p-2 hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setSelectedRecents((prev) =>
                                  event.target.checked ? [...prev, item.id] : prev.filter((value) => value !== item.id)
                                )
                              }
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium">{item.title}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{item.type}</span>
                              <span className="mt-1 block text-[11px] text-muted-foreground">{item.snippet || 'No preview available.'}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div ref={oneDriveSectionRef} className={`rounded-xl p-3 ${SOFT_SURFACE}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Import from OneDrive</p>
                      <span className="text-xs text-muted-foreground">{microsoftConnected ? (microsoftEmail || 'Connected') : 'Not connected'}</span>
                    </div>

                    <div className="mt-2 min-h-[110px]">
                      <p className="mb-2 text-xs text-muted-foreground">Connect once, then pick files. Your studyset draft remains saved across the auth redirect.</p>
                      <MicrosoftAppStrip returnTo="/tools/studyset?open=create&step=2" />
                    </div>
                    <div className="mt-2 rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">Selected OneDrive files</p>
                        {microsoftConnected && (
                          <Button type="button" variant="outline" size="sm" onClick={() => void loadMicrosoftSelectedFiles()}>
                            Refresh
                          </Button>
                        )}
                      </div>
                      {microsoftConnected && sortedOneDriveFiles.length === 0 && <p className="text-xs text-muted-foreground">No files selected yet.</p>}
                      {!microsoftConnected && <p className="text-xs text-muted-foreground">Connect Microsoft above to select files.</p>}
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {sortedOneDriveFiles.map((file) => (
                          <div key={file.id} className="rounded-lg border border-[#d1d5db] bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mb-2 flex h-12 items-center justify-center rounded-md bg-[#f1f5f9] dark:bg-zinc-800">
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

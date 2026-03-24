'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  FileText,
  ImageIcon,
  X,
  Loader2,
  Link2,
  Lightbulb,
  Sparkles,
  Mic,
  Captions,
  StopCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReactNode } from 'react';

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onImageDataUriChange?: (imageDataUri: string | null) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  toolId?: 'notes' | 'quiz' | 'flashcards';
  enableMic?: boolean;
  enableCaptions?: boolean;
  speechLanguage?: string;
  autoInsertCaptions?: boolean;
  enableBackendFallback?: boolean;
  sourceMergeMode?: 'append_labeled';
  topContent?: ReactNode;
}

type SourceKind = 'url' | 'file' | 'caption';

type SourceEntry = {
  id: string;
  kind: SourceKind;
  label: string;
  text: string;
  selected: boolean;
  loading?: boolean;
  error?: string;
  url?: string;
  urlKey?: string;
};

const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const appendLabeledBlock = (existing: string, _label: string, body: string) => {
  const cleanBody = body.trim();
  if (!cleanBody) return existing;
  const block = cleanBody;
  if (!existing.trim()) return block;
  return `${existing.trimEnd()}\n\n${block}`;
};

const formatTime = (epochMs?: number) => {
  if (!epochMs) return '--:--';
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const normalizeUrl = (raw: string): string | null => {
  const input = raw.trim();
  if (!input) return null;
  const candidate = /^(https?:)?\/\//i.test(input) ? input : `https://${input}`;
  try {
    const parsed = new URL(candidate);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const urlKey = (url: string) => url.replace(/\/$/, '').toLowerCase();

const cleanupCaptionText = (value: string) => {
  const normalized = value
    .replace(/\b(uh+|um+|erm+|like)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

  if (!normalized) return '';
  const withPeriod = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
};

const extractUrlsFromText = (text: string) => {
  const matches = Array.from(text.matchAll(URL_REGEX)).map((m) => m[0]);
  if (matches.length === 0) return { cleanedText: text, urls: [] as string[] };

  const cleanedText = text
    .replace(URL_REGEX, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trimStart();

  return { cleanedText, urls: matches };
};

export function SourceInput({
  value,
  onChange,
  onImageDataUriChange,
  onSubmit,
  placeholder = 'Enter your text here...',
  disabled = false,
  toolId,
  enableMic = true,
  enableCaptions = true,
  speechLanguage = 'en',
  autoInsertCaptions: _autoInsertCaptions = true,
  enableBackendFallback: _enableBackendFallback = true,
  sourceMergeMode = 'append_labeled',
  topContent,
}: SourceInputProps) {
  const { toast } = useToast();
  const micSessionIdRef = useRef<string>('');
  const micChunkCountRef = useRef(0);
  const micChunkBytesRef = useRef(0);
  const debugMic = useCallback((event: string, details?: Record<string, unknown>) => {
    const payload = {
      event,
      sessionId: micSessionIdRef.current || null,
      ts: new Date().toISOString(),
      ...details,
    };
    console.log('[MIC_DEBUG][CLIENT]', payload);

    // Mirror client mic logs to server so they appear in Vercel logs too.
    try {
      void fetch('/api/tools/mic-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Keep local flow resilient if debug logging fails.
    }
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackAudioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingSegmentsRef = useRef<string[]>([]);
  const restartAttemptsRef = useRef(0);
  const isFinalizingRecordingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastEmittedRef = useRef('');
  const integrationHydratedRef = useRef(false);

  const [manualText, setManualText] = useState('');
  const [sources, setSources] = useState<SourceEntry[]>([]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageDataUri, setUploadedImageDataUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [linksOpen, setLinksOpen] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [micError, setMicError] = useState<string | null>(null);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [isTranscribingFallback, setIsTranscribingFallback] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(false);

  useEffect(() => {
    isFinalizingRecordingRef.current = isFinalizingRecording;
  }, [isFinalizingRecording]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (value.trim()) setManualText(value);
  }, [value]);

  const hydrateIntegrationSources = useCallback(async (quiet = false) => {
    const response = await fetch('/api/integrations/context-sources?provider=microsoft&selected=1', {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const json = await response.json();
    const items = Array.isArray(json?.items) ? json.items : [];

    const mapped: SourceEntry[] = items.map((item: any) => {
      const appKey = String(item?.app || '').toLowerCase();
      const appLabel = appKey === 'powerpoint' ? 'PowerPoint' : appKey === 'onedrive' ? 'OneDrive' : 'Word';
      const name = String(item?.name || 'Untitled');
      const extracted = typeof item?.extracted_text === 'string' ? item.extracted_text.trim() : '';
      const webUrl = typeof item?.web_url === 'string' ? item.web_url : '';
      const lines = [`Microsoft ${appLabel} file: ${name}`];
      if (extracted) lines.push(extracted);
      if (webUrl) lines.push(`File URL: ${webUrl}`);
      return {
        id: `integration-${String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}`,
        kind: 'file',
        label: `MICROSOFT (${appLabel})`,
        text: lines.join('\n\n'),
        selected: true,
      };
    });

    setSources((prev) => {
      const localOnly = prev.filter((source) => !source.id.startsWith('integration-'));
      return [...localOnly, ...mapped];
    });

    if (!quiet) {
      toast({
        title: 'Microsoft sources ready',
        description: `${mapped.length} selected file${mapped.length === 1 ? '' : 's'} loaded.`,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (integrationHydratedRef.current) return;
    integrationHydratedRef.current = true;
    void hydrateIntegrationSources(true);
  }, [hydrateIntegrationSources]);

  useEffect(() => {
    const onUpdated = () => {
      void hydrateIntegrationSources(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('integration-sources-updated', onUpdated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('integration-sources-updated', onUpdated as EventListener);
      }
    };
  }, [hydrateIntegrationSources]);

  const compiledSource = useMemo(() => {
    let next = '';

    if (manualText.trim()) {
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, 'MANUAL_TEXT', manualText)
        : manualText;
    }

    for (const source of sources) {
      const body = source.text.trim() || source.url || '';
      if (!body) continue;
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, source.label, body)
        : body;
    }

    return next;
  }, [manualText, sourceMergeMode, sources]);

  useEffect(() => {
    if (compiledSource === lastEmittedRef.current) return;
    lastEmittedRef.current = compiledSource;
    onChange(compiledSource);
  }, [compiledSource, onChange]);

  useEffect(() => {
    onImageDataUriChange?.(uploadedImageDataUri);
  }, [onImageDataUriChange, uploadedImageDataUri]);

  const captionSources = useMemo(
    () => sources.filter((source) => source.kind === 'caption'),
    [sources]
  );

  const addSource = useCallback((entry: SourceEntry) => {
    setSources((prev) => [...prev, entry]);
  }, []);

  const upsertUrlSource = useCallback(async (rawUrl: string) => {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }
    setUrlInput(normalized);
    setLinksOpen(true);

    const host = new URL(normalized).hostname;
    const key = urlKey(normalized);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let inserted = false;

    setSources((prev) => {
      const exists = prev.some((s) => s.kind === 'url' && s.urlKey === key);
      if (exists) return prev;
      inserted = true;
      return [
        ...prev,
        {
          id,
          kind: 'url',
          label: `URL (${host})`,
          text: '',
          selected: true,
          loading: true,
          url: normalized,
          urlKey: key,
        },
      ];
    });

    if (!inserted) return;

    setIsFetchingUrl(true);
    try {
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });

      if (!res.ok) throw new Error('import_failed');

      const data = await res.json();
      const extracted = typeof data?.text === 'string' ? data.text.trim() : '';

      setSources((prev) => prev.map((s) => {
        if (s.id !== id) return s;
        if (!extracted) {
          return { ...s, loading: false, error: 'No readable text was found on this page.' };
        }
        return { ...s, text: extracted, loading: false, error: undefined };
      }));

      if (extracted) {
        toast({ title: 'Content imported', description: `Extracted text from ${host}` });
      }
    } catch {
      setSources((prev) => prev.map((s) => (
        s.id === id ? { ...s, loading: false, error: 'Could not fetch this URL right now.' } : s
      )));
      toast({ variant: 'destructive', title: 'Import failed', description: 'Could not fetch content from this URL.' });
    } finally {
      setIsFetchingUrl(false);
    }
  }, [toast]);

  const handleAddLink = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    await upsertUrlSource(raw);
    setUrlInput('');
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!supported.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Unsupported file type', description: 'Upload a PDF, DOCX, TXT, JPG, PNG or WebP file.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max file size is 10MB.' });
      return;
    }

    setUploadedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = typeof reader.result === 'string' ? reader.result : null;
        setUploadedImageDataUri(dataUri);
      };
      reader.onerror = () => setUploadedImageDataUri(null);
      reader.readAsDataURL(file);
    } else {
      setUploadedImageDataUri(null);
    }
    setIsProcessing(true);

    try {
      let extractedText = '';
      if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          extractedText = typeof data?.text === 'string' ? data.text : '';
        }
      }

      addSource({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'file',
        label: `FILE (${file.name})`,
        text: file.type.startsWith('image/')
          ? [extractedText ? extractedText : '', `Attached image file: ${file.name} (${file.type || 'image'})`].filter(Boolean).join('\n\n')
          : extractedText,
        selected: true,
        error: extractedText.trim() ? undefined : 'Could not extract text automatically.',
      });

      if (!extractedText.trim()) {
        toast({ title: 'File added', description: 'File was added, but text extraction returned empty.' });
      }
    } catch {
      addSource({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'file',
        label: `FILE (${file.name})`,
        text: '',
        selected: true,
        error: 'Could not extract text automatically.',
      });
      toast({ title: 'File added', description: 'Could not extract text automatically.' });
    } finally {
      setIsProcessing(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  const appendRecordingSegment = useCallback((text: string) => {
    const clean = normalizeText(text);
    if (!clean) return;
    const prev = recordingSegmentsRef.current[recordingSegmentsRef.current.length - 1];
    if (prev && prev.toLowerCase() === clean.toLowerCase()) {
      return;
    }
    recordingSegmentsRef.current = [...recordingSegmentsRef.current, clean];
  }, []);

  const beginRecordingSession = useCallback(() => {
    micSessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    micChunkCountRef.current = 0;
    micChunkBytesRef.current = 0;
    restartAttemptsRef.current = 0;
    recordingStartedAtRef.current = Date.now();
    recordingSegmentsRef.current = [];
    setIsFinalizingRecording(false);
    debugMic('recording_session_started', {
      speechLanguage,
      enableMic,
      enableCaptions,
      manualTextLength: manualText.length,
      sourceCount: sources.length,
    });
  }, [debugMic, enableCaptions, enableMic, manualText.length, sources.length, speechLanguage]);

  const finalizeRecordingSession = useCallback(() => {
    const joined = normalizeText(recordingSegmentsRef.current.join(' '));
    const captionText = cleanupCaptionText(joined);
    const start = recordingStartedAtRef.current ?? Date.now();
    const end = Date.now();

    recordingStartedAtRef.current = null;
    recordingSegmentsRef.current = [];
    debugMic('recording_session_finalize', {
      joinedLength: joined.length,
      captionLength: captionText.length,
      chunks: micChunkCountRef.current,
      chunkBytes: micChunkBytesRef.current,
      start,
      end,
      durationMs: end - start,
    });

    if (!captionText) {
      setMicError('No speech was detected in the recording.');
      debugMic('recording_session_no_speech');
      return;
    }

    const captionSource: SourceEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'caption',
      label: `CAPTION (${formatTime(start)}-${formatTime(end)})`,
      text: captionText,
      selected: true,
    };

    setSources((prev) => [...prev, captionSource]);
    setManualText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${captionText}` : captionText));
    debugMic('recording_session_caption_inserted', {
      captionSourceId: captionSource.id,
      captionPreview: captionText.slice(0, 100),
    });
  }, [debugMic]);

  const cleanupFallbackStream = useCallback(() => {
    const stream = fallbackStreamRef.current;
    fallbackStreamRef.current = null;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }, []);

  const transcribeFallbackAudio = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      debugMic('transcribe_skipped_empty_blob');
      return;
    }
    setIsTranscribingFallback(true);
    const transcribeStartedAt = Date.now();
    debugMic('transcribe_started', {
      blobType: blob.type,
      blobSize: blob.size,
      speechLanguage,
    });
    try {
      const fileExt = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `speech.${fileExt}`, { type: blob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', speechLanguage);

      const response = await fetch('/api/tools/transcribe', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      debugMic('transcribe_response', {
        ok: response.ok,
        status: response.status,
        durationMs: Date.now() - transcribeStartedAt,
        payloadKeys: Object.keys(payload || {}),
        textLength: typeof payload?.text === 'string' ? payload.text.length : 0,
        error: payload?.error || null,
      });
      if (!response.ok) {
        throw new Error(payload?.error || 'Transcription failed');
      }

      const text = normalizeText(payload?.text || '');
      if (text) {
        appendRecordingSegment(text);
        debugMic('transcribe_text_received', {
          normalizedLength: text.length,
          normalizedPreview: text.slice(0, 120),
        });
        finalizeRecordingSession();
      } else {
        setMicError('No speech was detected in the recording.');
        debugMic('transcribe_no_text');
      }
    } catch (error: any) {
      setMicError(error?.message || 'Could not transcribe fallback audio.');
      debugMic('transcribe_error', {
        message: error?.message || null,
        durationMs: Date.now() - transcribeStartedAt,
      });
      toast({
        variant: 'destructive',
        title: 'Transcription error',
        description: error?.message || 'Could not transcribe fallback audio.',
      });
    } finally {
      setIsTranscribingFallback(false);
      setIsFinalizingRecording(false);
      debugMic('transcribe_finished', {
        durationMs: Date.now() - transcribeStartedAt,
      });
    }
  }, [appendRecordingSegment, debugMic, finalizeRecordingSession, speechLanguage, toast]);

  const startFallbackRecording = useCallback(async () => {
    if (isFallbackRecording) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setMicError('Microphone is unavailable in this environment.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError('Browser does not support audio recording fallback.');
      return;
    }

    try {
      debugMic('media_devices_request_start');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fallbackStreamRef.current = stream;
      fallbackAudioChunksRef.current = [];
      for (const track of stream.getAudioTracks()) {
        track.onended = () => {
          debugMic('audio_track_ended', { label: track.label, readyState: track.readyState });
        };
        track.onmute = () => {
          debugMic('audio_track_muted', { label: track.label, readyState: track.readyState });
        };
        track.onunmute = () => {
          debugMic('audio_track_unmuted', { label: track.label, readyState: track.readyState });
        };
      }
      debugMic('media_devices_request_success', {
        audioTracks: stream.getAudioTracks().length,
        trackLabels: stream.getAudioTracks().map((t) => t.label || 'unknown'),
      });

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data?.size) {
          fallbackAudioChunksRef.current.push(event.data);
          micChunkCountRef.current += 1;
          micChunkBytesRef.current += event.data.size;
          debugMic('recorder_chunk', {
            chunkIndex: micChunkCountRef.current,
            size: event.data.size,
            totalBytes: micChunkBytesRef.current,
            recorderState: recorder.state,
          });
        }
      };

      recorder.onerror = (event) => {
        setMicError('Audio recording failed.');
        debugMic('recorder_error', {
          recorderState: recorder.state,
          eventType: event.type,
        });
      };

      recorder.onstop = async () => {
        const blob = new Blob(fallbackAudioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const recordingDurationMs = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : null;
        const unexpectedEarlyStop =
          !isFinalizingRecordingRef.current &&
          (blob.size === 0 || micChunkCountRef.current === 0) &&
          !!recordingDurationMs &&
          recordingDurationMs < 3000;
        debugMic('recorder_stopped', {
          recorderMimeType: recorder.mimeType,
          finalBlobType: blob.type,
          finalBlobBytes: blob.size,
          chunks: micChunkCountRef.current,
          totalChunkBytes: micChunkBytesRef.current,
          recordingDurationMs,
          expectedStop: isFinalizingRecordingRef.current,
          unexpectedEarlyStop,
        });
        fallbackAudioChunksRef.current = [];

        if (unexpectedEarlyStop && restartAttemptsRef.current < 1) {
          restartAttemptsRef.current += 1;
          debugMic('recorder_auto_restart', { attempt: restartAttemptsRef.current });
          cleanupFallbackStream();
          setIsFallbackRecording(false);
          setTimeout(() => {
            void startFallbackRecording();
          }, 180);
          return;
        }

        await transcribeFallbackAudio(blob);
        cleanupFallbackStream();
      };

      fallbackRecorderRef.current = recorder;
      setIsFallbackRecording(true);
      debugMic('recorder_start', {
        recorderMimeType: recorder.mimeType,
        preferredMime,
      });
      recorder.start(250);
    } catch (error: any) {
      cleanupFallbackStream();
      setMicError(error?.message || 'Could not access microphone for fallback recording.');
      setIsFinalizingRecording(false);
      debugMic('media_devices_request_error', {
        message: error?.message || null,
      });
    }
  }, [cleanupFallbackStream, debugMic, isFallbackRecording, transcribeFallbackAudio]);

  const stopFallbackRecording = useCallback(() => {
    const recorder = fallbackRecorderRef.current;
    fallbackRecorderRef.current = null;
    if (!recorder) {
      cleanupFallbackStream();
      setIsFallbackRecording(false);
      return;
    }

    if (recorder.state !== 'inactive') {
      debugMic('recorder_stop_requested', { recorderState: recorder.state });
      recorder.stop();
    } else {
      cleanupFallbackStream();
      debugMic('recorder_already_inactive');
    }
    setIsFallbackRecording(false);
  }, [cleanupFallbackStream, debugMic]);

  const stopListening = useCallback(() => {
    const wasListening = isFallbackRecording;
    if (!wasListening) return;

    setIsFinalizingRecording(true);
    debugMic('stop_listening');
    stopFallbackRecording();
  }, [debugMic, isFallbackRecording, stopFallbackRecording]);

  const startListening = useCallback(() => {
    setMicError(null);
    debugMic('start_listening');
    beginRecordingSession();
    void startFallbackRecording();
  }, [beginRecordingSession, debugMic, startFallbackRecording]);

  useEffect(() => {
    return () => {
      const recorder = fallbackRecorderRef.current;
      fallbackRecorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // no-op during teardown
        }
      }
      cleanupFallbackStream();
    };
  }, [cleanupFallbackStream]);

  const updateSourceText = (id: string, text: string) => {
    setSources((prev) => prev.map((source) => (
      source.id === id ? { ...source, text } : source
    )));
  };

  const handleManualTextChange = (raw: string) => {
    const { cleanedText, urls } = extractUrlsFromText(raw);
    setManualText(cleanedText);
    if (uploadedFile) {
      setUploadedFile(null);
      setUploadedImageDataUri(null);
    }

    if (urls.length > 0) {
      setLinksOpen(true);
      void Promise.all(urls.map((u) => upsertUrlSource(u)));
    }
  };

  const isImage = uploadedFile?.type.startsWith('image/');
  const wordCount = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;
  const charCount = manualText.length;
  const canGenerate = compiledSource.trim().length > 0;

  const tips = [
    'Paste lecture notes, textbook chapters, or articles',
    'Upload a PDF, DOCX, or image with text',
    'Paste links in text and they are auto-imported',
    'Use Mic and captions are auto-added while recording',
  ];

  return (
    <div
      className="h-full flex flex-col gap-3 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {captionsOpen && (
        <div className="absolute right-0 top-0 z-20 h-full w-[360px] border bg-background p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">Captions</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCaptionsOpen(false)}>Close</Button>
          </div>

          {captionSources.length === 0 ? (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              No captions yet. Record with Mic and each finished recording appears here.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {captionSources.map((caption) => (
                  <div key={caption.id} className="rounded-md border p-2 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">{caption.label}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-5 w-5 shrink-0"
                        onClick={() => removeSource(caption.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={caption.text}
                      onChange={(e) => {
                        updateSourceText(caption.id, e.target.value);
                      }}
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-start pt-1">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 text-foreground/70">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="font-medium">Tips {toolId ? `(${toolId})` : ''}</span>
          </div>
          {tips.map((tip, i) => (
            <p key={i} className="pl-5">- {tip}</p>
          ))}
        </div>
      </div>

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{uploadedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-4 w-4 shrink-0"
            onClick={() => {
              setUploadedFile(null);
              setUploadedImageDataUri(null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="mt-auto flex gap-2 items-stretch">
        <div className="flex-1 flex flex-col gap-2">
          {topContent && <div className="pb-1">{topContent}</div>}

          {linksOpen && (
            <div className="flex items-center gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAddLink(); }}
                placeholder="Paste a link and press Enter"
                className="flex-1 border border-sidebar-border rounded-full bg-sidebar-accent/65 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                disabled={isFetchingUrl}
              />
              <Button variant="outline" size="sm" onClick={() => void handleAddLink()} disabled={isFetchingUrl || !urlInput.trim()} className="rounded-full border-sidebar-border bg-sidebar-accent/70 text-xs h-7 px-3 hover:bg-sidebar-accent">
                {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
              </Button>
            </div>
          )}

          <Textarea
            value={manualText}
            onChange={(e) => handleManualTextChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onSubmit?.();
              }
            }}
            placeholder={placeholder}
            className="min-h-[170px] resize-none text-sm flex-1 rounded-2xl border border-border bg-muted/70"
            disabled={disabled || isProcessing}
          />

          {charCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums pl-1">
              {wordCount} words - {charCount} chars
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 w-[100px] shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs rounded-full flex-col h-auto py-3 border-border bg-muted/80 hover:bg-muted"
            onClick={() => setLinksOpen((prev) => !prev)}
            disabled={disabled || isProcessing}
          >
            <Link2 className="h-4 w-4" />
            Links
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs rounded-full flex-col h-auto py-3 border-border bg-muted/80 hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload
          </Button>
          {enableMic && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5 text-xs rounded-full flex-col h-auto py-3 border-border bg-muted/80 hover:bg-muted"
              onClick={() => (isFallbackRecording ? stopListening() : startListening())}
              disabled={disabled || isProcessing || !enableMic}
            >
              {isFallbackRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              Mic
            </Button>
          )}
          {enableCaptions && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5 text-xs rounded-full flex-col h-auto py-3 border-border bg-muted/80 hover:bg-muted"
              onClick={() => setCaptionsOpen((prev) => !prev)}
              disabled={disabled || !enableCaptions}
            >
              <Captions className="h-4 w-4" />
              Captions
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs rounded-full flex-col h-auto py-3 border-border bg-muted/80 hover:bg-muted"
            onClick={() => onSubmit?.()}
            disabled={disabled || isProcessing || !canGenerate}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />
    </div>
  );
}

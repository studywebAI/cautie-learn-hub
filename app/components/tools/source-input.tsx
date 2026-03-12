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
  WandSparkles,
  Circle,
  CircleDot,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  toolId?: 'notes' | 'quiz' | 'flashcards';
  enableMic?: boolean;
  enableCaptions?: boolean;
  sourceMergeMode?: 'append_labeled';
}

type TranscriptChunk = {
  id: string;
  text: string;
  startedAt?: number;
  endedAt?: number;
  selected: boolean;
};

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

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ||
    null
  );
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const appendLabeledBlock = (existing: string, label: string, body: string) => {
  const cleanBody = body.trim();
  if (!cleanBody) return existing;
  const block = `### SOURCE: ${label}\n${cleanBody}`;
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
  onSubmit,
  placeholder = 'Enter your text here...',
  disabled = false,
  toolId,
  enableMic = true,
  enableCaptions = true,
  sourceMergeMode = 'append_labeled',
}: SourceInputProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const chunkStartedAtRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const lastEmittedRef = useRef('');

  const [manualText, setManualText] = useState('');
  const [manualSelected, setManualSelected] = useState(true);
  const [sources, setSources] = useState<SourceEntry[]>([]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [linksOpen, setLinksOpen] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported] = useState(Boolean(getSpeechRecognitionConstructor()));
  const [interimTranscript, setInterimTranscript] = useState('');
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [captionsOpen, setCaptionsOpen] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (value.trim()) setManualText(value);
  }, [value]);

  const compiledSource = useMemo(() => {
    let next = '';

    if (manualSelected && manualText.trim()) {
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, 'MANUAL_TEXT', manualText)
        : manualText;
    }

    for (const source of sources) {
      if (!source.selected) continue;
      const body = source.text.trim() || source.url || '';
      if (!body) continue;
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, source.label, body)
        : body;
    }

    return next;
  }, [manualSelected, manualText, sourceMergeMode, sources]);

  useEffect(() => {
    if (compiledSource === lastEmittedRef.current) return;
    lastEmittedRef.current = compiledSource;
    onChange(compiledSource);
  }, [compiledSource, onChange]);

  const hasSelectedChunks = useMemo(() => chunks.some((chunk) => chunk.selected), [chunks]);
  const selectedChunks = useMemo(() => chunks.filter((chunk) => chunk.selected), [chunks]);

  const addSource = useCallback((entry: SourceEntry) => {
    setSources((prev) => [...prev, entry]);
  }, []);

  const upsertUrlSource = useCallback(async (rawUrl: string) => {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }

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

  const toggleSourceSelected = (id: string, selected: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, selected } : s)));
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
        text: extractedText,
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

  const pushChunk = (text: string) => {
    const clean = normalizeText(text);
    if (!clean) return;
    const startedAt = chunkStartedAtRef.current ?? Date.now();
    const endedAt = Date.now();
    chunkStartedAtRef.current = endedAt;

    setChunks((prev) => [
      ...prev,
      {
        id: `${endedAt}-${Math.random().toString(36).slice(2, 8)}`,
        text: clean,
        startedAt,
        endedAt,
        selected: true,
      },
    ]);
  };

  const stopListening = () => {
    keepListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    try { recognition.onresult = null; } catch {}
    try { recognition.onerror = null; } catch {}
    try { recognition.onend = null; } catch {}
    try { recognition.stop(); } catch {}
    try { recognition.abort(); } catch {}
  };

  useEffect(() => {
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    if (isListening) return;
    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      toast({ variant: 'destructive', title: 'Microphone unavailable', description: 'Use a Chromium browser for speech recognition.' });
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';
    keepListeningRef.current = true;
    setIsListening(true);
    chunkStartedAtRef.current = Date.now();

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript || '';
        if (result?.isFinal) pushChunk(text);
        else interim = normalizeText(text);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || 'unknown';
      if (err !== 'no-speech') {
        toast({ variant: 'destructive', title: 'Microphone error', description: `Speech recognition error: ${err}` });
      }
    };

    recognition.onend = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        keepListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      keepListeningRef.current = false;
      toast({ variant: 'destructive', title: 'Microphone unavailable', description: 'Could not start listening.' });
    }
  };

  const insertSelectedCaptions = (replaceAll = false) => {
    if (selectedChunks.length === 0) return;

    const start = selectedChunks[0]?.startedAt;
    const end = selectedChunks[selectedChunks.length - 1]?.endedAt;
    const block = selectedChunks.map((chunk) => chunk.text).join('\n');

    const captionSource: SourceEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'caption',
      label: `CAPTION (${formatTime(start)}-${formatTime(end)})`,
      text: block,
      selected: true,
    };

    if (replaceAll) {
      setManualText('');
      setManualSelected(false);
      setSources([captionSource]);
      return;
    }

    setSources((prev) => [...prev, captionSource]);
  };

  const cleanSelectedCaptions = () => {
    setChunks((prev) => prev.map((chunk) => (
      chunk.selected ? { ...chunk, text: cleanupCaptionText(chunk.text) } : chunk
    )));
  };

  const handleManualTextChange = (raw: string) => {
    const { cleanedText, urls } = extractUrlsFromText(raw);
    setManualText(cleanedText);
    if (uploadedFile) setUploadedFile(null);

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
    'Use Mic, then pick caption chunks to include',
  ];

  return (
    <div
      className="h-full flex flex-col gap-3 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {captionsOpen && (
        <div className="absolute right-0 top-0 z-20 h-full w-[360px] border bg-background shadow-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">Captions</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCaptionsOpen(false)}>Close</Button>
          </div>

          {chunks.length === 0 ? (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              No captions yet. Start Mic, then choose chunks to insert.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setChunks((prev) => prev.map((c) => ({ ...c, selected: true })))}>Select all</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setChunks((prev) => prev.map((c) => ({ ...c, selected: false })))}>Clear</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" disabled={!hasSelectedChunks} onClick={cleanSelectedCaptions}>
                  <WandSparkles className="h-3 w-3 mr-1" />
                  Clean selected
                </Button>
              </div>

              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="rounded-md border p-2 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={chunk.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setChunks((prev) => prev.map((c) => c.id === chunk.id ? { ...c, selected: checked } : c));
                        }}
                      />
                      <p className="text-muted-foreground">{formatTime(chunk.startedAt)} - {formatTime(chunk.endedAt)}</p>
                    </div>
                    <Textarea
                      value={chunk.text}
                      onChange={(e) => {
                        const next = e.target.value;
                        setChunks((prev) => prev.map((c) => c.id === chunk.id ? { ...c, text: next } : c));
                      }}
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="h-8 text-xs" disabled={!hasSelectedChunks} onClick={() => insertSelectedCaptions(false)}>Insert selected</Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={!hasSelectedChunks} onClick={() => insertSelectedCaptions(true)}>Replace source</Button>
              </div>
            </>
          )}
        </div>
      )}

      {!manualText && sources.length === 0 && (
        <div className="flex items-start pt-2">
          <div className="space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="font-medium">Tips {toolId ? `(${toolId})` : ''}</span>
            </div>
            {tips.map((tip, i) => (
              <p key={i} className="pl-5">- {tip}</p>
            ))}
          </div>
        </div>
      )}

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{uploadedFile.name}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-4 w-4 shrink-0" onClick={() => setUploadedFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-stretch">
        <div className="flex-1 flex flex-col gap-2">
          {linksOpen && (
            <div className="flex items-center gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAddLink(); }}
                placeholder="Paste a link and press Enter"
                className="flex-1 bg-background border rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                disabled={isFetchingUrl}
              />
              <Button size="sm" onClick={() => void handleAddLink()} disabled={isFetchingUrl || !urlInput.trim()} className="rounded-full text-xs h-7 px-3">
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
            className="min-h-[200px] resize-none text-sm flex-1"
            disabled={disabled || isProcessing}
          />

          <div className="rounded-md border p-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Included sources</p>
              <span className="text-[10px] text-muted-foreground">{sources.filter((s) => s.selected).length + (manualSelected && manualText.trim() ? 1 : 0)} selected</span>
            </div>

            <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setManualSelected((v) => !v)}
              >
                {manualSelected ? <CircleDot className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </button>
              <span className="font-medium">MANUAL_TEXT</span>
              <span className="text-muted-foreground ml-auto">{wordCount} words</span>
            </div>

            <div className="max-h-[140px] overflow-auto space-y-1 pr-1">
              {sources.length === 0 && (
                <p className="text-xs text-muted-foreground px-1 py-1">No additional sources yet.</p>
              )}
              {sources.map((source) => (
                <div key={source.id} className="flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground mt-0.5"
                    onClick={() => toggleSourceSelected(source.id, !source.selected)}
                  >
                    {source.selected ? <CircleDot className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{source.label}</p>
                    {source.loading && <p className="text-muted-foreground">Importing...</p>}
                    {source.error && <p className="text-red-400">{source.error}</p>}
                    {!source.loading && !source.error && (
                      <p className="text-muted-foreground truncate">{source.text.slice(0, 90) || source.url}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={() => removeSource(source.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {charCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums pl-1">
              {wordCount} words - {charCount} chars
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 w-[100px] shrink-0">
          <Button
            type="button"
            variant={linksOpen ? 'secondary' : 'outline'}
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={() => setLinksOpen((prev) => !prev)}
            disabled={disabled || isProcessing}
          >
            <Link2 className="h-4 w-4" />
            Links
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload
          </Button>
          <Button
            type="button"
            variant={isListening ? 'secondary' : 'outline'}
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={() => (isListening ? stopListening() : startListening())}
            disabled={disabled || isProcessing || !enableMic || !isSpeechSupported}
          >
            {isListening ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            Mic
          </Button>
          <Button
            type="button"
            variant={captionsOpen ? 'secondary' : 'outline'}
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={() => setCaptionsOpen((prev) => !prev)}
            disabled={disabled || !enableCaptions}
          >
            <Captions className="h-4 w-4" />
            Captions
          </Button>
          <Button
            type="button"
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={() => onSubmit?.()}
            disabled={disabled || isProcessing || !canGenerate}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      {isListening && (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Listening{interimTranscript ? `: ${interimTranscript}` : '...'}
        </div>
      )}

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

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, ImageIcon, X, Loader2, Link2, Lightbulb, Sparkles, Mic, Captions, StopCircle } from 'lucide-react';
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
  const valueRef = useRef(value);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported] = useState(Boolean(getSpeechRecognitionConstructor()));
  const [interimTranscript, setInterimTranscript] = useState('');
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [captionsOpen, setCaptionsOpen] = useState(false);

  const hasSelectedChunks = useMemo(() => chunks.some((chunk) => chunk.selected), [chunks]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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
  const appendSource = (label: string, text: string, replace = false) => {
    const base = replace ? '' : valueRef.current;
    const next = sourceMergeMode === 'append_labeled'
      ? appendLabeledBlock(base, label, text)
      : text;
    onChange(next);
  };

      if (file.type === 'text/plain') {
        const text = await file.text();
        appendSource(`FILE (${file.name})`, text);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.text) appendSource(`FILE (${file.name})`, data.text);
          else toast({ title: 'File uploaded', description: 'Could not extract text. Enter text manually.' });
        } else {
          toast({ title: 'File uploaded', description: 'Text extraction unavailable. Enter text manually.' });
        }
      }
    } catch {
      toast({ title: 'File uploaded', description: 'Could not extract text automatically.' });
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

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) return;

    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }

    setIsFetchingUrl(true);
    try {
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.startsWith('http') ? url : `https://${url}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const resolvedUrl = url.startsWith('http') ? url : `https://${url}`;
          const host = new URL(resolvedUrl).hostname;
          const next = sourceMergeMode === 'append_labeled'
            ? appendLabeledBlock(value, `URL (${host})`, data.text)
            : data.text;
          onChange(next);
          setUrlInput('');
          toast({ title: 'Content imported', description: `Extracted text from ${host}` });
        } else {
          toast({ variant: 'destructive', title: 'No content found', description: 'Could not extract text from this URL.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Import failed', description: 'Could not fetch content from this URL.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Import failed', description: 'Network error fetching URL.' });
    } finally {
      setIsFetchingUrl(false);
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
    // Live append so Mic action is visibly functional without requiring manual insert.
    appendSource(`CAPTION (${formatTime(startedAt)}-${formatTime(endedAt)})`, clean);
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
    return () => {
      stopListening();
    };
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

  const selectedChunks = chunks.filter((chunk) => chunk.selected);

  const applySelectedCaptions = (replace = false) => {
    if (selectedChunks.length === 0) return;
    const start = selectedChunks[0]?.startedAt;
    const end = selectedChunks[selectedChunks.length - 1]?.endedAt;
    const block = selectedChunks.map((chunk) => chunk.text).join('\n');
    const label = `CAPTION (${formatTime(start)}-${formatTime(end)})`;
    appendSource(label, block, replace);
  };

  const isImage = uploadedFile?.type.startsWith('image/');
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const tips = [
    'Paste lecture notes, textbook chapters, or articles',
    'Upload a PDF, DOCX, or image with text',
    'Import content from any URL',
    'Even a single sentence works - more text = richer output',
  ];

  return (
    <div
      className="h-full flex flex-col gap-3 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {captionsOpen && (
        <div className="absolute right-0 top-0 z-20 h-full w-[320px] border bg-background shadow-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">Captions</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCaptionsOpen(false)}>Close</Button>
          </div>
          {chunks.length === 0 ? (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              No captions yet. Start Mic and speak to record chunks.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setChunks((prev) => prev.map((c) => ({ ...c, selected: true })))}>Select all</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setChunks((prev) => prev.map((c) => ({ ...c, selected: false })))}>Clear</Button>
              </div>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {chunks.map((chunk) => (
                  <label key={chunk.id} className="flex gap-2 rounded-md border p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={chunk.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setChunks((prev) => prev.map((c) => c.id === chunk.id ? { ...c, selected: checked } : c));
                      }}
                    />
                    <div className="space-y-1">
                      <p className="text-muted-foreground">{formatTime(chunk.startedAt)} - {formatTime(chunk.endedAt)}</p>
                      <p>{chunk.text}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="h-8 text-xs" disabled={!hasSelectedChunks} onClick={() => applySelectedCaptions(false)}>Insert selected</Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" disabled={!hasSelectedChunks} onClick={() => applySelectedCaptions(true)}>Replace source</Button>
              </div>
            </>
          )}
        </div>
      )}
      {/* Tips area - top */}
      {!value && (
        <div className="flex items-start pt-2">
          <div className="space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="font-medium">Tips</span>
            </div>
            {tips.map((tip, i) => (
              <p key={i} className="pl-5">- {tip}</p>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded file chip */}
      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{uploadedFile.name}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-4 w-4 shrink-0" onClick={() => setUploadedFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Bottom input area: textarea left + action buttons right */}
      <div className="flex gap-2 items-stretch">
        {/* Textarea - takes most width */}
        <div className="flex-1 flex flex-col gap-1.5">
          <Textarea
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (uploadedFile) setUploadedFile(null);
            }}
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
          {charCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums pl-1">
              {wordCount} words · {charCount} chars
            </span>
          )}
        </div>

        {/* Right side action buttons - stacked vertically */}
        <div className="flex flex-col gap-2 w-[100px] shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs rounded-lg flex-col h-auto py-3"
            onClick={handleUrlImport}
            disabled={disabled || isProcessing || isFetchingUrl || !urlInput.trim()}
          >
            <Link2 className="h-4 w-4" />
            URL
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
            disabled={disabled || isProcessing || !value.trim()}
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

      <div className="flex items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); }}
          placeholder="https://example.com/article"
          className="flex-1 bg-background border rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          disabled={isFetchingUrl}
        />
        <Button size="sm" onClick={handleUrlImport} disabled={isFetchingUrl || !urlInput.trim()} className="rounded-full text-xs h-7 px-3">
          {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
        </Button>
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

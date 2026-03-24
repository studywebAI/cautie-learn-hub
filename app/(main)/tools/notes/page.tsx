'use client';

import { Suspense } from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles, Paintbrush, Mic, Square, WandSparkles, CircleSlash2, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { notesToMarkdown, notesToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseNotesFromMarkdown, parseNotesFromHtml } from '@/lib/import-parsers';
import { AppContext } from '@/contexts/app-context';
import { getToolStrings } from '@/lib/tool-i18n';
import { PaintOverlay } from '@/components/tools/paint-overlay';
import { TextHighlighterToolbar } from '@/components/tools/text-highlighter';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

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

const normalizeTranscriptSegment = (value: string) => value.replace(/\s+/g, ' ').trim();

const isLikelyLyricNoise = (segment: string) => {
  const cleaned = segment.trim().toLowerCase();
  if (!cleaned) return true;

  // Repetitive short lines are often music/hooks or crowd noise.
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 4 && words.length <= 9) {
    const uniqueWordRatio = new Set(words).size / words.length;
    if (uniqueWordRatio < 0.55) return true;
  }

  // Singing artifacts / non-lexical vocalizations.
  if (/(la\s+la|na\s+na|oh\s+oh|woo+|mmm+|hmm+)/.test(cleaned)) return true;
  return false;
};

const shouldSuppressAsInterruption = (segment: string) => {
  const cleaned = segment.trim().toLowerCase();
  if (!cleaned) return true;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const shortQuestion = words.length <= 7 && (cleaned.endsWith('?') || cleaned.startsWith('wait') || cleaned.startsWith('what'));
  const handRaiseNoise = /^((uh|um|hmm|yeah|yes|no)\b[\s,!?.]*){1,3}$/.test(cleaned);
  return shortQuestion || handRaiseNoise;
};

const cleanTranscriptSegment = (segment: string) => {
  const cleaned = normalizeTranscriptSegment(segment)
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1');

  if (!cleaned) return '';
  if (isLikelyLyricNoise(cleaned)) return '';

  // Strip obvious stutter repeats: "the the the concept" -> "the concept"
  const words = cleaned.split(' ');
  const deduped: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (i > 0 && words[i - 1].toLowerCase() === w.toLowerCase()) continue;
    deduped.push(w);
  }
  return deduped.join(' ').trim();
};

const appendTranscript = (existing: string, nextSegment: string) => {
  const next = normalizeTranscriptSegment(nextSegment);
  if (!next) return existing;
  return existing ? `${existing} ${next}` : next;
};

function NotesPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const { run: savedRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const t = getToolStrings(language);

  const [sourceText, setSourceText] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState('structured');
  const [audience, setAudience] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput['notes'] | null>(null);
  const [liveDraftNotes, setLiveDraftNotes] = useState<GenerateNotesOutput['notes'] | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [paintActive, setPaintActive] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listenError, setListenError] = useState<string | null>(null);
  const [lectureFocus, setLectureFocus] = useState(true);
  const [autoDraftEnabled, setAutoDraftEnabled] = useState(true);
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [inputMode, setInputMode] = useState<'text-files' | 'links' | 'listen'>('text-files');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const lectureFocusRef = useRef(true);
  const autoDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoDraftAtRef = useRef(0);
  const lastAutoDraftLengthRef = useRef(0);
  const lastAcceptedChunkRef = useRef('');
  const { toast } = useToast();

  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedNotes((output.notes || null) as GenerateNotesOutput['notes'] | null);
    }
  }, [savedRun]);

  useEffect(() => {
    lectureFocusRef.current = lectureFocus;
  }, [lectureFocus]);

  useEffect(() => {
    setIsSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.notes.${k}`);
    if (s('length') === 'short' || s('length') === 'medium' || s('length') === 'long') setLength(s('length') as any);
    if (s('style')) setStyle(s('style')!);
    if (s('audience')) setAudience(s('audience')!);

    const cachedTranscript = localStorage.getItem('tools.notes.liveTranscript');
    if (cachedTranscript) {
      setLiveTranscript(cachedTranscript);
      setSourceText(cachedTranscript);
      lastAutoDraftLengthRef.current = cachedTranscript.length;
    }
  }, []);

  useEffect(() => {
    if (!liveTranscript.trim()) {
      localStorage.removeItem('tools.notes.liveTranscript');
      return;
    }
    localStorage.setItem('tools.notes.liveTranscript', liveTranscript);
  }, [liveTranscript]);

  const runNotesGeneration = useCallback(async (inputText: string, options?: { background?: boolean }) => {
    const text = inputText.trim();
    if (!text) return null;

    const background = options?.background === true;
    if (background) setIsAutoDrafting(true);
    else setIsLoading(true);

    try {
      const run = await runToolFlowV2({
        toolId: 'notes',
        flowName: 'generateNotes',
        mode: style,
        artifactType: 'notes',
        artifactTitle: customTitle.trim() || 'Generated Notes',
        input: {
          sourceText: text,
          length,
          style,
          modePack: 'core',
          outputFocus: 'clarity',
          tone: 'neutral',
          audience,
          imageDataUri: imageDataUri || undefined,
          highlightTitles: false,
          fontFamily: 'default',
        },
      });
      const notes = (run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null;
      if (background) setLiveDraftNotes(notes);
      else setGeneratedNotes(notes);
      return notes;
    } catch (error: any) {
      if (!background) {
        toast({ variant: 'destructive', title: t.notes.generatingTitle, description: error?.message || 'Unable to generate notes' });
      }
      return null;
    } finally {
      if (background) setIsAutoDrafting(false);
      else setIsLoading(false);
    }
  }, [audience, customTitle, imageDataUri, length, style, t.notes.generatingTitle, toast]);

  const stopListening = useCallback(async (options?: { finalize?: boolean }) => {
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
    const shouldFinalize = options?.finalize !== false;
    const finalText = (liveTranscript || sourceText).trim();
    if (shouldFinalize && finalText.length > 40) {
      await runNotesGeneration(finalText, { background: false });
    }
  }, [liveTranscript, runNotesGeneration, sourceText]);

  const startListening = useCallback(() => {
    if (isListening) return;

    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      setListenError('Speech recognition is not supported in this browser.');
      toast({ variant: 'destructive', title: 'Listen mode unavailable', description: 'Use a Chromium browser and allow microphone access.' });
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language === 'nl' ? 'nl-NL' : 'en-US';

    keepListeningRef.current = true;
    setListenError(null);
    setInterimTranscript('');
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = normalizeTranscriptSegment(result?.[0]?.transcript || '');
        if (!text) continue;

        if (result?.isFinal) {
          const pieces = text
            .split(/(?<=[.!?])\s+/)
            .map((piece: string) => normalizeTranscriptSegment(piece))
            .filter(Boolean);

          const accepted = (lectureFocusRef.current
            ? pieces.filter((piece: string) => !shouldSuppressAsInterruption(piece))
            : pieces)
            .map((piece: string) => cleanTranscriptSegment(piece))
            .filter(Boolean)
            .filter((piece: string) => piece !== lastAcceptedChunkRef.current);

          if (accepted.length > 0) {
            lastAcceptedChunkRef.current = accepted[accepted.length - 1];
            finalChunk = appendTranscript(finalChunk, accepted.join(' '));
          }
        } else {
          interimChunk = appendTranscript(interimChunk, text);
        }
      }

      setInterimTranscript(interimChunk);
      if (finalChunk) {
        setLiveTranscript((prev) => appendTranscript(prev, finalChunk));
        setSourceText((prev) => appendTranscript(prev, finalChunk));
      }
    };

    recognition.onerror = (event: any) => {
      const code = event?.error || 'unknown';
      if (code === 'no-speech') return;
      const message = code === 'not-allowed'
        ? 'Microphone permission is blocked.'
        : code === 'audio-capture'
          ? 'No microphone was detected.'
          : `Speech recognition error: ${code}`;
      setListenError(message);
      toast({ variant: 'destructive', title: 'Listen mode error', description: message });
    };

    recognition.onend = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        setInterimTranscript('');
        return;
      }

      setTimeout(() => {
        if (!keepListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          keepListeningRef.current = false;
          setIsListening(false);
        }
      }, 80);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      keepListeningRef.current = false;
      setIsListening(false);
      setListenError('Could not start microphone listening.');
      toast({ variant: 'destructive', title: 'Listen mode error', description: 'Could not start microphone listening.' });
    }
  }, [isListening, language, toast]);

  const handleGenerate = async () => {
    await runNotesGeneration(sourceText, { background: false });
  };

  const handleLinkImport = useCallback(async () => {
    const raw = linkUrl.trim();
    if (!raw) return;

    const normalized = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    try {
      new URL(normalized);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }

    setIsFetchingLink(true);
    try {
      const response = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
      });
      if (!response.ok) {
        toast({ variant: 'destructive', title: 'Import failed', description: 'Could not fetch content from this URL.' });
        return;
      }
      const data = await response.json();
      const extracted = typeof data?.text === 'string' ? data.text.trim() : '';
      if (!extracted) {
        toast({ variant: 'destructive', title: 'No content found', description: 'Could not extract text from this URL.' });
        return;
      }
      setSourceText(extracted);
      toast({ title: 'Content imported', description: `Extracted text from ${new URL(normalized).hostname}` });
    } catch {
      toast({ variant: 'destructive', title: 'Import failed', description: 'Network error fetching URL.' });
    } finally {
      setIsFetchingLink(false);
    }
  }, [linkUrl, toast]);

  useEffect(() => { localStorage.setItem('tools.notes.length', length); }, [length]);
  useEffect(() => { localStorage.setItem('tools.notes.style', style); }, [style]);
  useEffect(() => { localStorage.setItem('tools.notes.audience', audience); }, [audience]);

  useEffect(() => {
    if (!isListening || !autoDraftEnabled || isLoading || isAutoDrafting) return;
    const transcript = liveTranscript.trim();
    if (transcript.length < 220) return;

    const minIntervalMs = 7000;
    const minAddedChars = 120;
    const charsSinceLastDraft = transcript.length - lastAutoDraftLengthRef.current;
    if (charsSinceLastDraft < minAddedChars) return;

    const elapsed = Date.now() - lastAutoDraftAtRef.current;
    const waitMs = elapsed >= minIntervalMs ? 450 : minIntervalMs - elapsed;

    if (autoDraftTimerRef.current) clearTimeout(autoDraftTimerRef.current);
    autoDraftTimerRef.current = setTimeout(async () => {
      const currentTranscript = liveTranscript.trim();
      if (!keepListeningRef.current || currentTranscript.length < 220) return;
      const deltaChars = currentTranscript.length - lastAutoDraftLengthRef.current;
      if (deltaChars < minAddedChars) return;

      lastAutoDraftAtRef.current = Date.now();
      lastAutoDraftLengthRef.current = currentTranscript.length;
      await runNotesGeneration(currentTranscript, { background: true });
    }, waitMs);

    return () => {
      if (autoDraftTimerRef.current) {
        clearTimeout(autoDraftTimerRef.current);
        autoDraftTimerRef.current = null;
      }
    };
  }, [autoDraftEnabled, isAutoDrafting, isListening, isLoading, liveTranscript, runNotesGeneration]);

  useEffect(() => () => {
    void stopListening({ finalize: false });
    if (autoDraftTimerRef.current) {
      clearTimeout(autoDraftTimerRef.current);
    }
  }, [stopListening]);

  useEffect(() => {
    if (inputMode !== 'listen' && isListening) {
      void stopListening({ finalize: false });
    }
  }, [inputMode, isListening, stopListening]);

  const lengthMap: Record<string, number> = { short: 0, medium: 1, long: 2 };
  const lengthFromSlider = (v: number) => (['short', 'medium', 'long'] as const)[v];
  const lengthLabels: Record<string, string> = { short: t.short, medium: t.medium, long: t.long };

  if (generatedNotes) {
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button variant="ghost" onClick={() => { setGeneratedNotes(null); setPaintActive(false); setHighlightActive(false); }} className="rounded-full">
              {t.back}
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <TextHighlighterToolbar
                active={highlightActive}
                onToggle={() => { setHighlightActive(h => !h); if (paintActive) setPaintActive(false); }}
                containerRef={notesContentRef}
              />
              <Button
                variant={paintActive ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-8 gap-1.5"
                onClick={() => { setPaintActive(p => !p); if (highlightActive) setHighlightActive(false); }}
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span className="text-xs">Annotate</span>
              </Button>
              <ExportToolbar
                toolType="notes"
                title={customTitle.trim() || undefined}
                getMarkdown={() => notesToMarkdown(generatedNotes)}
                getHtml={() => notesToHtml(generatedNotes)}
              />
            </div>
          </div>
          <div className="relative" ref={notesContentRef}>
            <NoteViewer notes={generatedNotes} />
            <PaintOverlay active={paintActive} onClose={() => setPaintActive(false)} />
          </div>
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
        />
      </div>

      <PillSelector label={t.notes.labels.style} options={t.notes.styleOptions} value={style} onChange={setStyle} disabled={isLoading} />
      <PillSelector label={t.notes.labels.audience} options={t.notes.audienceOptions} value={audience} onChange={setAudience} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.length}</p>
          <span className="text-xs font-mono capitalize">{lengthLabels[length]}</span>
        </div>
        <Slider value={[lengthMap[length]]} onValueChange={([v]) => setLength(lengthFromSlider(v))} min={0} max={2} step={1} disabled={isLoading} />
      </div>

      <Button variant="outline" onClick={handleGenerate} disabled={!canGenerate} className="w-full rounded-full bg-background">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {t.notes.generate}
      </Button>

      <ImportToolbar
        toolType="notes"
        onImport={(text) => {
          const notes = text.includes('<') ? parseNotesFromHtml(text) : parseNotesFromMarkdown(text);
          if (notes && notes.length > 0) {
            setGeneratedNotes(notes as any);
          } else {
            toast({ variant: 'destructive', title: t.couldNotParse, description: t.notes.parseError });
          }
        }}
        disabled={isLoading}
      />
    </>
  );

  return (
    <WorkbenchShell title="Notes" sidebar={sidebar}>
      <SourceInput
        toolId="notes"
        value={sourceText}
        onChange={setSourceText}
        onImageDataUriChange={setImageDataUri}
        onSubmit={handleGenerate}
        placeholder={t.sourceInputPlaceholder}
        topContent={<MicrosoftAppStrip returnTo="/tools/notes" />}
        speechLanguage={language}
        enableMic={false}
        enableCaptions={false}
        sourceMergeMode="append_labeled"
      />
    </WorkbenchShell>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <NotesPageContent />
    </Suspense>
  );
}

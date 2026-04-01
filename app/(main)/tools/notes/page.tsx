'use client';

import { Suspense } from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Paintbrush } from 'lucide-react';
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

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function NotesPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const taskId = searchParams.get('taskId');
  const studysetId = searchParams.get('studysetId');
  const launchRequested = searchParams.get('launch') === '1';
  const { run: savedRun } = useSavedRun(runId);
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;
  const t = getToolStrings(language);
  const noteStyleOptions = [
    { value: 'structured', label: 'Structured', description: 'Clear headings and concise key points' },
    { value: 'standard', label: 'Standard', description: 'Balanced summary style for general studying' },
    { value: 'cornell', label: 'Cornell', description: 'Cue + note + summary study layout' },
    { value: 'outline', label: 'Outline', description: 'Hierarchical bullet structure for fast review' },
    { value: 'mindmap', label: 'Mindmap', description: 'Concept relationship visual structure' },
    { value: 'timeline', label: 'Timeline', description: 'Chronological sequence of events or steps' },
  ];

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
  const [showLaunchScreen, setShowLaunchScreen] = useState(Boolean(launchRequested && taskId && studysetId));
  const [launchStageIndex, setLaunchStageIndex] = useState(0);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const lectureFocusRef = useRef(true);
  const autoDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoDraftAtRef = useRef(0);
  const lastAutoDraftLengthRef = useRef(0);
  const lastAcceptedChunkRef = useRef('');
  const launchHandledRef = useRef(false);
  const lastReportedSignatureRef = useRef('');
  const { toast } = useToast();

  const launchStages: Array<{ title: string; detail: string }> = [
    { title: 'Opening study task', detail: 'Loading your saved studyset plan and task settings.' },
    { title: 'Retrieving context sources', detail: 'Collecting source text and selected materials.' },
    { title: 'Preparing note structure', detail: 'Applying title, style, audience, and length settings.' },
    { title: 'Generating notes', detail: 'Building clean notes from your selected study content.' },
    { title: 'Finalizing workspace', detail: 'Opening notes with the generated output ready to edit.' },
  ];

  const reportStudysetPerformance = useCallback(async (inputText: string) => {
    if (!taskId || !studysetId) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;
    const signature = `${taskId}:${trimmed.length}:${style}:${length}:${audience}`;
    if (lastReportedSignatureRef.current === signature) return;
    lastReportedSignatureRef.current = signature;

    const score = clampScore(
      55 +
      (trimmed.length > 1200 ? 15 : trimmed.length > 500 ? 10 : 4) +
      (length === 'long' ? 6 : length === 'medium' ? 4 : 2)
    );

    await fetch(`/api/studysets/plan-tasks/${taskId}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studysetId,
        toolId: 'notes',
        score,
        totalItems: 1,
        correctItems: 1,
        timeSpentSeconds: Math.min(3600, Math.max(60, Math.round(trimmed.length / 6))),
        weakTopics: score < 70 ? ['concept clarity'] : [],
        markCompleted: true,
      }),
    }).catch(() => {});
  }, [audience, length, style, studysetId, taskId]);

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
    if (s('saveToRecents') === 'false') setSaveToRecents(false);

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

  const runNotesGeneration = useCallback(async (
    inputText: string,
    options?: {
      background?: boolean;
      preset?: Partial<{
        length: 'short' | 'medium' | 'long';
        style: string;
        audience: string;
        title: string;
      }>;
    }
  ) => {
    const text = inputText.trim();
    if (!text) return null;

    const background = options?.background === true;
    const requestedLength = options?.preset?.length || length;
    const requestedStyle = options?.preset?.style || style;
    const requestedAudience = options?.preset?.audience || audience;
    const requestedTitle = options?.preset?.title || customTitle.trim() || 'Generated Notes';
    if (background) setIsAutoDrafting(true);
    else setIsLoading(true);

    try {
      const run = await runToolFlowV2({
        toolId: 'notes',
        flowName: 'generateNotes',
        mode: requestedStyle,
        artifactType: 'notes',
        artifactTitle: requestedTitle,
        options: {
          saveToRecents,
        },
        persistArtifact: saveToRecents,
        input: {
          sourceText: text,
          length: requestedLength,
          style: requestedStyle,
          modePack: 'core',
          outputFocus: 'clarity',
          tone: 'neutral',
          audience: requestedAudience,
          regionCode: String(region || 'global').toUpperCase(),
          educationLevel: schoolingLevel,
          imageDataUri: imageDataUri || undefined,
          highlightTitles: false,
          fontFamily: 'default',
        },
      });
      const notes = (run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null;
      if (background) setLiveDraftNotes(notes);
      else {
        setGeneratedNotes(notes);
        await reportStudysetPerformance(text);
      }
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
  }, [audience, customTitle, imageDataUri, length, region, schoolingLevel, reportStudysetPerformance, saveToRecents, style, t.notes.generatingTitle, toast]);

  useEffect(() => {
    if (!launchRequested || !taskId || !studysetId || launchHandledRef.current) return;
    launchHandledRef.current = true;
    setShowLaunchScreen(true);
    setLaunchStageIndex(0);

    console.info('[STUDYSET_LAUNCH][NOTES] launch requested', {
      taskId,
      studysetId,
      launchRequested,
    });

    const runLaunch = async () => {
      try {
        setLaunchStageIndex(1);
        const response = await fetch(`/api/studysets/plan-tasks/${taskId}/launch`);
        if (!response.ok) throw new Error(`Could not load studyset task preset (${response.status})`);
        const payload = await response.json();
        const source = String(payload?.launch?.sourceText || '').trim();
        const preset = payload?.launch?.notesPreset || {};
        const title = String(payload?.launch?.artifactTitle || '').trim();

        console.info('[STUDYSET_LAUNCH][NOTES] launch payload loaded', {
          taskId,
          studysetId,
          sourceLength: source.length,
          preset,
          hasTitle: Boolean(title),
        });

        setLaunchStageIndex(2);
        if (source) setSourceText(source);
        if (preset?.length) setLength(preset.length as 'short' | 'medium' | 'long');
        if (preset?.style) setStyle(String(preset.style));
        if (preset?.audience) setAudience(String(preset.audience));
        if (title) setCustomTitle(title);

        if (source) {
          setLaunchStageIndex(3);
          await runNotesGeneration(source, {
            background: false,
            preset: {
              length: preset?.length as 'short' | 'medium' | 'long' | undefined,
              style: preset?.style ? String(preset.style) : undefined,
              audience: preset?.audience ? String(preset.audience) : undefined,
              title: title || undefined,
            },
          });
          setLaunchStageIndex(4);
          console.info('[STUDYSET_LAUNCH][NOTES] generation completed', { taskId, studysetId });
        }
        setTimeout(() => setShowLaunchScreen(false), 300);
      } catch (error: any) {
        console.error('[STUDYSET_LAUNCH][NOTES] launch failed', {
          taskId,
          studysetId,
          message: error?.message || String(error),
        });
        toast({
          variant: 'destructive',
          title: 'Could not start studyset task',
          description: error?.message || 'Please refresh and try again.',
        });
        setShowLaunchScreen(false);
      }
    };

    void runLaunch();
  }, [launchRequested, runNotesGeneration, studysetId, taskId, toast]);

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
  useEffect(() => { localStorage.setItem('tools.notes.saveToRecents', String(saveToRecents)); }, [saveToRecents]);

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

  if (showLaunchScreen) {
    const currentStage = launchStages[Math.min(launchStageIndex, launchStages.length - 1)];
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="mx-auto flex min-h-[52vh] w-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-border bg-card p-5 md:p-6">
            <div className="mb-3 flex items-center gap-3 text-sm text-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">{currentStage.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{currentStage.detail}</p>
          </div>
        </div>
      </div>
    );
  }

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
                getPrintHtml={() => notesContentRef.current?.innerHTML || notesToHtml(generatedNotes)}
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
          className="w-full h-8 rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={isLoading}
        />
      </div>

      <PillSelector label="Format" options={noteStyleOptions} value={style} onChange={setStyle} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.length}</p>
          <span className="text-xs font-mono capitalize">{lengthLabels[length]}</span>
        </div>
        <Slider
          value={[lengthMap[length]]}
          onValueChange={([v]) => setLength(lengthFromSlider(v))}
          min={0}
          max={2}
          step={1}
          disabled={isLoading}
          className="[&_.bg-secondary]:bg-sidebar-accent [&_.bg-primary]:bg-foreground/70 [&_[role=slider]]:border-sidebar-border [&_[role=slider]]:bg-sidebar-accent [&_[role=slider]]:shadow-sm"
        />
      </div>

      <div className="flex items-center justify-between rounded-md bg-sidebar-accent/35 px-2 py-1.5">
        <p className="text-xs text-muted-foreground">Save to recents</p>
        <Switch
          checked={saveToRecents}
          onCheckedChange={setSaveToRecents}
          className="h-5 w-9 data-[state=checked]:!bg-emerald-800 data-[state=unchecked]:!bg-red-800 data-[state=checked]:[&>span]:translate-x-4 [&>span]:h-4 [&>span]:w-4"
        />
      </div>

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

'use client';

import { Suspense } from 'react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles, Paintbrush, Mic, Square, Radio, WandSparkles, CircleSlash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { PillSelector } from '@/components/tools/pill-selector';
import { PresetManager } from '@/components/tools/preset-manager';
import { Slider } from '@/components/ui/slider';
import { ExportToolbar } from '@/components/tools/export-toolbar';
import { notesToMarkdown, notesToHtml } from '@/lib/export-formatters';
import { ImportToolbar } from '@/components/tools/import-toolbar';
import { parseNotesFromMarkdown, parseNotesFromHtml } from '@/lib/import-parsers';
import { AppContext } from '@/contexts/app-context';
import { getToolStrings } from '@/lib/tool-i18n';
import { PaintOverlay } from '@/components/tools/paint-overlay';
import { TextHighlighterToolbar } from '@/components/tools/text-highlighter';
import { Card, CardContent } from '@/components/ui/card';
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

const shouldSuppressAsInterruption = (segment: string) => {
  const cleaned = segment.trim().toLowerCase();
  if (!cleaned) return true;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const shortQuestion = words.length <= 7 && (cleaned.endsWith('?') || cleaned.startsWith('wait') || cleaned.startsWith('what'));
  const handRaiseNoise = /^((uh|um|hmm|yeah|yes|no)\b[\s,!?.]*){1,3}$/.test(cleaned);
  return shortQuestion || handRaiseNoise;
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
  const [modePack, setModePack] = useState('core');
  const [outputFocus, setOutputFocus] = useState('clarity');
  const [tone, setTone] = useState('neutral');
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
  const notesContentRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const lectureFocusRef = useRef(true);
  const autoDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoDraftAtRef = useRef(0);
  const lastAutoDraftLengthRef = useRef(0);
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
    if (s('pack')) setModePack(s('pack')!);
    if (s('focus')) setOutputFocus(s('focus')!);
    if (s('tone')) setTone(s('tone')!);
    if (s('audience')) setAudience(s('audience')!);
  }, []);

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
          modePack,
          outputFocus,
          tone,
          audience,
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
  }, [audience, customTitle, length, modePack, outputFocus, style, t.notes.generatingTitle, toast, tone]);

  const stopListening = useCallback(() => {
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
  }, []);

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

          const accepted = lectureFocusRef.current
            ? pieces.filter((piece: string) => !shouldSuppressAsInterruption(piece))
            : pieces;

          if (accepted.length > 0) {
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

  useEffect(() => { localStorage.setItem('tools.notes.length', length); }, [length]);
  useEffect(() => { localStorage.setItem('tools.notes.style', style); }, [style]);
  useEffect(() => { localStorage.setItem('tools.notes.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.notes.focus', outputFocus); }, [outputFocus]);
  useEffect(() => { localStorage.setItem('tools.notes.tone', tone); }, [tone]);
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
    stopListening();
    if (autoDraftTimerRef.current) {
      clearTimeout(autoDraftTimerRef.current);
    }
  }, [stopListening]);

  const lengthMap: Record<string, number> = { short: 0, medium: 1, long: 2 };
  const lengthFromSlider = (v: number) => (['short', 'medium', 'long'] as const)[v];
  const lengthLabels: Record<string, string> = { short: t.short, medium: t.medium, long: t.long };

  const currentSettings = { length, style, modePack, outputFocus, tone, audience };

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

      <PresetManager
        toolId="notes"
        currentSettings={currentSettings}
        onLoadPreset={(s) => {
          if (s.length) setLength(s.length);
          if (s.style) setStyle(s.style);
          if (s.modePack) setModePack(s.modePack);
          if (s.outputFocus) setOutputFocus(s.outputFocus);
          if (s.tone) setTone(s.tone);
          if (s.audience) setAudience(s.audience);
        }}
      />

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Listen mode</p>
          <Badge variant={isListening ? 'default' : 'outline'}>{isListening ? 'Live' : 'Idle'}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Start live lecture capture from the main Notes area. This panel shows status only.
        </p>
      </div>

      <PillSelector label={t.notes.labels.pack} options={t.notes.packOptions} value={modePack} onChange={setModePack} disabled={isLoading} />
      <PillSelector label={t.notes.labels.style} options={t.notes.styleOptions} value={style} onChange={setStyle} disabled={isLoading} />
      <PillSelector label={t.notes.labels.focus} options={t.notes.focusOptions} value={outputFocus} onChange={setOutputFocus} disabled={isLoading} />
      <PillSelector label={t.notes.labels.tone} options={t.notes.toneOptions} value={tone} onChange={setTone} disabled={isLoading} />
      <PillSelector label={t.notes.labels.audience} options={t.notes.audienceOptions} value={audience} onChange={setAudience} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t.length}</p>
          <span className="text-xs font-mono capitalize">{lengthLabels[length]}</span>
        </div>
        <Slider value={[lengthMap[length]]} onValueChange={([v]) => setLength(lengthFromSlider(v))} min={0} max={2} step={1} disabled={isLoading} />
      </div>

      <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full rounded-full">
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
      <div className="h-full flex flex-col gap-4">
        <Card className="border-primary/30 bg-[hsl(var(--surface-2))]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Radio className="h-3 w-3" />
                  Listen Mode
                </Badge>
                {isListening ? <Badge>Capturing live</Badge> : <Badge variant="outline">Ready</Badge>}
                {!isSpeechSupported && <Badge variant="destructive">Browser unsupported</Badge>}
                {isAutoDrafting && <Badge variant="outline">Drafting notes...</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {isListening ? (
                  <Button size="sm" className="rounded-full" onClick={stopListening}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-full" onClick={startListening} disabled={!isSpeechSupported}>
                    <Mic className="mr-2 h-4 w-4" />
                    Listen
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={async () => {
                    const text = liveTranscript.trim() || sourceText.trim();
                    await runNotesGeneration(text, { background: false });
                  }}
                  disabled={isLoading || (!(liveTranscript.trim()) && !(sourceText.trim()))}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                  Generate now
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={lectureFocus} onCheckedChange={setLectureFocus} />
                Lecture focus (ignore short interruptions)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={autoDraftEnabled} onCheckedChange={setAutoDraftEnabled} />
                Auto-convert transcript to notes
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Live transcript</p>
                  <span className="text-[10px] font-mono text-muted-foreground">{liveTranscript.length} chars</span>
                </div>
                <div className="min-h-[112px] max-h-[170px] overflow-auto text-sm leading-relaxed">
                  {liveTranscript ? (
                    <p>
                      {liveTranscript}
                      {interimTranscript ? <span className="text-muted-foreground"> {interimTranscript}</span> : null}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Click Listen and start speaking to capture lecture text live.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Live notes draft</p>
                  <span className="text-[10px] text-muted-foreground">
                    {liveDraftNotes ? `${liveDraftNotes.length} sections` : 'No draft yet'}
                  </span>
                </div>
                <div className="min-h-[112px] max-h-[170px] overflow-auto text-sm leading-relaxed">
                  {liveDraftNotes && liveDraftNotes.length > 0 ? (
                    <ul className="space-y-1">
                      {liveDraftNotes.slice(0, 4).map((note, idx) => (
                        <li key={`${note.title}-${idx}`} className="truncate">
                          - {note.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Auto-drafted notes will appear here during listening.</p>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={!liveDraftNotes || liveDraftNotes.length === 0}
                    onClick={() => setGeneratedNotes(liveDraftNotes)}
                  >
                    Open draft
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setLiveTranscript('');
                      setInterimTranscript('');
                      setSourceText('');
                      setLiveDraftNotes(null);
                      setListenError(null);
                      lastAutoDraftLengthRef.current = 0;
                    }}
                  >
                    <CircleSlash2 className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {listenError ? <p className="text-xs text-destructive">{listenError}</p> : null}
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1">
          <SourceInput value={sourceText} onChange={setSourceText} onSubmit={handleGenerate} placeholder={t.sourceInputPlaceholder} />
        </div>
      </div>
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

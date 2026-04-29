'use client';

import { Suspense } from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Bold, Italic, Loader2, Paintbrush, PanelsRightBottom, Underline } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

type DrawingPath = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
};

const NOTE_FONTS = [
  { value: 'IBM Plex Sans', label: 'IBM Plex Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
];

const NOTE_BLOCK_OPTIONS = [
  { value: 'bullets', label: 'Bullets' },
  { value: 'arrows', label: 'Arrows / Flow' },
  { value: 'key-terms', label: 'Key Terms' },
  { value: 'causes', label: 'Causes' },
  { value: 'definitions', label: 'Definitions' },
  { value: 'summary', label: 'Summary Box' },
];

type AutoHighlightTarget = {
  value: string;
  label: string;
  regex: RegExp;
};

const BASE_AUTO_HIGHLIGHT_TARGETS: AutoHighlightTarget[] = [
  { value: 'terms', label: 'Key terms', regex: /\b(term|concept|definition|model|theory|keyword|formula)\b/gi },
  { value: 'causes', label: 'Causes and effects', regex: /\b(because|due to|therefore|cause|effect|resulted in|led to)\b/gi },
  { value: 'dates', label: 'Dates and years', regex: /\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|(?:19|20)\d{2})\b/g },
];

function NotesPageContent() {
  const searchParams = useSearchParams();
  const layoutPreset = (searchParams.get('layout') || '').toLowerCase();
  const runId = searchParams.get('runId');
  const classId = searchParams.get('classId');
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
  const [editMode, setEditMode] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(true);
  const [noteHtml, setNoteHtml] = useState('');
  const [noteFontFamily, setNoteFontFamily] = useState('IBM Plex Sans');
  const [noteFontSize, setNoteFontSize] = useState(18);
  const [noteFontWeight, setNoteFontWeight] = useState(420);
  const [noteLineHeight, setNoteLineHeight] = useState(1.65);
  const [noteTextColor, setNoteTextColor] = useState('#181818');
  const [selectedNoteBlocks, setSelectedNoteBlocks] = useState<string[]>(['bullets', 'key-terms', 'summary']);
  const [selectedAutoHighlightTargets, setSelectedAutoHighlightTargets] = useState<string[]>(['terms']);
  const [autoHighlightColor, setAutoHighlightColor] = useState('rgba(250, 204, 21, 0.38)');
  const [annotationPaths, setAnnotationPaths] = useState<DrawingPath[]>([]);
  const [artifactId, setArtifactId] = useState<string | null>(null);
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
  const [premiumTier, setPremiumTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [isSharingToClass, setIsSharingToClass] = useState(false);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const isWordwebPreset = layoutPreset === 'wordweb' || layoutPreset === 'mindmap';
  const isTimelinePreset = layoutPreset === 'timeline';
  const pageTitle = isWordwebPreset ? 'Wordweb' : isTimelinePreset ? 'Timeline Notes' : 'Notes';

  const launchStages: Array<{ title: string; detail: string }> = [
    { title: 'Opening study task', detail: 'Loading your saved studyset plan and task settings.' },
    { title: 'Retrieving context sources', detail: 'Collecting source text and selected materials.' },
    { title: 'Preparing note structure', detail: 'Applying title, style, audience, and length settings.' },
    { title: 'Generating notes', detail: 'Building clean notes from your selected study content.' },
    { title: 'Finalizing workspace', detail: 'Opening notes with the generated output ready to edit.' },
  ];

  const autoHighlightTargets = useMemo(() => {
    const code = String(region || 'global').toUpperCase();
    const languageCode = String(language || 'en').toLowerCase();
    const targets = [...BASE_AUTO_HIGHLIGHT_TARGETS];

    if (languageCode === 'nl') {
      targets[0] = {
        ...targets[0],
        label: 'Begrippen',
        regex: /\b(term|concept|definition|begrip|definitie|model|theorie|formule)\b/gi,
      };
      targets[1] = {
        ...targets[1],
        label: 'Oorzaken en gevolgen',
        regex: /\b(because|due to|therefore|cause|effect|resulted in|led to|oorzaak|oorzaken|gevolg|gevolgen|daardoor)\b/gi,
      };
      targets[2] = { ...targets[2], label: 'Datums en jaren' };
    }

    if (code === 'DE') {
      targets.push({
        value: 'curriculum',
        label: 'Prüfung / Abitur',
        regex: /\b(abitur|klausur|prüfung|prüfungsstoff|lernziel)\b/gi,
      });
    } else if (code === 'NL') {
      targets.push({
        value: 'curriculum',
        label: 'Examen / Niveau',
        regex: /\b(havo|vwo|vmbo|mavo|examen|leerstof|samenvatting)\b/gi,
      });
    } else if (code === 'UK') {
      targets.push({
        value: 'curriculum',
        label: 'Exam board terms',
        regex: /\b(gcse|a-level|as level|ofqual|past paper|mark scheme)\b/gi,
      });
    } else if (code === 'US') {
      targets.push({
        value: 'curriculum',
        label: 'School assessment terms',
        regex: /\b(gpa|sat|act|ap course|rubric|midterm|final exam)\b/gi,
      });
    } else if (code === 'IN') {
      targets.push({
        value: 'curriculum',
        label: 'Board / entrance terms',
        regex: /\b(cbse|icse|jee|neet|board exam|syllabus)\b/gi,
      });
    } else {
      targets.push({
        value: 'curriculum',
        label: 'Assessment terms',
        regex: /\b(exam|assessment|syllabus|learning objective|grading criteria)\b/gi,
      });
    }

    return targets;
  }, [language, region]);

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

  const toggleMulti = useCallback((value: string, setValue: (updater: (prev: string[]) => string[]) => void) => {
    setValue((prev) => (prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]));
  }, []);

  const persistNotesState = useCallback((nextHtml?: string, nextPaths?: DrawingPath[]) => {
    const htmlToSave = typeof nextHtml === 'string' ? nextHtml : noteHtml;
    const pathsToSave = Array.isArray(nextPaths) ? nextPaths : annotationPaths;
    const payload = {
      html: htmlToSave,
      annotationPaths: pathsToSave,
      fontFamily: noteFontFamily,
      fontSize: noteFontSize,
      fontWeight: noteFontWeight,
      lineHeight: noteLineHeight,
      textColor: noteTextColor,
      selectedNoteBlocks,
      selectedAutoHighlightTargets,
      autoHighlightColor,
      updatedAt: Date.now(),
    };
    localStorage.setItem('tools.notes.editorState', JSON.stringify(payload));

    if (!saveToRecents || !htmlToSave.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const parsed = parseNotesFromHtml(htmlToSave);
      const content = parsed && parsed.length > 0 ? parsed : notesToMarkdown(generatedNotes || []);
      try {
        const response = await fetch('/api/tools/v2/artifacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifactId: artifactId || undefined,
            toolId: 'notes',
            artifactType: 'notes',
            title: customTitle.trim() || 'Notes',
            content,
            metadata: {
              editor: payload,
            },
          }),
        });
        const json = await response.json().catch(() => ({}));
        const returnedId =
          (typeof json?.id === 'string' && json.id) ||
          (typeof json?.artifact?.id === 'string' && json.artifact.id) ||
          null;
        if (returnedId && returnedId !== artifactId) {
          setArtifactId(returnedId);
        }
      } catch {
        // Keep editing flow resilient; local state is still saved.
      }
    }, 600);
  }, [
    annotationPaths,
    artifactId,
    autoHighlightColor,
    customTitle,
    generatedNotes,
    noteFontFamily,
    noteFontSize,
    noteFontWeight,
    noteHtml,
    noteLineHeight,
    noteTextColor,
    saveToRecents,
    selectedAutoHighlightTargets,
    selectedNoteBlocks,
  ]);

  const applyAutoHighlights = useCallback(() => {
    const container = notesContentRef.current;
    if (!container) return;
    const activeTargets = autoHighlightTargets.filter((target) => selectedAutoHighlightTargets.includes(target.value));
    if (activeTargets.length === 0) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node?.textContent?.trim()) continue;
      const parentTag = node.parentElement?.tagName?.toLowerCase();
      if (parentTag === 'mark') continue;
      textNodes.push(node);
    }

    textNodes.forEach((node) => {
      let html = node.textContent || '';
      let changed = false;
      activeTargets.forEach((target) => {
        html = html.replace(target.regex, (match) => {
          changed = true;
          return `<mark style="background:${autoHighlightColor};border-radius:2px;padding:0 1px;">${match}</mark>`;
        });
      });
      if (!changed) return;
      const wrapper = document.createElement('span');
      wrapper.innerHTML = html;
      const parent = node.parentNode;
      if (!parent) return;
      parent.replaceChild(wrapper, node);
    });

    const nextHtml = container.innerHTML;
    setNoteHtml(nextHtml);
    persistNotesState(nextHtml);
  }, [autoHighlightColor, autoHighlightTargets, persistNotesState, selectedAutoHighlightTargets]);

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
    if (layoutPreset === 'wordweb' || layoutPreset === 'mindmap') {
      setStyle('mindmap');
    } else if (layoutPreset === 'timeline') {
      setStyle('timeline');
    }
  }, [layoutPreset]);

  useEffect(() => {
    const loadTier = async () => {
      try {
        const res = await fetch('/api/subscription/upgrade', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        const tier = String(payload?.tier || 'free').toLowerCase();
        if (tier === 'pro' || tier === 'premium') setPremiumTier(tier);
        else setPremiumTier('free');
      } catch {}
    };
    void loadTier();
  }, []);

  useEffect(() => {
    if (premiumTier !== 'free') return;
    if (!isWordwebPreset && !isTimelinePreset) return;
    setStyle('structured');
    toast({
      title: 'Premium feature',
      description: 'Wordweb and Timeline note presets require Premium.',
    });
  }, [premiumTier, isWordwebPreset, isTimelinePreset, toast]);

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

    const rawEditorState = localStorage.getItem('tools.notes.editorState');
    if (rawEditorState) {
      try {
        const parsed = JSON.parse(rawEditorState);
        if (typeof parsed?.html === 'string') setNoteHtml(parsed.html);
        if (Array.isArray(parsed?.annotationPaths)) setAnnotationPaths(parsed.annotationPaths as DrawingPath[]);
        if (typeof parsed?.fontFamily === 'string') setNoteFontFamily(parsed.fontFamily);
        if (typeof parsed?.fontSize === 'number') setNoteFontSize(parsed.fontSize);
        if (typeof parsed?.fontWeight === 'number') setNoteFontWeight(parsed.fontWeight);
        if (typeof parsed?.lineHeight === 'number') setNoteLineHeight(parsed.lineHeight);
        if (typeof parsed?.textColor === 'string') setNoteTextColor(parsed.textColor);
        if (Array.isArray(parsed?.selectedNoteBlocks)) setSelectedNoteBlocks(parsed.selectedNoteBlocks);
        if (Array.isArray(parsed?.selectedAutoHighlightTargets)) setSelectedAutoHighlightTargets(parsed.selectedAutoHighlightTargets);
        if (typeof parsed?.autoHighlightColor === 'string') setAutoHighlightColor(parsed.autoHighlightColor);
      } catch {
        // Ignore bad local state.
      }
    }
  }, []);

  useEffect(() => {
    if (!generatedNotes) return;
    const nextHtml = notesToHtml(generatedNotes);
    if (!noteHtml.trim()) {
      setNoteHtml(nextHtml);
    }
  }, [generatedNotes, noteHtml]);

  useEffect(() => {
    if (!liveTranscript.trim()) {
      localStorage.removeItem('tools.notes.liveTranscript');
      return;
    }
    localStorage.setItem('tools.notes.liveTranscript', liveTranscript);
  }, [liveTranscript]);

  useEffect(() => {
    if (!generatedNotes) return;
    persistNotesState();
  }, [
    autoHighlightColor,
    generatedNotes,
    noteFontFamily,
    noteFontSize,
    noteFontWeight,
    noteLineHeight,
    noteTextColor,
    selectedAutoHighlightTargets,
    selectedNoteBlocks,
    persistNotesState,
  ]);

  useEffect(() => {
    const allowed = new Set(autoHighlightTargets.map((target) => target.value));
    setSelectedAutoHighlightTargets((prev) => {
      const next = prev.filter((value) => allowed.has(value));
      return next.length > 0 ? next : ['terms'];
    });
  }, [autoHighlightTargets]);

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
    const blockDirective = selectedNoteBlocks.length > 0
      ? `\n\n[Requested note blocks: ${selectedNoteBlocks.join(', ')}]`
      : '';
    const textWithDirectives = `${text}${blockDirective}`;

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
          sourceText: textWithDirectives,
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
      if (typeof run?.output_artifact_id === 'string' && run.output_artifact_id) {
        setArtifactId(run.output_artifact_id);
      }
      if (background) setLiveDraftNotes(notes);
      else {
        setGeneratedNotes(notes);
        setNoteHtml(notes ? notesToHtml(notes) : '');
        setAnnotationPaths([]);
        await reportStudysetPerformance(textWithDirectives);
      }
      return notes;
    } catch (error: any) {
      if (!background) {
        toast({
          variant: 'destructive',
          title: t.notes.generatingTitle,
          description: error?.message || 'Unable to generate notes',
          errorCode: error?.code ? String(error.code) : undefined,
        });
      }
      return null;
    } finally {
      if (background) setIsAutoDrafting(false);
      else setIsLoading(false);
    }
  }, [audience, customTitle, imageDataUri, length, region, schoolingLevel, selectedNoteBlocks, reportStudysetPerformance, saveToRecents, style, t.notes.generatingTitle, toast]);

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
          errorCode: error?.code ? String(error.code) : undefined,
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
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
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
  const editableSections = useMemo(() => {
    const parsed = parseNotesFromHtml(noteHtml);
    return parsed && parsed.length > 0 ? parsed : generatedNotes || [];
  }, [generatedNotes, noteHtml]);

  const applyInlineFormat = useCallback((command: 'bold' | 'italic' | 'underline') => {
    if (typeof document === 'undefined') return;
    if (!editMode) setEditMode(true);
    document.execCommand(command);
    const container = notesContentRef.current;
    if (!container) return;
    const nextHtml = container.innerHTML;
    setNoteHtml(nextHtml);
    persistNotesState(nextHtml);
  }, [editMode, persistNotesState]);

  const handleShareToClass = useCallback(async () => {
    if (!classId || !generatedNotes) return;
    setIsSharingToClass(true);
    try {
      const sections = editableSections.length;
      const res = await fetch(`/api/classes/${classId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'teacher',
          text: `Shared notes: ${customTitle.trim() || 'Untitled notes'}`,
          attachmentLabel: `${sections} sections`,
        }),
      });
      if (!res.ok) throw new Error('Failed to share notes');
      toast({ title: 'Shared to class', description: 'Notes were posted in class share.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Share failed', description: error?.message || 'Could not share notes.' });
    } finally {
      setIsSharingToClass(false);
    }
  }, [classId, customTitle, editableSections.length, generatedNotes, toast]);

  if (showLaunchScreen) {
    const currentStage = launchStages[Math.min(launchStageIndex, launchStages.length - 1)];
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="mx-auto flex min-h-[52vh] w-full max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-border surface-panel p-5 md:p-6">
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
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setGeneratedNotes(null);
                setPaintActive(false);
                setHighlightActive(false);
                setEditMode(false);
              }}
              className="rounded-full"
            >
              {t.back}
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showNotesPanel ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-8 gap-1.5"
                onClick={() => setShowNotesPanel((value) => !value)}
              >
                <PanelsRightBottom className="h-3.5 w-3.5" />
                <span className="text-xs">Edit panel</span>
              </Button>
              <TextHighlighterToolbar
                active={highlightActive}
                onToggle={() => { setHighlightActive(h => !h); if (paintActive) setPaintActive(false); }}
                containerRef={notesContentRef}
                singleUse
                onApplied={() => setHighlightActive(false)}
                onContentChanged={(html) => {
                  setNoteHtml(html);
                  persistNotesState(html);
                }}
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
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-8 gap-1.5"
                onClick={() => setEditMode((v) => !v)}
              >
                <span className="text-xs">{editMode ? 'Stop edit' : 'Edit text'}</span>
              </Button>
              <ExportToolbar
                toolType="notes"
                title={customTitle.trim() || undefined}
                getMarkdown={() => notesToMarkdown(editableSections)}
                getHtml={() => noteHtml || notesToHtml(generatedNotes)}
                getPrintHtml={() => notesContentRef.current?.innerHTML || noteHtml || notesToHtml(generatedNotes)}
              />
              {classId ? (
                <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => void handleShareToClass()} disabled={isSharingToClass}>
                  <span className="text-xs">{isSharingToClass ? 'Sharing...' : 'Share to class'}</span>
                </Button>
              ) : null}
            </div>
          </div>

          <div className={cn('grid gap-4', showNotesPanel ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-1')}>
            <div
              className="relative rounded-2xl border surface-panel p-5 md:p-6"
              style={{
                fontFamily: noteFontFamily,
                fontSize: `${noteFontSize}px`,
                fontWeight: noteFontWeight,
                lineHeight: noteLineHeight,
                color: noteTextColor,
              }}
            >
              <div
                ref={notesContentRef}
                className={cn(
                  'prose prose-sm md:prose-base max-w-none focus:outline-none',
                  editMode ? 'rounded-xl border border-dashed border-border p-3' : ''
                )}
                contentEditable={editMode}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: noteHtml || notesToHtml(generatedNotes) }}
                onInput={(event) => {
                  const html = (event.currentTarget as HTMLDivElement).innerHTML;
                  setNoteHtml(html);
                  persistNotesState(html);
                }}
                onBlur={(event) => {
                  const html = (event.currentTarget as HTMLDivElement).innerHTML;
                  setNoteHtml(html);
                  persistNotesState(html);
                }}
              />
              <PaintOverlay
                active={paintActive}
                onClose={() => setPaintActive(false)}
                singleUse
                initialPaths={annotationPaths}
                onPathsChange={(nextPaths) => {
                  setAnnotationPaths(nextPaths);
                  persistNotesState(noteHtml, nextPaths);
                }}
              />
            </div>

            {showNotesPanel && (
              <aside className="rounded-2xl border surface-panel p-4 space-y-4 h-fit xl:sticky xl:top-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Include blocks (multi-select)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_BLOCK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          'px-3 py-1 rounded-full text-xs border-0',
                          selectedNoteBlocks.includes(option.value) ? 'bg-white text-foreground' : 'bg-[hsl(var(--background))] text-foreground'
                        )}
                        onClick={() => toggleMulti(option.value, setSelectedNoteBlocks)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Auto highlight targets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {autoHighlightTargets.map((target) => (
                      <button
                        key={target.value}
                        type="button"
                        className={cn(
                          'px-3 py-1 rounded-full text-xs border-0',
                          selectedAutoHighlightTargets.includes(target.value) ? 'bg-white text-foreground' : 'bg-[hsl(var(--background))] text-foreground'
                        )}
                        onClick={() => toggleMulti(target.value, setSelectedAutoHighlightTargets)}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={autoHighlightColor.startsWith('#') ? autoHighlightColor : '#facc15'}
                      onChange={(e) => setAutoHighlightColor(e.target.value)}
                      className="h-7 w-10 rounded border border-border bg-transparent"
                    />
                    <Button type="button" variant="outline" className="h-7 rounded-full text-xs" onClick={applyAutoHighlights}>
                      Apply highlights
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Text formatting</p>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => applyInlineFormat('bold')}>
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => applyInlineFormat('italic')}>
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => applyInlineFormat('underline')}>
                      <Underline className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Font</p>
                    <select
                      value={noteFontFamily}
                      onChange={(e) => { setNoteFontFamily(e.target.value); persistNotesState(); }}
                      className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {NOTE_FONTS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Size</span>
                      <span>{noteFontSize}px</span>
                    </div>
                    <Slider
                      value={[noteFontSize]}
                      onValueChange={([value]) => { setNoteFontSize(value); persistNotesState(); }}
                      min={14}
                      max={28}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Weight</span>
                      <span>{noteFontWeight}</span>
                    </div>
                    <Slider
                      value={[noteFontWeight]}
                      onValueChange={([value]) => { setNoteFontWeight(value); persistNotesState(); }}
                      min={300}
                      max={700}
                      step={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Line height</span>
                      <span>{noteLineHeight.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[Math.round(noteLineHeight * 100)]}
                      onValueChange={([value]) => { setNoteLineHeight(value / 100); persistNotesState(); }}
                      min={120}
                      max={220}
                      step={5}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Text color</p>
                    <input
                      type="color"
                      value={noteTextColor}
                      onChange={(e) => { setNoteTextColor(e.target.value); persistNotesState(); }}
                      className="h-7 w-10 rounded border border-border bg-transparent"
                    />
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{t.title}</p>
        <Input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          className="h-9 text-sm"
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
        />
      </div>

      <div className="flex items-center justify-between rounded-lg surface-interactive px-2.5 py-2">
        <p className="text-xs text-muted-foreground">Save to recents</p>
        <Switch
          checked={saveToRecents}
          onCheckedChange={setSaveToRecents}
          className="h-5 w-9 data-[state=checked]:!bg-emerald-800 data-[state=unchecked]:!bg-red-800 data-[state=checked]:[&>span]:translate-x-4 [&>span]:h-4 [&>span]:w-4"
        />
      </div>
      {premiumTier === 'free' ? (
        <div className="rounded-lg surface-interactive px-2.5 py-2 text-[11px] text-muted-foreground">
          Timeline/Wordweb presets with advanced visuals are Premium features.
        </div>
      ) : null}

      <ImportToolbar
        toolType="notes"
        onImport={(text) => {
          const notes = text.includes('<') ? parseNotesFromHtml(text) : parseNotesFromMarkdown(text);
          if (notes && notes.length > 0) {
            setGeneratedNotes(notes as any);
            setNoteHtml(notesToHtml(notes as any));
            setAnnotationPaths([]);
          } else {
            toast({ variant: 'destructive', title: t.couldNotParse, description: t.notes.parseError });
          }
        }}
        disabled={isLoading}
      />
    </>
  );

  return (
    <WorkbenchShell title={pageTitle} sidebar={sidebar}>
      <SourceInput
        toolId="notes"
        value={sourceText}
        onChange={setSourceText}
        onImageDataUriChange={setImageDataUri}
        onSubmit={(compiledText) => {
          if (typeof compiledText === 'string') {
            setSourceText(compiledText);
          }
          return runNotesGeneration(String(compiledText || sourceText), { background: false });
        }}
        placeholder={t.sourceInputPlaceholder}
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

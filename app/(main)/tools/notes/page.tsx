'use client';

import { Suspense } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles, Paintbrush } from 'lucide-react';
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
  const [customTitle, setCustomTitle] = useState('');
  const [paintActive, setPaintActive] = useState(false);
  const [highlightActive, setHighlightActive] = useState(false);
  const notesContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  useEffect(() => {
    if (savedRun?.output_payload && savedRun.status === 'succeeded') {
      const output = savedRun.output_payload;
      setGeneratedNotes((output.notes || null) as GenerateNotesOutput['notes'] | null);
    }
  }, [savedRun]);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(`tools.notes.${k}`);
    if (s('length') === 'short' || s('length') === 'medium' || s('length') === 'long') setLength(s('length') as any);
    if (s('style')) setStyle(s('style')!);
    if (s('pack')) setModePack(s('pack')!);
    if (s('focus')) setOutputFocus(s('focus')!);
    if (s('tone')) setTone(s('tone')!);
    if (s('audience')) setAudience(s('audience')!);
  }, []);

  const handleGenerate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    try {
      const run = await runToolFlowV2({
        toolId: 'notes',
        flowName: 'generateNotes',
        mode: style,
        artifactType: 'notes',
        artifactTitle: customTitle.trim() || 'Generated Notes',
        input: {
          sourceText, length, style, modePack, outputFocus, tone, audience,
          highlightTitles: false, fontFamily: 'default',
        },
      });
      setGeneratedNotes((run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.notes.generatingTitle, description: error?.message || 'Unable to generate notes' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { localStorage.setItem('tools.notes.length', length); }, [length]);
  useEffect(() => { localStorage.setItem('tools.notes.style', style); }, [style]);
  useEffect(() => { localStorage.setItem('tools.notes.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.notes.focus', outputFocus); }, [outputFocus]);
  useEffect(() => { localStorage.setItem('tools.notes.tone', tone); }, [tone]);
  useEffect(() => { localStorage.setItem('tools.notes.audience', audience); }, [audience]);

  const lengthMap: Record<string, number> = { short: 0, medium: 1, long: 2 };
  const lengthFromSlider = (v: number) => (['short', 'medium', 'long'] as const)[v];
  const lengthLabels: Record<string, string> = { short: t.short, medium: t.medium, long: t.long };

  const currentSettings = { length, style, modePack, outputFocus, tone, audience };

  if (generatedNotes) {
    return (
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setGeneratedNotes(null)} className="rounded-full">
              {t.back}
            </Button>
            <ExportToolbar
              toolType="notes"
              title={customTitle.trim() || undefined}
              getMarkdown={() => notesToMarkdown(generatedNotes)}
              getHtml={() => notesToHtml(generatedNotes)}
            />
          </div>
          <NoteViewer notes={generatedNotes} />
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
      <SourceInput value={sourceText} onChange={setSourceText} onSubmit={handleGenerate} placeholder={t.sourceInputPlaceholder} />
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
'use client';

import { Suspense } from 'react';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSavedRun } from '@/hooks/use-saved-run';
import { Loader2, Sparkles } from 'lucide-react';
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

function NotesPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const { run: savedRun } = useSavedRun(runId);

  const [sourceText, setSourceText] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState('structured');
  const [modePack, setModePack] = useState('core');
  const [outputFocus, setOutputFocus] = useState('clarity');
  const [tone, setTone] = useState('neutral');
  const [audience, setAudience] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput['notes'] | null>(null);
  const { toast } = useToast();

  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  // Load saved run from history
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
        artifactTitle: 'Generated Notes',
        input: {
          sourceText, length, style, modePack, outputFocus, tone, audience,
          highlightTitles: false, fontFamily: 'default',
        },
      });
      setGeneratedNotes((run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation failed', description: error?.message || 'Unable to generate notes' });
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

  const packOptions = [
    { value: 'core', label: 'Core', description: 'Key concepts and main ideas distilled clearly' },
    { value: 'exam', label: 'Exam', description: 'Exam-focused notes with testable facts highlighted' },
    { value: 'reference', label: 'Reference', description: 'Comprehensive reference material with full detail' },
    { value: 'lecture', label: 'Lecture', description: 'Follows the flow of a lecture with speaker cues' },
    { value: 'revision', label: 'Revision', description: 'Ultra-condensed review summaries for quick revision' },
    { value: 'research', label: 'Research', description: 'Academic-style notes with citations and evidence' },
  ];

  const styleOptions = [
    { value: 'structured', label: 'Structured', description: 'Hierarchical headings with organized sections' },
    { value: 'standard', label: 'Standard', description: 'Clean paragraph-based notes' },
    { value: 'bullet-points', label: 'Cornell', description: 'Two-column Cornell format with cues and summaries' },
    { value: 'timeline', label: 'Timeline', description: 'Chronological sequence of events and developments' },
    { value: 'mindmap', label: 'Mindmap', description: 'Visual branching structure showing relationships' },
    { value: 'vocabulary', label: 'Vocabulary', description: 'Term-definition pairs organized by topic' },
    { value: 'outline', label: 'Outline', description: 'Numbered outline with indented sub-points' },
    { value: 'charting', label: 'Charting', description: 'Table-based comparison of categories and properties' },
    { value: 'flow', label: 'Flow', description: 'Step-by-step process notes for procedures and methods' },
    { value: 'q-and-a', label: 'Q&A', description: 'Question-and-answer pairs for self-testing' },
  ];

  const focusOptions = [
    { value: 'clarity', label: 'Clarity', description: 'Prioritizes clear, easy-to-understand explanations' },
    { value: 'compression', label: 'Cram', description: 'Maximum information in minimum space' },
    { value: 'retention', label: 'Retention', description: 'Structured for long-term memory with repetition cues' },
    { value: 'understanding', label: 'Understanding', description: 'Deep explanations with examples and analogies' },
    { value: 'application', label: 'Application', description: 'Focuses on how to apply concepts practically' },
    { value: 'synthesis', label: 'Synthesis', description: 'Connects ideas across topics and finds patterns' },
  ];

  const toneOptions = [
    { value: 'neutral', label: 'Neutral', description: 'Standard academic tone' },
    { value: 'casual', label: 'Casual', description: 'Friendly and approachable, like a study buddy' },
    { value: 'formal', label: 'Formal', description: 'Professional and precise academic language' },
    { value: 'simplified', label: 'Simplified', description: 'Plain language, avoids jargon where possible' },
    { value: 'technical', label: 'Technical', description: 'Uses full technical vocabulary without simplification' },
  ];

  const audienceOptions = [
    { value: 'student', label: 'Student', description: 'Tailored for learners encountering material for the first time' },
    { value: 'advanced', label: 'Advanced', description: 'Assumes prior knowledge, skips basics' },
    { value: 'teacher', label: 'Teacher', description: 'Teaching-oriented with pedagogical notes' },
    { value: 'professional', label: 'Professional', description: 'Practical focus for workplace application' },
    { value: 'researcher', label: 'Researcher', description: 'Emphasizes methodology, evidence, and gaps' },
  ];

  const currentSettings = { length, style, modePack, outputFocus, tone, audience };

  if (generatedNotes) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setGeneratedNotes(null)} className="rounded-full">
              ← Back
            </Button>
            <ExportToolbar
              toolType="notes"
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

      <PillSelector label="Pack" options={packOptions} value={modePack} onChange={setModePack} disabled={isLoading} />
      <PillSelector label="Style" options={styleOptions} value={style} onChange={setStyle} disabled={isLoading} />
      <PillSelector label="Focus" options={focusOptions} value={outputFocus} onChange={setOutputFocus} disabled={isLoading} />
      <PillSelector label="Tone" options={toneOptions} value={tone} onChange={setTone} disabled={isLoading} />
      <PillSelector label="Audience" options={audienceOptions} value={audience} onChange={setAudience} disabled={isLoading} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Length</p>
          <span className="text-xs font-mono capitalize">{length}</span>
        </div>
        <Slider value={[lengthMap[length]]} onValueChange={([v]) => setLength(lengthFromSlider(v))} min={0} max={2} step={1} disabled={isLoading} />
      </div>

      <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full rounded-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Notes
      </Button>
    </>
  );

  return (
    <WorkbenchShell title="Notes" sidebar={sidebar}>
      <SourceInput value={sourceText} onChange={setSourceText} onSubmit={handleGenerate} placeholder="Paste or type your source material..." />
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

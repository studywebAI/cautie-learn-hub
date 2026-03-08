'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SourceInput } from '@/components/tools/source-input';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';

export default function NotesPage() {
  const [sourceText, setSourceText] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState('structured');
  const [modePack, setModePack] = useState<'core' | 'exam' | 'reference'>('core');
  const [outputFocus, setOutputFocus] = useState<'clarity' | 'compression' | 'retention'>('clarity');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput['notes'] | null>(null);
  const { toast } = useToast();

  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  useEffect(() => {
    const savedLength = localStorage.getItem('tools.notes.length');
    const savedStyle = localStorage.getItem('tools.notes.style');
    const savedPack = localStorage.getItem('tools.notes.pack');
    const savedFocus = localStorage.getItem('tools.notes.focus');
    if (savedLength === 'short' || savedLength === 'medium' || savedLength === 'long') setLength(savedLength);
    if (savedStyle) setStyle(savedStyle);
    if (savedPack === 'core' || savedPack === 'exam' || savedPack === 'reference') setModePack(savedPack);
    if (savedFocus === 'clarity' || savedFocus === 'compression' || savedFocus === 'retention') setOutputFocus(savedFocus);
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
          sourceText, length, style, modePack, outputFocus,
          highlightTitles: false, fontFamily: 'default',
        },
      });
      setGeneratedNotes((run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error?.message || 'Unable to generate notes',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { localStorage.setItem('tools.notes.length', length); }, [length]);
  useEffect(() => { localStorage.setItem('tools.notes.style', style); }, [style]);
  useEffect(() => { localStorage.setItem('tools.notes.pack', modePack); }, [modePack]);
  useEffect(() => { localStorage.setItem('tools.notes.focus', outputFocus); }, [outputFocus]);

  const lengthMap: Record<string, number> = { short: 0, medium: 1, long: 2 };
  const lengthFromSlider = (v: number) => (['short', 'medium', 'long'] as const)[v];

  const packOptions = [
    { value: 'core', label: 'Core' },
    { value: 'exam', label: 'Exam' },
    { value: 'reference', label: 'Reference' },
  ];

  const styleOptions = [
    { value: 'structured', label: 'Structured' },
    { value: 'standard', label: 'Standard' },
    { value: 'bullet-points', label: 'Cornell' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'mindmap', label: 'Mindmap' },
    { value: 'vocabulary', label: 'Vocabulary' },
  ];

  const focusOptions = [
    { value: 'clarity', label: 'Clarity' },
    { value: 'compression', label: 'Cram' },
    { value: 'retention', label: 'Retention' },
  ];

  if (generatedNotes) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => setGeneratedNotes(null)} className="rounded-full">
            ← Back
          </Button>
          <NoteViewer notes={generatedNotes} />
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <PillSelector
        label="Pack"
        options={packOptions}
        value={modePack}
        onChange={(v) => setModePack(v as 'core' | 'exam' | 'reference')}
        disabled={isLoading}
      />

      <PillSelector
        label="Style"
        options={styleOptions}
        value={style}
        onChange={setStyle}
        disabled={isLoading}
      />

      <PillSelector
        label="Focus"
        options={focusOptions}
        value={outputFocus}
        onChange={(v) => setOutputFocus(v as 'clarity' | 'compression' | 'retention')}
        disabled={isLoading}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Length</p>
          <span className="text-xs font-mono capitalize">{length}</span>
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

      <Button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full rounded-full"
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Notes
      </Button>
    </>
  );

  return (
    <WorkbenchShell title="Notes" sidebar={sidebar}>
      <SourceInput
        value={sourceText}
        onChange={setSourceText}
        onSubmit={handleGenerate}
        placeholder="Paste or type your source material..."
      />
    </WorkbenchShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { ArtifactCollabPanel } from '@/components/tools/artifact-collab-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ToolRun = {
  id: string;
  status: string;
  created_at: string;
  finished_at?: string | null;
  error_message?: string | null;
};

export default function NotesPage() {
  const [sourceText, setSourceText] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState('structured');
  const [modePack, setModePack] = useState<'core' | 'exam' | 'reference'>('core');
  const [outputFocus, setOutputFocus] = useState<'clarity' | 'compression' | 'retention'>('clarity');
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<string>('free');
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput['notes'] | null>(null);
  const [history, setHistory] = useState<ToolRun[]>([]);
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);
  const { toast } = useToast();

  const canGenerate = sourceText.trim().length > 0 && !isLoading;

  const loadHistory = async () => {
    const res = await fetch('/api/tools/v2/runs');
    if (!res.ok) return;
    const data = (await res.json()) as ToolRun[];
    setHistory(data.filter((r: any) => r.tool_id === 'notes').slice(0, 8));
  };

  useEffect(() => {
    const savedLength = localStorage.getItem('tools.notes.length');
    const savedStyle = localStorage.getItem('tools.notes.style');
    const savedPack = localStorage.getItem('tools.notes.pack');
    const savedFocus = localStorage.getItem('tools.notes.focus');
    if (savedLength === 'short' || savedLength === 'medium' || savedLength === 'long') {
      setLength(savedLength);
    }
    if (savedStyle) {
      setStyle(savedStyle);
    }
    if (savedPack === 'core' || savedPack === 'exam' || savedPack === 'reference') {
      setModePack(savedPack);
    }
    if (savedFocus === 'clarity' || savedFocus === 'compression' || savedFocus === 'retention') {
      setOutputFocus(savedFocus);
    }

    const loadMeta = async () => {
      const usageRes = await fetch('/api/billing/v1/usage-summary');
      if (usageRes.ok) {
        const usage = await usageRes.json();
        setPlan(usage.plan || 'free');
      }
      await loadHistory();
    };
    loadMeta();
  }, []);

  const handleGenerate = async () => {
    if (!sourceText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Source text is required',
        description: 'Paste text before generating notes.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const run = await runToolFlowV2({
        toolId: 'notes',
        flowName: 'generateNotes',
        mode: style,
        artifactType: 'notes',
        artifactTitle: 'Generated Notes',
        input: {
          sourceText,
          length,
          style,
          modePack,
          outputFocus,
          highlightTitles: false,
          fontFamily: 'default',
        },
      });

      setGeneratedNotes((run?.output_payload?.notes || run?.notes || null) as GenerateNotesOutput['notes'] | null);
      setLatestArtifactId(run?.output_artifact_id || null);
      await loadHistory();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error?.message || 'Unable to generate notes from provided source text',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('tools.notes.length', length);
  }, [length]);

  useEffect(() => {
    localStorage.setItem('tools.notes.style', style);
  }, [style]);

  useEffect(() => {
    localStorage.setItem('tools.notes.pack', modePack);
  }, [modePack]);

  useEffect(() => {
    localStorage.setItem('tools.notes.focus', outputFocus);
  }, [outputFocus]);

  const leftPanel = useMemo(
    () => (
      <div className="space-y-3 pt-1">
        <div className="space-y-2">
          <Label htmlFor="source">Source Text</Label>
          <Textarea
            id="source"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void handleGenerate();
              }
            }}
            placeholder="Paste your source content here..."
            className="min-h-[74vh] text-sm"
          />
          <p className="text-xs text-muted-foreground">Use Ctrl/Cmd + Enter to generate.</p>
        </div>
      </div>
    ),
    [sourceText, handleGenerate]
  );

  const centerPanel = (
    <div className="space-y-3 pt-1">
      {generatedNotes && <NoteViewer notes={generatedNotes} />}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4 pt-1">
      <div className="space-y-3">
        <Tabs value={modePack} onValueChange={(v) => setModePack(v as 'core' | 'exam' | 'reference')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="exam">Exam</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="structured">Structured</option>
          <option value="standard">Standard</option>
          <option value="bullet-points">Cornell / Bullet</option>
          <option value="timeline">Exam-cram Timeline</option>
          <option value="mindmap">Mindmap</option>
          <option value="vocabulary">Citation / Vocabulary</option>
        </select>
        <Tabs value={outputFocus} onValueChange={(v) => setOutputFocus(v as 'clarity' | 'compression' | 'retention')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clarity">Clarity</TabsTrigger>
            <TabsTrigger value="compression">Cram</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-2">
        <Label>Length</Label>
        <select
          value={length}
          onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>
      <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate Notes
      </Button>

      <ArtifactCollabPanel
        latestArtifactId={latestArtifactId}
        isLoading={isLoading}
        plan={plan}
        history={history}
        showDiffPreview
        transformActions={[
          {
            label: 'Transform to Quiz',
            successMessage: 'Quiz artifact created',
            request: {
              targetToolId: 'quiz',
              targetFlowName: 'generateQuiz',
              transformInput: { sourceText, questionCount: 10 },
              title: 'Quiz from Notes',
            },
          },
          {
            label: 'Transform to Flashcards',
            successMessage: 'Flashcard artifact created',
            request: {
              targetToolId: 'flashcards',
              targetFlowName: 'generateFlashcards',
              transformInput: { sourceText, count: 12 },
              title: 'Flashcards from Notes',
            },
          },
        ]}
      />

    </div>
  );

  return (
    <WorkbenchShell
      title="Notes Studio"
      description="Generate structured notes and keep every run/version in the shared toolbox pipeline."
      plan={plan}
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  );
}

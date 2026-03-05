'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { runToolFlowV2 } from '@/lib/toolbox/client';

type ToolRun = {
  id: string;
  status: string;
  created_at: string;
  error_message?: string | null;
};

export default function NotesPage() {
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState('structured');
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
        artifactTitle: topic ? `${topic} Notes` : 'Generated Notes',
        input: {
          sourceText,
          topic: topic || undefined,
          length,
          style,
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
        description: error?.message || 'Unable to generate notes',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const leftPanel = useMemo(
    () => (
      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <Label htmlFor="topic">Topic (optional)</Label>
          <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. French Revolution" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source Text</Label>
          <Textarea
            id="source"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste your source content here..."
            className="min-h-[320px]"
          />
        </div>
      </div>
    ),
    [sourceText, topic]
  );

  const centerPanel = (
    <div className="space-y-3 pt-1">
      {!generatedNotes && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Generated notes will appear here after you run the tool.
        </div>
      )}
      {generatedNotes && <NoteViewer notes={generatedNotes} />}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4 pt-1">
      <div className="space-y-2">
        <Label>Style</Label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="structured">Structured</option>
          <option value="bullet-points">Bullet Points</option>
          <option value="standard">Standard</option>
          <option value="timeline">Timeline</option>
          <option value="mindmap">Mindmap</option>
          <option value="vocabulary">Vocabulary</option>
        </select>
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

      <div className="space-y-2">
        <Label>Cross-tool Actions</Label>
        <Button
          variant="outline"
          className="w-full"
          disabled={!latestArtifactId || isLoading}
          onClick={async () => {
            if (!latestArtifactId) return;
            try {
              const res = await fetch(`/api/tools/v2/artifacts/${latestArtifactId}/transform`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  targetToolId: 'quiz',
                  targetFlowName: 'generateQuiz',
                  transformInput: { sourceText, questionCount: 10 },
                  title: 'Quiz from Notes',
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || 'Transform failed');
              toast({ title: 'Quiz artifact created', description: 'Transformed from current notes.' });
            } catch (error: any) {
              toast({ variant: 'destructive', title: 'Transform failed', description: error?.message || 'Unable to transform artifact' });
            }
          }}
        >
          Transform to Quiz
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={!latestArtifactId || isLoading}
          onClick={async () => {
            if (!latestArtifactId) return;
            try {
              const res = await fetch(`/api/tools/v2/artifacts/${latestArtifactId}/transform`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  targetToolId: 'flashcards',
                  targetFlowName: 'generateFlashcards',
                  transformInput: { sourceText, count: 12 },
                  title: 'Flashcards from Notes',
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error || 'Transform failed');
              toast({ title: 'Flashcard artifact created', description: 'Transformed from current notes.' });
            } catch (error: any) {
              toast({ variant: 'destructive', title: 'Transform failed', description: error?.message || 'Unable to transform artifact' });
            }
          }}
        >
          Transform to Flashcards
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Recent Runs</Label>
          <Badge variant="outline">{plan.toUpperCase()}</Badge>
        </div>
        <div className="space-y-2">
          {history.length === 0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
          {history.map((run) => (
            <div key={run.id} className="rounded-md border p-2">
              <p className="text-xs font-medium">{run.status}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
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

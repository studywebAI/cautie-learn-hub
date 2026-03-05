'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Copy, FileSignature, Blocks, Sparkles, Clock3, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDictionary } from '@/contexts/app-context';
import { ToolboxCommandPalette } from '@/components/tools/toolbox-command-palette';

type UsageSummary = {
  usage: { dailyRuns: number };
  limits: { dailyRuns: number };
  remaining: { dailyRuns: number };
  plan: string;
};

type ToolRun = {
  id: string;
  tool_id: string;
  status: string;
  created_at: string;
};

type Artifact = {
  id: string;
  title: string;
  tool_id: string;
  updated_at: string;
};

export default function ToolsPage() {
  const { dictionary } = useDictionary();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  const tools = useMemo(
    () => [
      {
        key: 'quiz',
        title: dictionary.sidebar.tools.quizGenerator || 'Quiz',
        description: dictionary.tools.quiz.description || 'Generate quizzes from your source content.',
        icon: BrainCircuit,
        href: '/tools/quiz',
      },
      {
        key: 'flashcards',
        title: dictionary.sidebar.tools.flashcardMaker || 'Flashcards',
        description: dictionary.tools.flashcards.description || 'Create study decks and active recall cards.',
        icon: Copy,
        href: '/tools/flashcards',
      },
      {
        key: 'notes',
        title: dictionary.sidebar.tools.notes || 'Notes',
        description: dictionary.tools.material?.description || 'Generate structured study notes.',
        icon: FileSignature,
        href: '/tools/notes',
      },
      {
        key: 'blocks',
        title: dictionary.sidebar.tools.blocks || 'Blocks',
        description: 'Build reusable structured learning materials.',
        icon: Blocks,
        href: '/tools/blocks',
      },
    ],
    [dictionary]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, runsRes, artifactsRes] = await Promise.all([
          fetch('/api/billing/v1/usage-summary'),
          fetch('/api/tools/v2/runs'),
          fetch('/api/tools/v2/artifacts'),
        ]);

        if (usageRes.ok) {
          setUsage(await usageRes.json());
        }
        if (runsRes.ok) {
          setRuns(await runsRes.json());
        }
        if (artifactsRes.ok) {
          setArtifacts(await artifactsRes.json());
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentArtifacts = artifacts.slice(0, 5);
  const recentRuns = runs.slice(0, 6);
  const runByTool = recentRuns.reduce<Record<string, number>>((acc, run) => {
    acc[run.tool_id] = (acc[run.tool_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-headline">Toolbox</CardTitle>
                <CardDescription>
                  Unified workspace for notes, quizzes, flashcards, and structured materials.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ToolboxCommandPalette />
                <Badge variant="secondary">{usage?.plan?.toUpperCase() || 'FREE'}</Badge>
                {usage && (
                  <Badge variant="outline">
                    {usage.usage.dailyRuns}/{usage.limits.dailyRuns} runs today
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full justify-start">
                  <Link href="/tools/quiz">Create Quiz</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/tools/notes">Generate Notes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/tools/flashcards">Build Flashcards</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Continue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {recentArtifacts.length === 0 && <p className="text-muted-foreground">No recent artifacts yet.</p>}
                {recentArtifacts.map((a) => (
                  <div key={a.id} className="rounded-md border p-2">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-muted-foreground text-xs">{a.tool_id}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Recommended
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="rounded-md border p-2">Convert notes into a quiz for retrieval practice.</p>
                <p className="rounded-md border p-2">Generate flashcards from your latest quiz mistakes.</p>
                <p className="rounded-md border p-2">Use blocks to package reusable lesson content.</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card key={tool.key} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-headline text-xl">{tool.title}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Recent runs: {runByTool[tool.key] || 0}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={tool.href}>
                      Open Workbench
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {!loading && recentRuns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Runs</CardTitle>
              <CardDescription>Execution history from the unified tools pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{run.tool_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={run.status === 'succeeded' ? 'secondary' : 'outline'}>{run.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

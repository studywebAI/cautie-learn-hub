'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Copy, FileSignature, Sparkles, Clock3, Wand2, Route } from 'lucide-react';
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
  input_payload?: Record<string, any>;
};

type Artifact = {
  id: string;
  title: string;
  tool_id?: string;
  artifact_type?: string;
  updated_at: string;
};

type AnnouncementLite = {
  id: string;
  title?: string | null;
  content?: string | null;
};

const TOOL_LABELS: Record<string, string> = {
  studyset: 'Studyset',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  notes: 'Notes',
};

function extractRecommendedTool(input: string) {
  const marker = input.match(/\[TOOL_REC:(studyset|quiz|flashcards|notes)\]/i);
  if (marker?.[1]) return marker[1].toLowerCase();
  const urlHint = input.match(/\/tools\/(studyset|quiz|flashcards|notes)\b/i);
  if (urlHint?.[1]) return urlHint[1].toLowerCase();
  return null;
}

export default function ToolsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { dictionary } = useDictionary();
  const sidebarTools = dictionary.sidebar.tools as Record<string, string | undefined>;
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [teacherRecommendationCount, setTeacherRecommendationCount] = useState(0);
  const [teacherRecommendationHref, setTeacherRecommendationHref] = useState<string | null>(null);
  const [teacherRecommendedTools, setTeacherRecommendedTools] = useState<string[]>([]);
  const [recommendedToolDraft, setRecommendedToolDraft] = useState('quiz');
  const [publishingRecommendation, setPublishingRecommendation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readClassId = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedClassId(params.get('classId'));
    };
    readClassId();
    window.addEventListener('popstate', readClassId);
    return () => window.removeEventListener('popstate', readClassId);
  }, []);

  const tools = useMemo(
    () => [
      {
        key: 'studyset',
        title: 'Studyset',
        description: 'Build long-term, day-by-day study plans from all your material.',
        icon: Route,
        href: '/tools/studyset',
      },
      {
        key: 'quiz',
        title: sidebarTools.quizGenerator || 'Quiz',
        description: dictionary.tools.quiz.description || 'Generate quizzes from your source content.',
        icon: BrainCircuit,
        href: '/tools/quiz',
      },
      {
        key: 'flashcards',
        title: sidebarTools.flashcardMaker || 'Flashcards',
        description: dictionary.tools.flashcards.description || 'Create study decks and active recall cards.',
        icon: Copy,
        href: '/tools/flashcards',
      },
      {
        key: 'notes',
        title: sidebarTools.notes || 'Notes',
        description: dictionary.tools.material?.description || 'Generate structured study notes.',
        icon: FileSignature,
        href: '/tools/notes',
      },
    ],
    [dictionary, sidebarTools]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [usageRes, runsRes, artifactsRes, roleRes] = await Promise.all([
          fetch('/api/billing/v1/usage-summary'),
          fetch('/api/tools/v2/runs'),
          fetch('/api/tools/v2/artifacts'),
          fetch('/api/user/role'),
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
        if (roleRes.ok) {
          const roleJson = await roleRes.json();
          setRole(roleJson?.subscription_type === 'teacher' ? 'teacher' : 'student');
        }

        // Tiny recommendation chip:
        // only render when explicit recommendation records exist for the selected class.
        if (selectedClassId) {
          const announcementsRes = await fetch(`/api/classes/${encodeURIComponent(selectedClassId)}/announcements`);
          if (announcementsRes.ok) {
            const announcements = (await announcementsRes.json()) as AnnouncementLite[];
            const recommendations = (Array.isArray(announcements) ? announcements : [])
              .map((announcement) =>
                extractRecommendedTool(`${announcement.title || ''}\n${announcement.content || ''}`)
              )
              .filter(Boolean) as string[];
            setTeacherRecommendationCount(recommendations.length);
            setTeacherRecommendedTools(recommendations);
            setTeacherRecommendationHref(
              recommendations.length > 0
                ? `/tools/${recommendations[0]}?classId=${encodeURIComponent(selectedClassId)}`
                : null
            );
          } else {
            setTeacherRecommendationCount(0);
            setTeacherRecommendationHref(null);
            setTeacherRecommendedTools([]);
          }
        } else {
          setTeacherRecommendationCount(0);
          setTeacherRecommendationHref(null);
          setTeacherRecommendedTools([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClassId]);

  const publishToolRecommendation = async () => {
    if (!selectedClassId || role !== 'teacher' || publishingRecommendation) return;
    setPublishingRecommendation(true);
    try {
      const tool = recommendedToolDraft;
      const toolLabel = TOOL_LABELS[tool] || 'Tool';
      const recommendationHref = `/tools/${tool}?classId=${encodeURIComponent(selectedClassId)}`;
      const response = await fetch(`/api/classes/${encodeURIComponent(selectedClassId)}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[TOOL_REC:${tool}] ${toolLabel} recommended`,
          content: `Use this in toolbox: ${recommendationHref}`,
        }),
      });
      if (!response.ok) return;
      setTeacherRecommendationCount((value) => value + 1);
      setTeacherRecommendationHref(recommendationHref);
      setTeacherRecommendedTools((value) => [tool, ...value]);
    } finally {
      setPublishingRecommendation(false);
    }
  };

  const recentArtifacts = artifacts.slice(0, 5);
  const recentRuns = runs.slice(0, 6);
  const latestRun = runs[0];
  const latestSourceText = typeof latestRun?.input_payload?.sourceText === 'string' ? latestRun.input_payload.sourceText : '';
  const resumeHref = latestRun?.tool_id
    ? latestSourceText
      ? `/tools/${latestRun.tool_id}?sourceText=${encodeURIComponent(latestSourceText.slice(0, 1200))}`
      : `/tools/${latestRun.tool_id}`
    : null;
  const runByTool = recentRuns.reduce<Record<string, number>>((acc, run) => {
    acc[run.tool_id] = (acc[run.tool_id] || 0) + 1;
    return acc;
  }, {});
  const recommendationCounts = teacherRecommendedTools.reduce<Record<string, number>>((acc, tool) => {
    acc[tool] = (acc[tool] || 0) + 1;
    return acc;
  }, {});
  const topTeacherPicks = Object.entries(recommendationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const recommendedTool = Object.entries(runByTool).sort((a, b) => b[1] - a[1])[0]?.[0] || 'quiz';

  return (
    <div className="h-full overflow-auto p-5 md:p-7">
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
                {role === 'teacher' && selectedClassId && (
                  <div className="flex items-center gap-1 rounded-md border px-1 py-0.5">
                    <select
                      aria-label="Recommend tool"
                      value={recommendedToolDraft}
                      onChange={(event) => setRecommendedToolDraft(event.target.value)}
                      className="h-5 border-0 bg-transparent px-0 text-[10px] text-muted-foreground focus:outline-none"
                    >
                      <option value="studyset">studyset</option>
                      <option value="quiz">quiz</option>
                      <option value="notes">notes</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={publishingRecommendation}
                      className="h-5 px-1.5 text-[10px]"
                      onClick={publishToolRecommendation}
                    >
                      recommend
                    </Button>
                  </div>
                )}
                {teacherRecommendationCount > 0 && teacherRecommendationHref && (
                  <Button asChild variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                    <Link prefetch={false} href={teacherRecommendationHref}>teacher picks {teacherRecommendationCount}</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {role === 'student' && selectedClassId && topTeacherPicks.length > 0 && (
              <div className="md:col-span-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed px-2 py-1.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Teacher picks</span>
                {topTeacherPicks.map(([tool, count]) => (
                  <Button
                    key={tool}
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                  >
                    <Link prefetch={false} href={`/tools/${tool}?classId=${encodeURIComponent(selectedClassId)}`}>
                      {TOOL_LABELS[tool] || tool} x{count}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full justify-start">
                  <Link prefetch={false} href="/tools/studyset">Create Studyset</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link prefetch={false} href="/tools/quiz">Create Quiz</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link prefetch={false} href="/tools/notes">Generate Notes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link prefetch={false} href="/tools/flashcards">Build Flashcards</Link>
                </Button>
                {latestRun?.tool_id && (
                  <Button asChild variant="secondary" className="w-full justify-start">
                    <Link prefetch={false} href={resumeHref || `/tools/${latestRun.tool_id}`}>Continue Last Session</Link>
                  </Button>
                )}
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
                {latestRun && (
                  <div className="rounded-md border p-2">
                    <p className="font-medium">Last run: {latestRun.tool_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(latestRun.created_at).toLocaleString()}</p>
                  </div>
                )}
                {recentArtifacts.length === 0 && <p className="text-muted-foreground">No recent artifacts yet.</p>}
                {recentArtifacts.map((a) => (
                  <Link prefetch={false} key={a.id} href={`/material/${a.id}`} className="block rounded-md border p-2 hover:bg-muted/40">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-muted-foreground text-xs">{a.tool_id || a.artifact_type || 'artifact'}</p>
                  </Link>
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
                <p className="rounded-md border p-2">Most-used studio: <span className="font-medium">{recommendedTool}</span></p>
                <p className="rounded-md border p-2">Convert your latest artifact into another format in one click.</p>
                <p className="rounded-md border p-2">Run with longer source text for higher-quality output and fewer retries.</p>
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
                    <Link prefetch={false} href={tool.href}>
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

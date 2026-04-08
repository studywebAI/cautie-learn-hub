'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Link2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type ToolId = 'studyset' | 'quiz' | 'flashcards' | 'notes' | 'presentation';

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
  presentation: 'Presentation',
};

function extractRecommendedTool(input: string) {
  const marker = input.match(/\[TOOL_REC:(studyset|quiz|flashcards|notes|presentation)\]/i);
  if (marker?.[1]) return marker[1].toLowerCase();
  const urlHint = input.match(/\/tools\/(studyset|quiz|flashcards|notes|presentation)\b/i);
  if (urlHint?.[1]) return urlHint[1].toLowerCase();
  return null;
}

export function ToolContextPanel({
  currentTool,
  classId,
  compact = true,
}: {
  currentTool: ToolId;
  classId?: string | null;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [teacherRecommendedTools, setTeacherRecommendedTools] = useState<string[]>([]);
  const [recommendedToolDraft, setRecommendedToolDraft] = useState<ToolId>('quiz');
  const [publishingRecommendation, setPublishingRecommendation] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [microsoftEmail, setMicrosoftEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedClassId = useMemo(() => {
    if (classId) return classId;
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('studyweb-last-class-id');
  }, [classId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usageRes, runsRes, artifactsRes, roleRes, microsoftRes] = await Promise.all([
          fetch('/api/billing/v1/usage-summary', { cache: 'no-store' }),
          fetch('/api/tools/v2/runs', { cache: 'no-store' }),
          fetch('/api/tools/v2/artifacts', { cache: 'no-store' }),
          fetch('/api/user/role', { cache: 'no-store' }),
          fetch('/api/integrations/microsoft/status', { cache: 'no-store' }),
        ]);

        if (usageRes.ok) setUsage(await usageRes.json());
        if (runsRes.ok) setRuns(await runsRes.json());
        if (artifactsRes.ok) setArtifacts(await artifactsRes.json());
        if (roleRes.ok) {
          const roleJson = await roleRes.json();
          setRole(roleJson?.subscription_type === 'teacher' ? 'teacher' : 'student');
        }
        if (microsoftRes.ok) {
          const microsoftJson = await microsoftRes.json();
          setMicrosoftConnected(Boolean(microsoftJson?.connected));
          setMicrosoftEmail(String(microsoftJson?.account_email || ''));
        }

        if (selectedClassId) {
          const announcementsRes = await fetch(`/api/classes/${encodeURIComponent(selectedClassId)}/announcements`, { cache: 'no-store' });
          if (announcementsRes.ok) {
            const announcements = (await announcementsRes.json()) as AnnouncementLite[];
            const recommendations = (Array.isArray(announcements) ? announcements : [])
              .map((announcement) => extractRecommendedTool(`${announcement.title || ''}\n${announcement.content || ''}`))
              .filter(Boolean) as string[];
            setTeacherRecommendedTools(recommendations);
          } else {
            setTeacherRecommendedTools([]);
          }
        } else {
          setTeacherRecommendedTools([]);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedClassId]);

  const publishToolRecommendation = useCallback(async () => {
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
          content: `Use this in tools: ${recommendationHref}`,
        }),
      });
      if (!response.ok) throw new Error('Could not publish recommendation');
      setTeacherRecommendedTools((prev) => [tool, ...prev]);
      toast({ title: 'Recommendation sent' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Recommendation failed', description: error?.message || 'Try again.' });
    } finally {
      setPublishingRecommendation(false);
    }
  }, [publishingRecommendation, recommendedToolDraft, role, selectedClassId, toast]);

  const recentRuns = useMemo(() => runs.filter((run) => run.status === 'succeeded').slice(0, 5), [runs]);
  const recentArtifacts = useMemo(() => artifacts.slice(0, 4), [artifacts]);
  const latestCurrentToolRun = useMemo(
    () => recentRuns.find((run) => run.tool_id === currentTool) || null,
    [currentTool, recentRuns]
  );

  const teacherPickCounts = useMemo(() => {
    return teacherRecommendedTools.reduce<Record<string, number>>((acc, tool) => {
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {});
  }, [teacherRecommendedTools]);

  const layoutClass = compact
    ? 'space-y-3 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3'
    : 'space-y-3 rounded-xl border border-border bg-muted/30 p-4';

  return (
    <div className={layoutClass}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{usage?.plan?.toUpperCase() || 'FREE'}</Badge>
        {usage ? <Badge variant="outline">{usage.usage.dailyRuns}/{usage.limits.dailyRuns} today</Badge> : null}
      </div>

      {latestCurrentToolRun ? (
        <Button asChild variant="outline" size="sm" className="h-8 w-full justify-between text-xs">
          <Link
            prefetch={false}
            href={`/tools/${latestCurrentToolRun.tool_id}?runId=${encodeURIComponent(latestCurrentToolRun.id)}`}
          >
            Continue {TOOL_LABELS[currentTool]}
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      ) : null}

      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Recent runs</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : recentRuns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="space-y-1">
            {recentRuns.map((run) => (
              <Link
                prefetch={false}
                key={run.id}
                href={`/tools/${run.tool_id}?runId=${encodeURIComponent(run.id)}`}
                className="block rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted/40"
              >
                <span className="font-medium">{TOOL_LABELS[run.tool_id] || run.tool_id}</span>
                <span className="ml-2 text-muted-foreground">{new Date(run.created_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Recent files</p>
        {recentArtifacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved outputs yet.</p>
        ) : (
          <div className="space-y-1">
            {recentArtifacts.map((artifact) => (
              <Link
                prefetch={false}
                key={artifact.id}
                href={`/material/${artifact.id}`}
                className="block rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted/40"
              >
                <span className="truncate font-medium">{artifact.title || 'Untitled'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/60 px-2 py-1.5 text-xs">
        <p className="flex items-center gap-1 font-medium">
          <Link2 className="h-3.5 w-3.5" />
          Microsoft
        </p>
        <p className="mt-1 text-muted-foreground">
          {microsoftConnected ? `Connected as ${microsoftEmail || 'account'}` : 'Not connected'}
        </p>
      </div>

      {selectedClassId ? (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Teacher picks</p>
          {Object.keys(teacherPickCounts).length === 0 ? (
            <p className="text-xs text-muted-foreground">No recommendations yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {Object.entries(teacherPickCounts).map(([tool, count]) => (
                <Button key={tool} asChild variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                  <Link prefetch={false} href={`/tools/${tool}?classId=${encodeURIComponent(selectedClassId)}`}>
                    {TOOL_LABELS[tool] || tool} x{count}
                  </Link>
                </Button>
              ))}
            </div>
          )}

          {role === 'teacher' ? (
            <div className="flex items-center gap-1 pt-1">
              <select
                aria-label="Recommend tool"
                value={recommendedToolDraft}
                onChange={(event) => setRecommendedToolDraft(event.target.value as ToolId)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="studyset">studyset</option>
                <option value="quiz">quiz</option>
                <option value="flashcards">flashcards</option>
                <option value="notes">notes</option>
                <option value="presentation">presentation</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void publishToolRecommendation()}
                disabled={publishingRecommendation}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Recommend
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

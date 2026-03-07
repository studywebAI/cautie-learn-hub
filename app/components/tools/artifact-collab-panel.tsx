'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type ArtifactVersion = {
  id: string;
  version_number: number;
  content: any;
  created_at: string;
};

type CollabComment = {
  id: string;
  content: string;
  created_at: string;
};

type Suggestion = {
  id: string;
  note: string | null;
  status: string;
  created_at: string;
};

type TransformAction = {
  label: string;
  request: {
    targetToolId: string;
    targetFlowName: string;
    transformInput?: Record<string, any>;
    title?: string;
  };
  successMessage?: string;
};

type Props = {
  latestArtifactId: string | null;
  isLoading?: boolean;
  plan: string;
  history: Array<{ id: string; status: string; created_at: string; finished_at?: string | null }>;
  transformActions?: TransformAction[];
  showDiffPreview?: boolean;
};

export function ArtifactCollabPanel({
  latestArtifactId,
  isLoading = false,
  plan,
  history,
  transformActions = [],
  showDiffPreview = false,
}: Props) {
  const [artifactVersions, setArtifactVersions] = useState<ArtifactVersion[]>([]);
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [suggestionDraft, setSuggestionDraft] = useState('');
  const { toast } = useToast();

  const loadArtifactData = async () => {
    if (!latestArtifactId) {
      setArtifactVersions([]);
      setComments([]);
      setSuggestions([]);
      return;
    }
    const [historyRes, commentsRes, suggestionsRes] = await Promise.all([
      fetch(`/api/tools/v2/artifacts/${latestArtifactId}/history`),
      fetch(`/api/collab/v1/comments?artifactId=${latestArtifactId}`),
      fetch(`/api/collab/v1/suggestions?artifactId=${latestArtifactId}`),
    ]);

    if (historyRes.ok) {
      const data = await historyRes.json();
      setArtifactVersions(data.versions || []);
    }
    if (commentsRes.ok) {
      setComments(await commentsRes.json());
    }
    if (suggestionsRes.ok) {
      setSuggestions(await suggestionsRes.json());
    }
  };

  useEffect(() => {
    loadArtifactData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestArtifactId]);

  const diffSummary = useMemo(() => {
    if (!showDiffPreview || artifactVersions.length < 2) return null;
    const latest = JSON.stringify(artifactVersions[0].content);
    const previous = JSON.stringify(artifactVersions[1].content);
    return latest.length - previous.length;
  }, [artifactVersions, showDiffPreview]);

  const formatDuration = (createdAt: string, finishedAt?: string | null) => {
    if (!finishedAt) return null;
    const start = new Date(createdAt).getTime();
    const end = new Date(finishedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
    const ms = end - start;
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-2">
          {latestArtifactId && (
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/material/${latestArtifactId}`}>Open Current Artifact</Link>
            </Button>
          )}
          {transformActions.length === 0 && (
            <p className="text-xs text-muted-foreground">No transform actions configured.</p>
          )}
          {transformActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="w-full"
              disabled={!latestArtifactId || isLoading}
              onClick={async () => {
                if (!latestArtifactId) return;
                try {
                  const res = await fetch(`/api/tools/v2/artifacts/${latestArtifactId}/transform`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(action.request),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error || 'Transform failed');
                  toast({
                    title: action.successMessage || 'Transform created',
                    description: data?.id ? `Open: /material/${data.id}` : undefined,
                  });
                } catch (error: any) {
                  toast({
                    variant: 'destructive',
                    title: 'Transform failed',
                    description: error?.message || 'Unable to transform artifact',
                  });
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          {artifactVersions.length === 0 && <p className="text-xs text-muted-foreground">No artifact versions yet.</p>}
          {artifactVersions.map((version) => (
            <div key={version.id} className="rounded-md border p-2">
              <p className="text-xs font-medium">Version {version.version_number}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(version.created_at).toLocaleString()}</p>
            </div>
          ))}
          {diffSummary !== null && (
            <div className="rounded-md border border-dashed p-2">
              <p className="text-xs font-medium">Latest Diff Preview</p>
              <p className="text-[11px] text-muted-foreground">
                Size change: {diffSummary >= 0 ? '+' : ''}{diffSummary} chars
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-2">
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Add collaboration comment..."
            className="min-h-[90px]"
          />
          <Button
            className="w-full"
            disabled={!latestArtifactId || !commentDraft.trim()}
            onClick={async () => {
              if (!latestArtifactId || !commentDraft.trim()) return;
              try {
                const res = await fetch('/api/collab/v1/comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    artifactId: latestArtifactId,
                    content: commentDraft.trim(),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Comment failed');
                setCommentDraft('');
                await loadArtifactData();
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Comment failed', description: error?.message || 'Unable to add comment' });
              }
            }}
          >
            Add Comment
          </Button>
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border p-2">
              <p className="text-xs">{comment.content}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-2">
          <Textarea
            value={suggestionDraft}
            onChange={(e) => setSuggestionDraft(e.target.value)}
            placeholder="Propose an improvement suggestion..."
            className="min-h-[90px]"
          />
          <Button
            className="w-full"
            disabled={!latestArtifactId || !suggestionDraft.trim()}
            onClick={async () => {
              if (!latestArtifactId || !suggestionDraft.trim()) return;
              try {
                const res = await fetch('/api/collab/v1/suggestions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    artifactId: latestArtifactId,
                    patch: { summary: suggestionDraft.trim() },
                    note: suggestionDraft.trim(),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Suggestion failed');
                setSuggestionDraft('');
                await loadArtifactData();
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Suggestion failed', description: error?.message || 'Unable to create suggestion' });
              }
            }}
          >
            Create Suggestion
          </Button>
          {suggestions.length === 0 && <p className="text-xs text-muted-foreground">No suggestions yet.</p>}
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-md border p-2">
              <p className="text-xs">{suggestion.note || 'No note'}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">{new Date(suggestion.created_at).toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{suggestion.status}</Badge>
                  {suggestion.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/collab/v1/suggestions/${suggestion.id}/apply`, { method: 'POST' });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || 'Apply failed');
                          await loadArtifactData();
                          toast({ title: 'Suggestion applied' });
                        } catch (error: any) {
                          toast({ variant: 'destructive', title: 'Apply failed', description: error?.message || 'Unable to apply suggestion' });
                        }
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Recent Runs</Label>
          <Badge variant="outline">{plan.toUpperCase()}</Badge>
        </div>
        {history.length === 0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
        {history.map((run) => (
          <div key={run.id} className="rounded-md border p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{run.status}</p>
              {formatDuration(run.created_at, run.finished_at) && (
                <Badge variant="secondary" className="text-[10px]">
                  {formatDuration(run.created_at, run.finished_at)}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

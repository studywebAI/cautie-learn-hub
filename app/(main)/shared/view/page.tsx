'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type SharedData =
  | {
      kind: 'tool_run';
      title: string;
      href: string;
      run: {
        id: string;
        tool_id: string;
        mode: string | null;
        input_payload: any;
        options_payload: any;
        output_payload: any;
        created_at: string;
        finished_at: string | null;
      };
    }
  | {
      kind: 'link';
      title: string;
      href: string;
    };

export default function SharedViewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/share/public-link?token=${encodeURIComponent(token)}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(String(payload?.error || 'Failed to load shared content'));
        setData(payload as SharedData);
      } catch (e: any) {
        setError(e?.message || 'Could not load shared content');
      } finally {
        setIsLoading(false);
      }
    };
    if (token) void load();
    else {
      setError('Missing token');
      setIsLoading(false);
    }
  }, [token]);

  if (isLoading) return <div className="page-content text-sm text-muted-foreground">Loading shared content...</div>;
  if (error) return <div className="page-content text-sm text-destructive">{error}</div>;
  if (!data) return <div className="page-content text-sm text-muted-foreground">No shared data found.</div>;

  const copyCurrentUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  return (
    <div className="page-content w-full max-w-5xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-medium">{data.title}</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void copyCurrentUrl()}>
          Copy view link
        </Button>
      </div>
      <div className="rounded-lg border surface-panel p-3">
        <p className="text-xs text-muted-foreground">View-only shared content</p>
        {data.kind === 'tool_run' ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-md surface-interactive p-3">
              <p className="text-xs text-muted-foreground">Tool</p>
              <p className="text-sm">{data.run.tool_id}{data.run.mode ? ` (${data.run.mode})` : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Created: {new Date(data.run.created_at).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <section className="rounded-md surface-interactive p-3">
                <p className="mb-2 text-xs text-muted-foreground">Prompt / Input</p>
                <pre className="max-h-[300px] overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(data.run.input_payload, null, 2)}</pre>
              </section>
              <section className="rounded-md surface-interactive p-3">
                <p className="mb-2 text-xs text-muted-foreground">Settings / Options</p>
                <pre className="max-h-[300px] overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(data.run.options_payload, null, 2)}</pre>
              </section>
            </div>
            <section className="rounded-md surface-interactive p-3">
              <p className="mb-2 text-xs text-muted-foreground">Result</p>
              <pre className="max-h-[440px] overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(data.run.output_payload, null, 2)}</pre>
            </section>
          </div>
        ) : (
          <div className="mt-3">
            <Button type="button" onClick={() => { window.location.href = data.href; }}>
              Open shared link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

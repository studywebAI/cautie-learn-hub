'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function StudysetImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<{ name: string; day_count: number; task_count: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const importStudyset = async () => {
    if (!token) return;
    setImporting(true);
    try {
      const response = await fetch('/api/studysets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Could not import studyset');
      toast({ title: 'Studyset imported', description: 'The studyset is now in your library.' });
      router.push(`/tools/studyset/${json.studysetId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error?.message || 'Try again.',
      });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      setLoadingPreview(true);
      try {
        const response = await fetch(`/api/studysets/import?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error || 'Could not load preview');
        if (json?.preview && typeof json.preview === 'object') {
          setPreview({
            name: String(json.preview.name || 'Shared studyset'),
            day_count: Number(json.preview.day_count || 0),
            task_count: Number(json.preview.task_count || 0),
          });
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Preview unavailable',
          description: error?.message || 'You can still try importing.',
        });
      } finally {
        setLoadingPreview(false);
      }
    };
    void run();
  }, [token, toast]);

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto w-full max-w-xl">
        <Card className="border-none">
          <CardHeader>
            <CardTitle>Import shared studyset</CardTitle>
            <CardDescription>
              Import this shared plan to your account and start with your own daily tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPreview ? (
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            ) : preview ? (
              <div className="rounded-lg bg-background p-3 text-sm">
                <p className="font-medium">{preview.name}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.day_count} days · {preview.task_count} tasks
                </p>
              </div>
            ) : null}
            <Button onClick={() => void importStudyset()} disabled={!token || importing}>
              {importing ? 'Importing...' : 'Import studyset'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StudysetImportPage() {
  return (
    <Suspense fallback={null}>
      <StudysetImportContent />
    </Suspense>
  );
}

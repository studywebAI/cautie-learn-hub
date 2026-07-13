'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, Settings2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToolKey = 'quiz' | 'flashcards' | 'notes' | 'wordweb';

const VALID_TOOLS: ToolKey[] = ['quiz', 'flashcards', 'notes', 'wordweb'];

function LaunchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tool = searchParams.get('tool');
  const studysetId = searchParams.get('studysetId');
  const taskId = searchParams.get('taskId');

  const [taskTitle, setTaskTitle] = useState<string | null>(null);

  // Missing required params — bounce back to the studysets list.
  useEffect(() => {
    if (!tool || !taskId || !VALID_TOOLS.includes(tool as ToolKey)) {
      router.replace('/tools/studyset');
    }
  }, [router, taskId, tool]);

  // Fetch the task name for the header. Falls back to a generic heading on failure.
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    fetch(`/api/studysets/plan-tasks/${taskId}/launch`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const title = String(data?.task?.title || '').trim();
        if (title) setTaskTitle(title);
      })
      .catch(() => {
        /* non-fatal — generic heading is shown */
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (!tool || !taskId || !VALID_TOOLS.includes(tool as ToolKey)) {
    return (
      <div className="page-content">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const go = (mode: 'quick' | 'full' | null) => {
    if (mode === null) {
      // Custom — let the user configure the tool themselves (no launch, no mode).
      router.push(`/tools/${tool}?studysetId=${studysetId}&taskId=${taskId}`);
      return;
    }
    router.push(`/tools/${tool}?studysetId=${studysetId}&taskId=${taskId}&launch=1&mode=${mode}`);
  };

  return (
    <div className="page-content">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Back to studyset"
            onClick={() => router.push(`/tools/studyset/${studysetId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight tracking-tight text-foreground">
              {taskTitle || 'Ready to study?'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick how you want to run this session.
            </p>
          </div>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
          {/* Quick focus */}
          <button
            type="button"
            onClick={() => go('quick')}
            className="flex w-full items-center gap-4 rounded-2xl border border-border surface-panel p-5 text-left transition hover:shadow-md hover:border-foreground/20 cursor-pointer"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-chip text-muted-foreground">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-medium text-foreground">Quick focus</p>
              <p className="text-sm text-muted-foreground">5–10 min, core items only</p>
            </div>
          </button>

          {/* Full session — recommended / default */}
          <button
            type="button"
            onClick={() => go('full')}
            className="relative flex w-full items-center gap-4 rounded-2xl border-2 border-[var(--accent-brand)] surface-panel p-6 text-left shadow-md transition hover:shadow-lg cursor-pointer"
          >
            <span className="absolute right-4 top-4 rounded-full bg-[var(--accent-brand)] px-2.5 py-0.5 text-[11px] font-medium text-white">
              Recommended
            </span>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-brand)]/15 text-[var(--accent-brand)]">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base text-foreground">Full session</p>
              <p className="text-sm text-muted-foreground">Complete the planned session</p>
            </div>
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={() => go(null)}
            className="flex w-full items-center gap-4 rounded-2xl border border-border surface-panel p-5 text-left transition hover:shadow-md hover:border-foreground/20 cursor-pointer"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-chip text-muted-foreground">
              <Settings2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-medium text-foreground">Custom</p>
              <p className="text-sm text-muted-foreground">Choose your own settings</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LaunchPage() {
  return (
    <Suspense
      fallback={
        <div className="page-content">
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <LaunchPageContent />
    </Suspense>
  );
}

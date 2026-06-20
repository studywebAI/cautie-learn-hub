'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BrainCircuit, NotebookPen, Workflow, FolderKanban, ArrowLeft, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { FlashcardIcon, TimelineIcon } from '@/components/icons/custom-icons';

// Lazy-load so SSR doesn't break (ToolInputBox uses browser APIs)
const ToolInputBox = dynamic(
  () => import('@/components/tools/tool-input-box').then((m) => m.ToolInputBox),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

type ToolMeta = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const ALL_TOOLS: ToolMeta[] = [
  { id: 'flashcards', label: 'Flashcards', href: '/tools/flashcards', icon: FlashcardIcon },
  { id: 'quiz',       label: 'Quiz',       href: '/tools/quiz',        icon: BrainCircuit },
  { id: 'notes',      label: 'Notes',      href: '/tools/notes',       icon: NotebookPen },
  { id: 'mindmap',    label: 'Mindmap',    href: '/tools/wordweb',     icon: Workflow },
  { id: 'timeline',   label: 'Timeline',   href: '/tools/timeline',    icon: TimelineIcon },
  { id: 'studyset',   label: 'Studyset',   href: '/tools/studyset',    icon: FolderKanban },
];

type ToolResult = ToolMeta & {
  recommended: boolean;
  reason: string;
  context: string;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Phase = 'input' | 'analyzing' | 'results';

export default function ToolsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('input');
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Called by ToolInputBox when user hits submit
  const handleSubmit = async (compiledText: string) => {
    const text = compiledText.trim();
    if (!text) return;

    setError(null);
    setPhase('analyzing');

    try {
      const res = await fetch('/api/tools/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Analysis failed');

      const rawTools: Record<string, { recommended: boolean; reason: string; context: string }> =
        data?.tools ?? {};

      const resolved: ToolResult[] = ALL_TOOLS.map((tool) => ({
        ...tool,
        recommended: rawTools[tool.id]?.recommended === true,
        reason:      String(rawTools[tool.id]?.reason  ?? ''),
        context:     String(rawTools[tool.id]?.context ?? ''),
      }));

      setResults(resolved);
      setPhase('results');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setPhase('input');
    }
  };

  const recommended    = results.filter((t) => t.recommended);
  const notRecommended = results.filter((t) => !t.recommended);

  return (
    <div className="flex min-h-full flex-col items-center justify-start px-4 py-10 md:py-16">

      {/* ── INPUT PHASE ──────────────────────────────────────────────────── */}
      {phase === 'input' && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl tracking-tight">What are you studying?</h1>
            <p className="text-sm text-muted-foreground">
              Paste your notes, upload a file, or drop a link — AI picks the best tools for your content.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <ToolInputBox
            toolId="tools-picker"
            placeholder="Paste your notes, a chapter, vocabulary list, timeline of events…"
            onSubmit={handleSubmit}
            hideToolSwitcher
          />
        </div>
      )}

      {/* ── ANALYZING PHASE ──────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center gap-4 pt-32">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-brand)]/15" />
            <Spinner size={28} />
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ────────────────────────────────────────────────── */}
      {phase === 'results' && (
        <div className="w-full max-w-2xl space-y-8">

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => setPhase('input')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change text
          </Button>

          {/* Recommended */}
          {recommended.length > 0 && (
            <section className="space-y-3">
              <p className="text-[12px] text-muted-foreground">
                Recommended for your content
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recommended.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => router.push(tool.href)}
                    className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all duration-150 hover:border-[var(--accent-brand)]/50 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-brand)]/10 transition-colors group-hover:bg-[var(--accent-brand)]/18">
                      <tool.icon className="h-5 w-5 text-[var(--accent-brand)]" strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{tool.label}</p>
                      {tool.context && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {tool.context}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Not recommended — smaller, still accessible */}
          {notRecommended.length > 0 && (
            <section className="space-y-3">
              <p className="text-[12px] text-muted-foreground/50">
                Other tools
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {notRecommended.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => router.push(tool.href)}
                    className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card/60 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  >
                    <tool.icon className="h-4 w-4 shrink-0 opacity-60" strokeWidth={1.6} />
                    <span className="truncate">{tool.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {recommended.length === 0 && notRecommended.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Could not determine recommendations. Try adding more text.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

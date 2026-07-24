'use client';

import React, { useEffect, useState } from 'react';

interface PollBlockProps {
  block: { id: string; data: { question: string; options: string[] } };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
  isTeacherView?: boolean;
  resultsUrl?: string;
  voterListUrl?: string;
}

interface PollResults {
  options: string[];
  counts: Record<string, number>;
  totalVotes: number;
}

const POLL_REFRESH_MS = 5000;

export function PollBlock({ block, onSubmit, isSubmitted, isTeacherView, resultsUrl, voterListUrl }: PollBlockProps) {
  const options = block.data.options || [];
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<PollResults | null>(null);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [voters, setVoters] = useState<{ option: string; studentName: string }[] | null>(null);
  const showResults = isTeacherView || isSubmitted || !!picked;

  useEffect(() => {
    if (!showResults || !resultsUrl) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(resultsUrl, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setResults(data);
      } catch {
        // best-effort -- a missed refresh just shows slightly stale counts
      }
    };
    void load();
    const interval = setInterval(load, POLL_REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [showResults, resultsUrl]);

  const loadVoters = async (option: string) => {
    if (expandedOption === option) {
      setExpandedOption(null);
      return;
    }
    setExpandedOption(option);
    if (!voterListUrl) return;
    try {
      const res = await fetch(voterListUrl, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data?.answers)
        ? data.answers.map((a: any) => ({ option: a?.answer_data?.option, studentName: a?.student_name || 'Student' }))
        : [];
      setVoters(list);
    } catch {
      setVoters([]);
    }
  };

  const handleVote = async (option: string) => {
    if (submitting || picked) return;
    setSubmitting(true);
    setPicked(option);
    const result = await onSubmit({ option });
    if (!result.ok) setPicked(null);
    setSubmitting(false);
  };

  if (!showResults) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{block.data.question || 'Poll'}</p>
        <div className="space-y-1.5">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleVote(opt)}
              disabled={submitting || !opt}
              className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:border-accent-brand hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {opt || `Option ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const counts = results?.counts || {};
  const total = results?.totalVotes ?? 0;
  const max = Math.max(1, ...options.map((o) => counts[o] || 0));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{block.data.question || 'Poll'}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const count = counts[opt] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMine = picked === opt;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => (isTeacherView ? void loadVoters(opt) : undefined)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm relative overflow-hidden ${isMine ? 'border-accent-brand' : 'border-border'} ${isTeacherView ? 'cursor-pointer hover:border-accent-brand' : ''}`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-accent-brand/15"
                  style={{ width: `${(count / max) * 100}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span>{opt || `Option ${i + 1}`}{isMine && <span className="ml-1.5 text-[10px] text-accent-brand">your vote</span>}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{count} · {pct}%</span>
                </div>
              </button>
              {isTeacherView && expandedOption === opt && (
                <div className="mt-1 rounded-md border border-dashed border-border/70 p-2 text-xs text-muted-foreground">
                  {voters === null ? 'Loading...' : voters.filter((v) => v.option === opt).length === 0 ? 'No votes yet.' : voters.filter((v) => v.option === opt).map((v) => v.studentName).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{total} vote{total === 1 ? '' : 's'}</p>
    </div>
  );
}

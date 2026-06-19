'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { CautieLoader } from '@/components/ui/cautie-loader';

// Real "subject pick" source — walks the user's actual curriculum
// (subjects → chapters → paragraphs, the same hierarchy /subjects uses)
// so the studyset is genuinely scoped to a real part of their course.
export type SubjectTopicSeed = {
  subject: string;
  focusNote: string;
  label: string;
};

type LiteSubject = { id: string; title: string };
type LiteChapter = { id: string; title: string; chapter_number: number };
type LiteParagraph = { id: string; title: string; paragraph_number: number };

export function SubjectTopicPicker({
  appliedLabel,
  onApply,
}: {
  appliedLabel: string | null;
  onApply: (seed: SubjectTopicSeed) => void;
}) {
  const [subjects, setSubjects] = useState<LiteSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<LiteChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [chapterId, setChapterId] = useState<string | null>(null);
  const [paragraphs, setParagraphs] = useState<LiteParagraph[]>([]);
  const [loadingParagraphs, setLoadingParagraphs] = useState(false);

  const [paragraphIds, setParagraphIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSubjects(true);
      try {
        const response = await fetch('/api/subjects?lite=1', { cache: 'no-store' });
        if (!response.ok) throw new Error('failed');
        const json = await response.json();
        const list = Array.isArray(json) ? json : [];
        if (!cancelled) {
          setSubjects(list.map((row: any) => ({ id: String(row.id), title: String(row.title || 'Untitled subject') })));
        }
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pickSubject = async (id: string) => {
    setSubjectId(id);
    setChapterId(null);
    setChapters([]);
    setParagraphs([]);
    setParagraphIds([]);
    setLoadingChapters(true);
    try {
      const response = await fetch(`/api/subjects/${id}/chapters`, { cache: 'no-store' });
      if (!response.ok) throw new Error('failed');
      const json = await response.json();
      const list = Array.isArray(json) ? json : [];
      setChapters(
        list.map((row: any) => ({
          id: String(row.id),
          title: String(row.title || 'Untitled chapter'),
          chapter_number: Number(row.chapter_number || 0),
        }))
      );
    } catch {
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  const pickChapter = async (id: string) => {
    if (!subjectId) return;
    setChapterId(id);
    setParagraphs([]);
    setParagraphIds([]);
    setLoadingParagraphs(true);
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters/${id}/paragraphs`, { cache: 'no-store' });
      if (!response.ok) throw new Error('failed');
      const json = await response.json();
      const list = Array.isArray(json) ? json : [];
      setParagraphs(
        list.map((row: any) => ({
          id: String(row.id),
          title: String(row.title || 'Untitled paragraph'),
          paragraph_number: Number(row.paragraph_number || 0),
        }))
      );
    } catch {
      setParagraphs([]);
    } finally {
      setLoadingParagraphs(false);
    }
  };

  const toggleParagraph = (id: string) => {
    setParagraphIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id].slice(0, 6)));
  };

  const subject = subjects.find((s) => s.id === subjectId) || null;
  const chapter = chapters.find((c) => c.id === chapterId) || null;
  const canApply = !!subject && !!chapter;

  const apply = () => {
    if (!subject || !chapter) return;
    const pickedParagraphs = paragraphs
      .filter((p) => paragraphIds.includes(p.id))
      .sort((a, b) => a.paragraph_number - b.paragraph_number);
    const focusParts = [`Focus on ${subject.title} → Chapter ${chapter.chapter_number}: ${chapter.title}.`];
    if (pickedParagraphs.length > 0) {
      focusParts.push(
        `Specifically: ${pickedParagraphs.map((p) => `§${p.paragraph_number} ${p.title}`).join(', ')}.`
      );
    }
    const label =
      pickedParagraphs.length > 0
        ? `${subject.title} — ${chapter.title} (${pickedParagraphs.length} paragraph${pickedParagraphs.length === 1 ? '' : 's'})`
        : `${subject.title} — ${chapter.title}`;
    onApply({ subject: subject.title, focusNote: focusParts.join(' '), label });
  };

  if (loadingSubjects) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background py-10">
        <CautieLoader />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
        No subjects linked to your classes yet — pick another option to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick a subject, chapter and (optionally) paragraphs — we&apos;ll line the studyset up with that part of your course.
      </p>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => {
            const selected = subjectId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => void pickSubject(s.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  selected
                    ? 'border-[#6b7c4e] bg-[#6b7c4e]/10 text-[#4a5735]'
                    : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                }`}
              >
                {s.title}
              </button>
            );
          })}
        </div>
      </div>

      {subjectId && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Chapter</p>
          {loadingChapters ? (
            <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background py-6">
              <CautieLoader />
            </div>
          ) : chapters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No chapters found for this subject yet.</p>
          ) : (
            <div className="space-y-1.5">
              {chapters.map((c) => {
                const selected = chapterId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void pickChapter(c.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      selected
                        ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 text-foreground'
                        : 'border-border bg-background text-foreground hover:border-[#6b7c4e]/40 hover:bg-[#6b7c4e]/5'
                    }`}
                  >
                    <span className="truncate">
                      <span className="text-muted-foreground">Ch. {c.chapter_number}</span> {c.title}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#6b7c4e]' : 'text-muted-foreground'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {chapterId && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Paragraphs <span className="font-normal normal-case text-muted-foreground/80">(optional — pick up to 6 to narrow the focus)</span>
          </p>
          {loadingParagraphs ? (
            <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background py-6">
              <CautieLoader />
            </div>
          ) : paragraphs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No paragraphs found for this chapter yet — the whole chapter works too.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {paragraphs.map((p) => {
                const selected = paragraphIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParagraph(p.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                      selected
                        ? 'border-[#6b7c4e] bg-[#6b7c4e]/10 text-[#4a5735]'
                        : 'border-border bg-background text-muted-foreground hover:border-[#6b7c4e]/40 hover:text-foreground'
                    }`}
                  >
                    §{p.paragraph_number} {p.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {canApply && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {appliedLabel ? (
              <span className="inline-flex items-center gap-1.5 text-[#4a5735]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Linked: {appliedLabel}
              </span>
            ) : (
              <>
                Ready to link {subject?.title} — {chapter?.title}.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={apply}
            className="shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: '#6b7c4e' }}
          >
            {appliedLabel ? 'Update focus' : 'Use this topic'}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, CheckCircle2, XCircle, HelpCircle, Flag } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

type ResultQuestion = {
  block_id: string;
  type: string;
  question: string;
  max_points: number;
  block_data: any;
  correct_answer: any;
  student_answer: any;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  can_self_grade?: boolean;
};

const correctCls = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300';
const wrongCls = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300';
const pillCls = 'rounded-md border px-2 py-1';

// Per-type student-vs-correct comparison: your submitted answer tinted red/green,
// the correct answer shown alongside in green whenever you got it wrong.
function AnswerCompare({ q, isDutch }: { q: ResultQuestion; isDutch: boolean }) {
  const bd = q.block_data || {};
  const sa = q.student_answer || {};
  const empty = isDutch ? '(leeg)' : '(empty)';

  if (q.type === 'multiple_choice') {
    const options: Array<{ id: string; text: string; correct?: boolean }> = bd.options || [];
    const selected: string[] = sa.selected_answers || sa.selectedAnswers || [];
    if (options.length === 0) return null;
    return (
      <div className="space-y-1">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const cls = opt.correct ? correctCls : isSelected ? wrongCls : 'border-border';
          return (
            <div key={opt.id} className={`flex items-center gap-2 ${pillCls} ${cls}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${isSelected ? 'border-current bg-current' : 'border-muted-foreground'}`} />
              <span className="flex-1">{opt.text || '...'}</span>
              {isSelected && <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-70">{isDutch ? 'jouw keuze' : 'your pick'}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === 'fill_in_blank') {
    const correct: string[] = bd.answers || [];
    const given: string[] = sa.answers || [];
    if (correct.length === 0) return null;
    return (
      <div className="space-y-1">
        {correct.map((c, i) => {
          const g = String(given[i] ?? '');
          const isMatch = g.trim().toLowerCase() === String(c).trim().toLowerCase();
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`${pillCls} ${isMatch ? correctCls : wrongCls}`}>{g || empty}</span>
              {!isMatch && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <span className={`${pillCls} ${correctCls}`}>{c}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === 'ordering') {
    const items: string[] = bd.items || [];
    const correctOrder: number[] = bd.correct_order || [];
    const givenOrder: number[] = sa.order || [];
    if (items.length === 0 || correctOrder.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{isDutch ? 'Jouw volgorde' : 'Your order'}</p>
          <div className="space-y-1">
            {givenOrder.map((idx, pos) => (
              <div key={pos} className={`${pillCls} ${correctOrder[pos] === idx ? correctCls : wrongCls}`}>
                {pos + 1}. {items[idx] ?? '...'}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{isDutch ? 'Correcte volgorde' : 'Correct order'}</p>
          <div className="space-y-1">
            {correctOrder.map((idx, pos) => (
              <div key={pos} className={`${pillCls} ${correctCls}`}>{pos + 1}. {items[idx] ?? '...'}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (q.type === 'drag_drop' || q.type === 'matching') {
    const correctPairs: Array<{ left: string; right: string }> = bd.pairs || [];
    const givenPairs: Array<{ left: string; right: string }> = sa.pairs || [];
    if (correctPairs.length === 0) return null;
    const givenByLeft = new Map(givenPairs.map((p) => [p.left, p.right]));
    return (
      <div className="space-y-1">
        {correctPairs.map((p, i) => {
          const given = givenByLeft.get(p.left);
          const isMatch = given === p.right;
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className={`${pillCls} border-border`}>{p.left}</span>
              <span className="text-muted-foreground">→</span>
              <span className={`${pillCls} ${isMatch ? correctCls : wrongCls}`}>{given || (isDutch ? '(niet ingevuld)' : '(not answered)')}</span>
              {!isMatch && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className={`${pillCls} ${correctCls}`}>{p.right}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === 'number_line') {
    const correctValue = bd.correctValue;
    const given = sa.value;
    if (correctValue === undefined || correctValue === null) return null;
    const isMatch = q.is_correct === true;
    return (
      <div className="flex items-center gap-2">
        <span className={`${pillCls} ${isMatch ? correctCls : wrongCls}`}>{given ?? empty}</span>
        {!isMatch && (
          <>
            <span className="text-muted-foreground">→</span>
            <span className={`${pillCls} ${correctCls}`}>{correctValue}</span>
          </>
        )}
      </div>
    );
  }

  if (q.type === 'table') {
    const columns: Array<{ id: string; label: string }> = bd.columns || [];
    const rows: Array<{ id: string; cells: Array<{ editable?: boolean; correctValue?: string }> }> = bd.rows || [];
    const values: Record<string, string> = sa.values || {};
    if (rows.length === 0) return null;
    const cells: Array<{ label: string; given: string; correct: string; isMatch: boolean }> = [];
    rows.forEach((row) => {
      (row.cells || []).forEach((cell, ci) => {
        if (!cell.editable) return;
        const given = values[`${row.id}:${ci}`] || '';
        const correct = cell.correctValue || '';
        cells.push({ label: columns[ci]?.label || `Col ${ci + 1}`, given, correct, isMatch: given.trim().toLowerCase() === correct.trim().toLowerCase() });
      });
    });
    if (cells.length === 0) return null;
    return (
      <div className="space-y-1">
        {cells.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{c.label}:</span>
            <span className={`${pillCls} ${c.isMatch ? correctCls : wrongCls}`}>{c.given || empty}</span>
            {!c.isMatch && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className={`${pillCls} ${correctCls}`}>{c.correct}</span>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (q.type === 'diagram_labeling') {
    const points: Array<{ id: string; correctLabel: string }> = bd.points || [];
    const labels: Record<string, string> = sa.labels || {};
    if (points.length === 0) return null;
    return (
      <div className="space-y-1">
        {points.map((p, i) => {
          const given = labels[p.id] || '';
          const isMatch = given.trim().toLowerCase() === (p.correctLabel || '').trim().toLowerCase();
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span className={`${pillCls} ${isMatch ? correctCls : wrongCls}`}>{given || empty}</span>
              {!isMatch && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <span className={`${pillCls} ${correctCls}`}>{p.correctLabel}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === 'graph_plot') {
    const correctPoints: Array<{ x: number; y: number }> = bd.correctPoints || [];
    const givenPoints: Array<{ x: number; y: number }> = sa.points || [];
    if (correctPoints.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{isDutch ? 'Jouw punten' : 'Your points'}</p>
          <div className="flex flex-wrap gap-1">
            {givenPoints.length === 0
              ? <span className="text-muted-foreground">{isDutch ? '(geen)' : '(none)'}</span>
              : givenPoints.map((p, i) => <span key={i} className={`${pillCls} border-border`}>({p.x}, {p.y})</span>)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{isDutch ? 'Correcte punten' : 'Correct points'}</p>
          <div className="flex flex-wrap gap-1">
            {correctPoints.map((p, i) => <span key={i} className={`${pillCls} ${correctCls}`}>({p.x}, {p.y})</span>)}
          </div>
        </div>
      </div>
    );
  }

  if (q.type === 'open_question') {
    const given = sa.text || sa.answer || sa.value || '';
    return (
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{isDutch ? 'Jouw antwoord' : 'Your answer'}</p>
        <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-2.5 py-1.5">{given || (isDutch ? '(geen antwoord)' : '(no answer)')}</p>
      </div>
    );
  }

  return null;
}

export default function AssignmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ assignment_title: string; grade_released: boolean; grade: any; self_grade_enabled?: boolean; questions: ResultQuestion[] } | null>(null);
  const [flagOpenFor, setFlagOpenFor] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [flagSent, setFlagSent] = useState<Set<string>>(new Set());
  const [flagSending, setFlagSending] = useState(false);
  const [selfGradingId, setSelfGradingId] = useState<string | null>(null);

  const submitSelfGrade = async (question: ResultQuestion, gotItRight: boolean) => {
    if (selfGradingId) return;
    setSelfGradingId(question.block_id);
    try {
      const res = await fetch(
        `/api/subjects/${params.subjectId}/chapters/${params.chapterId}/paragraphs/${params.paragraphId}/assignments/${params.assignmentId}/results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_id: question.block_id, score: gotItRight ? question.max_points : 0 }),
        }
      );
      if (res.ok) {
        const result = await res.json();
        setData((prev) => prev && {
          ...prev,
          questions: prev.questions.map((q) =>
            q.block_id === question.block_id ? { ...q, is_correct: result.is_correct, score: result.score, can_self_grade: false } : q
          ),
        });
      }
    } finally {
      setSelfGradingId(null);
    }
  };

  const submitFlag = async (blockId: string) => {
    if (!flagNote.trim() || flagSending) return;
    setFlagSending(true);
    try {
      const res = await fetch(
        `/api/subjects/${params.subjectId}/chapters/${params.chapterId}/paragraphs/${params.paragraphId}/assignments/${params.assignmentId}/results/dispute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_id: blockId, note: flagNote.trim() }),
        }
      );
      if (res.ok) {
        setFlagSent(prev => new Set(prev).add(blockId));
        setFlagOpenFor(null);
        setFlagNote('');
      }
    } finally {
      setFlagSending(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/subjects/${params.subjectId}/chapters/${params.chapterId}/paragraphs/${params.paragraphId}/assignments/${params.assignmentId}/results`
        );
        if (res.status === 403) {
          setError(isDutch ? 'De docent heeft de resultaten nog niet vrijgegeven.' : 'Your teacher has not released the results yet.');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError(isDutch ? 'Kon resultaten niet laden.' : 'Could not load results.');
          setLoading(false);
          return;
        }
        setData(await res.json());
      } catch {
        setError(isDutch ? 'Kon resultaten niet laden.' : 'Could not load results.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.subjectId, params.chapterId, params.paragraphId, params.assignmentId, isDutch]);

  return (
    <div className="page-content max-w-2xl mx-auto py-6 space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {isDutch ? 'Terug' : 'Back'}
      </button>

      {loading && <div className="h-40 bg-muted rounded animate-pulse" />}

      {!loading && error && (
        <Card className="p-8 text-center surface-panel border border-border">
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      )}

      {!loading && data && (
        <>
          <PageHeader title={data.assignment_title} subtitle={isDutch ? 'Nakijkresultaten' : 'Results'} />

          {data.grade_released && data.grade && (
            <Card className="p-4 surface-panel border border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{isDutch ? 'Cijfer' : 'Grade'}</span>
              <span className="text-xl font-medium">{data.grade.grade_value ?? data.grade.grade_numeric}</span>
            </Card>
          )}
          {!data.grade_released && (
            <p className="text-xs text-muted-foreground">
              {isDutch ? 'Het cijfer is nog niet vrijgegeven — dit zijn alleen de goed/fout-resultaten.' : 'The grade has not been released yet — these are just the correct/incorrect results.'}
            </p>
          )}

          <div className="space-y-2">
            {data.questions.map((q, i) => (
              <Card key={q.block_id} className="p-3 surface-panel border border-border">
                <div className="flex items-start gap-2">
                  {q.is_correct === true && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                  {q.is_correct === false && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                  {q.is_correct === null && <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm">{i + 1}. {q.question}</p>
                    {q.feedback && <p className="text-xs text-muted-foreground">{q.feedback}</p>}
                    <p className="text-xs text-muted-foreground">
                      {q.score ?? 0} / {q.max_points} {isDutch ? 'punten' : 'points'}
                    </p>

                    <div className="pt-1 text-xs">
                      <AnswerCompare q={q} isDutch={isDutch} />
                    </div>

                    {q.can_self_grade && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-muted-foreground">
                          {isDutch ? 'Nakijken jezelf: had je dit goed?' : 'Self-grade: did you get this right?'}
                        </p>
                        <div className="flex gap-1.5">
                          <Button size="sm" disabled={selfGradingId === q.block_id} onClick={() => submitSelfGrade(q, true)}>
                            {isDutch ? 'Goed' : 'Correct'}
                          </Button>
                          <Button size="sm" variant="outline" disabled={selfGradingId === q.block_id} onClick={() => submitSelfGrade(q, false)}>
                            {isDutch ? 'Fout' : 'Incorrect'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {flagSent.has(q.block_id) ? (
                      <p className="text-xs text-muted-foreground italic">
                        {isDutch ? 'Gemeld bij de docent.' : 'Reported to your teacher.'}
                      </p>
                    ) : flagOpenFor === q.block_id ? (
                      <div className="space-y-1.5 pt-1">
                        <Textarea
                          value={flagNote}
                          onChange={(e) => setFlagNote(e.target.value)}
                          placeholder={isDutch ? 'Wat klopt er niet aan deze beoordeling?' : "What's wrong with this result?"}
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-1.5">
                          <Button size="sm" disabled={!flagNote.trim() || flagSending} onClick={() => submitFlag(q.block_id)}>
                            {isDutch ? 'Versturen' : 'Send'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setFlagOpenFor(null); setFlagNote(''); }}>
                            {isDutch ? 'Annuleren' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setFlagOpenFor(q.block_id); setFlagNote(''); }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground pt-0.5"
                      >
                        <Flag className="h-3 w-3" />
                        {isDutch ? 'Meld fout' : 'Report issue'}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

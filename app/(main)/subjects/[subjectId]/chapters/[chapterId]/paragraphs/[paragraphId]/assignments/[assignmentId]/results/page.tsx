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
  correct_answer: any;
  student_answer: any;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  can_self_grade?: boolean;
};

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

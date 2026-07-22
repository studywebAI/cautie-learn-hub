'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

type QuestionAnswer = {
  student_id: string;
  student_name: string;
  answer_data: any;
  is_correct: boolean | null;
  score: number | null;
};

type Question = {
  block_id: string;
  type: string;
  question: string;
  correct_answer: string;
  answers: QuestionAnswer[];
};

function answerText(answerData: any): string {
  return String(answerData?.text || answerData?.answer || answerData?.value || JSON.stringify(answerData?.selected ?? answerData ?? ''));
}

// Grade tab's answer-compare view -- keeps both styles decided in
// docs/mockups/editor-redesign.html: split-screen (student vs. correct
// answer, tinted, for grading one question in depth) and per-student list
// (for scanning a whole class fast). Both survive here; the quick-check in
// the assignment editor itself (Phase 4) only uses the list style.
export function AnswerReviewDialog({
  open,
  onOpenChange,
  classId,
  subjectId,
  gradeSetId,
  isDutch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId?: string | null;
  subjectId?: string | null;
  gradeSetId: string;
  isDutch?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [mode, setMode] = useState<'split' | 'list'>('split');

  useEffect(() => {
    if (!open) return;
    const base = classId
      ? `/api/classes/${classId}/grades/${gradeSetId}`
      : `/api/subjects/${subjectId}/grades/${gradeSetId}`;
    setLoading(true);
    fetch(`${base}/answer-review`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data) => {
        const list: Question[] = Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        setActiveBlockId(list[0]?.block_id || null);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [open, classId, subjectId, gradeSetId]);

  const activeQuestion = questions.find((q) => q.block_id === activeBlockId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isDutch ? 'Antwoorden bekijken' : 'Review answers'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen vragen gevonden voor deze toets.' : 'No questions found for this test.'}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Select value={activeBlockId || undefined} onValueChange={setActiveBlockId}>
                <SelectTrigger className="h-8 flex-1 min-w-0 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q, i) => (
                    <SelectItem key={q.block_id} value={q.block_id}>
                      {i + 1}. {q.question.slice(0, 60) || (isDutch ? 'Naamloze vraag' : 'Untitled question')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 rounded-lg bg-muted p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMode('split')}
                  className={`h-7 rounded-md px-2.5 text-xs ${mode === 'split' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  {isDutch ? 'Split-screen' : 'Split screen'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className={`h-7 rounded-md px-2.5 text-xs ${mode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  {isDutch ? 'Lijst' : 'List'}
                </button>
              </div>
            </div>

            {activeQuestion && mode === 'split' && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {activeQuestion.answers.length === 0 && (
                  <p className="text-sm text-muted-foreground">{isDutch ? 'Nog geen ingeleverde antwoorden.' : 'No submitted answers yet.'}</p>
                )}
                {activeQuestion.answers.map((a) => (
                  <div key={a.student_id} className="rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-1.5 text-xs font-medium border-b border-border bg-muted/40">{a.student_name}</div>
                    <div className="flex">
                      <div className={`flex-1 p-2.5 text-xs ${a.is_correct === false ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{isDutch ? "Leerling's antwoord" : "Student's answer"}</p>
                        <p>{answerText(a.answer_data)}</p>
                      </div>
                      <div className="flex-1 p-2.5 text-xs border-l border-border bg-green-50 dark:bg-green-950/20">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{isDutch ? 'Correct antwoord' : 'Correct answer'}</p>
                        <p>{activeQuestion.correct_answer || (isDutch ? 'Geen referentieantwoord' : 'No reference answer set')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeQuestion && mode === 'list' && (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                {activeQuestion.answers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">{isDutch ? 'Nog geen ingeleverde antwoorden.' : 'No submitted answers yet.'}</p>
                ) : (
                  activeQuestion.answers.map((a) => (
                    <div key={a.student_id} className="flex items-start justify-between gap-3 border-b border-border px-3 py-2 text-xs last:border-b-0">
                      <div className="min-w-0">
                        <p className="font-medium">{a.student_name}</p>
                        <p className="mt-0.5 truncate text-muted-foreground">{answerText(a.answer_data)}</p>
                      </div>
                      <span className={a.is_correct === true ? 'text-emerald-600 shrink-0' : a.is_correct === false ? 'text-rose-600 shrink-0' : 'text-muted-foreground shrink-0'}>
                        {a.is_correct === true ? (isDutch ? 'Correct' : 'Correct') : a.is_correct === false ? (isDutch ? 'Fout' : 'Incorrect') : (isDutch ? 'Niet nagekeken' : 'Not graded')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

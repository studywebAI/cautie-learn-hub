'use client';

import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { CautieLoader } from '@/components/ui/cautie-loader';

type NextAnswer = {
  answer_id: string;
  student_id: string;
  student_name: string;
  block_id: string;
  question: string;
  correct_answer: any;
  rubric: string[];
  max_points: number;
  student_answer: any;
};

function answerText(data: any): string {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') return data.text || data.value || JSON.stringify(data);
  return String(data);
}

export default function ReviewFlashcardPage() {
  const params = useParams();
  const gradeSetId = params.gradeSetId as string;
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const router = useRouter();
  const classes = context?.classes || [];

  const [classId, setClassId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [current, setCurrent] = useState<NextAnswer | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [autoGrading, setAutoGrading] = useState(false);

  const findClassAndLoad = useCallback(async () => {
    setLoading(true);
    for (const cls of classes) {
      const res = await fetch(`/api/classes/${cls.id}/grades/review-queue`);
      if (!res.ok) continue;
      const data = await res.json();
      const match = [...(data.nakijken || []), ...(data.becijferen || [])].find((g: any) => g.id === gradeSetId);
      if (match) {
        setClassId(cls.id);
        setTitle(match.title);
        await loadNext(cls.id);
        return;
      }
    }
    setLoading(false);
  }, [classes, gradeSetId]);

  useEffect(() => { if (classes.length) void findClassAndLoad(); }, [classes.length]);

  const loadNext = async (cid?: string) => {
    const effectiveClassId = cid || classId;
    if (!effectiveClassId) return;
    setLoading(true);
    setNote('');
    try {
      const res = await fetch(`/api/classes/${effectiveClassId}/grades/${gradeSetId}/review/next`);
      const data = await res.json();
      setCurrent(data.next || null);
      setRemaining(data.remaining || 0);
    } finally {
      setLoading(false);
    }
  };

  const submitVerdict = async (isCorrect: boolean) => {
    if (!classId || !current || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/classes/${classId}/grades/${gradeSetId}/review/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_id: current.answer_id, is_correct: isCorrect, note: note.trim() || null }),
      });
      await loadNext();
    } finally {
      setBusy(false);
    }
  };

  const runAutoGrade = async () => {
    if (!classId || autoGrading) return;
    setAutoGrading(true);
    try {
      await fetch(`/api/classes/${classId}/grades/${gradeSetId}/review/auto-grade`, { method: 'POST' });
      await loadNext();
    } finally {
      setAutoGrading(false);
    }
  };

  return (
    <div className="page-content max-w-2xl mx-auto py-6 space-y-4">
      <button
        onClick={() => router.push('/teacher-grades/review?mode=nakijken')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {isDutch ? 'Terug' : 'Back'}
      </button>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{title || (isDutch ? 'Nakijken' : 'Review')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {remaining > 0 ? `${remaining} ${isDutch ? 'nog te beoordelen' : 'left to review'}` : (isDutch ? 'Klaar' : 'Done')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runAutoGrade} disabled={autoGrading || loading || !current}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          {autoGrading ? (isDutch ? 'Bezig...' : 'Working...') : (isDutch ? 'Automatisch nakijken' : 'Auto-grade')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CautieLoader label={isDutch ? 'Laden' : 'Loading'} size="md" />
        </div>
      ) : !current ? (
        <Card className="p-10 text-center surface-panel border border-border space-y-3">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isDutch ? 'Alles is nagekeken. Ga verder naar becijferen.' : 'Everything has been reviewed. Continue to grading.'}
          </p>
          {classId && (
            <Link href={`/teacher-grades/${gradeSetId}/grading`}>
              <Button size="sm">{isDutch ? 'Naar becijferen' : 'Go to grading'}</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-4 surface-panel border border-border space-y-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{isDutch ? 'Vraag & correct antwoord' : 'Question & correct answer'}</p>
            <p className="text-sm">{current.question}</p>
            {current.correct_answer && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                {isDutch ? 'Modelantwoord' : 'Model answer'}: {answerText(current.correct_answer)}
              </p>
            )}
            {current.rubric?.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {current.rubric.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">{isDutch ? 'Max punten' : 'Max points'}: {current.max_points}</p>
          </Card>

          <Card className="p-4 surface-panel border border-border space-y-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{current.student_name}</p>
            <p className="text-sm whitespace-pre-wrap">{answerText(current.student_answer) || <span className="text-muted-foreground italic">{isDutch ? 'Geen antwoord' : 'No answer'}</span>}</p>
          </Card>
        </div>
      )}

      {current && (
        <>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isDutch ? 'Notitie voor jezelf of later (optioneel)' : 'Note for yourself or later (optional)'}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => submitVerdict(false)}>
              <XCircle className="h-4 w-4 mr-1.5" />
              {isDutch ? 'Fout' : 'Incorrect'}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={busy} onClick={() => submitVerdict(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {isDutch ? 'Goed' : 'Correct'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BookOpen, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type StudysetData = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  exam_date: string | null;
  day_count: number;
  task_count: number;
  created_at: string;
};

type DayData = {
  day_number: number;
  plan_date: string;
  summary: string | null;
  estimated_minutes: number;
  tasks: Array<{ title: string; task_type: string }>;
};

const TASK_ICONS: Record<string, string> = {
  quiz: '✏️',
  flashcards: '🃏',
  notes: '📝',
  mindmap: '🗺',
  timeline: '📅',
  review: '👁',
};

export default function ShareStudysetPage() {
  const params = useParams();
  const token = params.token as string;

  const [studyset, setStudyset] = useState<StudysetData | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/share/studyset?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to load studyset');
        }
        const data = await res.json();
        setStudyset(data.studyset);
        setDays(data.days || []);
      } catch (e: any) {
        setError(e.message || 'Could not load this studyset. The link may have expired.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6b7c4e]/5 to-transparent">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-[#6b7c4e]/40 mb-4" />
          <p className="text-sm text-muted-foreground">Loading studyset…</p>
        </div>
      </div>
    );
  }

  if (error || !studyset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6b7c4e]/5 to-transparent">
        <div className="max-w-sm text-center space-y-4">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <div>
            <h1 className="text-xl text-foreground">Studyset not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error || 'This studyset is no longer available.'}</p>
          </div>
          <Button asChild style={{ backgroundColor: '#6b7c4e' }}>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const examDate = studyset.exam_date ? new Date(studyset.exam_date) : null;
  const daysUntilExam = examDate
    ? Math.ceil((examDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#6b7c4e]/5">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl text-foreground leading-tight truncate">
                {studyset.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {studyset.subject && (
                  <span className="rounded-full bg-[#6b7c4e]/10 px-3 py-1 text-xs font-medium text-[#4a5735]">
                    {studyset.subject}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {studyset.day_count} day{studyset.day_count !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  {studyset.task_count} task{studyset.task_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button asChild className="flex-shrink-0" style={{ backgroundColor: '#6b7c4e' }}>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Description + Exam info */}
        {(studyset.description || daysUntilExam !== null) && (
          <div className="space-y-4">
            {studyset.description && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{studyset.description}</p>
              </div>
            )}
            {daysUntilExam !== null && (
              <div className={`rounded-xl border-2 p-4 ${
                daysUntilExam <= 7
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : daysUntilExam <= 14
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-border bg-muted/50'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4" />
                  {daysUntilExam < 0 ? (
                    <span>Exam was {Math.abs(daysUntilExam)} days ago</span>
                  ) : daysUntilExam === 0 ? (
                    <span>Exam is today!</span>
                  ) : (
                    <span>{daysUntilExam} days until exam</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Plan */}
        <div>
          <h2 className="text-xl text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#6b7c4e]" />
            Study Plan
          </h2>

          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No study days scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {days.map((day) => {
                const dayDate = new Date(day.plan_date);
                const isToday =
                  dayDate.toDateString() === new Date().toDateString();
                const isPast = dayDate < new Date();

                return (
                  <div
                    key={`day-${day.day_number}`}
                    className={`rounded-xl border transition-all ${
                      isToday
                        ? 'border-[#6b7c4e] bg-[#6b7c4e]/5 ring-1 ring-[#6b7c4e]/20'
                        : 'border-border hover:border-[#6b7c4e]/40'
                    } ${isPast && !isToday ? 'opacity-60' : ''}`}
                  >
                    <button className="w-full px-4 py-3 text-left" type="button">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-[15px] text-foreground">
                              Day {day.day_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dayDate.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            {isToday && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#6b7c4e] text-white">
                                TODAY
                              </span>
                            )}
                          </div>
                          {day.summary && (
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {day.summary}
                            </p>
                          )}
                          {day.tasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {day.tasks.map((task, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <span>{TASK_ICONS[task.task_type] || '•'}</span>
                                  <span className="truncate">{task.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {day.estimated_minutes > 0 && (
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {day.estimated_minutes}m
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-border pt-8 flex flex-col items-center text-center gap-4">
          <div>
            <h3 className="text-[17px] text-foreground">Want to study this?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sign up or log in to create your own copy and start studying.
            </p>
          </div>
          <Button asChild style={{ backgroundColor: '#6b7c4e' }} className="px-6">
            <Link href="/login">Get started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

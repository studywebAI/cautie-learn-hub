'use client';

import { useEffect, useState, useCallback } from 'react';
import { Radio, ChevronDown, AlertTriangle, X, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL_MS = 30_000;
const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

type LiveTest = {
  assignmentId: string;
  title: string;
  className: string;
  classId: string;
  subjectId: string;
  chapterId: string;
  paragraphId: string;
  inProgressCount: number;
  submittedCount: number;
};

type LiveStudent = {
  attemptId: string;
  studentId: string;
  studentName: string;
  status: string;
  correct: number;
  incorrect: number;
  ungraded: number;
  totalBlocks: number;
  tabSwitchCount: number;
  fullscreenExitCount: number;
  suspiciousPasteCount: number;
  possiblyLeft: boolean;
};

// Dashboard widget: only renders when at least one of the teacher's tests
// currently has a student in progress (self-hiding), polling a lightweight
// endpoint every ~30s. Expanding a test loads the fuller per-student live
// panel (progress, security flags, force-close) inline rather than
// navigating to a separate page — matches the TeacherStatRow expand pattern.
export function TeacherLiveTestWidget({ classIds }: { classIds: string[] }) {
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [students, setStudents] = useState<LiveStudent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | 'all' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) return;
    if (classIds.length === 0) return;

    let cancelled = false;
    const poll = () => {
      fetch(`/api/dashboard/teacher/live-tests?classIds=${classIds.join(',')}`)
        .then(r => r.ok ? r.json() : { liveTests: [] })
        .then(d => { if (!cancelled) setLiveTests(Array.isArray(d?.liveTests) ? d.liveTests : []); })
        .catch(() => {});
    };
    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [classIds.join(',')]);

  const loadDetail = useCallback((test: LiveTest) => {
    setDetailLoading(true);
    fetch(`/api/subjects/${test.subjectId}/chapters/${test.chapterId}/paragraphs/${test.paragraphId}/assignments/${test.assignmentId}/live`)
      .then(r => r.ok ? r.json() : { students: [] })
      .then(d => setStudents(Array.isArray(d?.students) ? d.students : []))
      .catch(() => setStudents([]))
      .finally(() => setDetailLoading(false));
  }, []);

  const toggleExpand = (test: LiveTest) => {
    if (expandedId === test.assignmentId) {
      setExpandedId(null);
      setStudents([]);
      return;
    }
    setExpandedId(test.assignmentId);
    loadDetail(test);
  };

  const closeAttempt = async (test: LiveTest, attemptId?: string) => {
    setClosingId(attemptId || 'all');
    try {
      await fetch(`/api/subjects/${test.subjectId}/chapters/${test.chapterId}/paragraphs/${test.paragraphId}/assignments/${test.assignmentId}/live/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attemptId ? { attemptId } : { all: true }),
      });
      loadDetail(test);
    } finally {
      setClosingId(null);
    }
  };

  if (liveTests.length === 0) return null;

  return (
    <div className="space-y-2">
      {liveTests.map(test => (
        <div key={test.assignmentId} className="rounded-xl surface-panel border border-destructive/30 p-4 space-y-3 shadow-sm">
          <button onClick={() => toggleExpand(test)} className="w-full flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              <Radio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm truncate">{test.title}</p>
                <p className="text-xs text-muted-foreground truncate">{test.className}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs tabular-nums text-muted-foreground">
                {test.inProgressCount} in progress · {test.submittedCount} submitted
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === test.assignmentId ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expandedId === test.assignmentId && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={closingId !== null}
                  onClick={() => closeAttempt(test)}
                >
                  Close test for everyone
                </Button>
              </div>

              {detailLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {students.map(s => (
                    <div key={s.attemptId} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 surface-interactive">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-medium truncate">{s.studentName}</p>
                          {s.possiblyLeft && s.status === 'in_progress' && (
                            <span title="No activity in the last 2 minutes — may have left the test">
                              <UserX className="h-3 w-3 text-amber-500" />
                            </span>
                          )}
                          {s.suspiciousPasteCount > 0 && (
                            <span title={`${s.suspiciousPasteCount} large paste(s) detected`}>
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {s.status} · {s.correct}/{s.totalBlocks} correct · {s.tabSwitchCount} tab switches · {s.fullscreenExitCount} fullscreen exits
                        </p>
                      </div>
                      {s.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs shrink-0"
                          disabled={closingId !== null}
                          onClick={() => closeAttempt(test, s.attemptId)}
                        >
                          <X className="h-3 w-3 mr-1" /> Close
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

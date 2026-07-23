'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';

type PendingRequest = {
  id: string;
  requesterId: string;
  email: string | null;
  role: 'student' | 'teacher';
  createdAt: string;
};

type Teacher = { id: string; name: string; isOwner: boolean };
type Student = { id: string; full_name: string | null; email: string | null };

// The "Group" tab: pending join requests (both roles) up top -- hidden
// entirely when empty -- and the normal teacher/student roster below.
// Kept intentionally basic; a fuller revamp (renaming, removing members,
// per-student notes) is future work.
export function SubjectRosterTab({ subjectId }: { subjectId: string }) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [subjectId]);

  async function load() {
    setLoading(true);
    try {
      const [pendingRes, teachersRes, studentsRes] = await Promise.allSettled([
        fetch(`/api/subjects/${subjectId}/join-requests`),
        fetch(`/api/subjects/${subjectId}/teachers`),
        fetch(`/api/subjects/${subjectId}/students`),
      ]);
      if (pendingRes.status === 'fulfilled' && pendingRes.value.ok) {
        setPending((await pendingRes.value.json()).requests || []);
      }
      if (teachersRes.status === 'fulfilled' && teachersRes.value.ok) {
        setTeachers((await teachersRes.value.json()).teachers || []);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
        setStudents((await studentsRes.value.json()).students || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resolve(requestId: string, action: 'approve' | 'reject') {
    setResolvingId(requestId);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/join-requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) await load();
    } finally {
      setResolvingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label={isDutch ? 'Laden…' : 'Loading…'} sublabel="" size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-[13px] font-600 text-foreground mb-3">
            {isDutch ? 'Wachtende verzoeken' : 'Pending requests'}
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-background divide-y divide-border">
            {pending.map((req) => (
              <div key={req.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-[13px]">{req.email || req.requesterId}</p>
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded surface-interactive text-muted-foreground">
                    {req.role === 'teacher' ? (isDutch ? 'docent' : 'teacher') : (isDutch ? 'student' : 'student')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" disabled={resolvingId === req.id} onClick={() => resolve(req.id, 'approve')}>
                    {isDutch ? 'Goedkeuren' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={resolvingId === req.id} onClick={() => resolve(req.id, 'reject')}>
                    {isDutch ? 'Afwijzen' : 'Reject'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-[13px] font-600 text-foreground mb-3">
          {isDutch ? 'Docenten' : 'Teachers'} ({teachers.length})
        </h3>
        <div className="overflow-hidden rounded-lg border border-border bg-background divide-y divide-border">
          {teachers.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-muted-foreground">{isDutch ? 'Geen docenten.' : 'No teachers.'}</p>
          ) : teachers.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
              <p className="text-[13px]">{t.name}</p>
              {t.isOwner && <span className="text-[11px] text-muted-foreground">{isDutch ? 'Eigenaar' : 'Owner'}</span>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-600 text-foreground mb-3">
          {isDutch ? 'Studenten' : 'Students'} ({students.length})
        </h3>
        <div className="overflow-hidden rounded-lg border border-border bg-background divide-y divide-border">
          {students.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-muted-foreground">{isDutch ? 'Geen studenten.' : 'No students.'}</p>
          ) : students.map((s) => (
            <div key={s.id} className="px-4 py-2.5">
              <p className="text-[13px]">{s.full_name || s.email || s.id}</p>
              {s.full_name && s.email && <p className="text-[11px] text-muted-foreground">{s.email}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

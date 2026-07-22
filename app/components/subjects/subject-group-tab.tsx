'use client';

import { useState, useEffect, useContext } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

// Mirrors app/components/class/group-tab.tsx's attendance-marking UI, but
// backed by a single /api/subjects/[subjectId]/attendance call instead of
// the class GroupTab's combined /group + /attendance + /members fetches.
// Renaming students isn't supported here since it goes through
// class_members, which has no subject equivalent.

type Student = {
  id: string;
  name: string;
  email: string | null;
  isPresent: boolean | null;
  hasHomeworkIncomplete: boolean;
  wasTooLate: boolean;
  stats: { totalAbsent: number; totalHomeworkIncomplete: number; totalTooLate: number };
};

type AttState = {
  isPresent: boolean | null;
  wasTooLate: boolean;
  hasHomeworkIncomplete: boolean;
  saving: boolean;
};

type Props = {
  subjectId: string;
};

function toAttState(s: Student): AttState {
  return {
    isPresent: typeof s.isPresent === 'boolean' ? s.isPresent : null,
    wasTooLate: Boolean(s.wasTooLate),
    hasHomeworkIncomplete: Boolean(s.hasHomeworkIncomplete),
    saving: false,
  };
}

export function SubjectGroupTab({ subjectId }: Props) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [attMap, setAttMap] = useState<Map<string, AttState>>(new Map());
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [subjectId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/attendance`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const rows: Student[] = data.students || [];
      setStudents(rows);
      setAttMap(new Map(rows.map((s) => [s.id, toAttState(s)])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function mark(studentId: string, field: keyof Pick<AttState, 'isPresent' | 'wasTooLate' | 'hasHomeworkIncomplete'>, value: boolean) {
    const cur = attMap.get(studentId) ?? { isPresent: null, wasTooLate: false, hasHomeworkIncomplete: false, saving: false };
    if (cur.saving) return;
    const next: AttState = { ...cur, [field]: value, saving: true };
    setAttMap((prev) => new Map(prev).set(studentId, next));
    try {
      const res = await fetch(`/api/subjects/${subjectId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          isPresent: field === 'isPresent' ? value : (cur.isPresent ?? true),
          wasTooLate: field === 'wasTooLate' ? value : cur.wasTooLate,
          hasHomeworkIncomplete: field === 'hasHomeworkIncomplete' ? value : cur.hasHomeworkIncomplete,
        }),
      });
      setAttMap((prev) => new Map(prev).set(studentId, { ...(res.ok ? next : cur), saving: false }));
    } catch {
      setAttMap((prev) => new Map(prev).set(studentId, { ...cur, saving: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label={isDutch ? 'Laden…' : 'Loading…'} sublabel="" size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border surface-panel px-4 py-8 text-center text-sm text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = students
    .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={isDutch ? 'Zoek leerlingen…' : 'Search students…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-[240px] text-[13px]"
        />
        <span className="text-[12px] text-muted-foreground">
          {isDutch ? 'Leerlingen' : 'Students'} ({students.length})
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="grid gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground" style={{ gridTemplateColumns: '1fr 160px' }}>
          <div>{isDutch ? 'Naam' : 'Name'}</div>
          <div className="text-center">{isDutch ? 'Aanwezigheid' : 'Attendance'}</div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {isDutch ? 'Geen leerlingen gevonden.' : 'No students found.'}
          </p>
        ) : (
          filtered.map((s, i) => {
            const att = attMap.get(s.id) ?? toAttState(s);
            const absences = s.stats?.totalAbsent || 0;
            const isSelected = selectedStudentId === s.id;

            return (
              <div key={s.id}>
                <div
                  className={cn(
                    'group grid items-center gap-3 border-t border-border/40 px-4 py-3 transition-colors cursor-pointer hover:bg-[hsl(var(--interactive-hover))]',
                    isSelected && 'bg-[hsl(var(--interactive-hover))]'
                  )}
                  style={{ gridTemplateColumns: '1fr 160px', borderLeft: '3px solid hsl(209,74%,50%)' }}
                  onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                >
                  <div>
                    <p className="text-[13px] leading-snug">{s.name}</p>
                    {s.email && <p className="text-[11px] text-muted-foreground leading-snug">{s.email}</p>}
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={(e) => { e.stopPropagation(); void mark(s.id, 'isPresent', true); }}
                      title={isDutch ? 'Aanwezig' : 'Present'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px]',
                        att.isPresent === true ? 'bg-green-600 text-white' : 'bg-muted text-green-600 hover:bg-muted/80',
                        att.saving && 'opacity-60'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={(e) => { e.stopPropagation(); void mark(s.id, 'isPresent', false); }}
                      title={isDutch ? 'Afwezig' : 'Absent'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px]',
                        att.isPresent === false ? 'bg-red-600 text-white' : 'bg-muted text-red-600 hover:bg-muted/80',
                        att.saving && 'opacity-60'
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    <span className="mx-0.5 h-4 w-px bg-border" />

                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={(e) => { e.stopPropagation(); void mark(s.id, 'wasTooLate', !att.wasTooLate); }}
                      title={isDutch ? 'Te laat' : 'Late'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px]',
                        att.wasTooLate ? 'bg-amber-500 text-white' : 'bg-muted text-amber-600 hover:bg-muted/80',
                        att.saving && 'opacity-60'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={att.saving}
                      onClick={(e) => { e.stopPropagation(); void mark(s.id, 'hasHomeworkIncomplete', !att.hasHomeworkIncomplete); }}
                      title={isDutch ? 'HW vergeten' : 'Forgot HW'}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded transition-colors text-[13px]',
                        att.hasHomeworkIncomplete ? 'bg-slate-600 text-white' : 'bg-muted text-slate-600 hover:bg-muted/80',
                        att.saving && 'opacity-60'
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-border/40 bg-[hsl(var(--interactive-hover))] px-4 py-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'Afwezigheid' : 'Absences'}</p>
                        <p className={cn('text-[16px] mt-1', absences > 2 ? 'text-red-600' : absences > 0 ? 'text-amber-600' : 'text-green-600')}>
                          {absences}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/60">{isDutch ? 'Status' : 'Status'}</p>
                        <p className="text-[12px] mt-2">
                          {att.isPresent === true && <span className="text-green-600">✓ {isDutch ? 'Aanwezig' : 'Present'}</span>}
                          {att.isPresent === false && <span className="text-red-600">✗ {isDutch ? 'Afwezig' : 'Absent'}</span>}
                          {att.isPresent === null && <span className="text-muted-foreground">—</span>}
                          {att.wasTooLate && <span className="text-amber-600"> · {isDutch ? 'Te laat' : 'Late'}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

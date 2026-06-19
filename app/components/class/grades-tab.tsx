'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ChevronRight, ArrowLeft, Trash2,
  Edit, Eye, Save, Send, X, Check, ClipboardList,
  Users, Target, History, FileText
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DEFAULT_CLASS_PREFERENCES, normalizeClassPreferences } from '@/lib/class-preferences';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

type GradeSet = {
  id: string;
  title: string;
  description?: string;
  category: string;
  weight: number;
  status: string;
  subject?: { id: string; title: string };
  grading_preset?: { id: string; name: string; kind: string; config?: any; is_default?: boolean };
  total_students: number;
  graded_count: number;
  average: number | null;
  created_at: string;
  updated_at: string;
};

type StudentGrade = {
  id: string;
  student_id: string;
  grade_value: string | null;
  grade_numeric?: number | null;
  feedback_text?: string;
  status: string;
  tag?: string;
  student: { id: string; full_name: string; email: string };
};

type Subject = {
  id: string;
  title: string;
};

type GradeHistoryEvent = {
  id: string;
  grade_set_id: string;
  grade_set_title: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  changed_by: string;
  changed_by_name: string;
  old_value: string | null;
  new_value: string | null;
  old_status: string | null;
  new_status: string | null;
  change_type: string;
  change_reason: string | null;
  created_at: string;
};

type GradePreset = {
  id: string;
  class_id: string;
  name: string;
  kind: 'freeform' | 'numeric_range' | 'letter_scale';
  config: any;
  is_default: boolean;
};

// =============================================
// MAIN GRADES TAB COMPONENT
// =============================================

export function GradesTab({ classId }: { classId: string }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'menu' | 'new' | 'edit' | 'edit-detail' | 'history' | 'reports'>('menu');
  const [gradeSets, setGradeSets] = useState<GradeSet[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [preferences, setPreferences] = useState(DEFAULT_CLASS_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [selectedGradeSetId, setSelectedGradeSetId] = useState<string | null>(null);
  const autoResolveRef = useRef<string>('');
  const deepLinkedStudentId = searchParams?.get('studentId') || '';

  useEffect(() => {
    void logClassTabEvent({
      classId,
      tab: 'grades',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
    void loadClassPreferences();
    void loadClassSubjects();
  }, [classId]);

  useEffect(() => {
    void loadGradeSets(selectedSubjectFilter);
  }, [classId, selectedSubjectFilter]);

  useEffect(() => {
    if (!deepLinkedStudentId) return;
    if (view === 'menu') setView('edit');
  }, [deepLinkedStudentId, view]);

  useEffect(() => {
    if (!deepLinkedStudentId || loading || gradeSets.length === 0) return;
    if (view === 'edit-detail' && selectedGradeSetId) return;
    if (autoResolveRef.current === `${classId}:${deepLinkedStudentId}`) return;

    const resolveGradeSet = async () => {
      autoResolveRef.current = `${classId}:${deepLinkedStudentId}`;
      for (const gradeSet of gradeSets) {
        try {
          const response = await fetch(`/api/classes/${classId}/grades/${gradeSet.id}`);
          if (!response.ok) continue;
          const payload = await response.json();
          const hasStudent = (payload?.grade_set?.student_grades || []).some(
            (entry: any) => entry.student_id === deepLinkedStudentId
          );
          if (hasStudent) {
            setSelectedGradeSetId(gradeSet.id);
            setView('edit-detail');
            return;
          }
        } catch {
          // continue trying next grade set
        }
      }
    };

    void resolveGradeSet();
  }, [classId, deepLinkedStudentId, gradeSets, loading, selectedGradeSetId, view]);

  const loadClassSubjects = async () => {
    try {
      void logClassTabEvent({
        classId,
        tab: 'grades',
        event: 'load_subjects_start',
        stage: 'data',
        level: 'debug',
      });
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (!response.ok) return;
      const data = await response.json();
      const incoming: Subject[] = data.subjects || [];
      setSubjects(incoming);
      if (preferences.default_subject_view === 'all') {
        setSelectedSubjectFilter('all');
      } else if (data.defaultSubjectId) {
        setSelectedSubjectFilter(data.defaultSubjectId);
      } else {
        setSelectedSubjectFilter('all');
      }
      void logClassTabEvent({
        classId,
        tab: 'grades',
        event: 'load_subjects_success',
        stage: 'data',
        level: 'debug',
        meta: { subject_count: incoming.length, default_view: preferences.default_subject_view },
      });
    } catch (error) {
      setSelectedSubjectFilter('all');
      void logClassTabEvent({
        classId,
        tab: 'grades',
        event: 'load_subjects_error',
        stage: 'data',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const loadClassPreferences = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`);
      if (!response.ok) return;
      const data = await response.json();
      const next = normalizeClassPreferences(data.preferences || {});
      setPreferences(next);
      if (next.default_subject_view === 'all') {
        setSelectedSubjectFilter('all');
      }
    } catch {
      setPreferences(DEFAULT_CLASS_PREFERENCES);
    }
  };

  const loadGradeSets = async (subjectId: string = 'all') => {
    setLoading(true);
    try {
      void logClassTabEvent({
        classId,
        tab: 'grades',
        event: 'load_grade_sets_start',
        stage: 'data',
        level: 'debug',
        meta: { subject_id: subjectId },
      });
      const query = subjectId && subjectId !== 'all' ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
      const response = await fetch(`/api/classes/${classId}/grades${query}`);
      if (response.ok) {
        const data = await response.json();
        setGradeSets(data.grade_sets || []);
        void logClassTabEvent({
          classId,
          tab: 'grades',
          event: 'load_grade_sets_success',
          stage: 'data',
          level: 'debug',
          meta: { count: (data.grade_sets || []).length },
        });
      }
    } catch (error) {
      void logClassTabEvent({
        classId,
        tab: 'grades',
        event: 'load_grade_sets_error',
        stage: 'data',
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (view === 'new') {
    return (
      <NewGradesWizard 
        classId={classId} 
        defaultSubjectId={selectedSubjectFilter !== 'all' ? selectedSubjectFilter : ''}
        initialSubjects={subjects}
        onComplete={() => {
          loadGradeSets(selectedSubjectFilter);
          setView('menu');
        }}
        onCancel={() => setView('menu')}
      />
    );
  }

  if (view === 'edit-detail' && selectedGradeSetId) {
    return (
      <EditGradesDetail
        classId={classId}
        gradeSetId={selectedGradeSetId}
        highlightedStudentId={deepLinkedStudentId}
        onBack={() => {
          setSelectedGradeSetId(null);
          setView('edit');
        }}
        onDeleted={() => {
          loadGradeSets(selectedSubjectFilter);
          setSelectedGradeSetId(null);
          setView('edit');
        }}
      />
    );
  }

  if (view === 'history') {
    return (
      <GradesHistoryView
        classId={classId}
        onBack={() => setView('menu')}
      />
    );
  }

  if (view === 'reports') {
    return (
      <GradesReportsView
        gradeSets={gradeSets}
        onBack={() => setView('menu')}
      />
    );
  }

  if (view === 'edit') {
    return (
      <EditGradesList
        classId={classId}
        gradeSets={gradeSets}
        loading={loading}
        onSelectGradeSet={(id) => {
          setSelectedGradeSetId(id);
          setView('edit-detail');
        }}
        onRefresh={() => loadGradeSets(selectedSubjectFilter)}
        subjectId={selectedSubjectFilter}
        onBack={() => setView('menu')}
      />
    );
  }

  // Main menu view
  return (
    <div className="class-shell">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Grades</h1>
        </div>
        <div className="w-full max-w-[280px]">
          <Label className="mb-1 block text-xs text-muted-foreground">Subject</Label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:surface-chip" onClick={() => setView('new')}>
              <p className="font-medium">New Grades</p>
              <p className="text-xs text-foreground/70">Create and assign grades</p>
            </button>
            <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:surface-chip" onClick={() => setView('edit')}>
              <p className="font-medium">Edit Grades</p>
              <p className="text-xs text-foreground/70">{gradeSets.length} grade set{gradeSets.length !== 1 ? 's' : ''}</p>
            </button>
            <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:surface-chip" onClick={() => setView('history')}>
              <p className="font-medium">History</p>
              <p className="text-xs text-foreground/70">Audit changes</p>
            </button>
            <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:surface-chip" onClick={() => setView('reports')}>
              <p className="font-medium">Reports</p>
              <p className="text-xs text-foreground/70">Class insights</p>
            </button>
          </div>

          {/* Recent Grade Sets Overview */}
          {gradeSets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Recent Grade Sets</h2>
                <span className="text-xs text-muted-foreground">
                  {gradeSets.filter(g => g.status === 'published').length} published · {gradeSets.filter(g => g.status === 'draft').length} draft
                </span>
              </div>
              <div className="space-y-2">
                {gradeSets.slice(0, 5).map((gs) => (
                  <div
                    key={gs.id}
                    className="class-panel p-3 cursor-pointer transition-colors hover:surface-interactive"
                    onClick={() => {
                      setSelectedGradeSetId(gs.id);
                      setView('edit-detail');
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-medium">{gs.title}</h3>
                          <Badge variant={gs.status === 'published' ? 'default' : 'secondary'} className="whitespace-nowrap">
                            {gs.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                          {gs.subject && <span>{gs.subject.title}</span>}
                          <span>•</span>
                          <span>{gs.graded_count}/{gs.total_students} graded</span>
                          {gs.average !== null && (
                            <>
                              <span>•</span>
                              <span>Avg: {gs.average.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="whitespace-nowrap">{gs.weight}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gradeSets.length === 0 && (
            <div className="class-panel py-8 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">No grade sets yet</p>
              <p className="text-xs text-muted-foreground">Click "New Grades" to create your first grade set</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GradesHistoryView({
  classId,
  onBack
}: {
  classId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GradeHistoryEvent[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/classes/${classId}/grades/history`);
        if (!response.ok) throw new Error('Failed to load grade history');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [classId]);

  const filtered = events.filter((event) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      event.grade_set_title.toLowerCase().includes(q) ||
      event.student_name.toLowerCase().includes(q) ||
      event.changed_by_name.toLowerCase().includes(q) ||
      (event.change_reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="class-shell">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl">Grade History</h1>
          <p className="text-muted-foreground">Audit timeline of grade changes</p>
        </div>
      </div>

      <div className="class-panel">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student, grade set, teacher, or reason" />
      </div>

      <div className="space-y-3">
        <h2 className="text-base">Events</h2>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grade history found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <div key={event.id} className="class-panel">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{event.change_type}</Badge>
                  <p>{event.student_name}</p>
                  <span className="text-sm text-muted-foreground">in</span>
                  <p className="text-sm">{event.grade_set_title}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.old_value ?? '-'} {'->'} {event.new_value ?? '-'} - by {event.changed_by_name} - {format(new Date(event.created_at), 'PPp')}
                </p>
                {event.change_reason && <p className="mt-1 text-sm">Reason: {event.change_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GradesReportsView({
  gradeSets,
  onBack
}: {
  gradeSets: GradeSet[];
  onBack: () => void;
}) {
  const withAverage = gradeSets.filter((g) => g.average !== null);
  const classAverage = withAverage.length > 0
    ? withAverage.reduce((sum, g) => sum + (g.average || 0), 0) / withAverage.length
    : null;
  const publishedCount = gradeSets.filter((g) => g.status === 'published').length;
  const draftCount = gradeSets.filter((g) => g.status === 'draft').length;
  const sortedByAverage = [...withAverage].sort((a, b) => (b.average || 0) - (a.average || 0));
  const topSet = sortedByAverage[0];
  const lowSet = sortedByAverage[sortedByAverage.length - 1];

  return (
    <div className="class-shell">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl">Grade Reports</h1>
          <p className="text-muted-foreground">Class-level performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <div className="class-panel">
          <p className="text-xs text-muted-foreground">Grade Sets</p>
          <p className="mt-1 text-xl">{gradeSets.length}</p>
        </div>
        <div className="class-panel">
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="mt-1 text-xl">{publishedCount}</p>
        </div>
        <div className="class-panel">
          <p className="text-xs text-muted-foreground">Drafts</p>
          <p className="mt-1 text-xl">{draftCount}</p>
        </div>
        <div className="class-panel">
          <p className="text-xs text-muted-foreground">Overall Average</p>
          <p className="mt-1 text-xl">{classAverage !== null ? classAverage.toFixed(1) : '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="class-panel-lg">
          <h2 className="text-base">Top Performing Grade Set</h2>
          {topSet ? (
            <div className="mt-2">
              <p>{topSet.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Average: {topSet.average?.toFixed(1)} - {topSet.graded_count}/{topSet.total_students} graded
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No numeric grade data yet.</p>
          )}
        </div>

        <div className="class-panel-lg">
          <h2 className="text-base">Needs Attention</h2>
          {lowSet ? (
            <div className="mt-2">
              <p>{lowSet.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Average: {lowSet.average?.toFixed(1)} - {lowSet.graded_count}/{lowSet.total_students} graded
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No numeric grade data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const toNumeric = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

// =============================================
// NEW GRADES WIZARD
// =============================================

function NewGradesWizard({
  classId, 
  defaultSubjectId,
  initialSubjects,
  onComplete, 
  onCancel 
}: { 
  classId: string; 
  defaultSubjectId?: string;
  initialSubjects?: Subject[];
  onComplete: () => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState(1);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects || []);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [presets, setPresets] = useState<GradePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetKind, setNewPresetKind] = useState<'freeform' | 'numeric_range' | 'letter_scale'>('freeform');
  const [newPresetValues, setNewPresetValues] = useState('');
  const [presetCodeInput, setPresetCodeInput] = useState('');

  useEffect(() => {
    loadSubjects();
    loadPresets();
  }, []);

  useEffect(() => {
    if (defaultSubjectId) {
      setSelectedSubjectId(defaultSubjectId);
    }
  }, [defaultSubjectId]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSubjects(data as Subject[]);
        } else {
          setSubjects(data.subjects || []);
          if (!selectedSubjectId && data.defaultSubjectId) {
            setSelectedSubjectId(data.defaultSubjectId);
          }
        }
      }
    } catch (error) {
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/grading-presets`);
      if (!response.ok) return;
      const data = await response.json();
      const incoming: GradePreset[] = data.presets || [];
      setPresets(incoming);
      const defaultPreset = incoming.find((p) => p.is_default);
      if (defaultPreset) {
        setSelectedPresetId(defaultPreset.id);
      } else if (incoming.length > 0 && !selectedPresetId) {
        setSelectedPresetId(incoming[0].id);
      }
    } catch (error) {
    }
  };

  const createGradeSet = async () => {
    setValidationError(null);
    setLoading(true);
    try {
      // Create grade set first
      const response = await fetch(`/api/classes/${classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          weight,
          subject_id: selectedSubjectId || null,
          grading_preset_id: selectedPresetId || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create grade set');
      }

      const data = await response.json();
      
      // If we have grades, update them
      if (students.length > 0) {
        const gradesWithValues = students.filter(s => {
          const hasNumeric = typeof s.grade_numeric === 'number' && !Number.isNaN(s.grade_numeric);
          const hasText = !!(s.grade_value && s.grade_value.trim() !== '');
          return hasNumeric || hasText;
        });
        
        if (gradesWithValues.length > 0) {
          const updateResponse = await fetch(`/api/classes/${classId}/grades/${data.grade_set.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_student_grades',
              student_grades: gradesWithValues.map(s => ({
                id: s.id,
                grade_numeric: s.grade_numeric ?? null,
                grade_value: s.grade_value
              }))
            })
          });

          if (!updateResponse.ok) {
          }
        }
      }

      toast({ title: 'Grade set created successfully!' });
      onComplete();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to create grade set', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (studentId: string, value: string) => {
    setValidationError(null);
    const numeric = toNumeric(value);
    setStudents(students.map(s => 
      s.student_id === studentId
        ? {
            ...s,
            grade_value: value.trim() ? value : null,
            grade_numeric: numeric
          }
        : s
    ));
  };

  const createPreset = async () => {
    if (!newPresetName.trim()) {
      toast({ title: 'Preset name is required', variant: 'destructive' });
      return;
    }

    const config =
      newPresetKind === 'letter_scale'
        ? { values: newPresetValues.split(',').map(v => v.trim()).filter(Boolean) }
        : {};

    const response = await fetch(`/api/classes/${classId}/grading-presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPresetName.trim(),
        kind: newPresetKind,
        config,
        is_default: presets.length === 0
      })
    });

    if (!response.ok) {
      const error = await response.json();
      toast({ title: error.error || 'Failed to create preset', variant: 'destructive' });
      return;
    }

    const data = await response.json();
    const created = data.preset as GradePreset;
    setPresets((prev) => [...prev, created]);
    setSelectedPresetId(created.id);
    setNewPresetName('');
    setNewPresetKind('freeform');
    setNewPresetValues('');
  };

  const encodePresetCode = (preset: { name: string; kind: GradePreset['kind']; config: any }) => {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(preset))));
    } catch {
      return '';
    }
  };

  const importPresetFromCode = async () => {
    const raw = presetCodeInput.trim();
    if (!raw) return;
    try {
      const decoded = decodeURIComponent(escape(atob(raw)));
      const parsed = JSON.parse(decoded) as { name?: string; kind?: GradePreset['kind']; config?: any };
      if (!parsed?.name || !parsed?.kind) {
        throw new Error('Invalid preset code.');
      }

      const response = await fetch(`/api/classes/${classId}/grading-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(parsed.name).trim(),
          kind: parsed.kind,
          config: parsed.config || {},
          is_default: presets.length === 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to import preset');
      }

      const data = await response.json();
      const created = data.preset as GradePreset;
      setPresets((prev) => [...prev, created]);
      setSelectedPresetId(created.id);
      setPresetCodeInput('');
      toast({ title: 'Preset imported' });
    } catch (error: any) {
      toast({ title: error?.message || 'Invalid preset code', variant: 'destructive' });
    }
  };

  const copySelectedPresetCode = async () => {
    const selected = presets.find((preset) => preset.id === selectedPresetId);
    if (!selected) return;
    const code = encodePresetCode({
      name: selected.name,
      kind: selected.kind,
      config: selected.config || {},
    });
    if (!code) {
      toast({ title: 'Could not generate preset code', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Preset code copied' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      {/* Modal */}
      <div className="bg-background rounded-lg border border-border shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/70 sticky top-0 bg-background">
          <h2 className="text-base font-500">New Grade Set</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quiz Chapter 5, Midterm Exam..."
              className="text-sm"
              autoFocus
            />
            {validationError && <p className="text-xs text-destructive">{validationError}</p>}
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Weight</Label>
            <Input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">How much this grade counts (e.g., 1x = normal, 2x = double weight)</p>
          </div>

          {/* Subject Selection */}
          {subjects.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Subject</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectId('')}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                    selectedSubjectId === ''
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border/70 hover:border-foreground/50'
                  }`}
                >
                  No Subject
                </button>
                {subjects.map((subj) => (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                      selectedSubjectId === subj.id
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border/70 hover:border-foreground/50'
                    }`}
                  >
                    {subj.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Selection */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Grading Scale</Label>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Use default</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} {preset.is_default ? '(default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border/70 sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!title.trim()) {
                setValidationError('Please enter a title');
                return;
              }
              await createGradeSet();
            }}
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Spinner size={16} className="mr-1" /> : null}
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper component to load students - directly from class_members
function StudentGrader({ classId, onStudentsLoaded }: { classId: string; onStudentsLoaded: (students: StudentGrade[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/members`);
        
        if (response.ok) {
          const members = await response.json();
          
          // Transform class members to student grades format
          const studentGrades: StudentGrade[] = members
            .filter((m: any) => (
              m.role === 'student' ||
              m.subscription_type === 'student' ||
              m.profile?.subscription_type === 'student' ||
              m.profiles?.subscription_type === 'student'
            ))
            .map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              student_id: m.user_id || m.id,
              grade_numeric: null,
              grade_value: null,
              status: 'draft',
              student: {
                id: m.user_id || m.id,
                full_name: m.profile?.full_name || m.profiles?.full_name || '',
                email: m.profile?.email || m.profiles?.email || m.email || 'Unknown'
              }
            }));
          
          onStudentsLoaded(studentGrades);
        } else {
          const errorText = await response.text();
          
          setError('Could not load students. API error: ' + response.status);
        }
      } catch (err: any) {
        setError('Failed to load students: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="mr-2" />
        <span>Loading students...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg surface-interactive p-4 text-center text-foreground/80">
        {error}
      </div>
    );
  }

  return null;
}

// =============================================
// EDIT GRADES LIST
// =============================================

function EditGradesList({
  classId,
  gradeSets,
  loading,
  subjectId,
  onSelectGradeSet,
  onRefresh,
  onBack
}: {
  classId: string;
  gradeSets: GradeSet[];
  loading: boolean;
  subjectId?: string;
  onSelectGradeSet: (id: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  return (
    <div className="class-shell">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl">Edit Grades</h1>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : gradeSets.length === 0 ? (
        <div className="class-panel py-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No grade sets yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gradeSets.map((gs) => (
            <div 
              key={gs.id} 
              className="class-panel-lg cursor-pointer transition-colors hover:surface-interactive"
              onClick={() => onSelectGradeSet(gs.id)}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate">{gs.title}</h3>
                    <Badge variant={gs.status === 'published' ? 'default' : 'secondary'}>
                      {gs.status}
                    </Badge>
                    <Badge variant="outline">{gs.weight}x</Badge>
                  </div>
                  <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                    <span>{gs.category}</span>
                    <span>{gs.graded_count}/{gs.total_students} graded</span>
                    {gs.average !== null && <span>Avg: {gs.average}</span>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// GRADE DISTRIBUTION CHART
// =============================================

function GradeDistributionChart({ students }: { students: Array<{ grade_numeric?: number | null }> }) {
  const nums = students
    .map(s => typeof s.grade_numeric === 'number' ? s.grade_numeric : null)
    .filter((g): g is number => g !== null);

  if (nums.length < 3) return null;

  const buckets = [
    { label: 'D  (<5.5)',   key: 'd', min: 0,   max: 5.5, barColor: '#f8c4c4' },
    { label: 'C  (5.5–6.9)', key: 'c', min: 5.5, max: 7,   barColor: '#f0d898' },
    { label: 'B  (7–8.4)',  key: 'b', min: 7,   max: 8.5, barColor: '#b8e0b8' },
    { label: 'A  (≥8.5)',   key: 'a', min: 8.5, max: 11,  barColor: '#7f8962' },
  ];

  const counts = buckets.map(b => ({
    ...b,
    count: nums.filter(n => n >= b.min && n < b.max).length,
  }));

  const maxCount = Math.max(...counts.map(b => b.count), 1);
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length;

  return (
    <div className="rounded-xl surface-panel border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Grade distribution</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{nums.length} graded</span>
          <span className="text-xs font-semibold text-[var(--accent-brand)]">avg {avg.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex items-end gap-3" style={{ height: '72px' }}>
        {counts.map(b => {
          const pct = b.count / maxCount;
          const barH = Math.max(pct * 56, b.count > 0 ? 8 : 0);
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '72px' }}>
              {b.count > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground">{b.count}</span>
              )}
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${barH}px`, background: b.barColor }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 flex-wrap">
        {counts.map(b => (
          <div key={b.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: b.barColor }} />
            <span className="text-[10px] text-muted-foreground">{b.label} · <strong>{b.count}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================
// EDIT GRADES DETAIL (view/edit single grade set)
// =============================================

function EditGradesDetail({ 
  classId, 
  gradeSetId, 
  highlightedStudentId,
  onBack,
  onDeleted
}: { 
  classId: string; 
  gradeSetId: string; 
  highlightedStudentId?: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [gradeSet, setGradeSet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [presets, setPresets] = useState<GradePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(highlightedStudentId || '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    loadGradeSet();
    loadPresets();
  }, [gradeSetId]);

  useEffect(() => {
    setSelectedStudentId(highlightedStudentId || '');
  }, [highlightedStudentId]);

  const loadPresets = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/grading-presets`);
      if (!response.ok) return;
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
    }
  };

  const loadGradeSet = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`);
      if (response.ok) {
        const data = await response.json();
        setGradeSet(data.grade_set);
        const incoming = data.grade_set.student_grades || [];
        if (highlightedStudentId) {
          incoming.sort((a: any, b: any) => {
            if (a.student_id === highlightedStudentId) return -1;
            if (b.student_id === highlightedStudentId) return 1;
            return 0;
          });
        }
        setStudents(incoming);
        setSelectedPresetId(data.grade_set.grading_preset?.id || '');
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (studentId: string, value: string) => {
    setValidationError(null);
    const numeric = toNumeric(value);
    setStudents(students.map(s => 
      s.student_id === studentId
        ? {
            ...s,
            grade_value: value.trim() ? value : null,
            grade_numeric: numeric
          }
        : s
    ));
  };

  const applyBulkToSelected = () => {
    setValidationError(null);
    if (selectedStudentIds.length === 0) return;
    const numeric = toNumeric(bulkGrade);
    setStudents(students.map(s => {
      if (!selectedStudentIds.includes(s.student_id)) return s;
      return {
        ...s,
        grade_value: bulkGrade.trim() ? bulkGrade : null,
        grade_numeric: numeric,
        feedback_text: bulkFeedback.trim() ? bulkFeedback : s.feedback_text
      };
    }));
  };

  const toggleStudentSelection = (studentId: string, withRange: boolean = false) => {
    const currentIndex = visibleStudents.findIndex((student) => student.student_id === studentId);
    if (currentIndex < 0) return;

    if (!withRange || lastSelectedIndexRef.current === null) {
      setSelectedStudentIds((prev) =>
        prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
      );
      lastSelectedIndexRef.current = currentIndex;
      return;
    }

    const [start, end] =
      currentIndex > lastSelectedIndexRef.current
        ? [lastSelectedIndexRef.current, currentIndex]
        : [currentIndex, lastSelectedIndexRef.current];
    const rangeIds = visibleStudents.slice(start, end + 1).map((student) => student.student_id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
    lastSelectedIndexRef.current = currentIndex;
  };

  const copyFromFirstSelected = (field: 'grade' | 'feedback') => {
    if (selectedStudentIds.length < 2) return;
    const source = students.find((row) => row.student_id === selectedStudentIds[0]);
    if (!source) return;
    if (field === 'grade') {
      const nextValue = String(source.grade_value || '').trim();
      if (!nextValue) return;
      const numeric = toNumeric(nextValue);
      setBulkGrade(nextValue);
      setStudents((prev) =>
        prev.map((row) =>
          selectedStudentIds.includes(row.student_id)
            ? { ...row, grade_value: nextValue, grade_numeric: numeric }
            : row
        )
      );
      return;
    }
    const nextFeedback = String(source.feedback_text || '').trim();
    if (!nextFeedback) return;
    setBulkFeedback(nextFeedback);
    setStudents((prev) =>
      prev.map((row) =>
        selectedStudentIds.includes(row.student_id)
          ? { ...row, feedback_text: nextFeedback }
          : row
      )
    );
  };

  const saveGrades = async () => {
    setValidationError(null);
    setSaving(true);
    try {
      if ((gradeSet?.grading_preset?.id || '') !== selectedPresetId) {
        const presetResp = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_grade_set',
            grading_preset_id: selectedPresetId || null
          })
        });
        if (!presetResp.ok) {
          throw new Error('Failed to update grading preset');
        }
      }

      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_student_grades',
          student_grades: students.map(s => ({
            id: s.id,
            grade_numeric: s.grade_numeric ?? null,
            grade_value: s.grade_value,
            feedback_text: s.feedback_text ?? null
          }))
        })
      });

      if (response.ok) {
        toast({ title: 'Grades saved successfully!' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Failed to save grades', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const publishGrades = async () => {
    setValidationError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
      });

      if (response.ok) {
        toast({ title: 'Grades published!' });
        loadGradeSet();
      } else {
        throw new Error('Failed to publish');
      }
    } catch (error) {
      toast({ title: 'Failed to publish grades', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGradeSet = async () => {
    if (!confirm('Are you sure you want to delete this grade set? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Grade set deleted' });
        onDeleted();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({ title: 'Failed to delete grade set', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={32} />
      </div>
    );
  }

  if (!gradeSet) {
    return (
      <div className="text-center py-12">
        <p>Grade set not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const canPublish = gradeSet.status === 'draft' && !saving;
  const showDeepLinkHint = Boolean(highlightedStudentId);
  const visibleStudents = selectedStudentId
    ? students.filter((student) => student.student_id === selectedStudentId)
    : students;
  const recentValues = students
    .map((student) => String(student.grade_value || '').trim())
    .filter(Boolean)
    .slice(0, 8);
  const suggestedBulkValue = recentValues.length >= 5 && recentValues.every((value) => value === recentValues[0]) ? recentValues[0] : '';

  return (
    <div className="class-shell">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{gradeSet.title}</h1>
            <Badge variant={gradeSet.status === 'published' ? 'default' : 'secondary'}>
              {gradeSet.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {gradeSet.category} | {gradeSet.weight}x weight | {gradeSet.graded_count}/{gradeSet.total_students} graded
            {gradeSet.average !== null && ` | Avg: ${gradeSet.average}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={deleteGradeSet} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          {gradeSet.status === 'draft' && (
            <Button onClick={publishGrades} disabled={!canPublish}>
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          )}
          <Button onClick={saveGrades} disabled={saving}>
            {saving ? <Spinner size={16} className="mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
      {showDeepLinkHint && (
        <div className="rounded-lg surface-interactive px-3 py-2 text-xs text-muted-foreground">
          Focused from Group tab. Highlighted student moved to top.
        </div>
      )}

      {/* Grade distribution chart — shown when enough numeric grades are available */}
      <GradeDistributionChart students={students} />

      <div className="flex items-center justify-end">
        <select
          value={selectedStudentId}
          onChange={(event) => {
            const nextStudentId = event.target.value;
            setSelectedStudentId(nextStudentId);
            if (nextStudentId) {
              router.replace(`/class/${classId}?tab=grades&studentId=${nextStudentId}`);
              window.requestAnimationFrame(() => {
                document.getElementById(`grade-student-${nextStudentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
              return;
            }
            router.replace(`/class/${classId}?tab=grades`);
          }}
          className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All students</option>
          {students.map((student) => (
            <option key={student.student_id} value={student.student_id}>
              {student.student?.full_name || student.student?.email || 'Unknown Student'}
            </option>
          ))}
        </select>
      </div>

      <div className="class-panel-lg space-y-4">
        <h2 className="text-base">Student Grades</h2>
          <div className="space-y-2">
            <Label className="font-semibold">Grading Preset</Label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No preset (free score)</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.kind})
                </option>
              ))}
            </select>
          </div>
        {validationError && <p className="text-sm text-foreground/80">{validationError}</p>}
          <div className="class-panel space-y-2">
            <Label className="font-semibold">Bulk for Selected</Label>
            {suggestedBulkValue ? (
              <button
                type="button"
                className="text-xs text-foreground/70 underline underline-offset-2"
                onClick={() => setBulkGrade(suggestedBulkValue)}
              >
                Suggestion detected: apply "{suggestedBulkValue}"
              </button>
            ) : null}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                value={bulkGrade}
                onChange={(e) => setBulkGrade(e.target.value)}
                className="md:col-span-1"
                placeholder="Grade value"
              />
              <Input
                value={bulkFeedback}
                onChange={(e) => setBulkFeedback(e.target.value)}
                className="md:col-span-1"
                placeholder="Feedback (optional)"
              />
              <Button onClick={applyBulkToSelected} variant="outline" className="md:col-span-1" disabled={selectedStudentIds.length === 0}>
                Apply to selected ({selectedStudentIds.length})
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromFirstSelected('grade')}
                disabled={selectedStudentIds.length < 2}
              >
                Copy first selected grade
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyFromFirstSelected('feedback')}
                disabled={selectedStudentIds.length < 2}
              >
                Copy first selected notes
              </Button>
            </div>
          </div>

          {/* Students list */}
          <div className="grid grid-cols-1 gap-3 px-3 text-xs text-muted-foreground md:grid-cols-12">
            <div className="md:col-span-1">Select</div>
            <div className="md:col-span-5">Student</div>
            <div className="md:col-span-2">Grade</div>
            <div className="md:col-span-4">Notes</div>
          </div>
          <div className="rounded-md border border-border/70">
            {visibleStudents.map((student) => (
              <div
                id={`grade-student-${student.student_id}`}
                key={student.student_id}
                className={`grid grid-cols-1 gap-3 border-b border-border/60 p-3 md:grid-cols-12 md:items-center ${
                  highlightedStudentId === student.student_id ? 'surface-interactive' : ''
                }`}
              >
                <div className="md:col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.student_id)}
                    onClick={(event) => {
                      toggleStudentSelection(student.student_id, event.shiftKey);
                    }}
                    onChange={() => {}}
                    className="h-4 w-4 accent-[hsl(var(--primary-foreground))]"
                  />
                </div>
                <div className="min-w-0 md:col-span-5">
                  <p className="font-medium truncate">{student.student?.full_name || student.student?.email || 'Unknown Student'}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.student?.email || 'No email available'}</p>
                </div>
                <Input
                  value={student.grade_value ?? ''}
                  onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                  className="md:col-span-2"
                  placeholder="Grade"
                />
                <Input
                  value={student.feedback_text ?? ''}
                  onChange={(e) => setStudents((prev) => prev.map((row) => row.student_id === student.student_id ? { ...row, feedback_text: e.target.value } : row))}
                  className="md:col-span-4"
                  placeholder="Optional note"
                />
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}







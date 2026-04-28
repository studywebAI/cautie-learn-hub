'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, ChevronRight, ArrowLeft, Trash2, 
  Edit, Eye, Loader2, Save, Send, X, Check, ClipboardList,
  Users, Target, History, FileText
} from 'lucide-react';
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
      console.error('Failed to load class subjects for grades filter:', error);
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
      console.error('Failed to load grade sets:', error);
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:bg-[hsl(var(--surface-3))]" onClick={() => setView('new')}>
            <p>New Grades</p>
            <p className="text-xs text-foreground/70">Create and assign grades</p>
          </button>
          <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:bg-[hsl(var(--surface-3))]" onClick={() => setView('edit')}>
            <p>Edit Grades</p>
            <p className="text-xs text-foreground/70">{gradeSets.length} grade set{gradeSets.length !== 1 ? 's' : ''}</p>
          </button>
          <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:bg-[hsl(var(--surface-3))]" onClick={() => setView('history')}>
            <p>History</p>
            <p className="text-xs text-foreground/70">Audit changes</p>
          </button>
          <button type="button" className="class-panel h-16 px-4 text-left transition-colors hover:bg-[hsl(var(--surface-3))]" onClick={() => setView('reports')}>
            <p>Reports</p>
            <p className="text-xs text-foreground/70">Class insights</p>
          </button>
        </div>
      )}

      {gradeSets.length > 0 ? (
        <div className="text-sm text-foreground/70">
          {gradeSets.length} sets - {gradeSets.filter(g => g.status === 'published').length} published - {gradeSets.filter(g => g.status === 'draft').length} drafts
        </div>
      ) : null}
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
        console.error('Failed to load grade history:', error);
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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
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
      console.error('Failed to load subjects:', error);
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
      console.error('Failed to load grading presets:', error);
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
            console.error('Failed to update grades');
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

  return (
    <div className="class-shell">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl">New Grades</h1>
        </div>
      </div>

      <div className="class-panel-lg space-y-4">
        <div className="space-y-2">
          <Label className="text-base">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-base border border-border/70" />
        </div>

        <div className="space-y-2">
          <Label className="text-base">Weight</Label>
          <div className="flex gap-3 items-center">
            {[1, 2, 3].map((w) => (
              <Button key={w} variant={weight === w ? 'default' : 'outline'} onClick={() => setWeight(w)} className="w-16">
                {w}x
              </Button>
            ))}
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
              className="w-20 border border-border/70"
              min={0.5}
              max={10}
              step={0.5}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Grading Preset (Optional)</Label>
          <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)} className="w-full p-2 border rounded-md">
            <option value="">No preset (free input)</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.kind})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} />
            <select
              value={newPresetKind}
              onChange={(e) => setNewPresetKind(e.target.value as 'freeform' | 'numeric_range' | 'letter_scale')}
              className="w-full p-2 border rounded-md"
            >
              <option value="freeform">Freeform</option>
              <option value="numeric_range">Numeric Range</option>
              <option value="letter_scale">Letter Scale</option>
            </select>
            <Button type="button" variant="outline" onClick={createPreset}>Save Preset</Button>
          </div>
          {newPresetKind === 'letter_scale' && (
            <Input value={newPresetValues} onChange={(e) => setNewPresetValues(e.target.value)} />
          )}
        </div>

        {subjects.length > 0 && (
          <div className="space-y-2">
            <Label className="text-base">
              Subject
            </Label>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full p-2 border rounded-md">
              <option value="">All subjects</option>
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>{subj.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-base">Students</Label>
          {validationError && <p className="text-sm text-foreground/80">{validationError}</p>}
          <div className="grid grid-cols-1 gap-3 px-3 text-xs text-muted-foreground md:grid-cols-12">
            <div className="md:col-span-8">Student</div>
            <div className="md:col-span-4 text-center">Grade</div>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border border-border/70 divide-y divide-border/70">
            {students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                <p>Loading students...</p>
              </div>
            ) : (
              students.map((student) => (
                <div key={student.student_id} className="grid grid-cols-1 gap-3 p-3 items-center md:grid-cols-12">
                  <div className="min-w-0 md:col-span-8">
                    <p className="truncate">{student.student.full_name || student.student.email || 'Unknown Student'}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.student.email || 'No email available'}</p>
                  </div>
                  <Input
                    value={student.grade_value ?? ''}
                    onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                    className="md:col-span-4 text-center"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between border-t border-border/70 pt-3">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!title.trim()) {
                toast({ title: 'Please enter a title', variant: 'destructive' });
                return;
              }
              await createGradeSet();
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Create Grade Set
          </Button>
        </div>
      </div>

      {students.length === 0 && !loading && <StudentGrader classId={classId} onStudentsLoaded={setStudents} />}
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
          console.error('[StudentGrader] Members API error:', response.status, errorText);
          
          setError('Could not load students. API error: ' + response.status);
        }
      } catch (err: any) {
        console.error('[StudentGrader] Failed to load students:', err);
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
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading students...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[hsl(var(--surface-2))] p-4 text-center text-foreground/80">
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              className="class-panel-lg cursor-pointer transition-colors hover:bg-[hsl(var(--surface-2))]"
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
      console.error('Failed to load grading presets:', error);
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
      console.error('Failed to load grade set:', error);
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
      {showDeepLinkHint && (
        <div className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          Focused from Group tab. Highlighted student moved to top.
        </div>
      )}
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
                  highlightedStudentId === student.student_id ? 'bg-muted/45' : ''
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






